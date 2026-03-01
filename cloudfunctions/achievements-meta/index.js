// 云函数：achievements-meta
// 返回成就元数据（可后续迁移到数据库）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async ()=>{
  return {
    ok:true,
    items:[
      { id:'xp_500', icon:'⚡', name_zh:'XP 500', name_en:'XP 500', desc_zh:'累计获得 500 XP', desc_en:'Reach total 500 XP' },
      { id:'habit_10', icon:'🔥', name_zh:'习惯10', name_en:'Habit 10', desc_zh:'完成 10 次习惯打卡', desc_en:'Complete 10 habit check-ins' },
      { id:'pomo_20', icon:'⏱️', name_zh:'番茄20', name_en:'Pomodoro 20', desc_zh:'完成 20 个番茄', desc_en:'Finish 20 pomodoros' }
    ]
  };
};
