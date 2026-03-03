# 需求文档：竞技模式（回合制多人赛跑对战）

## 简介

为跳跳游戏新增"竞技模式"，将核心跳跃玩法扩展为回合制多人线上赛跑对战。竞技模式的基础跳跃玩法完全复用经典模式，包括：按住蓄力、松开跳跃、抛物线轨迹、落地形状碰撞检测（矩形/圆形/五边形）、边缘容错 20%（4 个脚点中至少 3 个在平台内）、蓄力 25% 以上翻滚动画、特殊平台机制（移动平台、缩小平台、限时平台）、落地粒子与完美落地粒子与灰尘特效、跳跃/落地/完美落地/滑落/受伤/塌陷音效、角色渲染（蓄力压扁、翻滚旋转、眼睛高光等）。竞技模式只是在这套完整的跳跃玩法之上套了回合制赛跑的框架。

玩家通过 WebSocket 连接到轻量级 Node.js 后端，在房间中与其他玩家同台竞技。赛道由 20 个平台组成，第 20 个平台为终点。每个回合，当前玩家掷骰子（1-6）决定本回合可跳跃的次数，然后依次进行蓄力跳跃操作。跳跃成功则前进到下一个平台，跳跃失败（掉落）则留在原平台，无论成功或失败均消耗 1 次跳跃机会。骰子点数用完后回合结束，轮到下一位玩家。先到达终点的玩家获胜。赛道中穿插问号(?)平台，玩家落上去会触发大富翁风格随机事件。玩家还可获取和使用道具卡影响对局走向。所有玩家看到相同的平台序列（种子同步）。

## 术语表

- **Arena_Mode（竞技模式）**：跳跳游戏的回合制多人线上赛跑对战模式
- **Game_Server（游戏服务器）**：基于 Node.js + WebSocket 的轻量后端服务，负责房间管理、回合调度、状态同步和事件仲裁
- **Client（客户端）**：运行在浏览器中的前端游戏实例，通过 WebSocket 与 Game_Server 通信
- **Room（房间）**：一局竞技对战的逻辑容器，包含 2-6 名玩家，共享同一赛道
- **Room_Lobby（房间大厅）**：玩家创建或加入房间的界面
- **Host（房主）**：创建房间的玩家，拥有开始游戏的权限
- **Platform_Seed（平台种子）**：用于生成确定性赛道平台序列的随机数种子，由 Game_Server 分配，确保所有玩家看到相同的赛道布局
- **Racetrack（赛道）**：由 20 个平台组成的线性赛道，第 20 个平台为终点
- **Platform_Index（平台索引）**：玩家在赛道上的当前位置，范围 1-20，起点为第 1 个平台，终点为第 20 个平台
- **Dice（骰子）**：每回合开始时掷出的 1-6 随机数，决定当前回合可跳跃的次数
- **Jump_Quota（跳跃配额）**：当前回合剩余的可跳跃次数，由骰子点数决定，每次跳跃（无论成功或失败）消耗 1 次
- **Turn（回合）**：一个玩家从掷骰子到跳跃配额用完的完整行动周期
- **Turn_Order（回合顺序）**：玩家的行动顺序，按加入房间的先后排列，循环轮转
- **Mystery_Platform（问号平台）**：赛道上标有"?"的特殊平台，玩家成功落上去后触发一个随机竞技事件
- **Arena_Event（竞技事件）**：在问号平台上触发的随机效果（大富翁风格），分为天灾类、惩罚类、幸运类和对抗类
- **Item（道具）**：玩家可持有并主动使用的大富翁风格道具卡，每人最多持有 2 个
- **Skip_Turn（暂停回合）**：玩家被冻结无法行动的状态，持续指定回合数，轮到该玩家时自动跳过
- **Ghost（幽灵）**：其他玩家在本地客户端的半透明渲染表示，用于显示对手在赛道上的位置
- **Player（玩家）**：参与竞技的一个客户端用户，拥有 Platform_Index、道具和活跃效果
- **Spectator_View（观战视角）**：非当前回合玩家观看当前行动玩家操作的视角
- **Rank_Screen（排名结算界面）**：对局结束后显示所有玩家最终排名的界面
- **Room_Code（房间码）**：由 Game_Server 生成的 4 位字母数字组合，用于其他玩家加入指定房间
- **Heartbeat（心跳）**：客户端与服务器之间定期发送的保活消息，用于检测断线
- **Dice_Modifier（骰子修正）**：影响骰子结果的临时效果，如骰子+N 或骰子最大值限制
- **Shield（护盾）**：抵消下一次负面事件的保护效果
- **Trap（陷阱）**：放置在指定格子上的隐形机关，其他玩家经过时触发暂停 1 回合效果

