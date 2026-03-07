# 其他游戏模块 — 技术设计文档

## 一、架构设计

### 整体架构

```
index.html (主页面)
  └── showOtherGames() → 游戏选择页面（overlay内渲染）
        ├── games/snake.html          → window.location 跳转
        ├── games/runner.html
        ├── games/space-invaders.html
        ├── games/breakout.html
        ├── games/tetris.html
        ├── games/minesweeper.html
        └── games/tank-battle.html
```

- 每个游戏为独立 HTML 文件，包含完整的 CSS + JS，无外部依赖
- 游戏入口页在 `index.html` 的 `showOtherGames()` 函数中渲染
- 返回主页通过 `window.location.href` 跳转回 `index.html`（或相对路径 `../`）
- 服务端 `server.js` 已有静态文件服务，`/games/xxx.html` 自动可访问

### 通用代码结构（每个游戏文件）

```
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>游戏名 - 跳跳游戏</title>
  <style>/* 内联CSS */</style>
</head>
<body>
  <canvas id="game"></canvas>
  <div id="ui"><!-- 返回按钮、暂停按钮、HUD --></div>
  <script>/* 内联JS - 完整游戏逻辑 */</script>
</body>
</html>
```

### 通用模块设计

每个游戏 JS 内部统一包含以下模块：

| 模块 | 职责 |
|------|------|
| `resize()` | Canvas 自适应屏幕，计算缩放比 |
| `init()` | 初始化游戏状态 |
| `update(dt)` | 游戏逻辑更新（基于 dt 帧间隔） |
| `render()` | Canvas 绘制 |
| `gameLoop(ts)` | requestAnimationFrame 主循环 |
| `input` | 键盘/触屏输入处理 |
| `particles[]` | 粒子系统（爽感通用） |
| `screenShake()` | 屏幕震动 |
| `spawnParticles(x,y,color,count)` | 粒子生成 |
| `showFloatingText(x,y,text)` | 飘字 |
| `flashScreen()` | 全屏闪光 |
| `combo` | 连击计数器 |

## 二、游戏入口页设计

### showOtherGames() 改造

将现有占位页面改为游戏卡片网格：

```
┌─────────────────────────────┐
│  🎲 其他游戏     [← 返回]   │
├──────────┬──────────────────┤
│ 🐝 小蜜蜂 │ 🐍 贪吃蛇      │
│ 太空射击   │ 经典吃豆        │
├──────────┼──────────────────┤
│ 🏓 打砖块  │ 💣 扫雷         │
│ 弹球消除   │ 数字推理        │
├──────────┼──────────────────┤
│ 🎮 坦克大战│ 🔲 俄罗斯方块   │
│ 保卫基地   │ 旋转消行        │
├──────────┴──────────────────┤
│        🏃 跑酷闯关           │
│        无尽奔跑              │
└─────────────────────────────┘
```

- 2列网格布局，最后一个居中
- 卡片样式：圆角、半透明背景、hover 放大
- 点击跳转：`window.location.href = 'games/xxx.html'`

## 三、各游戏技术设计

### 3.1 贪吃蛇 (snake.html)

**数据结构**:
- `snake[]`: 蛇身坐标数组，`[{x,y}, ...]`，索引0为蛇头
- `food`: `{x, y, type}` — type: 'normal'/'gold'/'poison'
- `obstacles[]`: 障碍物坐标数组
- `direction`: 当前方向 'up'/'down'/'left'/'right'
- `nextDirection`: 缓冲方向（防止同帧反向）
- 网格大小: 20×20格（Canvas 400×400 逻辑像素）

**核心算法**:
- 移动：每 tick 蛇头按方向新增一格，尾部删除一格（吃食物时不删尾）
- 碰撞：蛇头坐标与墙壁边界/自身坐标/障碍物比较
- 食物生成：随机空位，避开蛇身和障碍物

**触屏输入**:
- touchstart 记录起点，touchend 计算滑动方向（dx/dy 绝对值比较）
- 最小滑动距离 30px 防误触

### 3.2 跑酷闯关 (runner.html)

**数据结构**:
- `player`: `{x, y, vy, state, width, height}` — state: 'run'/'jump'/'slide'/'fall'
- `obstacles[]`: `{x, y, width, height, type}` — type: 'low'/'high'/'pit'/'bird'
- `ground`: 地面 y 坐标
- `distance`: 已跑距离（米）
- `speed`: 当前速度（像素/帧）
- `scene`: 当前场景主题索引

**核心算法**:
- 重力跳跃：`vy += gravity; y += vy;` 落地时 `vy = 0, state = 'run'`
- 下滑：缩小碰撞箱高度，持续 0.5 秒后自动恢复
- 障碍生成：基于距离和速度的间隔生成，保证可通过性
- 场景切换：根据 distance 阈值切换背景颜色和元素

**碰撞箱**:
- 跑步/跳跃：完整碰撞箱
- 下滑：高度减半，y 坐标下移

### 3.3 小蜜蜂 (space-invaders.html)

**数据结构**:
- `player`: `{x, y, lives, shootTimer}`
- `enemies[][]`: 二维数组，`{x, y, alive, hp, type, row, col}`
- `bullets[]`: `{x, y, dy, owner}` — owner: 'player'/'enemy'
- `enemyDir`: 阵列移动方向 1/-1
- `wave`: 当前波次
- `ufo`: `{x, y, active, dir}` — 随机出现的高分目标

**核心算法**:
- 自动射击：每帧检查 shootTimer，到达射速间隔时自动发射子弹
- 阵列移动：所有存活敌人整体平移，边缘检测后反向+下移
- 敌人射击：随机选择最底行存活敌人发射子弹
- 波次递进：清空后根据 wave 数调整阵列大小、速度、射频

