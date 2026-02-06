/**
 * Pokémon Emerald Web Engine (MVP) - Stage 3
 * 新增：状态机、实体交互、对话系统
 */

// --- 1. 常量与配置 ---
const TILE_SIZE = 32;
const SCREEN_WIDTH = 480;
const SCREEN_HEIGHT = 320;
const MAP_COLS = 40; 
const MAP_ROWS = 30;

// 瓦片ID
const TILE_GRASS = 0;
const TILE_WATER = 1;
const TILE_WALL  = 2;

// 游戏状态枚举
const STATE = {
    ROAMING: 'roaming', // 自由移动
    DIALOGUE: 'dialogue' // 对话中（锁定移动）
};

// --- 2. 地图与实体数据 ---
const mapData = [];
// 实体列表 (NPCs, 路牌)
const entities = [
    {
        x: 4, y: 4, 
        type: 'npc', 
        color: '#ffdd00', // 黄色小人
        text: ["科学的力量真伟大！", "现在的技术已经能把游戏移植到网页上了！"]
    },
    {
        x: 8, y: 5, 
        type: 'sign', 
        color: '#b8860b', // 木头色路牌
        text: ["这里是 101 号道路。", "注意草丛里的野生程序员。"]
    }
];

// 初始化地图
for (let r = 0; r < MAP_ROWS; r++) {
    let row = [];
    for (let c = 0; c < MAP_COLS; c++) {
        if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
            row.push(TILE_WALL);
        } else {
            const rand = Math.random();
            if (rand < 0.7) row.push(TILE_GRASS);
            else if (rand < 0.8) row.push(TILE_WATER);
            else row.push(TILE_WALL);
        }
    }
    mapData.push(row);
}
// 确保实体位置是平地，防止卡住
entities.forEach(e => mapData[e.y][e.x] = TILE_GRASS);
mapData[2][2] = TILE_GRASS; 

// --- 3. 核心对象 ---

let gameState = STATE.ROAMING;

const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    z: false, zPressed: false // zPressed 用于检测单次按键
};

