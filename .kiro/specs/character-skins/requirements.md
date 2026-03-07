# 需求文档：角色皮肤系统

## 简介

为跳跳游戏添加角色皮肤系统，允许玩家通过经典模式积累金币，在皮肤商店中购买解锁不同外观的角色皮肤，并在所有游戏模式中使用已装备的皮肤。当前角色使用 Canvas 绘制（圆头方身 + 眼睛 + 高光），皮肤系统将在此基础上扩展多种视觉风格。

## 术语表

- **Skin_System**：角色皮肤系统，管理皮肤定义、解锁状态、装备状态的整体模块
- **Skin_Store**：皮肤商店界面，展示所有可用皮肤及其价格，供玩家浏览和购买
- **Skin**：一套角色外观定义，包含主体颜色、眼睛样式、高光样式、轮廓样式、可选特效等绘制参数
- **Coin**：金币，经典模式中根据跳跃评分获得的虚拟货币，用于购买皮肤
- **Player_Renderer**：角色渲染器，负责根据当前装备的皮肤绘制角色外观（包括 Player.draw 和 arenaDrawCharacter）
- **Skin_API**：服务端皮肤相关的 HTTP API 接口，处理皮肤数据的读写
- **User_Data**：服务端用户数据（usersData），存储在 JSON 文件中，包含用户的金币余额、已解锁皮肤列表、当前装备皮肤

## 需求

### 需求 1：皮肤定义与注册

**用户故事：** 作为开发者，我希望有一套结构化的皮肤定义系统，以便统一管理所有皮肤的外观参数。

#### 验收标准

1. THE Skin_System SHALL 定义至少 6 种不同的皮肤，每种皮肤包含唯一标识符（skinId）、名称、价格、主体颜色、内圈颜色、眼睛样式、高光样式和可选特效参数
2. THE Skin_System SHALL 包含一个名为 "default" 的默认皮肤，该皮肤价格为 0，外观与当前角色绘制效果一致
3. WHEN 新皮肤被添加到皮肤注册表时，THE Skin_System SHALL 通过皮肤配置数组进行集中管理，无需修改渲染逻辑

### 需求 2：金币获取

**用户故事：** 作为玩家，我希望在经典模式中通过跳跃获得金币，以便积累货币购买皮肤。

#### 验收标准

1. WHEN 玩家在经典模式中完成一次跳跃并获得评分时，THE Skin_System SHALL 根据评分授予对应数量的金币（完美落地 50 分对应 5 金币，普通落地 20 分对应 2 金币，边缘落地 10 分对应 1 金币）
2. WHEN 经典模式一局游戏结束时，THE Skin_System SHALL 将该局累计获得的金币总数提交到服务端，累加到用户的金币余额中
3. THE Skin_System SHALL 在游戏结束界面显示本局获得的金币数量
4. IF 用户未登录，THEN THE Skin_System SHALL 不授予金币，并在游戏结束界面提示"登录后可获得金币"

### 需求 3：金币余额管理

**用户故事：** 作为玩家，我希望随时查看自己的金币余额，以便了解购买力。

#### 验收标准

1. THE Skin_API SHALL 提供查询用户金币余额的接口（GET /api/coins），返回当前金币数量
2. THE Skin_API SHALL 提供增加金币的接口（POST /api/coins/add），接受用户名、token 和金币数量参数，验证 token 后累加金币
3. WHEN 用户登录成功后，THE Skin_System SHALL 从服务端获取金币余额并在主界面显示
4. IF 请求中的 token 验证失败，THEN THE Skin_API SHALL 返回 401 状态码和"未登录或登录已过期"错误信息

### 需求 4：皮肤购买

**用户故事：** 作为玩家，我希望用金币购买喜欢的皮肤，以便个性化我的角色。

#### 验收标准