**触屏输入**:
- touchmove 跟踪手指 x 坐标，飞船跟随移动
- 无需射击按钮（自动射击）

### 3.4 弹球打砖块 (breakout.html)

**数据结构**:
- `paddle`: `{x, y, width, height}`
- `ball`: `{x, y, vx, vy, radius, speed}`
- `bricks[]`: `{x, y, width, height, hp, maxHp, type}` — type: 'normal'/'steel'/'powerup'/'explosive'
- `powerups[]`: `{x, y, type, vy}` — 掉落道具
- `level`: 当前关卡

**核心算法**:
- 球反弹：墙壁直接反转 vx/vy；挡板反弹根据击中位置计算角度（-60°~60°）
- 砖块碰撞：AABB 检测，判断碰撞面（上下反转vy，左右反转vx）
- 关卡布局：预设数组定义每关砖块位置和类型
- 道具效果：计时器管理，到期恢复

**触屏输入**:
- touchmove 跟踪手指 x 坐标，挡板跟随

### 3.5 俄罗斯方块 (tetris.html)

**数据结构**:
- `board[20][10]`: 棋盘二维数组，0=空，颜色值=已填充
- `current`: `{type, rotation, x, y, shape}` — 当前方块
- `next`: 下一个方块
- `dropTimer`: 下落计时器
- `level`: 等级
- `lines`: 已消行数

**核心算法**:
- 7种方块定义：每种4个旋转状态的 4×4 矩阵
- 碰撞检测：方块每格检查 board 对应位置是否越界或已占用
- 行消除：从底部扫描，满行移除并上方下移
- 硬降：从当前位置向下逐格检测直到碰撞

**触屏输入**:
- 左右滑动：移动方块
- 上滑：旋转
- 下滑：加速下落
- 快速点击：硬降

### 3.6 扫雷 (minesweeper.html)

**数据结构**:
- `board[rows][cols]`: `{mine, revealed, flagged, count}`
- `difficulty`: 当前难度配置
- `firstClick`: 是否首次点击
- `timer`: 计时器
- `minesLeft`: 剩余雷数显示

**核心算法**:
- 棋盘生成：首次点击后生成雷，保证点击位置3×3范围无雷
- 数字计算：每格统计周围8格的雷数
- 连锁翻开：BFS/递归，count=0 的格子自动翻开相邻格
- 胜利判定：所有非雷格子已翻开

**触屏输入**:
- 点击：翻开格子
- 长按（300ms）：标旗/取消标旗
- 双指缩放：棋盘缩放（高级难度需要）

**注意**: 扫雷不使用 Canvas，改用 DOM 渲染（grid 布局），动画用 CSS transition

### 3.7 坦克大战 (tank-battle.html)

**数据结构**:
- `player`: `{x, y, dir, speed, lives, shootCooldown, shield}`
- `enemies[]`: `{x, y, dir, speed, hp, type, shootTimer, ai}`
- `bullets[]`: `{x, y, dir, speed, owner, power}`
- `map[26][26]`: 地图网格，0=空/1=砖墙/2=钢墙/3=河流/4=草丛/5=基地
- `powerups[]`: `{x, y, type, timer}`
- `stage`: 当前关卡

**核心算法**:
- 网格对齐移动：坦克在 26×26 网格中移动，每格 16px（逻辑）
- AI 行为：随机方向移动 + 定时射击，30% 概率朝基地方向偏移
- 地图碰撞：移动前检查目标格子类型
- 子弹碰撞：与墙壁（砖墙扣血/钢墙反弹）、坦克、基地的碰撞

**触屏输入**:
- 左下角虚拟方向键（十字形）
- 右下角射击按钮

**关卡地图**: 预设8个地图数组，第9关起随机生成

## 四、爽感系统通用实现

### 粒子系统

```javascript
// 每个游戏内置
const particles = [];
function spawnParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8 - 2,
      life: 1,
      decay: 0.02 + Math.random() * 0.03,
      size: 2 + Math.random() * 4,
      color
    });
  }
}
```

### 屏幕震动

```javascript
let shakeX = 0, shakeY = 0, shakeDur = 0;
function screenShake(intensity = 4, duration = 150) {
  shakeDur = duration;
  // 在 render 中: if (shakeDur > 0) ctx.translate(random shakeX, shakeY)
}
```

### 连击系统

```javascript
let combo = 0, comboTimer = 0;
function addCombo() {
  combo++;
  comboTimer = 2000; // 2秒内继续算连击
  if (combo >= 2) showFloatingText(W/2, H/2, `x${combo} COMBO!`);
}
```

### 飘字系统

```javascript
const floatingTexts = [];
function showFloatingText(x, y, text, color = '#ffd700') {
  floatingTexts.push({ x, y, text, color, life: 1, vy: -2 });
}
```

## 五、响应式设计

### Canvas 缩放策略

```javascript
function resize() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight - 50; // 留出顶部UI
  const scale = Math.min(maxW / GAME_W, maxH / GAME_H);
  canvas.style.width = (GAME_W * scale) + 'px';
  canvas.style.height = (GAME_H * scale) + 'px';
  // 触屏坐标转换时除以 scale
}
```

- 逻辑分辨率固定（如 400×600），CSS 缩放适配屏幕
- 触屏事件坐标需要除以缩放比转换为逻辑坐标

## 六、返回导航

每个游戏的返回按钮跳转逻辑：

```javascript
// 检测是否在子路径下（如 /jump/ 部署）
function goBack() {
  const base = window.location.pathname.replace(/\/games\/[^/]*$/, '/');
  window.location.href = base;
}
```

这样无论部署在根路径还是 `/jump/` 子路径下都能正确返回。
