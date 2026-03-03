# Bugfix Requirements Document

## Introduction

跳跳游戏（跳跳蛙.html）存在三个 bug 需要修复：
1. 游戏创建了 5 个角色轮流跳跃，但期望只有 1 个角色、5 滴血
2. 角色从移动平台跳出掉落后，复活点使用绝对坐标，导致移动平台移走后角色复活在空中直接掉落
3. 缩小平台在角色复位时被恢复原始宽度，导致缩小行为循环重复（缩小→复位放大→再缩小）

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 游戏初始化时 THEN `initGame()` 创建 5 个 `Character` 对象并通过 `CharacterRoster` 管理轮换，状态栏显示 5 个角色卡片，每次跳跃后切换到下一个角色

1.2 WHEN 角色站在移动平台上跳出并掉落失败后复活时 THEN 系统使用 `lastSafeX`/`lastSafeY`（记录的是落地时的绝对坐标）来复位角色位置，但移动平台已经移动到其他位置，导致角色复活在空中直接再次掉落

1.3 WHEN 角色从缩小平台跳出掉落后复位时 THEN `fallToBase` 动画完成后执行 `safePlat.w = safePlat.origW` 将缩小平台宽度恢复为原始值，之后缩小平台的 `shrinking` 属性仍为 `true`，导致平台再次开始缩小，形成循环放大缩小的效果

### Expected Behavior (Correct)

2.1 WHEN 游戏初始化时 THEN 系统 SHALL 只创建 1 个角色，拥有 5 点生命值，状态栏只显示 1 个角色卡片，不进行角色轮换

2.2 WHEN 角色站在移动平台上跳出并掉落失败后复活时 THEN 系统 SHALL 记录安全平台的引用（而非绝对坐标），复活时根据该移动平台的当前位置计算中心点，将角色复位到移动平台的当前中心位置

2.3 WHEN 角色从缩小平台跳出掉落后复位时 THEN 系统 SHALL 在恢复缩小平台宽度后将其 `shrinking` 属性设为 `false`，使缩小行为停止，不再循环放大缩小

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 角色正常跳跃并成功落在平台上时 THEN 系统 SHALL CONTINUE TO 正确计算得分、播放落地动画、生成粒子特效

3.2 WHEN 角色站在移动平台上时 THEN 系统 SHALL CONTINUE TO 让角色跟随移动平台移动（`player.x += curPlat.moveDeltaX`）

3.3 WHEN 角色站在缩小平台上且平台仍在缩小过程中时 THEN 系统 SHALL CONTINUE TO 正常执行缩小逻辑，当脚下平台缩到踩不住时触发掉落

3.4 WHEN 角色生命值降为 0 时 THEN 系统 SHALL CONTINUE TO 正确结束游戏并显示最终得分

3.5 WHEN 角色从非移动的普通平台掉落后复活时 THEN 系统 SHALL CONTINUE TO 将角色复位到该平台的正确位置

3.6 WHEN 限时平台倒计时结束塌陷后角色复位时 THEN 系统 SHALL CONTINUE TO 正确恢复限时平台状态并重新开始倒计时
