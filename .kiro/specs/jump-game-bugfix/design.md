# 跳跳游戏三合一 Bugfix 设计

## Overview

跳跳蛙游戏存在三个 bug 需要修复：
1. 游戏创建了 5 个角色轮流跳跃，但期望行为是 1 个角色拥有 5 滴血
2. 移动平台上掉落后复活使用绝对坐标，导致平台移走后角色复活在空中再次掉落
3. 缩小平台复位时恢复了宽度但未重置 `shrinking` 标志，导致循环放大缩小

修复策略：最小化改动，精准修复每个 bug 的根因，同时确保不影响现有正常行为。

## Glossary

- **Bug_Condition (C)**: 触发 bug 的条件集合，包含三个独立的故障条件
- **Property (P)**: 修复后的期望行为
- **Preservation**: 修复不应影响的现有行为（正常跳跃、得分、粒子特效、移动平台跟随等）
- **CharacterRoster**: `CharacterRoster` 类，管理多角色轮换逻辑（Bug 1 的根因）
- **lastSafeX / lastSafeY**: 全局变量，记录角色最后安全站立的绝对坐标（Bug 2 的根因）
- **safePlat.shrinking**: 缩小平台的缩小标志，复位时未重置（Bug 3 的根因）

## Bug Details

### Fault Condition

三个 bug 分别在以下条件下触发：

**Bug 1 - 多角色问题**：游戏初始化时创建 5 个 `Character` 对象并通过 `CharacterRoster` 管理轮换。

**Bug 2 - 移动平台复活坐标**：角色从移动平台掉落后，复活使用 `lastSafeX`/`lastSafeY`（绝对坐标），但移动平台已移走。

**Bug 3 - 缩小平台循环**：`fallToBase` 动画完成后执行 `safePlat.w = safePlat.origW` 恢复宽度，但 `shrinking` 仍为 `true`，导致再次缩小。

**Formal Specification:**
```
FUNCTION isBugCondition_1(state)
  INPUT: state of type GameState
  OUTPUT: boolean
  RETURN state.roster.characters.length > 1
END FUNCTION

FUNCTION isBugCondition_2(input)
  INPUT: input of type ReviveEvent
  OUTPUT: boolean
  RETURN input.safePlatform.moving == true
         AND input.reviveX != input.safePlatform.getTopCenter().x
         AND input.reviveY != input.safePlatform.getTopCenter().y
END FUNCTION

FUNCTION isBugCondition_3(input)
  INPUT: input of type PlatformResetEvent
  OUTPUT: boolean
  RETURN input.safePlatform.shrinking == true
         AND input.safePlatform.w == input.safePlatform.origW
         // 宽度已恢复但 shrinking 仍为 true，将再次缩小
END FUNCTION
```

### Examples

- **Bug 1**: 游戏开始后状态栏显示 5 个角色卡片，每次跳跃后切换到下一个角色 → 期望只有 1 个角色卡片，5 滴血
- **Bug 2**: 角色站在移动平台上跳出掉落，移动平台已移到 x=300，但复活坐标仍是 x=200（记录时的位置），角色复活在空中 → 期望复活到移动平台当前位置 x=300
- **Bug 3**: 角色从缩小平台掉落复位，平台宽度恢复为 origW=80，但 shrinking=true 导致立即开始缩小，缩到 minW 后下次复位又恢复，循环往复 → 期望复位后 shrinking=false，停止缩小
- **边缘情况**: 角色从非移动的普通平台掉落复位，应正常使用绝对坐标复位（不受 Bug 2 修复影响）

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 角色正常跳跃并成功落在平台上时，得分计算、落地动画、粒子特效不变
- 角色站在移动平台上时，跟随移动平台移动（`player.x += curPlat.moveDeltaX`）不变
- 缩小平台在角色站立期间的正常缩小逻辑不变
- 角色生命值降为 0 时正确结束游戏并显示最终得分
- 从非移动普通平台掉落后复活到正确位置
- 限时平台倒计时结束塌陷后正确恢复状态并重新开始倒计时

**Scope:**
所有不涉及以下三个条件的输入不受影响：
- 游戏初始化时的角色创建逻辑
- 移动平台上掉落后的复活坐标计算
- 缩小平台复位时的状态重置

## Hypothesized Root Cause