1. WHEN 玩家在皮肤商店中选择一个未解锁的皮肤并确认购买时，THE Skin_API SHALL 验证用户金币余额是否大于等于皮肤价格
2. WHEN 金币余额充足时，THE Skin_API SHALL 扣除对应金币数量，将该皮肤 skinId 添加到用户的已解锁皮肤列表中，并返回更新后的金币余额和已解锁皮肤列表
3. IF 金币余额不足，THEN THE Skin_API SHALL 返回 400 状态码和"金币不足"错误信息，不扣除任何金币
4. IF 玩家尝试购买已解锁的皮肤，THEN THE Skin_API SHALL 返回 400 状态码和"皮肤已解锁"错误信息
5. THE Skin_API SHALL 将购买结果持久化到用户数据 JSON 文件中

### 需求 5：皮肤装备

**用户故事：** 作为玩家，我希望装备已解锁的皮肤，以便在游戏中使用该外观。

#### 验收标准

1. WHEN 玩家在皮肤商店中选择一个已解锁的皮肤并点击"装备"时，THE Skin_API SHALL 将该皮肤 skinId 设置为用户的当前装备皮肤
2. WHEN 装备成功后，THE Skin_Store SHALL 在该皮肤上显示"已装备"标识，并移除其他皮肤的"已装备"标识
3. IF 玩家尝试装备未解锁的皮肤，THEN THE Skin_API SHALL 返回 400 状态码和"皮肤未解锁"错误信息
4. THE Skin_API SHALL 将装备状态持久化到用户数据 JSON 文件中

### 需求 6：皮肤商店界面

**用户故事：** 作为玩家，我希望有一个直观的皮肤商店界面，以便浏览、购买和装备皮肤。

#### 验收标准

1. THE Skin_Store SHALL 在游戏主界面（overlay）提供一个"皮肤商店"入口按钮
2. THE Skin_Store SHALL 以网格布局展示所有可用皮肤，每个皮肤卡片包含皮肤名称、价格、角色预览和状态标识（未解锁/已解锁/已装备）
3. WHEN 皮肤卡片被点击时，THE Skin_Store SHALL 根据皮肤状态显示对应操作按钮（未解锁显示"购买 X 金币"，已解锁显示"装备"，已装备显示"已装备"灰色按钮）
4. THE Skin_Store SHALL 在界面顶部显示玩家当前金币余额
5. WHEN 购买或装备操作完成后，THE Skin_Store SHALL 立即刷新界面状态，无需手动刷新

### 需求 7：角色渲染适配

**用户故事：** 作为玩家，我希望装备的皮肤在所有游戏模式中生效，以便获得一致的视觉体验。

#### 验收标准

1. WHEN 经典模式开始时，THE Player_Renderer SHALL 读取当前装备的皮肤参数，使用皮肤定义的颜色、样式和特效绘制角色（Player.draw 方法）
2. WHEN 竞技模式中绘制本地玩家时，THE Player_Renderer SHALL 使用当前装备的皮肤参数绘制角色（arenaDrawCharacter 函数）
3. WHEN 竞技模式中绘制其他玩家时，THE Player_Renderer SHALL 使用该玩家的皮肤参数以 50% 透明度绘制角色
4. IF 用户未登录或未装备任何皮肤，THEN THE Player_Renderer SHALL 使用 "default" 皮肤的参数绘制角色

### 需求 8：皮肤数据同步

**用户故事：** 作为玩家，我希望皮肤数据在不同设备间保持一致，以便随时随地使用已购买的皮肤。

#### 验收标准

1. THE Skin_API SHALL 提供查询用户皮肤数据的接口（GET /api/skins），返回已解锁皮肤列表和当前装备皮肤 skinId
2. THE Skin_API SHALL 提供购买皮肤的接口（POST /api/skins/buy），接受用户名、token 和 skinId 参数
3. THE Skin_API SHALL 提供装备皮肤的接口（POST /api/skins/equip），接受用户名、token 和 skinId 参数
4. WHEN 用户登录成功后，THE Skin_System SHALL 从服务端同步皮肤数据到客户端，确保显示最新的解锁和装备状态
5. WHEN 竞技模式建立 WebSocket 连接时，THE Skin_System SHALL 将当前装备的 skinId 发送给服务端，以便广播给其他玩家
