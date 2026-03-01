// 云函数：gain-xp
// 作用：根据事件类型为用户增加 XP，并记录一条 xp_log
// 请求参数：{ type: 'habit_complete'|'pomodoro_complete'|'finance_update'|'custom', value?:number }
// 规则：
//  - 基本表：habit_complete=10, pomodoro_complete=12, finance_update=8
//  - 自定义 value 覆盖（上限 200）
//  - 当天同类型可设软上限（可扩展：此处简单不限制）
// 返回：{ ok:true, added, newXP, level }

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const TYPE_BASE = {
  habit_complete: 10,
  pomodoro_complete: 12,
  finance_update: 8
};

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if(!openid){ return { ok:false, error:'NO_OPENID' }; }
  const { type='custom', value } = event || {};
  let add = TYPE_BASE[type] || 5;
  if(typeof value === 'number' && !isNaN(value)){ add = Math.min(200, Math.max(1, Math.floor(value))); }

  const db = cloud.database();
  const userColl = db.collection('user');
  const xpLogColl = db.collection('xp_log');

  const userRes = await userColl.where({ openid }).limit(1).get();
  if(!userRes.data.length){ return { ok:false, error:'USER_NOT_FOUND' }; }
  const user = userRes.data[0];

  const now = Date.now();
  const newXP = (user.xp||0) + add;
  const level = user.level || 1;

  // 累计行为计数（简单结构：stats.{type}）
  const statsPatch = {}; const statKey = `stats.${type}`;
  statsPatch[statKey] = (user.stats && user.stats[type] ? user.stats[type] + 1 : 1);

  await userColl.doc(user._id).update({ data:{ xp: newXP, level, updatedAt: now, ...statsPatch } });
  await xpLogColl.add({ data:{ userId: openid, type, add, before: user.xp||0, after: newXP, level, createdAt: now } });

  // 成就判定（示例规则）
  const achievementsColl = db.collection('achievements');
  const unlocked = [];
  async function tryUnlock(id, cond, payload){
    if(!cond) return; // 条件不满足
    // 是否已存在
    const exist = await achievementsColl.where({ userId: openid, id }).limit(1).get();
    if(exist.data.length) return;
    await achievementsColl.add({ data:{ userId: openid, id, createdAt: now, payload } });
    unlocked.push(id);
  }

  const totalXPAfter = newXP + (level-1)*100; // 粗略累计（未精确历史）
  const habitCompleteCount = (user.stats && user.stats.habit_complete) || (type==='habit_complete'?1:0);
  const pomoCount = (user.stats && user.stats.pomodoro_complete) || (type==='pomodoro_complete'?1:0);
  await tryUnlock('xp_500', totalXPAfter >= 500, { totalXPAfter });
  await tryUnlock('habit_10', habitCompleteCount >= 10, { habitCompleteCount });
  await tryUnlock('pomo_20', pomoCount >= 20, { pomoCount });

  return { ok:true, added:add, newXP, level, unlocked };  
};
