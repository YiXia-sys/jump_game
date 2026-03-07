# 实施计划：角色皮肤系统

## 概述

将角色皮肤系统分步实现，从数据定义到服务端 API，再到客户端 UI 和渲染改造，最后完成竞技模式集成。所有变更集中在 `index.html` 和 `server.js` 两个文件中。测试使用 fast-check 进行属性测试，测试文件放在 `tests/` 目录下。

## 任务

- [x] 1. 皮肤注册表与基础工具函数
  - [x] 1.1 在 `index.html` 中定义 `SKIN_REGISTRY` 常量数组，包含至少 6 种皮肤（default、flame、ocean、forest、galaxy、candy），每种皮肤包含 skinId、name、price、bodyColor、innerColor、eyeColor、eyeSize、highlightColor、outlineColor、effect 字段
    - `default` 皮肤 price 为 0，bodyColor 为 null（沿用角色原色）
    - 其余皮肤设置不同的颜色和特效组合
    - _需求：1.1, 1.2, 1.3_
  - [x] 1.2 实现 `getSkinById(skinId)` 函数，从 SKIN_REGISTRY 中查找皮肤，找不到时返回 default 皮肤
    - _需求：7.4_
  - [x] 1.3 实现 `getEquippedSkin()` 函数，返回当前装备的皮肤对象（从全局变量 `playerEquippedSkin` 读取）
    - _需求：7.1_
  - [x] 1.4 实现 `pointsToCoins(points)` 函数，将跳跃评分映射为金币数量（50→5, 20→2, 10→1，其他→0）
    - _需求：2.1_
  - [x] 1.5 定义客户端全局状态变量：`playerCoins`、`playerUnlockedSkins`、`playerEquippedSkin`、`sessionCoins`
    - _需求：2.1, 3.3_
  - [ ]* 1.6 编写属性测试：皮肤注册表完整性（属性 1）
    - **属性 1：皮肤注册表完整性**
    - 验证所有皮肤包含必要字段、skinId 唯一、注册表长度 ≥ 6
    - 在 `tests/skin-registry.test.js` 中实现
    - **验证需求：1.1**
  - [ ]* 1.7 编写属性测试：评分到金币映射正确性（属性 2）
    - **属性 2：评分到金币的映射正确性**
    - 验证有效评分值返回正确金币数，无效值返回 0
    - 在 `tests/skin-registry.test.js` 中实现
    - **验证需求：2.1**
  - [ ]* 1.8 编写属性测试：默认皮肤回退（属性 8）
    - **属性 8：默认皮肤回退**
    - 验证无效 skinId（null/undefined/空字符串/不存在 ID）返回 default 皮肤
    - 在 `tests/skin-registry.test.js` 中实现
    - **验证需求：7.4**

- [x] 2. 服务端金币与皮肤 API
  - [x] 2.1 扩展 `server.js` 中的用户数据结构，新增 `coins`、`unlockedSkins`、`equippedSkin` 字段的自动初始化逻辑
    - 已有用户首次访问时自动补充默认值：coins=0, unlockedSkins=['default'], equippedSkin='default'
    - 实现 `ensureSkinData(username)` 辅助函数
    - _需求：8.1, 8.2, 8.3_
  - [x] 2.2 实现 `GET /api/coins` 接口，验证 token 后返回用户金币余额
    - _需求：3.1, 3.4_
  - [x] 2.3 实现 `POST /api/coins/add` 接口，验证 token 后累加金币并持久化
    - _需求：3.2, 3.4_
  - [x] 2.4 实现 `GET /api/skins` 接口，返回用户已解锁皮肤列表和当前装备皮肤
    - _需求：8.1_
  - [x] 2.5 实现 `POST /api/skins/buy` 接口，验证余额、检查是否已解锁、扣除金币、添加皮肤到已解锁列表并持久化
    - 金币不足返回 400 "金币不足"
    - 皮肤已解锁返回 400 "皮肤已解锁"
    - 皮肤不存在返回 400 "皮肤不存在"
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 2.6 实现 `POST /api/skins/equip` 接口，验证皮肤是否已解锁，设置装备状态并持久化
    - 皮肤未解锁返回 400 "皮肤未解锁"
    - _需求：5.1, 5.3, 5.4_
  - [ ]* 2.7 编写属性测试：金币余额累加往返（属性 3）
    - **属性 3：金币余额累加往返**
    - 验证多次 add 后 get 返回的余额等于累加总和
    - 在 `tests/coin-api.test.js` 中实现
    - **验证需求：2.2, 3.1, 3.2**
  - [ ]* 2.8 编写属性测试：认证令牌验证（属性 4）
    - **属性 4：认证令牌验证**
    - 验证所有需认证端点在无效 token 时返回 401
    - 在 `tests/coin-api.test.js` 中实现
    - **验证需求：3.4**
  - [ ]* 2.9 编写属性测试：皮肤购买正确性（属性 5）
    - **属性 5：皮肤购买正确性**
    - 验证余额充足时扣款正确、余额不足时不变
    - 在 `tests/skin-api.test.js` 中实现
    - **验证需求：4.1, 4.2, 4.3, 4.5**
  - [ ]* 2.10 编写属性测试：皮肤装备正确性（属性 6）
    - **属性 6：皮肤装备正确性**
    - 验证已解锁皮肤可装备、未解锁皮肤装备失败
    - 在 `tests/skin-api.test.js` 中实现
    - **验证需求：5.1, 5.4**

- [x] 3. 检查点 - 服务端 API 验证
  - 确保所有服务端 API 测试通过，ask the user if questions arise.

