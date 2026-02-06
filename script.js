/**
 * Pokémon Emerald Web Engine (MVP)
 * 基于用户提供的研究报告第4节架构
 */

// --- 1. 常量定义 (参考 include/global.h) ---
const TILE_SIZE = 32; // 模拟 16x16 放大2倍
const COLS = 15;      // 480 / 32
const ROWS = 10;      // 320 / 32

// 模拟瓦片ID (参考 map.json)
const TILE_GRASS = 0;
const TILE_WATER = 1;
const TILE_WALL  = 2;

// --- 2. 简易地图数据 (参考 data/maps/) ---
// 0:草地(可走), 1:水(不可走), 2:墙(不可走)
const mapData = [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 1, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 2],
    [2, 0, 0, 1, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

// --- 3. 核心对象 ---

// 输入处理 (参考 InputHandler)
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    z: false // 模拟A键
};

window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// 玩家对象 (参考 src/field_player_avatar.c)
const player = {
    x: 2, // 网格坐标
    y: 2,
    direction: 'down', // facing
    isMoving: false,
    moveProgress: 0, // 0 到 TILE_SIZE
    speed: 2, // 移动速度 (像素/帧)
    
    // 渲染坐标 (像素)
    pixelX: 2 * TILE_SIZE,
    pixelY: 2 * TILE_SIZE,
    targetX: 2 * TILE_SIZE,
    targetY: 2 * TILE_SIZE
};

// --- 4. 游戏逻辑 ---

function isWalkable(x, y) {
    // 边界检查
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    // 碰撞检测：只有草地(0)可走
    return mapData[y][x] === TILE_GRASS;
}

function updateGameLogic() {
    // 移动逻辑：类似GBA，只有当玩家完全停在一个格子里时，才能接受新的移动指令
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
                player.x = nextX; // 逻辑坐标先行更新
                player.y = nextY;
            }
        }
    } else {
        // 平滑移动插值
        if (player.pixelX < player.targetX) player.pixelX += player.speed;
        if (player.pixelX > player.targetX) player.pixelX -= player.speed;
        if (player.pixelY < player.targetY) player.pixelY += player.speed;
        if (player.pixelY > player.targetY) player.pixelY -= player.speed;

        // 检查移动是否完成 (简单的近似检查)
        if (Math.abs(player.pixelX - player.targetX) < player.speed &&
            Math.abs(player.pixelY - player.targetY) < player.speed) {
            player.pixelX = player.targetX;
            player.pixelY = player.targetY;
            player.isMoving = false;
        }
    }
}

// --- 5. 渲染系统 (参考报告 4.2 瓦片地图渲染) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function render() {
    // 清除屏幕
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 绘制地图 (Layer 0)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tileId = mapData[r][c];
            // 简单的色块替代真实素材
            if (tileId === TILE_GRASS) ctx.fillStyle = '#4cd158'; // 绿宝石草地色
            if (tileId === TILE_WATER) ctx.fillStyle = '#4fa4b8'; // 水色
            if (tileId === TILE_WALL)  ctx.fillStyle = '#6e4529'; // 墙色
            
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // 绘制网格线方便调试
            ctx.strokeStyle = '#00000020';
            ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // 2. 绘制玩家 (Sprite)
    ctx.fillStyle = '#ff0000'; // 主角戴着红帽子
    // 简单的阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(player.pixelX + TILE_SIZE/2, player.pixelY + TILE_SIZE - 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 玩家本体
    ctx.fillStyle = '#e3350d'; // Brendan's hat color
    ctx.fillRect(player.pixelX + 4, player.pixelY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    
    // 方向指示器 (眼睛)
    ctx.fillStyle = '#fff';
    if(player.direction === 'down') ctx.fillRect(player.pixelX + 8, player.pixelY + 12, 16, 4);
    if(player.direction === 'up') ctx.fillRect(player.pixelX + 12, player.pixelY + 4, 8, 4);
    if(player.direction === 'left') ctx.fillRect(player.pixelX + 4, player.pixelY + 10, 4, 8);
    if(player.direction === 'right') ctx.fillRect(player.pixelX + 24, player.pixelY + 10, 4, 8);
}

// --- 6. 游戏主循环 (完全复刻报告 4.1.1 代码) ---
const TARGET_FPS = 60;
const TIME_STEP = 1000 / TARGET_FPS; // ~16.67ms
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += deltaTime;

    // 追赶逻辑：如果渲染慢了，多次执行更新以保证逻辑同步 (Fixed Timestep)
    while (accumulator >= TIME_STEP) {
        updateGameLogic(); 
        accumulator -= TIME_STEP;
    }

    // 渲染 (可以加入 alpha 插值平滑，MVP暂时省略)
    render();
   
    requestAnimationFrame(gameLoop);
}

// 启动引擎
requestAnimationFrame(gameLoop);