## 需求

### 需求 1：竞技模式入口

**用户故事：** 作为玩家，我想在首页看到竞技模式的入口，以便快速进入多人对战。

#### 验收标准

1. THE Home_Screen SHALL 在经典模式按钮下方显示一个"竞技模式"按钮，使用区分性背景色（#533483 紫色），尺寸与经典模式按钮相同
2. WHEN 玩家点击"竞技模式"按钮时, THE Client SHALL 隐藏首页覆盖层并显示 Room_Lobby 界面
3. WHEN 玩家尚未设置角色名称时, THE Client SHALL 在进入 Room_Lobby 前要求玩家输入角色名称（1-8 个字符）

### 需求 2：游戏服务器

**用户故事：** 作为开发者，我想要一个轻量级后端服务来管理多人对战的房间、回合调度和状态同步，以便玩家能够进行回合制对战。

#### 验收标准

1. THE Game_Server SHALL 基于 Node.js 和 ws 库实现 WebSocket 服务，监听可配置的端口（默认 3000）
2. THE Game_Server SHALL 维护所有活跃 Room 的状态，包括房间内玩家列表、游戏阶段（等待中/进行中/已结束）、Platform_Seed、Turn_Order 和当前回合玩家
3. WHEN 一个 WebSocket 连接建立时, THE Game_Server SHALL 为该连接分配唯一的玩家 ID 并发送欢迎消息
4. THE Game_Server SHALL 管理回合调度，维护 Turn_Order 并在当前玩家回合结束后自动切换到下一位玩家
5. WHEN 当前回合玩家的 Jump_Quota 耗尽时, THE Game_Server SHALL 结束该玩家的回合并通知所有 Client 轮转到 Turn_Order 中的下一位玩家
6. WHEN Client 超过 5 秒未发送 Heartbeat 时, THE Game_Server SHALL 判定该玩家断线并通知房间内其他玩家，该玩家的回合自动跳过直至重连
7. IF Game_Server 接收到格式错误的消息, THEN THE Game_Server SHALL 忽略该消息并向发送方返回错误提示

### 需求 3：房间系统

**用户故事：** 作为玩家，我想创建或加入房间来和朋友对战，以便组织多人游戏。

#### 验收标准

1. WHEN 玩家在 Room_Lobby 点击"创建房间"时, THE Client SHALL 向 Game_Server 发送创建请求，Game_Server 生成一个唯一的 4 位 Room_Code 并返回给 Client
2. WHEN 房间创建成功时, THE Client SHALL 显示房间等待界面，包含 Room_Code（大字体可复制）、当前玩家列表和"开始游戏"按钮
3. WHEN 玩家在 Room_Lobby 输入 Room_Code 并点击"加入房间"时, THE Client SHALL 向 Game_Server 发送加入请求
4. IF 玩家尝试加入不存在的房间, THEN THE Client SHALL 显示"房间不存在"的错误提示
5. IF 玩家尝试加入已满（6人）或已开始游戏的房间, THEN THE Client SHALL 显示"房间已满"或"游戏已开始"的错误提示
6. WHEN 新玩家加入房间时, THE Game_Server SHALL 向房间内所有 Client 广播更新后的玩家列表
7. THE Room SHALL 支持 2 至 6 名玩家参与对战
8. WHEN Host 点击"开始游戏"且房间内玩家数量达到 2 人及以上时, THE Game_Server SHALL 生成 Platform_Seed、确定 Turn_Order（按加入顺序）并向所有 Client 发送游戏开始指令
9. WHEN Host 断线时, THE Game_Server SHALL 将房间内下一位玩家提升为新的 Host

