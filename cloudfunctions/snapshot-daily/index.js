// 云函数：snapshot-daily
// 作用：每日聚合核心 KPI (FI 进度 / 储蓄率 / 技能 ROI Top 等) 写入 kpi_snapshots 集合（幂等按 date）

const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const { finance={}, skills=[], sessions=[], habits=[], weeklySportMinutes } = event || {};
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
  // 计算 KPI
  const fiProgress = finance.freedom != null ? finance.freedom : 0;
  const savingsRate = finance.savingsRate != null ? finance.savingsRate : null;
  const focusMinutesToday = sessions.filter(s=> isToday(s.ts)).reduce((a,b)=> a + Number(b.minutes||0),0);
  const focusHours = +(focusMinutesToday/60).toFixed(2);
  const habitImpact = habits.reduce((sum,h)=> sum + Number(h.estimatedAnnualImpact||0),0);
  const healthPercent = weeklySportMinutes!=null? Math.min(100, Math.round(weeklySportMinutes/150*100)) : 0;
  // 技能 ROI Top3
  const topSkillROI = skills.filter(s=> s.roiPercent!=null).sort((a,b)=> b.roiPercent-a.roiPercent).slice(0,3).map(s=>({ skillId:s.id||s.skillId||s.name, roiPercent:s.roiPercent }));
  const db = cloud.database();
  const coll = db.collection('kpi_snapshots');
  // 幂等：按 userId+date 更新或插入
  const existing = await coll.where({ userId, date: dateStr }).get();
  const doc = {
    userId,
    date: dateStr,
    fiProgress,
    savingsRate,
    focusHours,
    habitImpact,
    healthPercent,
    topSkillROI,
    updatedAt: Date.now(),
    createdAt: existing.data && existing.data.length? existing.data[0].createdAt : Date.now(),
    schemaVersion:1
  };
  if(existing.data && existing.data.length){
    await coll.doc(existing.data[0]._id).update({ data: doc });
  } else {
    await coll.add({ data: doc });
  }
  return { status:'ok', upserted:true, date:dateStr, fiProgress, savingsRate };
};

function isToday(ts){
  if(!ts) return false;
  const d = new Date(ts); const now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}
