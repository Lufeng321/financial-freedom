// 聚合周/月回顾核心指标
// 输入：globalData + 目标周或月范围
// 输出：{ rangeType:'week'|'month', startDate, endDate, savingsRate, netAssetChange, passiveIncomeDelta, topExpenseCategories:[], topSkillHours:[], moodDistribution: {happy:0,...}, habitCompletionRate, focusMinutesTotal }

function parseDate(str){ return new Date(str.replace(/-/g,'/')); }
function ymd(d){ return d.toISOString().slice(0,10); }

function getWeekRange(date){ // 周一为起点
  const d=new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay()===0?7:d.getDay();
  const start=new Date(d); start.setDate(d.getDate()-(day-1));
  const end=new Date(start); end.setDate(start.getDate()+6);
  return { start, end };
}

function filterBillsInRange(bills, start, end){
  const s=start.getTime(); const e=end.getTime()+86399999;
  return bills.filter(b=>{ if(!b.datetime) return false; const ts=parseDate(b.datetime).getTime(); return ts>=s && ts<=e; });
}

function aggregate(globalData,{ type='week', refDate=new Date() }={}){
  const g=globalData||{}; const bills=g.bills||[]; const sessions=g.sessions||[]; const diaryList=g.diaryList||[]; const habits=g.habits||[];
  let start,end,label;
  if(type==='month'){
    start=new Date(refDate.getFullYear(), refDate.getMonth(),1);
    end=new Date(refDate.getFullYear(), refDate.getMonth()+1,0);
    label = start.toISOString().slice(0,7);
  } else {
    const r=getWeekRange(refDate); start=r.start; end=r.end; label=ymd(start)+'~'+ymd(end);
  }
  // 账单
  const billsIn=filterBillsInRange(bills,start,end);
  let income=0, expense=0, passiveIncome=0;
  const expenseCatMap={};
  billsIn.forEach(b=>{
    if(b.kind==='in'){ income+=Number(b.amount)||0; if(b.incomeType==='passive') passiveIncome+=Number(b.amount)||0; }
    else if(b.kind==='out'){ expense+=Number(b.amount)||0; if(b.category){ expenseCatMap[b.category]=(expenseCatMap[b.category]||0)+Number(b.amount)||0; } }
  });
  const savings = income - expense;
  const savingsRate = income>0? Number(((savings)/income*100).toFixed(1)) : 0;
  // 顶级支出分类
  const topExpenseCategories = Object.keys(expenseCatMap).map(k=>({ category:k, amount:expenseCatMap[k] })).sort((a,b)=>b.amount-a.amount).slice(0,3);
  // 技能投入（番茄 sessions 转小时）
  const sStart=start.getTime(); const sEnd=end.getTime()+86399999;
  const sessionsIn = sessions.filter(s=> s.ts>=sStart && s.ts<=sEnd);
  const skillMinutes={}; sessionsIn.forEach(s=>{ const key=s.skillId||'其他'; skillMinutes[key]=(skillMinutes[key]||0)+Number(s.minutes||0); });
  const topSkillHours = Object.keys(skillMinutes).map(k=>({ skillId:k, hours: Number((skillMinutes[k]/60).toFixed(1)) })).sort((a,b)=>b.hours-a.hours).slice(0,3);
  const focusMinutesTotal = sessionsIn.reduce((sum,s)=>sum+Number(s.minutes||0),0);
  // 心情分布（按 diary mood 字段，假设字段名 mood）
  const moodDistribution={};
  const dStart=sStart; const dEnd=sEnd;
  diaryList.filter(d=>{ if(!d.date) return false; const ts=parseDate(d.date+' 00:00').getTime(); return ts>=dStart && ts<=dEnd; }).forEach(d=>{ const m=d.mood||'other'; moodDistribution[m]=(moodDistribution[m]||0)+1; });
  // 习惯完成率：已打卡天数 / (习惯数 * 范围天数) 简化
  const daysCount = Math.round((sEnd - sStart + 1)/86400000);
  let habitDone=0;
  habits.forEach(h=>{ const set = h.days instanceof Set? h.days: new Set(h.days||[]); set.forEach(dayStr=>{ const ts=parseDate(dayStr+' 00:00').getTime(); if(ts>=sStart && ts<=sEnd) habitDone++; }); });
  const habitCompletionRate = habits.length>0? Number((habitDone / (habits.length*daysCount) *100).toFixed(1)) : 0;
  // 净资产变化 & 被动收入增量（简单：使用 monthlySnapshots 或收入中 passive）
  // 暂无资产负债快照，以被动收入 = passiveIncome，净资产变化用 savings 近似
  const netAssetChange = savings; // placeholder
  const passiveIncomeDelta = passiveIncome; // placeholder

  // 贡献行为简化：番茄次数、打卡次数、记账次数
  const actionContrib = [];
  actionContrib.push({ key:'focus', label:'专注番茄', value: sessionsIn.length });
  const habitEvents = habitDone; actionContrib.push({ key:'habit', label:'习惯打卡', value: habitEvents });
  const billsCount = billsIn.length; actionContrib.push({ key:'bill', label:'记账条目', value: billsCount });
  actionContrib.sort((a,b)=> b.value-a.value);

  return { rangeType:type, label, start:ymd(start), end:ymd(end), savingsRate, netAssetChange, passiveIncomeDelta, topExpenseCategories, topSkillHours, moodDistribution, habitCompletionRate, focusMinutesTotal, actionContrib };
}

module.exports={ aggregate };
