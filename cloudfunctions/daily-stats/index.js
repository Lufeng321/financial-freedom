// 云函数：daily-stats
// 汇总近7日 xp_log / 习惯 / 番茄 次数（示例简化）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async ()=>{
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if(!openid) return { ok:false, error:'NO_OPENID' };
  const db = cloud.database();
  const now = Date.now();
  const since = now - 7*24*3600*1000;
  const xpLog = await db.collection('xp_log').where({ userId: openid, createdAt: db.command.gte(since) }).limit(1000).get();
  const daily = {};
  xpLog.data.forEach(l=>{ const d=new Date(l.createdAt); const k=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; (daily[k]=daily[k]||{xp:0,habit:0,pomo:0}).xp+=l.add; if(l.type==='habit_complete') daily[k].habit++; if(l.type==='pomodoro_complete') daily[k].pomo++; });
  // 构造连续 7 天序列（含缺口补 0）
  const daysArr=[]; for(let i=6;i>=0;i--){ const dt=new Date(now - i*24*3600*1000); const k=`${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`; const o=daily[k]||{xp:0,habit:0,pomo:0}; daysArr.push({ date:k, ...o }); }
  const series = {
    xp: daysArr.map(d=>d.xp),
    habit: daysArr.map(d=>d.habit),
    pomo: daysArr.map(d=>d.pomo)
  };
  return { ok:true, daily, days: daysArr, series };
};
