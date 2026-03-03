# Requirements Document

## Introduction

为跳跳游戏（jump_game/跳跳蛙.html）增加两个新功能：测试模式（无限血量）和边缘落地容错机制。测试模式允许开发者在不受血量限制的情况下测试游戏；边缘落地容错机制放宽脚部检测的判定标准，提升游戏体验。

## Glossary

- **Game**: 跳跳游戏应用程序（jump_game/跳跳蛙.html）
- **Start_Screen**: 游戏开始界面，包含标题、说明文字和开始按钮的覆盖层（overlay）
- **Test_Mode**: 测试模式，角色拥有无限血量，不会因血量耗尽而结束游戏
- **Normal_Mode**: 正常模式，角色拥有5滴血，血量耗尽后游戏结束
- **Character**: 游戏角色，由 Character 类管理，包含血量（health）和存活状态（alive）
- **Platform**: 游戏中的平台，角色通过跳跃在平台之间移动
- **Foot_Points**: 角色脚部的4个边缘检测点，用于判断角色是否站稳在平台上
- **Edge_Slip**: 边缘滑落，当角色落地位置过于靠近平台边缘时触发的滑落动画和扣血机制
- **Tolerance_Rate**: 容错率，允许脚部检测点中一定比例不在平台形状内仍判定为站稳
- **Hit_Test**: 平台的碰撞检测方法，判断一个点是否在平台顶面形状内

## Requirements

### Requirement 1: 测试模式按钮

**User Story:** As a 开发者, I want 在开始游戏界面看到一个"测试模式"按钮, so that 我可以选择以无限血量进入游戏进行测试

#### Acceptance Criteria

1. WHEN Start_Screen 显示时, THE Game SHALL 在"开始游戏"按钮下方渲染一个标签为"测试模式"的按钮
2. THE "测试模式"按钮 SHALL 采用与"开始游戏"按钮不同的视觉样式以区分两种模式
3. WHEN 用户点击"测试模式"按钮, THE Game SHALL 以 Test_Mode 启动游戏并隐藏 Start_Screen
4. WHEN 用户点击"开始游戏"按钮, THE Game SHALL 以 Normal_Mode 启动游戏（行为与当前逻辑一致）

### Requirement 2: 测试模式下无限血量

**User Story:** As a 开发者, I want 测试模式下角色拥有无限血量, so that 我可以不受死亡限制地测试游戏的各种平台和跳跃机制

#### Acceptance Criteria

1. WHILE Game 处于 Test_Mode, THE Character SHALL 在受到伤害时保持 health 值不减少且 alive 状态始终为 true
2. WHILE Game 处于 Test_Mode, THE Game SHALL 在状态栏中显示"∞"符号替代血量心形图标，以标识当前为测试模式
3. WHILE Game 处于 Test_Mode, WHEN Character 跳跃失败（未落在平台上或触发 Edge_Slip）, THE Game SHALL 执行掉落动画并将 Character 复位到上一个安全平台，但不扣减血量
4. WHILE Game 处于 Normal_Mode, THE Character SHALL 保持原有的5滴血机制（受到伤害时 health 减1，health 为0时 alive 变为 false）

### Requirement 3: 边缘落地容错机制

**User Story:** As a 玩家, I want 落地判定有一定的容错空间, so that 我在平台边缘落地时不会因为微小的偏差而触发滑落

#### Acceptance Criteria

1. WHEN Character 落在 Platform 上时, THE Game SHALL 检测4个 Foot_Points 中有多少个通过 Hit_Test
2. WHEN 4个 Foot_Points 中有3个或以上通过 Hit_Test, THE Game SHALL 判定 Character 站稳，不触发 Edge_Slip
3. WHEN 4个 Foot_Points 中有2个或更少通过 Hit_Test, THE Game SHALL 触发 Edge_Slip 滑落动画
4. THE Foot_Points 的位置和数量（4个点：左、右、前、后，半径8px）SHALL 保持与当前实现一致

### Requirement 4: 游戏结束界面模式标识

**User Story:** As a 用户, I want 在游戏结束界面看到当前游戏模式的标识, so that 我能区分测试模式和正常模式的游戏结果

#### Acceptance Criteria

1. WHILE Game 处于 Test_Mode, WHEN 游戏结束界面显示时, THE Game SHALL 在分数区域附近显示"[测试模式]"标识
2. WHILE Game 处于 Normal_Mode, WHEN 游戏结束界面显示时, THE Game SHALL 不显示任何模式标识（保持当前行为）