### 需求 4：确定性赛道生成

**用户故事：** 作为玩家，我想和对手看到完全相同的赛道布局，以便比赛公平公正。

#### 验收标准

1. WHEN 游戏开始时, THE Game_Server SHALL 生成一个随机 Platform_Seed（32 位整数）并分发给所有 Client
2. THE Client SHALL 使用基于 Platform_Seed 的确定性伪随机数生成器（seeded PRNG）生成 20 个平台组成的赛道，确保相同种子产生相同的平台位置、宽度、间距和特殊属性
3. THE 确定性伪随机数生成器 SHALL 使用 Mulberry32 算法，接受 Platform_Seed 作为输入，输出 0 到 1 之间的浮点数
4. THE Client SHALL 使用 seeded PRNG 替代 Math.random() 来决定赛道中的所有随机参数，包括平台方向、间距、宽度和 Mystery_Platform 的出现位置
5. WHEN 两个 Client 使用相同的 Platform_Seed 时, THE 两个 Client 生成的 20 个平台的位置坐标、形状和特殊属性 SHALL 完全一致
6. THE Racetrack SHALL 由 20 个平台组成，第 1 个平台为起点（所有玩家初始位置），第 20 个平台为终点

### 需求 5：基础跳跃玩法复用

**用户故事：** 作为玩家，我想在竞技模式中体验与经典模式完全一致的跳跃手感，以便无需重新学习操作即可专注于赛跑策略。

#### 验收标准

1. THE Arena_Mode SHALL 完全复用经典模式的蓄力系统：玩家按住屏幕蓄力、松开跳跃，蓄力条实时显示蓄力进度，最大蓄力时间为 2 秒
2. THE Arena_Mode SHALL 完全复用经典模式的跳跃系统：角色沿抛物线轨迹飞行，跳跃方向朝向下一个平台中心，蓄力达到 25% 以上时角色执行翻滚动画
3. THE Arena_Mode SHALL 完全复用经典模式的落地判定逻辑：使用形状碰撞检测（矩形/圆形/五边形），边缘容错 20%（角色 4 个脚点中至少 3 个在平台内即判定为成功落地）
4. THE Arena_Mode SHALL 完全复用经典模式的边缘视觉修正：容错触发时将角色拉向平台中心，掉落时播放半踩边缘摇晃动画
5. THE Arena_Mode SHALL 支持赛道中出现移动平台、缩小平台和限时平台，复用经典模式的 Platform 类及其特殊平台子类型逻辑
6. THE Arena_Mode SHALL 完全复用经典模式的粒子特效系统：落地粒子、完美落地粒子和灰尘特效
7. THE Arena_Mode SHALL 完全复用经典模式的音效系统（SFX）：跳跃音效、落地音效、完美落地音效、滑落音效、受伤音效和塌陷音效
8. THE Arena_Mode SHALL 完全复用经典模式 Player 类的角色渲染逻辑：蓄力时角色压扁变形、翻滚时角色旋转、眼睛高光效果

### 需求 6：回合制核心玩法

**用户故事：** 作为玩家，我想通过掷骰子和跳跃操作在赛道上前进，以便与其他玩家赛跑到终点。

#### 验收标准

