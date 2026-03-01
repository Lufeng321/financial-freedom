// Weekly Quest 进度工具
// 结构：storage key 'weekly_quests' 数组 [{id,type,goal,progress,...}]
// 提供：updateQuestProgress(type, inc) -> { updated, questDone, allDone, quests }
const app = getApp();
const STORAGE_KEY = 'weekly_quests';

function readQuests(){
  let qs=[]; try{ qs = wx.getStorageSync(STORAGE_KEY) || []; }catch(e){}
  return Array.isArray(qs)? qs: [];
}
function writeQuests(qs){ try{ wx.setStorageSync(STORAGE_KEY, qs); }catch(e){} }

function updateQuestProgress(type, inc=1){
  const quests = readQuests();
  if(!quests.length) return { updated:false, quests };
  let updated=false, questDone=false;
  const now = Date.now();
  const newQuests = quests.map(q=>{
    if(q.type===type){
      const before = q.progress||0;
      const after = Math.min(q.goal, before + inc);
      if(after!==before){ updated=true; q.progress=after; q.updatedAt=now; }
      if(after===q.goal && before!==q.goal){ questDone=true; }
    }
    return q;
  });
  if(updated){ writeQuests(newQuests); }
  let allDone = newQuests.length>0 && newQuests.every(q=>q.progress>=q.goal);
  // XP 奖励（幂等：打标记）
  if(app){
    let awardFn; try{ awardFn = require('./growthService').award; }catch(e){}
    const st = app.globalData.questStatus || (app.globalData.questStatus={});
    if(questDone){
      // 单项奖励
      const rewardMap = { pomo:15, habit:15, finance:20 };
      const r = rewardMap[type] || 10;
      if(!st['quest_'+type+'_done']){ st['quest_'+type+'_done']=true; if(awardFn){ awardFn(app,'quest_single_done',{ questType:type, xpOverride:r }); } else { app.addXP && app.addXP(r,'完成任务'); } }
    }
    if(allDone && !st.allWeeklyDone){ st.allWeeklyDone=true; if(awardFn){ awardFn(app,'quest_all_done',{}); } else { app.addXP && app.addXP(50,'完成全部周任务'); } }
    app.persist && app.persist();
    try{
      if(questDone){ wx.showToast({ title:'任务完成 +XP', icon:'success' }); }
      else if(updated){ wx.showToast({ title:'进度 +1', icon:'none' }); }
      if(allDone){ wx.showToast({ title:'全部周任务完成!', icon:'success' }); }
    }catch(e){}
  }
  return { updated, questDone, allDone, quests:newQuests };
}

module.exports = { updateQuestProgress };