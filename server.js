const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// === 配置 ===
const PORT = process.env.PORT || 3000;
const HEARTBEAT_TIMEOUT = 5000;
const ROOM_DESTROY_DELAY = 30000;
const CHAR_COLORS = ['#e94560','#00b4d8','#fb8500','#06d6a0','#8338ec','#ff6b6b'];
const BOT_SURNAME = ['明','华','红','蓝','绿','紫','风','云','星','月','天','雪','龙','凤','海','山','林','石','光','影','梦','心','玉','金','银','铁','花','竹','松','柏'];
const BOT_GIVEN = ['轩','宇','泽','辰','阳','瑶','琪','萱','涵','睿','博','翔','逸','然','诺','彤','悦','欣','妍','灵','杰','豪','鑫','磊','伟','强','勇','飞','鹏','达'];
function randomBotName(existingNames) {
  for (let i = 0; i < 50; i++) {
    const n = BOT_SURNAME[Math.floor(Math.random()*BOT_SURNAME.length)] + BOT_GIVEN[Math.floor(Math.random()*BOT_GIVEN.length)] + 'R';
    if (!existingNames.has(n)) return n;
  }
  return '机器' + Date.now().toString(36).slice(-2) + 'R';
}
let botIdCounter = 0;

// === 数据持久化 ===
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let usersData = {};
let leaderboardData = { classic: [], arena: [] };

function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch(e) { usersData = {}; }
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) leaderboardData = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
  } catch(e) { leaderboardData = { classic: [], arena: [] }; }
  if (!leaderboardData.classic) leaderboardData.classic = [];
  if (!leaderboardData.arena) leaderboardData.arena = [];
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf8');
}

function saveLeaderboard() {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardData, null, 2), 'utf8');
}

loadData();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'jump_game_salt').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyToken(username, token) {
  if (!username || !token || !usersData[username]) return false;
  return usersData[username].token === token;
}

// === HTTP 服务 + API ===

const httpServer = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // API 路由
  if (req.url === '/api/register' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (!username || !password) { jsonRes(res, 400, { error: '用户名和密码不能为空' }); return; }
        const name = username.trim().slice(0, 8);
        if (name.length < 1) { jsonRes(res, 400, { error: '用户名至少1个字符' }); return; }
        if (password.length < 3) { jsonRes(res, 400, { error: '密码至少3个字符' }); return; }
        if (usersData[name]) { jsonRes(res, 400, { error: '用户名已存在' }); return; }
        const token = generateToken();
        usersData[name] = { password: hashPassword(password), token, createdAt: Date.now() };
        saveUsers();
        jsonRes(res, 200, { ok: true, username: name, token });
      } catch(e) { jsonRes(res, 400, { error: '请求格式错误' }); }
    });
    return;
  }

  if (req.url === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        const name = (username || '').trim();
        if (!name || !password) { jsonRes(res, 400, { error: '用户名和密码不能为空' }); return; }
        const user = usersData[name];
        if (!user) { jsonRes(res, 400, { error: '用户不存在' }); return; }
        if (user.password !== hashPassword(password)) { jsonRes(res, 400, { error: '密码错误' }); return; }
        const token = generateToken();
        user.token = token;
        saveUsers();
        jsonRes(res, 200, { ok: true, username: name, token });
      } catch(e) { jsonRes(res, 400, { error: '请求格式错误' }); }
    });
    return;
  }

  if (req.url === '/api/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, token } = JSON.parse(body);
        if (verifyToken(username, token)) {
          jsonRes(res, 200, { ok: true, username });
        } else {
          jsonRes(res, 401, { error: '登录已过期' });
        }
      } catch(e) { jsonRes(res, 400, { error: '请求格式错误' }); }
    });
    return;
  }

  if (req.url === '/api/score' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, token, mode, score, platformIndex, rank } = JSON.parse(body);
        if (!verifyToken(username, token)) { jsonRes(res, 401, { error: '未登录或登录已过期' }); return; }
        const now = Date.now();
        if (mode === 'classic') {
          const existing = leaderboardData.classic.findIndex(e => e.username === username);
          if (existing >= 0) {
            if (score > leaderboardData.classic[existing].score) {
              leaderboardData.classic[existing] = { username, score, date: now };
            }
          } else {
            leaderboardData.classic.push({ username, score, date: now });
          }
          leaderboardData.classic.sort((a, b) => b.score - a.score);
          leaderboardData.classic = leaderboardData.classic.slice(0, 50);
        } else if (mode === 'arena') {
          leaderboardData.arena.push({ username, platformIndex: platformIndex || 0, rank: rank || 0, date: now });
          leaderboardData.arena.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return b.platformIndex - a.platformIndex;
          });
          leaderboardData.arena = leaderboardData.arena.slice(0, 50);
        }
        saveLeaderboard();
        jsonRes(res, 200, { ok: true });
      } catch(e) { jsonRes(res, 400, { error: '请求格式错误' }); }
    });
    return;
  }

  if (req.url === '/api/leaderboard' && req.method === 'GET') {
    jsonRes(res, 200, {
      classic: leaderboardData.classic.slice(0, 20),
      arena: leaderboardData.arena.slice(0, 20)
    });
    return;
  }

  // 静态文件服务
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(data);
  });
});

