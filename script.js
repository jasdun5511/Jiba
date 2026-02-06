/**
 * Pokémon Emerald Web Engine (MVP) - Stage 2
 * 包含：大地图、摄像机系统、视锥剔除渲染
 */

// --- 1. 常量定义 ---
const TILE_SIZE = 32; // 模拟 16x16 放大2倍
const SCREEN_WIDTH = 480;
const SCREEN_HEIGHT = 320;

// 地图尺寸（扩大到 40x30 格）
const MAP_COLS = 40; 
const MAP_ROWS = 30;

// 瓦片ID
const TILE_GRASS = 0;
const TILE_WATER = 1;
const TILE_WALL  = 2;

// --- 2. 动态地图生成 ---
const mapData = [];

// 初始化随机大地图
for (let r = 0; r < MAP_ROWS; r++) {
    let row = [];
    for (let c = 0; c < MAP_COLS; c++) {
        // 边界强制为墙
        if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
            row.push(TILE_WALL);
        } else {
            // 随机生成: 70%草地, 10%水, 20%墙
            const rand = Math.random();
            if (rand < 0.7) row.push(TILE_GRASS);
            else if (rand < 0.8) row.push(TILE_WATER);
            else row.push(TILE_WALL);
        }
    }
    mapData.push(row);
}

// 强制设置出生点 (2,2) 为草地，防止卡死
mapData[2][2] = TILE_GRASS; 

// --- 3. 核心对象 ---

// 输入处理
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    z: false
};

window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// 玩家对象
const player = {
    x: 2, // 网格坐标
    y: 2,
    direction: 'down',
    isMoving: false,
    moveProgress: 0,
    speed: 4, // 略微提高速度方便跑图
    
    // 像素坐标
    pixelX: 2 * TILE_SIZE,
    pixelY: 2 * TILE_SIZE,
    targetX: 2 * TILE_SIZE,
    targetY: 2 * TILE_SIZE
};

// [新增] 摄像机对象
const camera = {
    x: 0,
    y: 0,
    
    follow: function(target) {
        // 让主角居中：摄像机位置 = 主角中心 - 屏幕中心
        this.x = (target.pixelX + TILE_SIZE / 2) - (SCREEN_WIDTH / 2);
        this.y = (target.pixelY + TILE_SIZE / 2) - (SCREEN_HEIGHT / 2);

        // 边界钳制：防止拍摄到地图外的黑边
        // clamp(x, min, max)
        this.x = Math.max(0, Math.min(this.x, MAP_COLS * TILE_SIZE - SCREEN_WIDTH));
        this.y = Math.max(0, Math.min(this.y, MAP_ROWS * TILE_SIZE - SCREEN_HEIGHT));
    }
};

// --- 4. 游戏逻辑 ---

function isWalkable(x, y) {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
    return mapData[y][x] === TILE_GRASS;
}

// [新增] 简易遭遇系统
function checkEncounter() {
    // 仅当玩家静止在草丛中时触发
    if (!player.isMoving && mapData[player.y][player.x] === TILE_GRASS) {
        // 极低概率触发 (因为每帧都会检测)
        if (Math.random() < 0.005) { 
            console.log("🔥 野生宝可梦出现了！");
            // 这里可以加入闪烁特效或暂停游戏逻辑
        }
    }
}

function updateGameLogic() {
    // 1. 移动逻辑
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
        // 平滑移动插值
        if (player.pixelX < player.targetX) player.pixelX += player.speed;
        if (player.pixelX > player.targetX) player.pixelX -= player.speed;
        if (player.pixelY < player.targetY) player.pixelY += player.speed;
        if (player.pixelY > player.targetY) player.pixelY -= player.speed;

        // 判定移动结束
        if (Math.abs(player.pixelX - player.targetX) < player.speed &&
            Math.abs(player.pixelY - player.targetY) < player.speed) {
            player.pixelX = player.targetX;
            player.pixelY = player.targetY;
            player.isMoving = false;
        }
    }

    // 2. 摄像机跟拍
    camera.follow(player);

    // 3. 检查遭遇
    checkEncounter();
}

// --- 5. 渲染系统 (包含视锥剔除) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算当前视野内的网格范围 (Frustum Culling)
    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol   = startCol + (SCREEN_WIDTH / TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / TILE_SIZE);
    const endRow   = startRow + (SCREEN_HEIGHT / TILE_SIZE) + 1;

    // 1. 绘制地图
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            // 安全边界检查
            if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) {
                const tileId = mapData[r][c];
                
                // 计算屏幕绘制坐标 (世界坐标 - 摄像机坐标)
                const drawX = (c * TILE_SIZE) - camera.x;
                const drawY = (r * TILE_SIZE) - camera.y;

                if (tileId === TILE_GRASS) {
                    ctx.fillStyle = '#4cd158'; // 草地
                    ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    // 细节：深色草丛点缀
                    ctx.fillStyle = '#3eb049';
                    ctx.fillRect(drawX + 4, drawY + 4, 24, 24);
                } 
                else if (tileId === TILE_WATER) {
                    ctx.fillStyle = '#4fa4b8'; // 水
                    ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    // 细节：高光
                    ctx.fillStyle = '#a6e1ea';
                    ctx.fillRect(drawX + 8, drawY + 8, 16, 4);
                } 
                else { 
                    ctx.fillStyle = '#6e4529'; // 墙/山
                    ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                    // 细节：纹理
                    ctx.fillStyle = '#5c3a22';
                    ctx.fillRect(drawX + 2, drawY + 16, 28, 2);
                }
            }
        }
    }

    // 2. 绘制玩家
    // 玩家屏幕坐标 = 玩家世界坐标 - 摄像机坐标
    const screenX = player.pixelX - camera.x;
    const screenY = player.pixelY - camera.y;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX + TILE_SIZE/2, screenY + TILE_SIZE - 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = '#e3350d'; 
    ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    // 眼睛/朝向
    ctx.fillStyle = '#fff';
    if(player.direction === 'down') ctx.fillRect(screenX + 8, screenY + 12, 16, 4);
    if(player.direction === 'up') ctx.fillRect(screenX + 12, screenY + 4, 8, 4);
    if(player.direction === 'left') ctx.fillRect(screenX + 4, screenY + 10, 4, 8);
    if(player.direction === 'right') ctx.fillRect(screenX + 24, screenY + 10, 4, 8);
    
    // DEBUG信息
    ctx.fillStyle = 'white';
    ctx.font = '12px Courier New';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(`Pos: ${player.x}, ${player.y}`, 10, 20);
}

// --- 6. 游戏主循环 ---
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

// 启动
requestAnimationFrame(gameLoop);