1. WHEN 轮到某位玩家的回合时, THE Game_Server SHALL 通知所有 Client 当前回合玩家，Client 在该玩家头顶显示高亮指示
2. WHEN 玩家的回合开始时, THE Client SHALL 显示骰子动画，Game_Server 生成 1-6 的随机整数作为 Dice 结果并广播给所有 Client
3. WHEN Dice 结果确定后, THE Client SHALL 将 Dice 结果设为该玩家的 Jump_Quota，并在 HUD 中显示剩余跳跃次数
4. WHILE 玩家的 Jump_Quota 大于 0 时, THE Client SHALL 允许该玩家进行与经典模式完全一致的蓄力和跳跃操作（按住蓄力、松开跳跃）
5. WHEN 玩家进行跳跃时, THE Client SHALL 将跳跃目标设为赛道上 Platform_Index + 1 对应的平台，使用经典模式的抛物线轨迹计算
6. WHEN 玩家跳跃落地时, THE Client SHALL 使用经典模式的 hitTest 判定逻辑检测角色是否成功落在目标平台上
7. WHEN 玩家跳跃成功（hitTest 判定落在目标平台上）时, THE Game_Server SHALL 将该玩家的 Platform_Index 加 1，并扣减 Jump_Quota 1 次
8. WHEN 玩家跳跃失败（hitTest 判定未落在目标平台上，即掉落）时, THE Game_Server SHALL 将该玩家重置到跳跃前所在的平台，并扣减 Jump_Quota 1 次
9. THE Racetrack 上的平台 SHALL 可以具有移动、缩小、限时等特殊属性（复用经典模式 Platform 类），增加跳跃难度
10. WHEN 玩家的 Jump_Quota 降至 0 时, THE Game_Server SHALL 结束该玩家的回合，轮转到 Turn_Order 中的下一位玩家
11. WHEN 玩家的 Platform_Index 达到 20（终点）时, THE Game_Server SHALL 宣布该玩家获胜并结束对局
12. WHILE 非当前回合玩家等待时, THE Client SHALL 以 Spectator_View 显示当前行动玩家的跳跃操作
13. WHILE 玩家处于 Skip_Turn 状态时, THE Game_Server SHALL 在轮到该玩家时自动跳过其回合，扣减 Skip_Turn 剩余回合数 1，并通知所有 Client
14. WHEN 存在 Dice_Modifier 效果时, THE Game_Server SHALL 在掷骰子后将修正应用于 Dice 结果（加值修正后上限为 12，最大值限制修正将超出部分截断），并在 Client 显示修正后的最终点数

### 需求 7：问号平台与竞技事件

**用户故事：** 作为玩家，我想在跳到问号平台时触发随机竞技事件，以便通过策略和运气影响对局走向。

#### 验收标准

1. THE Client SHALL 在赛道的 20 个平台中按 seeded PRNG 以 20% 的概率将普通平台标记为 Mystery_Platform（起点和终点平台除外）
2. THE Mystery_Platform SHALL 在顶面中央绘制白色"?"标记（字号 18px，半透明脉动动画，透明度在 0.5-1.0 之间循环，周期 1.5 秒）
3. WHEN 玩家成功落在 Mystery_Platform 上时, THE Client SHALL 向 Game_Server 发送事件触发请求
4. WHEN Game_Server 收到事件触发请求时, THE Game_Server SHALL 使用服务端随机数从竞技事件池中抽取一个 Arena_Event，并将结果广播给房间内所有 Client
5. THE Arena_Event 池 SHALL 包含以下天灾类事件：
   - **地震**：房间内所有玩家（包括触发者）的 Platform_Index 减 1（最低为 1，不低于起点）
   - **台风**：房间内所有玩家的下回合 Dice 最大值变为 3（超过 3 的结果截断为 3）
6. THE Arena_Event 池 SHALL 包含以下惩罚类事件：
   - **送进监狱**：触发者进入 Skip_Turn 状态，暂停 2 回合，画面在触发者角色周围显示铁栏杆效果
   - **医院休息**：触发者进入 Skip_Turn 状态，暂停 1 回合，但下回合恢复时获得 Dice_Modifier +2
   - **罚款**：触发者的 Platform_Index 减 2（最低为 1，不低于起点）