function jsonRes(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// === 工具函数 ===
let playerIdCounter = 0;
function generatePlayerId() { return 'p' + (++playerIdCounter) + '_' + Date.now().toString(36); }

function generateRoomCode(existingCodes) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (existingCodes.has(code));
  return code;
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg);
  for (const [id, p] of room.players) {
    if (id !== excludeId && p.connected && !p.isBot && p.ws && p.ws.readyState === 1) {
      p.ws.send(data);
    }
  }
}

function sendTo(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastAll(room, msg) { broadcast(room, msg); }

function getPlayerInfoList(room) {
  const list = [];
  for (const [id, p] of room.players) {
    list.push({ id, name: p.name, color: p.color, connected: p.connected, isBot: !!p.isBot });
  }
  return list;
}

function getRoomState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: getPlayerInfoList(room),
    phase: room.phase,
    seed: room.seed,
    turnOrder: room.turnOrder,
    currentTurnPlayerId: room.turnOrder[room.currentTurnIndex] || null,
    currentTurnQuota: room.currentTurnQuota,
    roundNumber: room.roundNumber
  };
}

// === 房间管理 ===
const rooms = new Map(); // roomCode -> Room
const playerRooms = new Map(); // playerId -> roomCode

function createRoom(hostId, hostName, hostWs) {
  const code = generateRoomCode(new Set(rooms.keys()));
  const room = {
    code,
    hostId,
    players: new Map(),
    phase: 'waiting',
    seed: 0,
    turnOrder: [],
    currentTurnIndex: 0,
    currentTurnQuota: 0,
    roundNumber: 0,
    traps: new Map(),
    lastEvents: new Map(),
    destroyTimer: null
  };
  const player = createServerPlayer(hostId, hostName, hostWs, CHAR_COLORS[0]);
  room.players.set(hostId, player);
  rooms.set(code, room);
  playerRooms.set(hostId, code);
  return room;
}

function createServerPlayer(id, name, ws, color) {
  return {
    id, name, ws, color,
    platformIndex: 1,
    items: [],
    skipTurns: 0,
    diceModifier: null,
    hasShield: false,
    connected: true,
    totalJumps: 0,
    successfulJumps: 0,
    eventsTriggered: 0,
    autoLandRemaining: 0,
    heartbeatTimer: null
  };
}

function joinRoom(roomCode, playerId, playerName, ws) {
  const room = rooms.get(roomCode);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'waiting') return { error: '游戏已开始' };
  if (room.players.size >= 6) return { error: '房间已满' };
  const colorIdx = room.players.size % CHAR_COLORS.length;
  const player = createServerPlayer(playerId, playerName, ws, CHAR_COLORS[colorIdx]);
  room.players.set(playerId, player);
  playerRooms.set(playerId, roomCode);
  return { room };
}

function removePlayer(playerId) {
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  room.players.delete(playerId);
  playerRooms.delete(playerId);
  // Host 转移（只转给真人）
  if (room.hostId === playerId && room.players.size > 0) {
    let nextHost = null;
    for (const [id, p] of room.players) {
      if (!p.isBot) { nextHost = id; break; }
    }
    if (nextHost) {
      room.hostId = nextHost;
      broadcastAll(room, { type: 'host_changed', newHostId: nextHost });
    }
  }
  broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });
  // 空房间销毁（只看真人）
  const hasHumans = [...room.players.values()].some(p => !p.isBot);
  if (!hasHumans) {
    rooms.delete(roomCode);
    for (const [id] of room.players) playerRooms.delete(id);
  }
}

// === AI 机器人 ===

