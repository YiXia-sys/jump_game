# 需求文档

## 简介

本文档定义了跳跳游戏优化项目的需求。该项目基于现有的2.5D等距投影风格跳跃游戏代码（jump_game/跳跳蛙.html），旨在通过代码重构、性能优化、可维护性提升和功能增强来改进游戏质量。

现有游戏是一个多角色轮流跳跃的游戏，包含蓄力跳跃机制、多种平台类型、难度递增系统、粒子特效和镜头跟随等特性。优化目标是在保持现有功能的基础上，提升代码质量、性能表现和用户体验。

## 术语表

- **Game_System**: 整个跳跳游戏系统
- **Character_Roster**: 角色轮换管理系统，管理5个角色的轮流跳跃
- **Platform_Generator**: 平台生成器，负责创建和管理游戏平台
- **Jump_Mechanic**: 跳跃机制，包括蓄力、跳跃距离计算和抛物线运动
- **Scoring_System**: 计分系统，根据落点位置计算得分
- **Particle_System**: 粒子特效系统
- **Camera_System**: 镜头跟随系统
- **Difficulty_System**: 难度递增系统，根据跳跃次数解锁特殊平台
- **Platform_Shape**: 平台形状类型（矩形、圆形、五边形）
- **Special_Platform**: 特殊平台（移动平台、缩小平台、限时平台）
- **Collision_Detector**: 碰撞检测器，判断角色是否落在平台上
- **Animation_System**: 动画系统，处理角色动画和平台动画
- **UI_System**: 用户界面系统，包括状态栏和蓄力条
- **Failure_Mechanic**: 失败机制，处理角色掉落和生命值扣除
- **Canvas_Renderer**: Canvas渲染器
- **Configuration**: 游戏配置参数（跳跃距离、平台尺寸等）

## 需求

### 需求 1: 代码模块化重构

**用户故事:** 作为开发者，我希望将单文件代码重构为模块化结构，以便提高代码可维护性和可测试性。

#### 验收标准

1. THE Game_System SHALL 将核心游戏逻辑分离为独立的JavaScript模块
2. THE Game_System SHALL 将渲染逻辑与游戏逻辑分离
3. THE Game_System SHALL 将配置参数集中管理在Configuration模块中
4. THE Game_System SHALL 保持所有现有功能在重构后正常工作
5. WHEN 模块化完成后，THE Game_System SHALL 支持单元测试

### 需求 2: 纯函数提取与测试

**用户故事:** 作为开发者，我希望提取并测试所有纯函数，以便确保核心计算逻辑的正确性。

#### 验收标准

1. THE Game_System SHALL 将所有纯函数（calculatePower、calculateJumpDistance、calculateScore、calculateParabola等）提取到独立模块
2. FOR ALL 纯函数，THE Game_System SHALL 确保函数无副作用且输出仅依赖输入
3. THE Game_System SHALL 为每个纯函数提供单元测试
4. WHEN 相同输入提供给纯函数时，THE Game_System SHALL 返回相同输出（幂等性）
5. THE Game_System SHALL 验证calculatePower函数在0到maxCharge范围内返回0到1的值

### 需求 3: 形状系统扩展性

**用户故事:** 作为开发者，我希望形状系统易于扩展，以便未来添加新的平台形状。

#### 验收标准

1. THE Game_System SHALL 定义标准的形状接口（drawTop、drawLeft、drawRight、hitTest、getCenter、getMaxRadius）
2. WHEN 新形状类型添加到SHAPES对象时，THE Platform_Generator SHALL 自动支持该形状
3. THE Game_System SHALL 为每种形状类型提供碰撞检测测试
4. FOR ALL 形状类型，THE Collision_Detector SHALL 正确判断点是否在形状内
5. THE Game_System SHALL 验证圆形和五边形的hitTest函数与实际渲染形状一致

### 需求 4: 平台生成算法优化

**用户故事:** 作为玩家，我希望平台生成更加合理和有趣，以便获得更好的游戏体验。

#### 验收标准

1. THE Platform_Generator SHALL 确保连续同方向平台不超过2个
2. THE Platform_Generator SHALL 根据当前平台宽度和下一个平台宽度动态调整间距
3. WHEN 跳跃次数达到15次时，THE Difficulty_System SHALL 解锁移动平台
4. WHEN 跳跃次数达到20次时，THE Difficulty_System SHALL 解锁缩小平台
5. WHEN 跳跃次数达到25次时，THE Difficulty_System SHALL 解锁限时平台
6. THE Platform_Generator SHALL 确保生成的平台间距在玩家可跳跃范围内

### 需求 5: 碰撞检测精确性

**用户故事:** 作为玩家，我希望碰撞检测准确无误，以便游戏体验公平合理。

#### 验收标准

1. THE Collision_Detector SHALL 使用射线法准确判断点是否在多边形内
2. THE Collision_Detector SHALL 检测角色脚部4个边缘点是否完全在平台上
3. WHEN 角色脚部未完全踩在平台上时，THE Failure_Mechanic SHALL 触发边缘滑落动画
4. THE Collision_Detector SHALL 正确处理圆形平台的椭圆碰撞检测
5. THE Collision_Detector SHALL 正确处理五边形平台的多边形碰撞检测