7. THE Arena_Event 池 SHALL 包含以下幸运类事件：
   - **花园休息**：触发者获得 Dice_Modifier +3，应用于下回合骰子结果
   - **彩票中奖**：触发者的 Platform_Index 直接加 3（不超过 20，若达到 20 则直接获胜）
   - **天使祝福**：触发者获得一个 Shield（护盾卡道具），若道具栏已满则立即生效为护盾状态
8. THE Arena_Event 池 SHALL 包含以下对抗类事件：
   - **抢劫**：Game_Server 随机选择一名对手，该对手的 Platform_Index 减 2（最低为 1）
   - **陷阱**：触发者在当前所在平台放置一个 Trap，其他玩家经过该平台时进入 Skip_Turn 状态暂停 1 回合（Trap 触发一次后消失）
9. WHEN Arena_Event 被触发时, THE Client SHALL 在触发者头顶显示事件名称和图标（持续 1.5 秒后淡出），并播放对应音效
10. WHEN 惩罚类或天灾类事件影响到对手时, THE 被影响的 Client SHALL 在画面中央显示红色警告文字（如"地震来了！"或"你被送进监狱！"），持续 1 秒后淡出
11. THE Game_Server SHALL 确保同一玩家连续触发 Mystery_Platform 时，不会连续抽到相同的 Arena_Event
12. WHEN Mystery_Platform 被触发时, THE Game_Server SHALL 以 70% 概率触发 Arena_Event，以 30% 概率给予触发者一个随机 Item（道具）

### 需求 8：道具系统（大富翁风格）

**用户故事：** 作为玩家，我想在对局中获取和使用大富翁风格的道具卡，以便通过策略性使用道具影响对局走向。

#### 验收标准

1. THE Item 系统 SHALL 包含以下道具：
   - **必中卡**：使用后本回合所有剩余跳跃自动成功落地到目标平台
   - **退后卡**：指定一名对手，将该对手的 Platform_Index 减 3（最低为 1，需要选择目标）
   - **暂停卡**：指定一名对手，使该对手进入 Skip_Turn 状态暂停 1 回合（需要选择目标）
   - **护盾卡**：使用后获得 Shield 状态，抵消下一次负面事件（天灾、惩罚、对抗类事件或 Trap 效果），触发后消失
   - **加速卡**：使用后本回合 Dice 结果翻倍（仅在掷骰子后、跳跃开始前使用有效）
2. THE Player SHALL 最多同时持有 2 个 Item，当持有数量已满时，新获得的道具自动丢弃
3. WHEN 玩家在自己的回合内、跳跃蓄力开始前点击道具栏中的 Item 时, THE Client SHALL 向 Game_Server 发送道具使用请求
4. WHEN Game_Server 收到道具使用请求时, THE Game_Server SHALL 验证道具合法性（玩家确实持有该道具、当前为该玩家的回合且未在蓄力中），执行道具效果并广播给房间内所有 Client
5. WHEN 退后卡或暂停卡被使用时, THE Client SHALL 弹出目标选择面板，列出所有对手供玩家选择目标
6. WHEN 退后卡命中对手时, THE 被命中的 Client SHALL 播放退回动画（角色向后滑回），并显示"你被退后了！"提示
7. WHEN 暂停卡命中对手时, THE 被命中的 Client SHALL 显示"你被暂停了！"提示，角色周围显示冻结效果
8. WHEN 玩家使用必中卡时, THE Client SHALL 在角色脚下显示金色光环效果，持续到本回合结束
9. WHEN 玩家使用加速卡时, THE Client SHALL 将 HUD 中的骰子点数显示更新为翻倍后的值，并以橙色高亮显示

### 需求 9：多人同步与渲染

**用户故事：** 作为玩家，我想实时看到其他玩家在赛道上的位置和当前回合玩家的跳跃动作，以便感受到真实的竞技氛围。

#### 验收标准