function addBot(room) {
  if (room.players.size >= 6) return { error: '房间已满' };
  if (room.phase !== 'waiting') return { error: '游戏已开始' };
  const botId = 'bot_' + (++botIdCounter) + '_' + Date.now().toString(36);
  const existingNames = new Set([...room.players.values()].map(p => p.name));
  const botName = '🤖 ' + randomBotName(existingNames);
  const colorIdx = room.players.size % CHAR_COLORS.length;
  const bot = createServerPlayer(botId, botName, null, CHAR_COLORS[colorIdx]);
  bot.isBot = true;
  bot.connected = true;
  room.players.set(botId, bot);
  playerRooms.set(botId, room.code);
  return { botId };
}

function removeBot(room, botId) {
  const player = room.players.get(botId);
  if (!player || !player.isBot) return { error: '不是机器人' };
  if (room.phase !== 'waiting') return { error: '游戏已开始' };
  room.players.delete(botId);
  playerRooms.delete(botId);
  return {};
}

// Bot AI: 自动执行回合
function botPlayTurn(room, botId) {
  const bot = room.players.get(botId);
  if (!bot || !bot.isBot) return;
  if (room.phase !== 'playing') return;

  // 1. 先尝试使用道具
  if (bot.items.length > 0) {
    const item = bot.items[0];
    let targetId = null;
    if (item === 'pushback' || item === 'freeze') {
      // 选择领先最多的对手
      const opponents = [...room.players.entries()]
        .filter(([id]) => id !== botId)
        .sort((a, b) => b[1].platformIndex - a[1].platformIndex);
      if (opponents.length > 0) targetId = opponents[0][0];
    }
    if (item !== 'pushback' && item !== 'freeze' || targetId) {
      const result = useItem(room, botId, item, targetId);
      if (!result.error) {
        broadcastAll(room, { type: 'item_used', playerId: botId, itemType: item, targetId, effect: result.effect });
        if (result.effect && result.effect.newQuota !== undefined) {
          // speed_boost 更新了 quota，继续
        }
      }
    }
  }

  // 2. 掷骰子
  rollDice(room, botId);

  // 3. 模拟跳跃（延迟执行，让客户端有时间看动画）
  let jumpsDone = 0;
  const quota = room.currentTurnQuota;

  function doNextJump() {
    if (room.phase !== 'playing') return;
    const currentId = room.turnOrder[room.currentTurnIndex];
    if (currentId !== botId) return;
    if (room.currentTurnQuota <= 0) return;

    // Bot 跳跃成功率：70%（必中卡时100%）
    let success = Math.random() < 0.7;
    if (bot.autoLandRemaining > 0) {
      success = true;
      bot.autoLandRemaining--;
    }

    const targetIndex = bot.platformIndex + 1;
    const chargePower = 0.4 + Math.random() * 0.4; // 模拟蓄力

    // 广播跳跃动画
    broadcastAll(room, { type: 'jump_broadcast', playerId: botId, platformIndex: bot.platformIndex - 1, chargePower });

    // 延迟后报告结果
    setTimeout(() => {
      if (room.phase !== 'playing') return;
      const cid = room.turnOrder[room.currentTurnIndex];
      if (cid !== botId) return;

      reportJumpResult(room, botId, success, success ? targetIndex : bot.platformIndex);

      // 如果成功落在 Mystery_Platform，触发事件
      if (success && room.phase === 'playing') {
        // 需要检查赛道上该平台是否是 mystery（服务端不存储赛道，用概率模拟）
        // 实际上赛道是客户端生成的，服务端不知道哪些是 mystery
        // 所以让客户端来触发 trigger_mystery，但 bot 没有客户端
        // 解决方案：服务端也用 seed 生成赛道信息
        checkBotMystery(room, botId);
      }

      // 继续下一跳
      if (room.currentTurnQuota > 0 && room.turnOrder[room.currentTurnIndex] === botId) {
        setTimeout(doNextJump, 800);
      }
    }, 600);
  }

  // 延迟开始第一跳（给客户端时间显示骰子结果）
  setTimeout(doNextJump, 1000);
}

// Bot mystery 平台检查：用 seed 重新生成赛道判断
function checkBotMystery(room, botId) {
  const bot = room.players.get(botId);
  if (!bot) return;
  const mysteryFlags = generateMysteryFlagsExact(room.seed);
  const platIdx = bot.platformIndex; // 1-based
  if (platIdx >= 2 && platIdx <= 19 && mysteryFlags[platIdx - 1]) {
    const result = triggerMysteryPlatform(room, botId);
    if (result) {
      broadcastAll(room, { type: 'mystery_result', playerId: botId, ...result });
      if (result.effects) {
        broadcastAll(room, { type: 'event_effect', event: result.event, affectedPlayers: result.effects });
      }
      if (result.winner) {
        endGame(room, result.winner);
      }
    }
  }
}