### 需求 6: 计分系统准确性

**用户故事:** 作为玩家，我希望计分系统准确反映我的落点质量，以便获得公平的分数。

#### 验收标准

1. WHEN 落点距离平台中心小于等于最大半径25%时，THE Scoring_System SHALL 给予50分
2. WHEN 落点距离平台中心在最大半径25%到60%之间时，THE Scoring_System SHALL 给予20分
3. WHEN 落点距离平台中心大于最大半径60%时，THE Scoring_System SHALL 给予10分
4. THE Scoring_System SHALL 根据不同形状的实际最大半径计算距离比例
5. THE Scoring_System SHALL 在完美落地时触发屏幕震动和特殊粒子效果

### 需求 7: 跳跃物理系统

**用户故事:** 作为玩家，我希望跳跃物理感觉自然流畅，以便获得良好的操作手感。

#### 验收标准

1. THE Jump_Mechanic SHALL 根据蓄力时间计算跳跃距离（最小10px，最大350px）
2. THE Jump_Mechanic SHALL 根据跳跃距离动态调整跳跃高度（最小20px，最大150px）
3. THE Jump_Mechanic SHALL 根据跳跃距离动态调整跳跃时长（最小300ms，最大800ms）
4. THE Jump_Mechanic SHALL 使用抛物线函数计算跳跃轨迹
5. WHEN 蓄力低于10%时，THE Animation_System SHALL 不播放翻滚动画
6. WHEN 蓄力大于等于10%时，THE Animation_System SHALL 播放翻滚动画

### 需求 8: 特殊平台机制

**用户故事:** 作为玩家，我希望特殊平台机制工作正常，以便体验游戏的挑战性。

#### 验收标准

1. WHEN 角色站在移动平台上时，THE Game_System SHALL 使角色跟随平台移动
2. WHEN 缩小平台宽度缩小到角色无法站立时，THE Failure_Mechanic SHALL 触发失败
3. WHEN 限时平台倒计时结束时，THE Game_System SHALL 使平台塌陷
4. WHEN 角色站在限时平台上时，THE UI_System SHALL 显示倒计时进度环
5. WHEN 平台塌陷时，THE Failure_Mechanic SHALL 触发角色掉落
6. THE Game_System SHALL 在角色复位后恢复塌陷平台的状态

### 需求 9: 失败机制与复位

**用户故事:** 作为玩家，我希望失败后能看到清晰的反馈并复位到安全位置，以便继续游戏。

#### 验收标准

1. WHEN 角色未落在任何平台上时，THE Failure_Mechanic SHALL 扣除1点生命值
2. WHEN 角色生命值归零时，THE Character_Roster SHALL 标记该角色为淘汰
3. WHEN 角色失败时，THE Animation_System SHALL 播放掉落到柱底的动画
4. WHEN 掉落动画完成后，THE Game_System SHALL 将角色复位到上次安全位置
5. WHEN 角色复位后，THE Character_Roster SHALL 切换到下一个存活角色
6. WHEN 所有角色淘汰时，THE Game_System SHALL 结束游戏并显示总分

### 需求 10: 角色轮换系统

**用户故事:** 作为玩家，我希望5个角色轮流跳跃，以便体验多角色玩法。

#### 验收标准

1. THE Character_Roster SHALL 管理5个角色，每个角色有独立的分数和生命值
2. WHEN 一次跳跃完成后，THE Character_Roster SHALL 切换到下一个存活角色
3. WHEN 当前角色淘汰时，THE Character_Roster SHALL 跳过该角色切换到下一个存活角色
4. THE UI_System SHALL 在状态栏高亮显示当前角色
5. THE UI_System SHALL 半透明显示已淘汰角色
6. THE Character_Roster SHALL 为每个角色分配不同的颜色

### 需求 11: 粒子特效系统

**用户故事:** 作为玩家，我希望看到丰富的视觉反馈，以便增强游戏沉浸感。

#### 验收标准

1. WHEN 角色落地时，THE Particle_System SHALL 生成落地粒子特效
2. WHEN 完美落地时，THE Particle_System SHALL 生成20个彩色粒子
3. WHEN 普通落地时，THE Particle_System SHALL 生成8个灰色粒子
4. WHEN 角色掉落到柱底时，THE Particle_System SHALL 生成12个灰尘粒子
5. THE Particle_System SHALL 使粒子受重力影响并逐渐消失
6. THE Particle_System SHALL 在每帧更新所有粒子的位置和透明度

### 需求 12: 镜头跟随系统

**用户故事:** 作为玩家，我希望镜头平滑跟随角色，以便始终看到游戏重点。

#### 验收标准

1. WHEN 角色落地时，THE Camera_System SHALL 将目标镜头位置设置为角色位置
2. THE Camera_System SHALL 使用线性插值实现平滑跟随（lerp系数0.08）
3. WHEN 完美落地时，THE Camera_System SHALL 触发屏幕震动效果
4. THE Camera_System SHALL 在震动时随机偏移镜头位置
5. THE Camera_System SHALL 确保角色始终在屏幕可见范围内