- [x] 4. 经典模式金币获取与结算
  - [x] 4.1 在 `index.html` 的经典模式跳跃落地逻辑中，调用 `pointsToCoins()` 累加 `sessionCoins`
    - 在 `calculateScore` 返回分数后，将对应金币加到 sessionCoins
    - _需求：2.1_
  - [x] 4.2 修改 `showOverlay(true)` 游戏结束界面，显示本局获得的金币数量
    - 已登录用户显示 "本局金币：+X 🪙"
    - 未登录用户显示 "登录后可获得金币"
    - _需求：2.3, 2.4_
  - [x] 4.3 游戏结束时，已登录用户调用 `POST /api/coins/add` 提交 sessionCoins 到服务端
    - 提交成功后更新本地 `playerCoins`
    - _需求：2.2_
  - [x] 4.4 在主界面 overlay 顶部显示金币余额（已登录时），登录成功后调用 `GET /api/coins` 获取余额
    - 修改 `rebuildOverlayHTML()` 添加金币显示区域
    - _需求：3.3_

- [x] 5. 皮肤商店界面
  - [x] 5.1 在主界面 overlay 添加"皮肤商店"按钮，点击调用 `showSkinStore()`
    - 按钮样式与现有按钮一致，放在竞技模式按钮下方
    - 未登录时提示"请先登录"
    - _需求：6.1_
  - [x] 5.2 实现 `showSkinStore()` 函数，替换 overlay 内容为皮肤商店界面
    - 顶部显示金币余额
    - 网格布局展示所有皮肤卡片
    - 每个卡片包含 Canvas 预览、名称、价格、状态标识
    - 调用 `GET /api/skins` 获取用户皮肤数据
    - _需求：6.2, 6.4, 8.4_
  - [x] 5.3 实现皮肤卡片内的 Canvas 预览绘制，使用皮肤参数绘制角色缩略图
    - _需求：6.2_
  - [x] 5.4 实现皮肤卡片点击交互：根据状态显示购买/装备/已装备按钮
    - 未解锁：显示"购买 X 金币"，调用 `POST /api/skins/buy`
    - 已解锁：显示"装备"，调用 `POST /api/skins/equip`
    - 已装备：显示灰色"已装备"按钮
    - _需求：6.3, 6.5_
  - [x] 5.5 实现 `closeSkinStore()` 函数，返回主界面
    - _需求：6.1_
  - [ ]* 5.6 编写属性测试：皮肤操作按钮状态判定（属性 7）
    - **属性 7：皮肤操作按钮状态判定**
    - 验证未解锁→'buy'，已解锁未装备→'equip'，已装备→'equipped'
    - 在 `tests/skin-store-logic.test.js` 中实现
    - **验证需求：6.3**

- [x] 6. 角色渲染改造
  - [x] 6.1 改造 `Player.draw(ox, oy)` 方法，使用当前装备皮肤的参数替换硬编码颜色
    - bodyColor 为 null 时沿用 `roster.getCurrent().color`
    - 使用皮肤的 innerColor、eyeColor、eyeSize、highlightColor
    - 如果有 outlineColor，绘制轮廓描边
    - 如果有 effect，绘制对应特效
    - _需求：7.1, 7.4_
  - [x] 6.2 改造 `arenaDrawCharacter(px, py, color, skinId)` 函数，新增 skinId 参数
    - 根据 skinId 查找皮肤注册表获取绘制参数
    - 保持与 Player.draw 一致的皮肤渲染效果
    - _需求：7.2, 7.3_
  - [x] 6.3 更新所有调用 `arenaDrawCharacter` 的地方，传入正确的 skinId
    - 本地玩家使用 `playerEquippedSkin`
    - 其他玩家使用 WebSocket 广播的 skinId
    - 其他玩家以 50% 透明度绘制
    - _需求：7.2, 7.3_

- [x] 7. 检查点 - 客户端渲染与商店验证
  - 确保皮肤商店正常显示、购买装备流程正确、角色渲染使用皮肤参数，ask the user if questions arise.

- [x] 8. 竞技模式皮肤同步
  - [x] 8.1 修改客户端 WebSocket 消息，在 `create_room` / `join_room` 时附加 `skinId` 字段
    - _需求：8.5_
  - [x] 8.2 修改 `server.js` 中的 `createServerPlayer` 函数，存储玩家的 `skinId`
    - _需求：8.5_
  - [x] 8.3 修改 `getPlayerInfoList` 函数，在返回数据中包含每个玩家的 `skinId`
    - _需求：8.5_
  - [x] 8.4 修改客户端竞技模式渲染逻辑，从玩家信息中读取 skinId 传给 `arenaDrawCharacter`
    - _需求：7.2, 7.3, 8.5_

- [x] 9. 登录同步与数据初始化
  - [x] 9.1 修改登录成功回调，调用 `GET /api/coins` 和 `GET /api/skins` 同步皮肤数据到客户端全局变量
    - _需求：3.3, 8.4_
  - [x] 9.2 修改登出逻辑，重置客户端皮肤状态为默认值
    - _需求：7.4_

- [x] 10. 最终检查点 - 全功能验证
  - 确保所有测试通过，经典模式金币获取、皮肤商店购买装备、角色渲染、竞技模式皮肤同步全部正常工作，ask the user if questions arise.

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求编号，确保可追溯性
- 属性测试使用 fast-check 库，需先安装：`npm install --save-dev fast-check`
- 测试文件需要从 index.html 和 server.js 中提取可测试的纯函数
- 检查点用于阶段性验证，确保增量开发的正确性