// 服务端版 mulberry32（与客户端一致）
function mulberry32Server(seed) {
  let t = seed | 0;
  return function() {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 生成赛道的 mystery 标记数组（与客户端 generateRacetrack 的 PRNG 调用顺序完全一致）
function generateMysteryFlagsExact(seed) {
  const prng = mulberry32Server(seed);
  const totalPlatforms = 20;
  const flags = [false]; // 平台0（起点）
  let lastMoving = false;

  for (let i = 1; i < totalPlatforms; i++) {
    prng(); // 方向 newDir
    prng(); // 平台宽度 pw
    prng(); // 间距 gap（只有一次 prng）
    prng(); // 形状 st
    prng(); // 颜色
    prng(); // movePhase

    const isLast = (i === totalPlatforms - 1);
    const mysteryRoll = prng(); // isMystery
    flags.push(!isLast && mysteryRoll < 0.2);

    const specialRoll = prng(); // specialRoll
    // 根据 specialRoll 的值，可能有额外的 prng 调用
    if (!lastMoving && !isLast && specialRoll < 0.25) {
      // moving platform
      prng(); // moveSpeed
      prng(); // moveRange
      lastMoving = true;
    } else if (!isLast && specialRoll < 0.40) {
      // shrinking
      prng(); // shrinkRate
      lastMoving = false;
    } else if (!isLast && specialRoll < 0.50) {
      // timed
      prng(); // timerDuration
      lastMoving = false;
    } else {
      lastMoving = false;
    }
  }
  return flags;
}

// === 事件仲裁器 ===
const ARENA_EVENTS = [
  { type: 'earthquake', name: '地震', category: 'disaster' },
  { type: 'typhoon', name: '台风', category: 'disaster' },
  { type: 'jail', name: '送进监狱', category: 'penalty' },
  { type: 'hospital', name: '医院休息', category: 'penalty' },
  { type: 'fine', name: '罚款', category: 'penalty' },
  { type: 'garden', name: '花园休息', category: 'lucky' },
  { type: 'lottery', name: '彩票中奖', category: 'lucky' },
  { type: 'angel', name: '天使祝福', category: 'lucky' },
  { type: 'robbery', name: '抢劫', category: 'versus' },
  { type: 'trap', name: '陷阱', category: 'versus' }
];

const ITEM_TYPES = ['auto_land', 'pushback', 'freeze', 'shield', 'speed_boost'];

function clampIndex(idx) { return Math.max(1, Math.min(20, idx)); }

function applyEvent(room, event, triggerPlayerId) {
  const effects = [];
  const triggerPlayer = room.players.get(triggerPlayerId);

  switch (event.type) {
    case 'earthquake':
      for (const [id, p] of room.players) {
        p.platformIndex = clampIndex(p.platformIndex - 1);
        effects.push({ playerId: id, newIndex: p.platformIndex, effect: 'earthquake' });
      }
      break;
    case 'typhoon':
      for (const [id, p] of room.players) {
        p.diceModifier = { type: 'max_limit', value: 3, remainingTurns: 1 };
        effects.push({ playerId: id, effect: 'typhoon' });
      }
      break;
    case 'jail':
      if (triggerPlayer) {
        triggerPlayer.skipTurns = 2;
        room.currentTurnQuota = 0; // 清空当前剩余步数
        effects.push({ playerId: triggerPlayerId, effect: 'jail', skipTurns: 2, clearQuota: true });
      }
      break;
    case 'hospital':
      if (triggerPlayer) {
        // 医院：不跳过回合，而是额外增加一次投掷机会（+3步数）
        room.currentTurnQuota += 3;
        triggerPlayer.diceModifier = { type: 'add', value: 2, remainingTurns: 1 };
        effects.push({ playerId: triggerPlayerId, effect: 'hospital', bonusQuota: 3 });
      }
      break;
    case 'fine':
      if (triggerPlayer) {
        triggerPlayer.platformIndex = clampIndex(triggerPlayer.platformIndex - 2);
        effects.push({ playerId: triggerPlayerId, newIndex: triggerPlayer.platformIndex, effect: 'fine' });
      }
      break;
    case 'garden':
      if (triggerPlayer) {
        triggerPlayer.diceModifier = { type: 'add', value: 3, remainingTurns: 1 };
        effects.push({ playerId: triggerPlayerId, effect: 'garden' });
      }
      break;
    case 'lottery':
      if (triggerPlayer) {
        triggerPlayer.platformIndex = clampIndex(triggerPlayer.platformIndex + 3);
        effects.push({ playerId: triggerPlayerId, newIndex: triggerPlayer.platformIndex, effect: 'lottery' });
        if (triggerPlayer.platformIndex >= 20) {
          return { effects, winner: triggerPlayerId };
        }
      }
      break;
    case 'angel':
      if (triggerPlayer) {
        if (triggerPlayer.items.length < 2) {
          triggerPlayer.items.push('shield');
          effects.push({ playerId: triggerPlayerId, effect: 'angel', item: 'shield' });
        } else {
          triggerPlayer.hasShield = true;
          effects.push({ playerId: triggerPlayerId, effect: 'angel', shieldActive: true });
        }
      }
      break;
    case 'robbery': {
      const opponents = [...room.players.keys()].filter(id => id !== triggerPlayerId);
      if (opponents.length > 0) {
        const targetId = opponents[Math.floor(Math.random() * opponents.length)];
        const target = room.players.get(targetId);
        target.platformIndex = clampIndex(target.platformIndex - 2);
        effects.push({ playerId: targetId, newIndex: target.platformIndex, effect: 'robbery' });
      }
      break;
    }
    case 'trap':
      if (triggerPlayer) {
        room.traps.set(triggerPlayer.platformIndex, triggerPlayerId);
        effects.push({ playerId: triggerPlayerId, platformIndex: triggerPlayer.platformIndex, effect: 'trap' });
      }
      break;
  }
  return { effects };
}

function triggerMysteryPlatform(room, playerId) {
  const player = room.players.get(playerId);
  if (!player) return null;
  player.eventsTriggered++;

  // 70% 事件, 30% 道具
  if (Math.random() < 0.7) {
    // 抽事件（防连续相同）
    const lastEvent = room.lastEvents.get(playerId);
    let available = ARENA_EVENTS.filter(e => e.type !== lastEvent);
    if (available.length === 0) available = ARENA_EVENTS;
    const event = available[Math.floor(Math.random() * available.length)];
    room.lastEvents.set(playerId, event.type);

    // 检查护盾
    if (player.hasShield && (event.category === 'disaster' || event.category === 'penalty' || event.category === 'versus')) {
      player.hasShield = false;
      return { resultType: 'shielded', event };
    }

    const result = applyEvent(room, event, playerId);
    return { resultType: 'event', event, effects: result.effects, winner: result.winner };
  } else {
    const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    if (player.items.length < 2) {
      player.items.push(itemType);
      return { resultType: 'item', item: itemType };
    }
    return { resultType: 'item_full', item: itemType };
  }
}

function useItem(room, playerId, itemType, targetId) {
  const player = room.players.get(playerId);
  if (!player) return { error: '玩家不存在' };
  const currentTurnId = room.turnOrder[room.currentTurnIndex];
  if (currentTurnId !== playerId) return { error: '不是你的回合' };
  const itemIdx = player.items.indexOf(itemType);
  if (itemIdx === -1) return { error: '未持有该道具' };
  player.items.splice(itemIdx, 1);

  const effect = {};
  switch (itemType) {
    case 'auto_land':
      player.autoLandRemaining = room.currentTurnQuota;
      effect.type = 'auto_land';
      break;
    case 'pushback':
      if (targetId) {
        const target = room.players.get(targetId);
        if (target) {
          target.platformIndex = clampIndex(target.platformIndex - 3);
          effect.type = 'pushback';
          effect.targetId = targetId;
          effect.newIndex = target.platformIndex;
        }
      }
      break;
    case 'freeze':
      if (targetId) {
        const target = room.players.get(targetId);
        if (target) {
          target.skipTurns = Math.max(target.skipTurns, 1);
          effect.type = 'freeze';
          effect.targetId = targetId;
        }
      }
      break;
    case 'shield':
      player.hasShield = true;
      effect.type = 'shield';
      break;
    case 'speed_boost':
      room.currentTurnQuota = Math.min(room.currentTurnQuota * 2, 12);
      effect.type = 'speed_boost';
      effect.newQuota = room.currentTurnQuota;
      break;
  }
  return { effect };
}

// === 回合调度 ===

function startGame(room) {
  if (room.players.size < 2) return { error: '至少需要 2 名玩家' };
  room.phase = 'playing';
  room.seed = Math.floor(Math.random() * 0xFFFFFFFF);
  room.turnOrder = [...room.players.keys()];
  room.currentTurnIndex = 0;
  room.roundNumber = 1;
  room.traps.clear();
  room.lastEvents.clear();
  for (const [id, p] of room.players) {
    p.platformIndex = 1;
    p.items = [];
    p.skipTurns = 0;
    p.diceModifier = null;
    p.hasShield = false;
    p.totalJumps = 0;
    p.successfulJumps = 0;
    p.eventsTriggered = 0;
    p.autoLandRemaining = 0;
  }
  broadcastAll(room, { type: 'game_start', seed: room.seed, turnOrder: room.turnOrder });
  startTurn(room);
}

function startTurn(room) {
  const playerId = room.turnOrder[room.currentTurnIndex];
  const player = room.players.get(playerId);
  if (!player) { advanceTurn(room); return; }

  // Skip_Turn 处理
  if (player.skipTurns > 0) {
    player.skipTurns--;
    broadcastAll(room, { type: 'skip_turn', playerId, remainingSkips: player.skipTurns });
    advanceTurn(room);
    return;
  }

  // 断线的真人玩家跳过（机器人永远在线）
  if (!player.isBot && !player.connected) {
    advanceTurn(room);
    return;
  }

  broadcastAll(room, { type: 'turn_start', playerId, roundNumber: room.roundNumber });

  // 机器人自动执行回合
  if (player.isBot) {
    setTimeout(() => botPlayTurn(room, playerId), 500);
  }
}

function rollDice(room, playerId) {
  const currentId = room.turnOrder[room.currentTurnIndex];
  if (currentId !== playerId) return;
  let value = Math.floor(Math.random() * 6) + 1;
  const player = room.players.get(playerId);
  let modifier = null;

  if (player && player.diceModifier) {
    modifier = { ...player.diceModifier };
    if (player.diceModifier.type === 'add') {
      value = Math.min(value + player.diceModifier.value, 12);
    } else if (player.diceModifier.type === 'max_limit') {
      value = Math.min(value, player.diceModifier.value);
    }
    player.diceModifier.remainingTurns--;
    if (player.diceModifier.remainingTurns <= 0) player.diceModifier = null;
  }

  room.currentTurnQuota = value;
  broadcastAll(room, { type: 'dice_result', playerId, value, modifier });
}

function reportJumpResult(room, playerId, success, targetIndex) {
  const currentId = room.turnOrder[room.currentTurnIndex];
  if (currentId !== playerId) return;
  const player = room.players.get(playerId);
  if (!player) return;

  player.totalJumps++;
  if (success) {
    player.successfulJumps++;
    player.platformIndex = clampIndex(targetIndex);
  }
  room.currentTurnQuota--;

  // 检查陷阱
  if (success && room.traps.has(player.platformIndex)) {
    const trapper = room.traps.get(player.platformIndex);
    if (trapper !== playerId) {
      if (player.hasShield) {
        player.hasShield = false;
      } else {
        player.skipTurns = Math.max(player.skipTurns, 1);
      }
      room.traps.delete(player.platformIndex);
      broadcastAll(room, { type: 'event_effect', event: { type: 'trap_triggered', name: '陷阱触发', category: 'versus' }, affectedPlayers: [{ playerId, effect: 'trap_triggered' }] });
    }
  }

  broadcastAll(room, {
    type: 'land_result', playerId, success,
    newIndex: player.platformIndex,
    quotaLeft: room.currentTurnQuota
  });

  // 胜利判定
  if (player.platformIndex >= 20) {
    endGame(room, playerId);
    return;
  }

  // 回合结束判定
  if (room.currentTurnQuota <= 0) {
    player.autoLandRemaining = 0;
    advanceTurn(room);
  }
}

function advanceTurn(room) {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
  // 检查是否回到第一个玩家（新一轮）
  if (room.currentTurnIndex === 0) room.roundNumber++;
  broadcastAll(room, { type: 'turn_end', nextPlayerId: room.turnOrder[room.currentTurnIndex] });
  startTurn(room);
}

function endGame(room, winnerId) {
  room.phase = 'ended';
  const rankings = computeRankings(room, winnerId);
  broadcastAll(room, { type: 'game_end', winnerId, rankings });
}

function computeRankings(room, winnerId) {
  const players = [...room.players.values()];
  players.sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    if (b.platformIndex !== a.platformIndex) return b.platformIndex - a.platformIndex;
    return b.successfulJumps - a.successfulJumps;
  });
  return players.map((p, i) => ({
    rank: i + 1,
    playerId: p.id,
    playerName: p.name,
    platformIndex: p.platformIndex,
    totalJumps: p.totalJumps,
    successRate: p.totalJumps > 0 ? Math.round(p.successfulJumps / p.totalJumps * 100) : 0,
    eventsTriggered: p.eventsTriggered,
    isWinner: p.id === winnerId
  }));
}