### Bug 1: 多角色 → 单角色

**根因**: `initGame()` 中通过 `for` 循环创建了 5 个 `Character` 对象，并用 `CharacterRoster` 管理轮换。`handleLanding()` 和 `fallToBase` 完成后都调用 `roster.advance()` 切换角色。

**关键代码**:
```javascript
// initGame() 中
const chars = [];
for (let i = 0; i < 5; i++) {
  chars.push(new Character(i, '角色' + (i+1), CHAR_COLORS[i]));
}
roster = new CharacterRoster(chars);
```

### Bug 2: 移动平台复活坐标

**根因**: `handleLanding()` 中记录 `lastSafeX = landX; lastSafeY = landY;`（绝对坐标）。`fallToBase` 完成后用 `player.x = lastSafeX; player.y = lastSafeY;` 复位。但移动平台的 `x` 在不断变化，绝对坐标已过时。

**关键代码**:
```javascript
// handleLanding() 中
lastSafeX = landX;
lastSafeY = landY;

// fallToBase 完成后
player.x = lastSafeX;
player.y = lastSafeY;
```

### Bug 3: 缩小平台循环缩小

**根因**: `fallToBase` 完成后恢复缩小平台宽度 `safePlat.w = safePlat.origW`，但未将 `safePlat.shrinking` 设为 `false`。由于 `Platform.update()` 中 `if (this.shrinking && !this.collapsed)` 会继续缩小，导致循环。

**关键代码**:
```javascript
// fallToBase 完成后
if (safePlat.shrinking) {
  safePlat.w = safePlat.origW;
  // 缺少: safePlat.shrinking = false;
}
```

## Correctness Properties

Property 1: Fault Condition - 单角色五滴血

_For any_ 游戏初始化状态，系统 SHALL 只创建 1 个角色，拥有 5 点生命值，状态栏只显示 1 个角色卡片，不进行角色轮换。

**Validates: Requirements 2.1**

Property 2: Fault Condition - 移动平台复活位置

_For any_ 角色从移动平台掉落后复活的事件，系统 SHALL 根据安全平台的当前位置（而非记录时的绝对坐标）计算复活坐标，将角色复位到移动平台的当前中心位置。

**Validates: Requirements 2.2**

Property 3: Fault Condition - 缩小平台复位停止缩小

_For any_ 角色从缩小平台掉落后复位的事件，系统 SHALL 在恢复缩小平台宽度后将 `shrinking` 属性设为 `false`，使缩小行为停止。

**Validates: Requirements 2.3**

Property 4: Preservation - 正常跳跃与得分

_For any_ 不涉及上述三个 bug 条件的输入（正常跳跃、落地、得分、粒子特效、移动平台跟随、限时平台倒计时等），修复后的代码 SHALL 产生与原代码完全相同的行为。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `jump_game/跳跳蛙.html`

### Bug 1: 单角色五滴血

**Function**: `initGame()`

**Specific Changes**:
1. **移除多角色创建循环**: 将 `for (let i = 0; i < 5; i++)` 改为只创建 1 个角色
2. **设置 5 滴血**: 单角色的 `health` 设为 5
3. **简化 Roster**: `CharacterRoster` 只包含 1 个角色，`advance()` 不再切换
4. **更新 UI 描述**: 将 overlay 中的 "5人轮换" 改为 "1个角色 · 5滴血" 或类似描述

**涉及的其他位置**:
- `handleLanding()` 中的 `roster.advance()` — 单角色时 advance 不会切换，无需改动
- `fallToBase` 完成后的 `roster.advance()` — 同上
- `updateStatusBar()` — 自动适配，无需改动

### Bug 2: 移动平台复活坐标

**新增全局变量**: `let lastSafePlatform = null;` 记录安全平台的引用

**Function**: `handleLanding()`

**Specific Changes**:
1. **记录平台引用**: 新增 `lastSafePlatform = platform;` 保存安全平台引用
2. **保留 lastSafeX/lastSafeY**: 作为非移动平台的回退坐标

**Function**: `fallToBase` 完成后的复位逻辑

**Specific Changes**:
1. **动态计算复活坐标**: 复位时检查 `lastSafePlatform`，如果是移动平台则使用 `lastSafePlatform.getTopCenter()` 获取当前位置
2. **非移动平台回退**: 如果不是移动平台，继续使用 `lastSafeX`/`lastSafeY`

