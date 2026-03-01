// 成长子维度拆分与雷达图数据
// 目标：为成长雷达提供子项得分（0-100）及最近变化，逻辑可后续替换更精确算法
const weights = require('../config/growth-weights');

function calcGrowthSubscores(dash){
  // 输入 dash: calcDashboard 返回对象 (包含 component 比例 + 各类原始数值)
  // 输出：{ focus, finance, health, habit, leverage, roi, total } 各 0-100
  // 约定：
  // - focus: focusComponent *100
  // - finance: (fiComponent*0.6 + dash.savingsRate/100*0.4)*100 capped
  // - health: healthComponent *100
  // - habit: 依据 habitImpact 金额转化（假设 >=5000 年化视为 100）
  // - leverage: leverageComponent *100
  // - roi: roiComponent *100
  const focus = +(dash.focusComponent*100).toFixed(1);
  const finance = +((dash.fiComponent*0.6 + (dash.savingsRate!=null? (dash.savingsRate/100)*0.4:0))*100).toFixed(1);
  const health = +(dash.healthComponent*100).toFixed(1);
  const habit = Math.min(100, +( (dash.habitImpact||0)/5000*100 ).toFixed(1));
  const leverage = +(dash.leverageComponent*100).toFixed(1);
  const roi = +(dash.roiComponent*100).toFixed(1);
  const total = +( (focus*weights.focus + finance*weights.fi + health*weights.health + leverage*weights.leverage + roi*weights.roi)/ (weights.focus+weights.fi+weights.health+weights.leverage+weights.roi) ).toFixed(1);
  return { focus, finance, health, habit, leverage, roi, total };
}

module.exports = { calcGrowthSubscores };