1. THE Client SHALL 在当前回合玩家跳跃时向 Game_Server 发送跳跃消息，包含起跳平台索引、蓄力值和时间戳
2. THE Client SHALL 在当前回合玩家落地时向 Game_Server 发送落地消息，包含落地结果（成功/失败）和目标平台索引
3. WHEN Client 收到当前回合玩家的跳跃消息时, THE 其他 Client SHALL 在本地以 Ghost 形式渲染该玩家的跳跃抛物线动画
4. THE Ghost SHALL 以对应玩家的角色颜色渲染，透明度为 0.5，并在头顶显示玩家名称（字号 10px，白色）
5. THE Client SHALL 在赛道上同时渲染所有玩家的位置标记，每个标记使用对应玩家的角色颜色
6. WHILE 竞技模式运行时, THE Client SHALL 每 2 秒向 Game_Server 发送一次 Heartbeat 消息
7. WHEN 回合切换时, THE Client SHALL 将镜头平滑移动到当前回合玩家所在的平台位置

### 需求 10：回合制赛跑赛制

**用户故事：** 作为玩家，我想通过赛跑到终点来赢得比赛，以便获得竞技成就感。

#### 验收标准

1. THE Game_Server SHALL 在游戏开始时将所有玩家的 Platform_Index 设为 1（起点）
2. WHEN 某位玩家的 Platform_Index 达到 20 时, THE Game_Server SHALL 立即结束对局，宣布该玩家为胜者，并通知所有 Client
3. THE 最终排名规则 SHALL 为：第一名为到达终点的玩家，其余玩家按 Platform_Index 从高到低排列，Platform_Index 相同时按总跳跃成功次数从高到低排列
4. WHEN 玩家在回合中通过彩票中奖事件或正常跳跃使 Platform_Index 达到或超过 20 时, THE Game_Server SHALL 将该玩家的 Platform_Index 设为 20 并判定获胜
5. WHILE 玩家处于 Skip_Turn 状态时, THE Client SHALL 在该玩家的角色上方显示暂停剩余回合数（如"暂停中：剩余 2 回合"），并在赛道位置标记上显示锁定图标
6. WHEN Skip_Turn 状态结束时, THE Client SHALL 在角色上方显示"解除暂停！"提示（持续 1 秒后淡出）

### 需求 11：竞技模式 HUD 界面

**用户故事：** 作为玩家，我想在对局中清晰地看到所有竞技信息，以便做出正确的决策。

#### 验收标准

1. WHILE 竞技模式运行时, THE Client SHALL 在画面顶部显示赛道进度条，标注 20 个格子，每个玩家的位置用对应角色颜色的标记显示在进度条上
2. WHILE 竞技模式运行时, THE Client SHALL 在赛道进度条下方高亮显示当前回合玩家的名称和角色颜色标识
3. WHILE 竞技模式运行时, THE Client SHALL 在画面右上角显示当前回合的骰子点数和剩余跳跃次数（格式："🎲 X | 剩余跳跃：Y"）
4. WHILE 竞技模式运行时, THE Client SHALL 在画面右上角骰子信息下方以图标列表形式显示本地玩家当前所有活跃的 Arena_Event 效果及剩余回合数
5. WHILE 竞技模式运行时, THE Client SHALL 在画面右下角显示道具栏，以 2 个格子展示当前持有的 Item（空格子显示虚线边框），每个格子显示道具图标和名称
6. WHEN 玩家点击道具栏中的 Item 时, THE Client SHALL 激活该道具；对于需要指定目标的道具（退后卡、暂停卡），Client SHALL 弹出目标选择面板列出所有对手供玩家选择
7. THE Client SHALL 仅允许当前回合玩家在蓄力开始前使用道具，非当前回合玩家的道具栏显示为不可点击状态
8. WHILE 竞技模式运行时, THE Client SHALL 在画面左上角显示当前对局已进行的回合总数（格式："第 N 回合"）
9. WHILE 竞技模式运行时, THE Client SHALL 在画面顶部状态栏显示所有玩家的卡片，每张卡片包含：角色颜色标识、玩家名称、当前 Platform_Index（如"第 8 格"）和 Skip_Turn 状态标识