### 需求 13: UI状态显示

**用户故事:** 作为玩家，我希望清楚看到所有角色的状态，以便了解游戏进度。

#### 验收标准

1. THE UI_System SHALL 在顶部状态栏显示所有5个角色的信息
2. THE UI_System SHALL 为每个角色显示名称、分数和生命值
3. THE UI_System SHALL 使用心形图标显示生命值
4. THE UI_System SHALL 使用骷髅图标显示淘汰状态
5. THE UI_System SHALL 在底部显示蓄力条
6. WHEN 蓄力时，THE UI_System SHALL 实时更新蓄力条宽度

### 需求 14: 游戏结束与重新开始

**用户故事:** 作为玩家，我希望游戏结束时看到详细的成绩统计，以便了解表现。

#### 验收标准

1. WHEN 所有角色淘汰时，THE Game_System SHALL 显示游戏结束界面
2. THE UI_System SHALL 显示总分
3. THE UI_System SHALL 显示每个角色的分数和淘汰状态
4. WHEN 点击重新开始按钮时，THE Game_System SHALL 重置所有游戏状态
5. THE Game_System SHALL 重新初始化5个角色，每个角色5点生命值
6. THE Game_System SHALL 重置跳跃计数和难度系统

### 需求 15: 性能优化

**用户故事:** 作为玩家，我希望游戏运行流畅，以便获得良好的游戏体验。

#### 验收标准

1. THE Canvas_Renderer SHALL 使用深度排序优化渲染顺序
2. THE Game_System SHALL 限制保留的历史平台数量（最多3个）
3. THE Particle_System SHALL 自动移除透明度为0的粒子
4. THE Game_System SHALL 使用requestAnimationFrame实现流畅动画
5. THE Game_System SHALL 在游戏暂停时停止渲染循环

### 需求 16: 配置参数管理

**用户故事:** 作为开发者，我希望游戏参数易于调整，以便快速平衡游戏难度。

#### 验收标准

1. THE Configuration SHALL 集中管理所有游戏常量（跳跃距离、平台尺寸、生命值等）
2. THE Configuration SHALL 支持运行时修改参数
3. THE Configuration SHALL 为每个参数提供合理的默认值
4. THE Configuration SHALL 验证参数值的有效性
5. THE Configuration SHALL 支持导出和导入配置

### 需求 17: 2.5D等距投影渲染

**用户故事:** 作为玩家，我希望看到精美的2.5D视觉效果，以便获得独特的游戏体验。

#### 验收标准

1. THE Canvas_Renderer SHALL 使用等距投影渲染立方体平台
2. THE Canvas_Renderer SHALL 使用等距投影渲染圆柱平台
3. THE Canvas_Renderer SHALL 使用等距投影渲染五棱柱平台
4. THE Canvas_Renderer SHALL 为平台的顶面、左侧面、右侧面使用不同的颜色深度
5. THE Canvas_Renderer SHALL 在平台底部绘制阴影
6. THE Canvas_Renderer SHALL 在角色底部绘制阴影

### 需求 18: 角色动画系统

**用户故事:** 作为玩家，我希望角色动画生动有趣，以便增强游戏趣味性。

#### 验收标准

1. WHEN 蓄力时，THE Animation_System SHALL 播放角色压缩动画
2. WHEN 跳跃时，THE Animation_System SHALL 播放角色翻滚动画
3. WHEN 落地时，THE Animation_System SHALL 播放角色弹跳动画
4. WHEN 边缘滑落时，THE Animation_System SHALL 播放摇晃和滑落动画
5. WHEN 掉落时，THE Animation_System SHALL 播放旋转下落动画
6. THE Animation_System SHALL 根据蓄力程度调整角色压缩比例

### 需求 19: 输入处理系统

**用户故事:** 作为玩家，我希望支持鼠标和触摸操作，以便在不同设备上游玩。

#### 验收标准

1. WHEN 鼠标按下时，THE Game_System SHALL 开始蓄力
2. WHEN 鼠标松开时，THE Game_System SHALL 释放跳跃
3. WHEN 触摸开始时，THE Game_System SHALL 开始蓄力
4. WHEN 触摸结束时，THE Game_System SHALL 释放跳跃
5. THE Game_System SHALL 阻止默认的触摸和鼠标事件
6. THE Game_System SHALL 在跳跃动画进行中忽略输入

### 需求 20: 边缘情况处理

**用户故事:** 作为开发者，我希望游戏正确处理各种边缘情况，以便避免bug和崩溃。

#### 验收标准

1. WHEN 平台宽度为0时，THE Game_System SHALL 使用默认最大半径
2. WHEN 所有角色同时淘汰时，THE Game_System SHALL 正确结束游戏
3. WHEN 角色在平台塌陷瞬间跳跃时，THE Game_System SHALL 正确处理状态
4. WHEN 移动平台移出屏幕时，THE Game_System SHALL 保持碰撞检测正常
5. WHEN 缩小平台宽度小于最小值时，THE Game_System SHALL 停止缩小
6. IF 安全平台已塌陷，THEN THE Game_System SHALL 在复位时恢复平台状态