// === 心跳与断线处理 ===

function setupHeartbeat(ws, playerId) {
  clearHeartbeat(playerId);
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.get(playerId);
  if (!player) return;
  player.heartbeatTimer = setTimeout(() => {
    handleDisconnect(playerId);
  }, HEARTBEAT_TIMEOUT);
}

function clearHeartbeat(playerId) {
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.get(playerId);
  if (player && player.heartbeatTimer) {
    clearTimeout(player.heartbeatTimer);
    player.heartbeatTimer = null;
  }
}

function handleDisconnect(playerId) {
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.get(playerId);
  if (!player || !player.connected) return;

  // 等待阶段：直接移除玩家，腾出座位
  if (room.phase === 'waiting') {
    room.players.delete(playerId);
    playerRooms.delete(playerId);
    clearHeartbeat(playerId);

    // Host 转移
    if (room.hostId === playerId) {
      let newHost = null;
      for (const [id, p] of room.players) {
        if (!p.isBot) { newHost = id; break; }
      }
      if (newHost) {
        room.hostId = newHost;
        broadcastAll(room, { type: 'host_changed', newHostId: newHost });
      }
    }

    broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });

    // 如果房间没有真人了，销毁
    const hasHuman = [...room.players.values()].some(p => !p.isBot);
    if (!hasHuman) {
      for (const [id] of room.players) playerRooms.delete(id);
      rooms.delete(roomCode);
    }
    return;
  }

  // 游戏进行中：标记离线
  player.connected = false;
  broadcastAll(room, { type: 'player_disconnected', playerId });
  broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });

  // Host 转移（只转给真人）
  if (room.hostId === playerId) {
    for (const [id, p] of room.players) {
      if (p.connected && !p.isBot) {
        room.hostId = id;
        broadcastAll(room, { type: 'host_changed', newHostId: id });
        break;
      }
    }
  }

  // 如果是当前回合玩家，跳过
  const currentId = room.turnOrder[room.currentTurnIndex];
  if (currentId === playerId) {
    advanceTurn(room);
  }

  // 检查是否所有真人玩家断线
  const allHumansDisconnected = [...room.players.values()].every(p => p.isBot || !p.connected);
  if (allHumansDisconnected) {
    room.destroyTimer = setTimeout(() => {
      rooms.delete(roomCode);
      for (const [id] of room.players) playerRooms.delete(id);
    }, ROOM_DESTROY_DELAY);
  }
}