window.addEventListener('keydown', (e) => {
    if(keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if(e.key === 'z' && !keys.zPressed) {
        keys.zPressed = true;
        handleInteraction(); // 按下瞬间触发交互
    }
});
window.addEventListener('keyup', (e) => {
    if(keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if(e.key === 'z') keys.zPressed = false;
});

const player = {
    x: 2, y: 2,
    direction: 'down',
    isMoving: false,
    speed: 4,
    pixelX: 2 * TILE_SIZE,
    pixelY: 2 * TILE_SIZE,
    targetX: 2 * TILE_SIZE,
    targetY: 2 * TILE_SIZE
};

const camera = {
    x: 0, y: 0,
    follow: function(target) {
        this.x = (target.pixelX + TILE_SIZE / 2) - (SCREEN_WIDTH / 2);
        this.y = (target.pixelY + TILE_SIZE / 2) - (SCREEN_HEIGHT / 2);
        this.x = Math.max(0, Math.min(this.x, MAP_COLS * TILE_SIZE - SCREEN_WIDTH));
        this.y = Math.max(0, Math.min(this.y, MAP_ROWS * TILE_SIZE - SCREEN_HEIGHT));
    }
};

// --- 4. 交互与对话系统 ---

const dialogueUI = {
    box: document.getElementById('dialogue-box'),
    text: document.getElementById('dialogue-text'),
    queue: [], // 待显示的文本队列
    isTyping: false,
    
    show: function(lines) {
        gameState = STATE.DIALOGUE; // 锁定游戏状态
        this.queue = [...lines]; // 复制文本数组
        this.box.classList.remove('hidden');
        this.nextPage();
    },
    
    nextPage: function() {
        if (this.queue.length === 0) {
            this.close();
            return;
        }
        const line = this.queue.shift();
        this.typeWriter(line);
    },
    
    typeWriter: function(text) {
        this.isTyping = true;
        this.text.innerHTML = '';
        let i = 0;
        const speed = 30; // 打字速度 (ms)
        
        const timer = setInterval(() => {
            this.text.innerHTML += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                this.isTyping = false;
            }
        }, speed);
    },
    
    close: function() {
        this.box.classList.add('hidden');
        gameState = STATE.ROAMING; // 恢复移动
        // 防止 Z 键连点导致瞬间再次触发
        setTimeout(() => keys.zPressed = false, 200);
    }
};

function handleInteraction() {
    if (gameState === STATE.DIALOGUE) {
        // 如果正在打字，直接显示全文字（跳过打字效果）- 暂略
        // 如果打字结束，显示下一页
        if (!dialogueUI.isTyping) {
            dialogueUI.nextPage();
        }
        return;
    }

    // 只有在静止时才能发起交互
    if (gameState === STATE.ROAMING && !player.isMoving) {
        // 1. 计算主角面前的坐标
        let targetX = player.x;
        let targetY = player.y;
        
        if (player.direction === 'up') targetY--;
        else if (player.direction === 'down') targetY++;
        else if (player.direction === 'left') targetX--;
        else if (player.direction === 'right') targetX++;

        // 2. 检查该坐标有没有实体
        const entity = entities.find(e => e.x === targetX && e.y === targetY);
        
        if (entity) {
            // 3. 触发对话
            // 如果是 NPC，让他面向玩家 (简单的 AI)
            dialogueUI.show(entity.text);
        }
    }
}

// --- 5. 游戏逻辑更新 ---

function isWalkable(x, y) {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
    // 检查地形
    if (mapData[y][x] !== TILE_GRASS) return false;
    // 检查是否有实体挡路 (NPC是实体的)
    if (entities.some(e => e.x === x && e.y === y)) return false;
    return true;
}

function updateGameLogic() {
    // 如果在对话中，完全停止所有物理更新
    if (gameState === STATE.DIALOGUE) return;

    // 移动逻辑
    if (!player.isMoving) {
        let dx = 0;
        let dy = 0;

        if (keys.ArrowUp) { dy = -1; player.direction = 'up'; }
        else if (keys.ArrowDown) { dy = 1; player.direction = 'down'; }
        else if (keys.ArrowLeft) { dx = -1; player.direction = 'left'; }
        else if (keys.ArrowRight) { dx = 1; player.direction = 'right'; }

        if (dx !== 0 || dy !== 0) {
            const nextX = player.x + dx;
            const nextY = player.y + dy;

            if (isWalkable(nextX, nextY)) {
                player.isMoving = true;
                player.targetX = nextX * TILE_SIZE;
                player.targetY = nextY * TILE_SIZE;
                player.x = nextX;
                player.y = nextY;
            }
        }
    } else {
        if (player.pixelX < player.targetX) player.pixelX += player.speed;
        if (player.pixelX > player.targetX) player.pixelX -= player.speed;
        if (player.pixelY < player.targetY) player.pixelY += player.speed;
        if (player.pixelY > player.targetY) player.pixelY -= player.speed;

        if (Math.abs(player.pixelX - player.targetX) < player.speed &&
            Math.abs(player.pixelY - player.targetY) < player.speed) {
            player.pixelX = player.targetX;
            player.pixelY = player.targetY;
            player.isMoving = false;
        }
    }

    camera.follow(player);
}

// --- 6. 渲染系统 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol   = startCol + (SCREEN_WIDTH / TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / TILE_SIZE);
    const endRow   = startRow + (SCREEN_HEIGHT / TILE_SIZE) + 1;

    // 绘制地图
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) {
                const drawX = (c * TILE_SIZE) - camera.x;
                const drawY = (r * TILE_SIZE) - camera.y;
                const tileId = mapData[r][c];

                if (tileId === TILE_GRASS) {
                    ctx.fillStyle = '#4cd158'; ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#3eb049'; ctx.fillRect(drawX + 4, drawY + 4, 24, 24);
                } else if (tileId === TILE_WATER) {
                    ctx.fillStyle = '#4fa4b8'; ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#a6e1ea'; ctx.fillRect(drawX + 8, drawY + 8, 16, 4);
                } else { 
                    ctx.fillStyle = '#6e4529'; ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#5c3a22'; ctx.fillRect(drawX + 2, drawY + 16, 28, 2);
                }
            }
        }
    }

    // [新增] 绘制实体 (NPCs)
    entities.forEach(e => {
        const drawX = (e.x * TILE_SIZE) - camera.x;
        const drawY = (e.y * TILE_SIZE) - camera.y;
        
        // 简单的剔除：如果在屏幕外就不画
        if (drawX > -32 && drawX < SCREEN_WIDTH && drawY > -32 && drawY < SCREEN_HEIGHT) {
            ctx.fillStyle = e.color;
            ctx.fillRect(drawX + 4, drawY + 4, 24, 24); // 简单的方块人
            // 简单的脸
            ctx.fillStyle = 'black';
            ctx.fillRect(drawX + 8, drawY + 10, 4, 4);
            ctx.fillRect(drawX + 20, drawY + 10, 4, 4);
        }
    });

    // 绘制玩家
    const screenX = player.pixelX - camera.x;
    const screenY = player.pixelY - camera.y;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX + TILE_SIZE/2, screenY + TILE_SIZE - 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e3350d'; 
    ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    ctx.fillStyle = '#fff';
    if(player.direction === 'down') ctx.fillRect(screenX + 8, screenY + 12, 16, 4);
    if(player.direction === 'up') ctx.fillRect(screenX + 12, screenY + 4, 8, 4);
    if(player.direction === 'left') ctx.fillRect(screenX + 4, screenY + 10, 4, 8);
    if(player.direction === 'right') ctx.fillRect(screenX + 24, screenY + 10, 4, 8);
}

// 循环保持不变
const TARGET_FPS = 60;
const TIME_STEP = 1000 / TARGET_FPS; 
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += deltaTime;

    while (accumulator >= TIME_STEP) {
        updateGameLogic(); 
        accumulator -= TIME_STEP;
    }

    render();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
