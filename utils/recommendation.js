// recommendation.js
// 统一生成今日主建议 + 备选建议（基于复利引擎 metrics）

function buildRecommendations(engine){
  if(!engine || !Array.isArray(engine.metrics)) return { primary:null, alternatives:[], stage:null };
  // 基础排序：按 gap/target 比例
  const scored = engine.metrics.map(m=>{
    const target = Number(m.target)||0; const gap = Number(m.gap)||0; const ratio = target>0? (gap/target):0; return { metric:m, ratio }; });
  const cand = scored.filter(s=> s.ratio>0.01 && !['fiCoverage','skillCapital'].includes(s.metric.key));
  cand.sort((a,b)=> b.ratio - a.ratio);
  // 阶段判定基于 fiCoverage
  let stage='early';
  const fiMetric = engine.metrics.find(m=>m.key==='fiCoverage');
  const fiPct = fiMetric? fiMetric.value : 0;
  if(fiPct>=70) stage='sprint'; else if(fiPct>=30) stage='transition';
  // 最低核心维度诊断（focus,savings,habitCons,health,skillAnnual）做补贴优先权重
  const coreKeys = ['focus','savings','habitCons','health','skillAnnual'];
  const core = cand.filter(c=> coreKeys.includes(c.metric.key));
  if(core.length){
    // 赋予阶段加权：early 强化 savings/focus，transition 平衡 habit/health，sprint 强调 skillAnnual + 优化健康保持
    core.forEach(c=>{
      let w=1;
      if(stage==='early' && (c.metric.key==='savings' || c.metric.key==='focus')) w=1.25;
      if(stage==='transition' && (c.metric.key==='habitCons' || c.metric.key==='health')) w=1.15;
      if(stage==='sprint' && (c.metric.key==='skillAnnual' || c.metric.key==='health')) w=1.2;
      c._adj = c.ratio * w;
    });
    core.sort((a,b)=> (b._adj||b.ratio) - (a._adj||a.ratio));
  }
  // compoundScore 触发：若存在且 < 55 优先给“修补最弱维度”建议
  let primary=null; const alternatives=[];
  if(engine.compoundScore!=null && engine.compoundScore < 55 && core.length){
    const weakest = core[0].metric; // 已排序后第一为最大 gap
    primary = convertToSuggestion(weakest, { compound:true, stage });
  }else if(cand.length){
    primary = convertToSuggestion(cand[0].metric, { stage });
  }
  // 备选：取剩余 3 个（排除 primary）
  cand.filter(c=> !primary || c.metric.key!==primary.key).slice(0,3).forEach(c=> alternatives.push(convertToSuggestion(c.metric,{ stage, alt:true })));
  return { primary, alternatives, stage };
}

function convertToSuggestion(m, ctx={}){
  const stage = ctx.stage;
  const stageTail = stage==='early'? '（早期加速）' : stage==='transition'? '（结构平衡）' : stage==='sprint'? '（冲刺优化）':' ';
  switch(m.key){
    case 'focus': return { key:'focus', title:'提升专注'+(stage==='early'?'·加速':'') , desc:'完成 1 个番茄立即提升复合分数', cta:'开始番茄', go:'/pages/pomodoro/pomodoro' };
    case 'savings': return { key:'savings', title:'优化储蓄率'+(stage==='early'?'·核心':'') , desc:'复盘 1 笔>100支出 或 今日记账补全', cta:'去记账', go:'/pages/bill/bill' };
    case 'habitCons': return { key:'habit', title:'巩固习惯'+(stage==='transition'?'·平衡':'') , desc:'打卡一个高价值习惯维持连续性', cta:'去打卡', go:'/pages/habit/habit' };
    case 'health': return { key:'health', title:'补足健康'+(stage!=='early'?'·保持':''), desc:'15~20 分钟中等强度活动（快走/力量）', cta:'记录运动', go:'/pages/sport/sport' };
    case 'skillAnnual': return { key:'skill', title:'拉升技能年化'+(stage==='sprint'?'·冲刺':''), desc:'安排 25 分钟 deliberate practice', cta:'练技能', go:'/pages/skill/skill' };
    case 'fiCoverage': return { key:'fiCoverage', title:'拉升 FI 覆盖', desc:'新增或优化一个可产出现金流的资产', cta:'更新资产', go:'/pages/finance/finance' };
    case 'skillCapital': return { key:'skillCapital', title:'提升技能资本', desc:'挑选一项高 ROI 技能增加练习', cta:'练技能', go:'/pages/skill/skill' };
    default: return { key:m.key, title:(m.label||'指标')+stageTail, desc:'提升该项可改善整体复利', cta:'去行动', go:'' };
  }
}

module.exports = { buildRecommendations };
