# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - 三合一 Bug 验证（单角色/移动平台复活/缩小平台循环）
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the three bugs exist
  - **Scoped PBT Approach**:
    - Bug 1: 调用 `initGame()` 后断言 `roster.characters.length === 1` 且 `roster.characters[0].health === 5`
    - Bug 2: 模拟角色在移动平台落地后平台移动，触发复位，断言 `player.x === lastSafePlatform.getTopCenter().x`
    - Bug 3: 模拟缩小平台复位流程，断言复位后 `safePlat.shrinking === false`
  - isBugCondition_1: `state.roster.characters.length > 1`
  - isBugCondition_2: `input.safePlatform.moving == true AND reviveX != safePlatform.getTopCenter().x`
  - isBugCondition_3: `input.safePlatform.shrinking == true AND safePlatform.w == safePlatform.origW`
  - Expected counterexamples:
    - Bug 1: `roster.characters.length === 5` 而非 1
    - Bug 2: 复活坐标等于记录时的绝对坐标，而非移动平台当前位置
    - Bug 3: 复位后 `safePlat.shrinking === true`，平台继续缩小
  - Run test on UNFIXED code - expect FAILURE (this confirms the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - 正常游戏行为保全（跳跃得分/移动平台跟随/缩小逻辑/限时平台/普通平台复活）
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code:
    - 正常跳跃落地后得分计算、落地动画、粒子特效正常工作
    - 角色站在移动平台上时跟随移动（`player.x += curPlat.moveDeltaX`）
    - 缩小平台在角色站立期间正常执行缩小逻辑
    - 角色生命值降为 0 时正确结束游戏并显示最终得分
    - 从非移动普通平台掉落后复活到正确位置
    - 限时平台倒计时结束塌陷后正确恢复状态并重新开始倒计时
  - Write property-based tests:
    - _For all_ 正常跳跃落地事件（非 bug 条件），得分增加值与平台类型匹配
    - _For all_ 移动平台上的角色，`player.x` 跟随平台 `moveDeltaX` 更新
    - _For all_ 缩小平台上角色站立期间，`shrinking === true` 时平台宽度持续减小
    - _For all_ 非移动普通平台掉落复位，复活坐标等于 `lastSafeX`/`lastSafeY`
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for 跳跳蛙三合一 Bug 修复

  - [x] 3.1 Bug 1 修复：单角色五滴血
    - 修改 `initGame()` 中的角色创建逻辑，将 `for (let i = 0; i < 5; i++)` 改为只创建 1 个角色
    - 设置单角色 `health = 5`
    - `CharacterRoster` 只包含 1 个角色
    - 更新 overlay 中的 UI 描述，将 "5人轮换" 改为 "1个角色 · 5滴血" 或类似描述
    - _Bug_Condition: isBugCondition_1(state) where state.roster.characters.length > 1_
    - _Expected_Behavior: roster.characters.length === 1 AND roster.characters[0].health === 5_
    - _Preservation: 角色正常跳跃得分、落地动画、粒子特效不变；生命值降为 0 时正确结束游戏_
    - _Requirements: 2.1_

  - [x] 3.2 Bug 2 修复：移动平台复活点改为相对位置
    - 新增全局变量 `let lastSafePlatform = null;`
    - 在 `handleLanding()` 中新增 `lastSafePlatform = platform;` 记录安全平台引用
    - 修改 `fallToBase` 完成后的复位逻辑：检查 `lastSafePlatform`，如果是移动平台则使用 `lastSafePlatform.getTopCenter()` 获取当前位置
    - 非移动平台回退使用 `lastSafeX`/`lastSafeY`
    - _Bug_Condition: isBugCondition_2(input) where safePlatform.moving == true AND reviveX != safePlatform.getTopCenter().x_
    - _Expected_Behavior: player.x === lastSafePlatform.getTopCenter().x AND player.y === lastSafePlatform.getTopCenter().y_
    - _Preservation: 角色站在移动平台上时跟随移动不变；从非移动普通平台掉落后复活位置正确_
    - _Requirements: 2.2_

  - [x] 3.3 Bug 3 修复：缩小平台落地后停止缩小
    - 在 `fallToBase` 完成后的缩小平台恢复逻辑中，`safePlat.w = safePlat.origW;` 之后添加 `safePlat.shrinking = false;`
    - _Bug_Condition: isBugCondition_3(input) where safePlatform.shrinking == true AND safePlatform.w == safePlatform.origW_
    - _Expected_Behavior: safePlat.shrinking === false AND safePlat.w === safePlat.origW_
    - _Preservation: 缩小平台在角色站立期间的正常缩小逻辑不变_
    - _Requirements: 2.3_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 三合一 Bug 已修复验证
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - 正常游戏行为保全验证
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
