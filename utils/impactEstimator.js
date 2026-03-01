// 行动影响预估 (早期启发式) - 返回 { xpDelta, focusDelta, growthDelta, fiDelta }
// 可后续用真实数据回填或服务端计算
const weights = require('../config/growth-weights');

function estimateImpact(actionType, ctx={}){
  // 默认增量
  let focusHours = 0; let habitImpact = 0; let fiProgress = 0; let savings = 0;
  switch(actionType){
    case 'focus': // 一次番茄 25min
      focusHours = 0.42; break;
    case 'todo': // 完成焦点任务 => 执行力/杠杆
      focusHours = 0.1; break;
    case 'bill': // 记账提升数据质量，间接提升储蓄分析 (用一个极小正向提示)
      savings = 0.05; break; // 0.05% 点
    case 'habit':
      habitImpact = 0.2; break; // 习惯影响指数 +0.2(抽象值)
    default: break;
  }
  // GrowthScore 估算：仅用受影响组件的增量线性近似
  // focus component target 4h -> 每小时贡献 weights.focus * (1/4)
  const growthDelta = (focusHours/4)*weights.focus*100 + (habitImpact/100)*weights.health*0 + (fiProgress/100)*weights.fi*100; // 简化
  return {
    focusDelta: +focusHours.toFixed(2),
    growthDelta: +growthDelta.toFixed(2),
    fiDelta: +fiProgress.toFixed(2),
    savingsDelta: +savings.toFixed(2)
  };
}

module.exports = { estimateImpact };