function handleReconnect(ws, playerId, roomCode) {
  const room = rooms.get(roomCode);
  if (!room) { sendTo(ws, { type: 'room_error', message: '房间不存在' }); return; }
  const player = room.players.get(playerId);
  if (!player) { sendTo(ws, { type: 'room_error', message: '玩家不在房间中' }); return; }

  player.connected = true;
  player.ws = ws;
  ws._playerId = playerId;

  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
    room.destroyTimer = null;
  }

  broadcastAll(room, { type: 'player_reconnected', playerId });
  broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });
  sendTo(ws, { type: 'room_snapshot', room: getRoomState(room) });
  setupHeartbeat(ws, playerId);
}

// === WebSocket 服务 ===

const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(PORT, () => {
  console.log(`游戏服务器启动在端口 ${PORT}`);
  console.log(`打开 http://localhost:${PORT} 开始游戏`);
});

wss.on('connection', (ws) => {
  const playerId = generatePlayerId();
  ws._playerId = playerId;
  sendTo(ws, { type: 'welcome', playerId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      sendTo(ws, { type: 'error', message: '消息格式错误' });
      return;
    }
    if (!msg || !msg.type) {
      sendTo(ws, { type: 'error', message: '缺少消息类型' });
      return;
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    clearHeartbeat(ws._playerId);
    handleDisconnect(ws._playerId);
  });
});

