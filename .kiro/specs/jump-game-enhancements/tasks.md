# Implementation Plan: 跳跳游戏增强功能

## Overview

在单文件 `jump_game/跳跳蛙.html` 中实现测试模式和边缘落地容错两个功能。所有改动均在同一个 HTML 文件的 `<script>` 标签内完成。

## Tasks

- [x] 1. 新增全局变量与修改 initGame 函数
  - [x] 1.1 在全局作用域新增 `testMode` 布尔变量，默认值为 `false`
    - 在现有全局变量声明区域添加 `let testMode = false;`
    - _Requirements: 2.1_
  - [x] 1.2 修改 `initGame()` 函数，接受 `isTestMode` 参数并设置全局 `testMode`
    - 在函数开头添加 `testMode = isTestMode || false;`
    - 确保每次调用 `initGame` 时 `testMode` 被正确重置
    - _Requirements: 1.3, 1.4_

- [x] 2. 开始界面新增"测试模式"按钮
  - [x] 2.1 在 overlay 的 `#startBtn` 下方添加"测试模式"按钮 DOM 元素
    - 按钮 id 为 `testModeBtn`，标签文字为"测试模式"
    - 使用深蓝色背景（`#0f3460`）和较小字号，与红色"开始游戏"按钮区分
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 为"测试模式"按钮绑定点击事件，调用 `initGame(true)` 并隐藏 overlay
    - 为"开始游戏"按钮确认调用 `initGame(false)` 保持原有行为
    - _Requirements: 1.3, 1.4_

- [x] 3. 实现测试模式下无限血量
  - [x] 3.1 修改 `Character.takeDamage()` 方法，在 `testMode === true` 时跳过扣血逻辑
    - 在方法开头添加 `if (testMode) return;`
    - 确保 `health` 不减少、`alive` 始终为 `true`
    - _Requirements: 2.1, 2.3_
  - [x] 3.2 修改 `updateStatusBar()` 函数，测试模式下显示 `∞` 替代心形图标
    - 当 `testMode === true` 时，状态栏血量区域显示 `∞` 符号
    - 正常模式保持原有心形图标显示
    - _Requirements: 2.2, 2.4_
  - [ ]* 3.3 编写属性测试：测试模式伤害免疫
    - **Property 1: Test mode damage immunity**
    - 生成随机 takeDamage 调用次数（1-100），验证 testMode=true 下 health 不变、alive 为 true
    - **Validates: Requirements 2.1, 2.3**
  - [ ]* 3.4 编写属性测试：正常模式伤害机制
    - **Property 2: Normal mode damage mechanics**
    - 生成随机初始 health（1-5）和随机 takeDamage 调用次数，验证 testMode=false 下 health 递减和 alive 状态
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint - 确认测试模式功能完整
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 实现边缘落地容错机制
  - [x] 5.1 修改 `handleLanding()` 中的边缘检测逻辑
    - 将脚部检测从 `every`（全部通过）改为计数判断
    - 统计 4 个 Foot_Points 中通过 `hitTest` 的数量
    - 当通过数 ≥ 3 时判定站稳，不触发 Edge_Slip
    - 当通过数 ≤ 2 时触发 Edge_Slip 滑落动画
    - 保持 4 个脚部检测点的位置和数量不变
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 5.2 编写属性测试：边缘落地容错阈值
    - **Property 3: Edge landing tolerance threshold**
    - 生成随机平台和随机落点位置，验证站稳判定与 ≥3 阈值一致
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 6. 游戏结束界面模式标识
  - [x] 6.1 修改 `showOverlay(isGameOver)` 函数，测试模式下显示"[测试模式]"标识
    - 当 `testMode === true` 且为游戏结束界面时，在分数区域附近显示"[测试模式]"文字
    - 正常模式下不显示任何模式标识
    - _Requirements: 4.1, 4.2_

- [x] 7. Final checkpoint - 确认所有功能完整
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- 所有改动均在 `jump_game/跳跳蛙.html` 单文件内完成