### 需求 12：排名结算界面

**用户故事：** 作为玩家，我想在对局结束后看到详细的排名和统计，以便了解自己和对手的表现。

#### 验收标准

1. WHEN 对局结束时, THE Client SHALL 显示 Rank_Screen，按最终排名从高到低列出所有玩家
2. THE Rank_Screen SHALL 为每位玩家显示：排名序号、角色颜色标识、玩家名称、最终 Platform_Index、总跳跃次数、跳跃成功率和触发的竞技事件次数
3. THE Rank_Screen SHALL 为第一名玩家显示金色皇冠图标和"胜利！"标签
4. THE Rank_Screen SHALL 提供"再来一局"按钮（返回同一房间的等待界面）和"返回首页"按钮
5. WHEN 玩家点击"再来一局"时, THE Client SHALL 向 Game_Server 发送重新准备请求，Game_Server 将该玩家状态重置为等待中
6. THE 最终排名规则 SHALL 为：胜者（到达终点的玩家）排第一，其余玩家按 Platform_Index 从高到低排列，Platform_Index 相同时按总跳跃成功次数从高到低排列

### 需求 13：竞技模式音效

**用户故事：** 作为玩家，我想在竞技模式中听到丰富的音效反馈，以便获得沉浸的对战体验。

#### 验收标准

1. WHEN 玩家掷骰子时, THE Client SHALL 播放骰子滚动音效（频率从 200Hz 快速上升至 600Hz，持续 0.5 秒，正弦波，模拟骰子翻滚）
2. WHEN 玩家落在 Mystery_Platform 上时, THE Client SHALL 播放神秘音效（起始频率 300Hz 上升至 900Hz，持续 0.4 秒，正弦波）
3. WHEN 天灾类或惩罚类 Arena_Event 影响到本地玩家时, THE Client SHALL 播放警告音效（频率 200Hz，方波，持续 0.3 秒，音量 0.2）
4. WHEN 幸运类 Arena_Event 激活时, THE Client SHALL 播放正面音效（频率 523Hz 后跟 784Hz，各持续 0.1 秒，正弦波）
5. WHEN 对局结束时, THE Client SHALL 为胜者播放胜利旋律（C5-E5-G5 三音依次播放，各 0.15 秒，正弦波）
6. WHEN 玩家使用 Item 时, THE Client SHALL 播放道具使用音效（频率 660Hz，正弦波，持续 0.2 秒，音量 0.15）
7. WHEN 回合切换到本地玩家时, THE Client SHALL 播放回合开始提示音（频率 880Hz，正弦波，持续 0.15 秒，音量 0.2）

### 需求 14：网络异常处理

**用户故事：** 作为玩家，我想在网络出现问题时得到合理的处理，以便不会因为短暂断线而完全丧失游戏体验。

#### 验收标准

1. WHEN Client 检测到 WebSocket 连接断开时, THE Client SHALL 在画面中央显示"连接中断，正在重连..."提示，并每 2 秒尝试重新连接，最多尝试 3 次
2. WHEN 重连成功时, THE Client SHALL 从 Game_Server 获取当前房间状态快照（包括所有玩家的 Platform_Index、Turn_Order、当前回合玩家和活跃效果）并恢复游戏画面
3. IF 3 次重连均失败, THEN THE Client SHALL 显示"连接失败"提示和"返回首页"按钮
4. WHEN 对局进行中有玩家断线时, THE Game_Server SHALL 等待 5 秒，若该玩家未重连则将其标记为离线，该玩家的回合自动跳过
5. IF 房间内所有玩家均断线, THEN THE Game_Server SHALL 在 30 秒后销毁该房间并释放资源
6. WHEN 断线玩家重连成功时, THE Game_Server SHALL 恢复该玩家的参与状态，该玩家在下一个属于自己的回合正常行动