function handleMessage(ws, msg) {
  const playerId = ws._playerId;

  switch (msg.type) {
    case 'create_room': {
      const name = (msg.playerName || '').trim().slice(0, 8) || '玩家';
      const room = createRoom(playerId, name, ws);
      sendTo(ws, { type: 'room_created', roomCode: room.code, room: getRoomState(room) });
      break;
    }
    case 'join_room': {
      const name = (msg.playerName || '').trim().slice(0, 8) || '玩家';
      const code = (msg.roomCode || '').toUpperCase();
      const result = joinRoom(code, playerId, name, ws);
      if (result.error) {
        sendTo(ws, { type: 'room_error', message: result.error });
      } else {
        sendTo(ws, { type: 'room_joined', room: getRoomState(result.room) });
        broadcast(result.room, { type: 'player_list_update', players: getPlayerInfoList(result.room) }, playerId);
      }
      break;
    }
    case 'start_game': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (!room) { sendTo(ws, { type: 'error', message: '未在房间中' }); break; }
      if (room.hostId !== playerId) { sendTo(ws, { type: 'error', message: '只有房主可以开始游戏' }); break; }
      const err = startGame(room);
      if (err && err.error) sendTo(ws, { type: 'error', message: err.error });
      break;
    }
    case 'roll_dice': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (room && room.phase === 'playing') rollDice(room, playerId);
      break;
    }
    case 'jump': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (room && room.phase === 'playing') {
        broadcastAll(room, { type: 'jump_broadcast', playerId, platformIndex: msg.platformIndex, chargePower: msg.chargePower });
      }
      break;
    }
    case 'land': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (room && room.phase === 'playing') {
        // 必中卡检查
        const player = room.players.get(playerId);
        let success = msg.success;
        if (player && player.autoLandRemaining > 0) {
          success = true;
          player.autoLandRemaining--;
        }
        reportJumpResult(room, playerId, success, msg.targetIndex);
      }
      break;
    }
    case 'trigger_mystery': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (room && room.phase === 'playing') {
        const result = triggerMysteryPlatform(room, playerId);
        if (result) {
          broadcastAll(room, { type: 'mystery_result', playerId, ...result });
          if (result.effects) {
            broadcastAll(room, { type: 'event_effect', event: result.event, affectedPlayers: result.effects });
          }
          if (result.winner) {
            endGame(room, result.winner);
          } else if (room.currentTurnQuota <= 0) {
            // 事件清空了步数（如监狱），结束回合
            const p = room.players.get(playerId);
            if (p) p.autoLandRemaining = 0;
            advanceTurn(room);
          }
        }
      }
      break;
    }
    case 'use_item': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (room && room.phase === 'playing') {
        const result = useItem(room, playerId, msg.itemType, msg.targetId);
        if (result.error) {
          sendTo(ws, { type: 'error', message: result.error });
        } else {
          broadcastAll(room, { type: 'item_used', playerId, itemType: msg.itemType, targetId: msg.targetId, effect: result.effect });
        }
      }
      break;
    }
    case 'heartbeat': {
      setupHeartbeat(ws, playerId);
      break;
    }
    case 'reconnect': {
      handleReconnect(ws, msg.playerId, msg.roomCode);
      break;
    }
    case 'add_bot': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (!room) { sendTo(ws, { type: 'error', message: '未在房间中' }); break; }
      if (room.hostId !== playerId) { sendTo(ws, { type: 'error', message: '只有房主可以添加机器人' }); break; }
      const result = addBot(room);
      if (result.error) {
        sendTo(ws, { type: 'error', message: result.error });
      } else {
        broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });
      }
      break;
    }
    case 'remove_bot': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (!room) { sendTo(ws, { type: 'error', message: '未在房间中' }); break; }
      if (room.hostId !== playerId) { sendTo(ws, { type: 'error', message: '只有房主可以移除机器人' }); break; }
      const result = removeBot(room, msg.botId);
      if (result.error) {
        sendTo(ws, { type: 'error', message: result.error });
      } else {
        broadcastAll(room, { type: 'player_list_update', players: getPlayerInfoList(room) });
      }
      break;
    }
    case 'restart_room': {
      const roomCode = playerRooms.get(playerId);
      const room = roomCode ? rooms.get(roomCode) : null;
      if (!room) { sendTo(ws, { type: 'error', message: '未在房间中' }); break; }
      if (room.phase === 'playing') { sendTo(ws, { type: 'error', message: '游戏进行中' }); break; }
      room.phase = 'waiting';
      room.turnOrder = [];
      room.currentTurnIndex = 0;
      room.currentTurnQuota = 0;
      room.roundNumber = 0;
      room.traps.clear();
      room.lastEvents.clear();
      for (const [id, p] of room.players) {
        p.platformIndex = 1;
        p.items = [];
        p.skipTurns = 0;
        p.diceModifier = null;
        p.hasShield = false;
        p.totalJumps = 0;
        p.successfulJumps = 0;
        p.eventsTriggered = 0;
        p.autoLandRemaining = 0;
      }
      broadcastAll(room, { type: 'room_reset', room: getRoomState(room) });
      break;
    }
    default:
      sendTo(ws, { type: 'error', message: '未知消息类型: ' + msg.type });
  }
}
