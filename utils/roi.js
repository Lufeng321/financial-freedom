// 技能 ROI 计算 (Phase 0 简化)
// ROI% = (expectedAnnualUplift * confidence) / (investedCost + investedHours * hourCost) *100
// 若分母为 0 返回 null

function calcSkillROI(skill, hourCost){
  if(!skill) return { roiPercent:null, effectiveAnnual:0 };
  const investedHours = Number(skill.investedHours||0);
  const investedCost = Number(skill.investedCost||0);
  const uplift = Number(skill.expectedAnnualUplift||0);
  const confidence = Number(skill.confidence||0);
  const effectiveAnnual = uplift * confidence;
  const denom = investedCost + investedHours * hourCost;
  if(denom <= 0) return { roiPercent:null, effectiveAnnual };
  const roiPercent = +(effectiveAnnual / denom * 100).toFixed(1);
  return { roiPercent, effectiveAnnual };
}

function sortSkillsByROI(list, hourCost){
  return (list||[]).map(s=>{
    const r = calcSkillROI(s, hourCost);
    return { ...s, _roi: r.roiPercent, _effectiveAnnual: r.effectiveAnnual };
  }).sort((a,b)=> (b._roi||-Infinity) - (a._roi||-Infinity));
}

function updateSkillHours(skill, minutes){
  const hAdd = (Number(minutes)||0)/60;
  skill.investedHours = +(Number(skill.investedHours||0)+hAdd).toFixed(2);
  skill.lastSessionAt = Date.now();
  // 练习后适度恢复 confidence（渐进回升）
  if(typeof skill.confidence === 'number'){
    const inc = Math.min(0.02, minutes/1500); // 25min≈0.016
    skill.confidence = +(Math.min(1, (skill.confidence||0)+inc)).toFixed(3);
  }
  return skill;
}

// 每日调用一次，对长期未练习技能应用衰减。
function decaySkills(state){
  if(!state || !Array.isArray(state.skills)) return;
  const today = new Date().toISOString().slice(0,10);
  state.skills.forEach(s=>{
    if(!s) return;
    if(s._decayDate === today) return; // 当天已处理
    s._decayDate = today;
    const last = s.lastSessionAt || 0;
    if(!last) return;
    const days = (Date.now() - last)/86400000;
    if(days <= 14) return;
    if(typeof s.confidence !== 'number') return;
    // 每超过14天，对超出部分的每7天按 0.95 衰减因子
    const extra = days - 14;
    const periods = extra / 7;
    const factor = Math.pow(0.95, periods);
    const minFloor = 0.3;
    s.confidence = +(Math.max(minFloor, s.confidence * factor)).toFixed(3);
  });
}

module.exports = { calcSkillROI, sortSkillsByROI, updateSkillHours, decaySkills };