### Bug 3: 缩小平台复位停止缩小

**Function**: `fallToBase` 完成后的复位逻辑

**Specific Changes**:
1. **重置 shrinking 标志**: 在 `safePlat.w = safePlat.origW;` 之后添加 `safePlat.shrinking = false;`

## Testing Strategy

### Validation Approach

测试策略分两阶段：先在未修复代码上验证 bug 存在（探索性测试），再在修复后验证 bug 已解决且现有行为不变。

### Exploratory Fault Condition Checking

**Goal**: 在修复前验证三个 bug 确实存在，确认根因分析正确。

**Test Plan**: 编写单元测试模拟三个 bug 的触发条件，在未修复代码上运行观察失败。

**Test Cases**:
1. **多角色测试**: 调用 `initGame()` 后检查 `roster.characters.length`，期望为 5（未修复时）→ 修复后期望为 1（will fail on unfixed code if asserting 1）
2. **移动平台复活测试**: 模拟角色在移动平台上落地，记录 lastSafeX，然后移动平台移动后触发复位，检查复活坐标是否跟随平台（will fail on unfixed code）
3. **缩小平台循环测试**: 模拟缩小平台复位流程，检查复位后 `shrinking` 是否为 false（will fail on unfixed code）

**Expected Counterexamples**:
- Bug 1: `roster.characters.length === 5` 而非 1
- Bug 2: 复活坐标 `player.x` 等于记录时的绝对坐标，而非移动平台当前位置
- Bug 3: 复位后 `safePlat.shrinking === true`，平台继续缩小

### Fix Checking

**Goal**: 验证修复后，所有 bug 条件下的行为符合期望。

**Pseudocode:**
```
FOR ALL state WHERE isBugCondition_1(state) DO
  result := initGame_fixed()
  ASSERT result.roster.characters.length == 1
  ASSERT result.roster.characters[0].health == 5
END FOR

FOR ALL input WHERE isBugCondition_2(input) DO
  result := revive_fixed(input)
  ASSERT result.playerX == input.safePlatform.getTopCenter().x
  ASSERT result.playerY == input.safePlatform.getTopCenter().y
END FOR

FOR ALL input WHERE isBugCondition_3(input) DO
  result := resetPlatform_fixed(input)
  ASSERT result.safePlatform.shrinking == false
  ASSERT result.safePlatform.w == result.safePlatform.origW
END FOR
```

### Preservation Checking

**Goal**: 验证修复后，所有非 bug 条件下的行为与原代码一致。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) == fixedBehavior(input)
END FOR
```

**Testing Approach**: 属性基测试（Property-Based Testing）适合保全检查，因为：
- 自动生成大量测试用例覆盖输入域
- 捕获手动单元测试可能遗漏的边缘情况
- 对非 bug 输入的行为不变提供强保证

**Test Plan**: 先在未修复代码上观察正常行为，再编写属性基测试验证修复后行为一致。

**Test Cases**:
1. **正常跳跃得分保全**: 验证正常跳跃落地后得分计算、粒子特效不变
2. **移动平台跟随保全**: 验证角色站在移动平台上时跟随移动不变
3. **缩小平台正常缩小保全**: 验证角色站在缩小平台上时正常缩小逻辑不变
4. **限时平台保全**: 验证限时平台倒计时和塌陷逻辑不变
5. **普通平台复活保全**: 验证从非移动普通平台掉落后复活位置正确

### Unit Tests

- 测试 `initGame()` 后只有 1 个角色且 health=5
- 测试移动平台复活时使用平台当前坐标
- 测试缩小平台复位后 shrinking=false
- 测试边缘情况：安全平台已塌陷时的复位逻辑

### Property-Based Tests

- 生成随机移动平台位置，验证复活坐标始终等于平台当前中心
- 生成随机缩小平台状态，验证复位后 shrinking 始终为 false
- 生成随机游戏状态，验证非 bug 输入的行为不变

### Integration Tests

- 完整游戏流程：初始化 → 跳跃 → 落地 → 掉落 → 复活，验证单角色 5 滴血
- 移动平台场景：落地 → 平台移动 → 掉落 → 复活到平台当前位置
- 缩小平台场景：落地 → 缩小 → 掉落 → 复位 → 验证不再缩小
