const app = getApp();
const { track } = require('../../utils/track.js');
const { gainXP } = require('../../utils/xp.js');
// 抽取逻辑后的服务
const { computeXP, computeFinance, computeHabits, buildRecommendationsV2, computeUpcomingAchievements, setCache, getCache, buildWeeklyQuests } = require('../../utils/profileService.js');
const { t } = require('../../utils/i18n');
Page({
  data:{
    nickname:'未命名用户',
    avatarEmoji:'👤',
  openid:'',
  loggedIn:false,
  loggingIn:false,
  zyid:'',
    level:1,
    xp:0,
    xpPercent:0,
    xpToNext:0,
    netWorth:'--', passiveYear:'--', expenseYear:'--', coreProgress:'--',
    freedomPercent:0, freedomMsg:'加载中...',
    habitCount:0, bestStreak:0, pomodoroCount:0, skillCount:0, mood:'🙂',
  badges:[], messages:[],
  i18n:{ achievementBadgesTitle: t('achievement.badgesTitle'), achievementBadgesNote: t('achievement.badgesNote') },
  hourCostInput:'',
  sportWeeklyTargetInput:'',
  recommendations:[], // V2 结构: {id,text,why,score}
  showAdvanced:false,
  locale:'zh',
  achievementsMeta:[],
  series:{ xp:[], habit:[], pomo:[] },
  loading:true,
  recIndex:0, // 轮换推荐起始索引
  upcoming:[] // 即将解锁成就
  ,weeklyQuests:[]
  ,insightLine:''
  },
  onShow(){ this.refreshAll(); this.fetchZyidFromCloud(); const tabBar=this.getTabBar&&this.getTabBar(); if(tabBar){ tabBar.setSelectedByRoute(this.route); } },
  onLoad(){ track('me_page_enter'); this.detectLocale(); this.loadAchievementsMeta(); },
  editName(e){ this.setData({ nickname:e.detail.value }); app.globalData.nickname=e.detail.value; app.persist && app.persist(); },
  chooseAvatar(){ /* 可扩展上传 */ },
  toggleTheme(){ /* 主题切换预留 */ },
  refreshStats(){ this.refreshAll(); }, // 仍保留内部使用，如需手动触发可在其他位置调用
  computeXP(g){
    let level = g.level||1; let xp=g.xp||0; let changed=false; let loop=0;
    while(loop<20){ // 防止异常死循环
      const need = level*100;
      if(xp>=need){ xp-=need; level++; changed=true; track('level_up',{ level }); }
      else break;
      loop++;
    }
    if(changed){ g.level = level; g.xp = xp; app.persist && app.persist(); }
    const nextNeed = level*100; const percent = Math.min(100, (xp/nextNeed*100));
    return { level, xp, xpPercent: percent.toFixed(1), xpToNext: Math.max(0,nextNeed-xp) };
  },
  computeFinance(g){
    const assets=g.assets||[]; const liabilities=g.liabilities||[]; const net=assets.reduce((s,a)=>s+Number(a.amount||0),0)-liabilities.reduce((s,a)=>s+Number(a.amount||0),0);
    const passiveYear = g.bills.filter(b=>b.kind==='in' && b.incomeType==='passive').reduce((s,b)=>s+Number(b.amount||0),0) + assets.reduce((s,a)=>s + Number(a.amount||0)*(Number(a.roi||0)),0);
    const expenseYear = g.bills.filter(b=>b.kind==='out').reduce((s,b)=>s+Number(b.amount||0),0);
    const dailyPassive = passiveYear/365; const dailyExpense = expenseYear/365 || 1; const freedom = Math.min(100,(dailyPassive/dailyExpense*100));
    const fmt = (n)=>{
      if(n==null || isNaN(n)) return '--';
      if(Math.abs(n)>=10000){ return (n/1000).toFixed(1).replace(/\.0$/,'')+'k'; }
      return String(Math.round(n));
    };
    return { netWorth:fmt(net), passiveYear:fmt(passiveYear), expenseYear:fmt(expenseYear), freedomPercent:freedom.toFixed(0), freedomMsg: freedom>=100?'🎉 已实现财务自由':`距离财务自由还差 ${(100-freedom).toFixed(1)}%`, coreProgress: (net>0? Math.round(net/ (passiveYear? passiveYear:1)*100):0)+'%' };
  },
  computeHabits(g){
    const habits=g.habits||[]; let best=0; habits.forEach(h=>{ if(h.streak>best) best=h.streak; }); return { habitCount:habits.length, bestStreak:best };
  },
  refreshAll: (function(){
    let timer = null;
    return function(){
      if(timer){ clearTimeout(timer); }
      timer = setTimeout(()=>{
        const g = app.globalData;
        // 安全兜底
        g.bills = Array.isArray(g.bills)? g.bills: [];
        g.assets = Array.isArray(g.assets)? g.assets: [];
        g.liabilities = Array.isArray(g.liabilities)? g.liabilities: [];
        g.habits = Array.isArray(g.habits)? g.habits: [];
        g.skills = Array.isArray(g.skills)? g.skills: [];
        const xpObj = computeXP(g);
        const fin = computeFinance(g);
        const hb = computeHabits(g);
        const pomodoroCount = g.pomodoroCount || 0;
        const skillCount = g.skills.length || 0;
        const messages=(g.messages||[]).map(m=>({...m,timeStr:(new Date(m.time)).toLocaleTimeString()}));
        const openid = g.openid||'';
        const zyid = g.zyid || this.data.zyid || g.bizId || this.data.bizId || '';
        const baseSet = {
          nickname: g.nickname||this.data.nickname,
          ...xpObj, ...fin, ...hb, pomodoroCount, skillCount, messages,
          hourCostInput: (g.settings&&g.settings.hourCost)||100,
          sportWeeklyTargetInput: (g.settings&&g.settings.sportWeeklyTarget)||150,
          openid, openidShort: openid? (openid.slice(0,6)+'…'+openid.slice(-4)):'', loggedIn: !!openid, zyid: zyid||'',
          loading:false
        };
        // 推荐 (全量池 + 轮换)
        const recPool = buildRecommendationsV2({ xpObj, fin, habitsObj: hb, pomodoroCount, skillCount });
        const slice = recPool.slice(this.data.recIndex, this.data.recIndex + 2);
        // 如果不足 2 条，循环补齐
        while(slice.length < 2 && recPool.length){
          slice.push(recPool[(slice.length) % recPool.length]);
        }
        // 增强：附加图标
        const sliceWithIcon = slice.map(r=>({ ...r, icon: this.mapRecommendationIcon(r.id) }));
        baseSet.recommendations = sliceWithIcon;
        this.setData(baseSet, ()=>{
          if(openid && !zyid){ this.fetchZyidFromCloud(); }
          this.buildBadges();
          this.buildTodaySummary(g, { hb, fin, pomodoroCount });
          this.pullRecentStats();
          // 推荐曝光埋点
          if(sliceWithIcon.length){
            track('recommendation_expose', { ids: sliceWithIcon.map(r=>r.id) });
          }
          this.computeInsight(xpObj, fin, hb, pomodoroCount);
        });
      }, 50);
    };
  })(),
  doLogin(){
    if(this.data.loggedIn){ wx.showToast({ title:'已登录', icon:'none' }); return; }
    if(this.data.loggingIn){ return; }
    if(!wx.cloud){ wx.showToast({ title:'云未初始化', icon:'none' }); return; }
    this.setData({ loggingIn:true });
    wx.showLoading({ title:'登录中' });
  track('login_click');
    wx.cloud.callFunction({ name:'login' }).then(res=>{
      const { openid } = res.result||{};
      if(!openid){ wx.showToast({ title:'登录失败', icon:'none' }); return; }
      app.globalData.openid = openid; app.persist && app.persist();
      const openidShort = openid.slice(0,6)+'…'+openid.slice(-4);
      this.setData({ openid, openidShort, loggedIn:true });
      // 获取微信用户资料（需开启 userProfile 能力）
      wx.getUserProfile({ desc:'用于完善用户资料' }).then(p=>{
        const nick = (p.userInfo && (p.userInfo.nickName||p.userInfo.nickname)) || this.data.nickname || '未命名用户';
        const avatarUrl = p.userInfo && (p.userInfo.avatarUrl || p.userInfo.avatarURL);
        this.setData({ nickname: nick });
        app.globalData.nickname = nick; app.persist && app.persist();
        if(avatarUrl){
          const ext = avatarUrl.split('?')[0].split('.').pop()||'jpg';
          const cloudPath = `avatars/${openid}.${ext}`;
          wx.cloud.uploadFile({ cloudPath, filePath: avatarUrl }).then(up=>{
            this.callCreateUser(nick, up.fileID, avatarUrl);
          }).catch(()=>{ this.callCreateUser(nick, '', avatarUrl); });
        } else {
          this.callCreateUser(nick, '', '');
        }
      }).catch(()=>{
        // 用户拒绝授权，仍创建记录（用当前昵称和 emoji）
        this.callCreateUser(this.data.nickname, '', '');
      });
      wx.showToast({ title:'登录成功', icon:'success' });
  track('login_success');
  // 尝试获取已有 ZyID
  this.fetchZyidFromCloud();
    }).catch(err=>{ console.error('login call failed', err); wx.showToast({ title:(err&&err.errMsg)?('失败:'+err.errMsg):'调用失败', icon:'none' }); }).finally(()=>{ wx.hideLoading(); this.setData({ loggingIn:false }); });
  },
  doLogout(){
    if(!this.data.loggedIn) return;
    const g = app.globalData;
    const old = g.openid;
    g.openid = '';
    this.setData({ openid:'', openidShort:'', loggedIn:false });
    app.persist && app.persist();
    wx.showToast({ title:'已退出', icon:'none' });
    console.log('logout ok, old openid =', old);
  track('logout');
  },
  callCreateUser(nickname, avatarFileID, avatarUrl){
    wx.cloud.callFunction({
      name:'create-user',
      data:{ nickname, avatarEmoji: this.data.avatarEmoji, avatarFileID, avatarUrl }
    }).then(r=>{
  const ret=r.result||{}; if(ret.ok){ const zyid = ret.bizId || ret.zyid || ''; this.setData({ zyid: (zyid||'') }); app.globalData.zyid = zyid||''; app.persist && app.persist(); }
    }).catch(e=>{ console.warn('create-user failed', e); });
  },
  copyzyid(){ if(!this.data.zyid) return; wx.setClipboardData({ data:this.data.zyid, success:()=>{ wx.showToast({ title:'已复制', icon:'none' }); } }); },
  fetchZyidFromCloud(){
    if(!wx.cloud || !this.data.loggedIn){ return; }
    if(this.data.zyid){ return; }
    const db = wx.cloud.database();
    db.collection('user').where({ openid: app.globalData.openid }).limit(1).get().then(res=>{
      if(res.data && res.data.length){
        const doc = res.data[0];
  const zyid = doc.zyid || doc.bizId || '';
        if(!doc.zyid && doc.bizId){
          // 回写补齐 zyid 字段，方便后续直接取
          try{ db.collection('user').doc(doc._id).update({ data:{ zyid: doc.bizId } }); }catch(e){}
        }
  if(zyid){ this.setData({ zyid: (zyid||'') }); app.globalData.zyid = zyid; }
      }
    }).catch(()=>{});
  },
  copyOpenid(){ if(!this.data.openid) return; wx.setClipboardData({ data:this.data.openid, success:()=>{ wx.showToast({ title:'已复制', icon:'none' }); } }); },
  onHide(){ try{ wx.hideLoading(); }catch(e){} },
  onUnload(){ try{ wx.hideLoading(); }catch(e){} },
  onHourCostInput(e){ this.setData({ hourCostInput:e.detail.value }); },
  onSportWeeklyTargetInput(e){ this.setData({ sportWeeklyTargetInput:e.detail.value }); },
  saveSettings(){
    const g=app.globalData; g.settings = g.settings||{};
    const hourCost = Number(this.data.hourCostInput)||100;
    const sportWeeklyTarget = Number(this.data.sportWeeklyTargetInput)||150;
    g.settings.hourCost = hourCost;
    g.settings.sportWeeklyTarget = sportWeeklyTarget;
    app.persist && app.persist();
    wx.showToast({ title:'已保存', icon:'success' });
  track('settings_save', { hourCost, sportWeeklyTarget });
  },
  buildBadges(){ this.fetchAchievements(); },
  detectLocale(){ try{ const sys=wx.getSystemInfoSync(); const lang=(sys.language||'zh').toLowerCase(); this.setData({ locale: lang.startsWith('zh')?'zh':'en' }); }catch(e){ this.setData({ locale:'zh' }); } },
  t(zh,en){ return this.data.locale==='zh'? (zh||en): (en||zh); },
  loadAchievementsMeta(){
    if(!wx.cloud) return;
    // 缓存尝试
    const cached = getCache('ach_meta_v1');
    if(cached){ this.setData({ achievementsMeta: cached }); }
    wx.cloud.callFunction({ name:'achievements-meta' }).then(r=>{
      const items=(r.result&&r.result.items)||[]; this.setData({ achievementsMeta: items }); setCache('ach_meta_v1', items, 24*3600*1000);
    }).catch(()=>{});
  },
  fetchAchievements(){
    if(!wx.cloud || !this.data.loggedIn){ return; }
    const db = wx.cloud.database();
    db.collection('achievements').where({ userId: this.data.openid }).limit(100).get().then(res=>{
  const raw = res.data||[];
  const docs = raw.map(d=>({ id:d.id, icon:this.mapAchievementIcon(d.id), name:this.mapAchievementName(d.id) }));
  this.setData({ badges: docs });
  // 计算即将解锁
  const stats = { totalXP: app.globalData.totalXP || (app.globalData.xpTotal || 0), habitCountDone: (app.globalData.habits||[]).reduce((s,h)=> s + (h.count||0),0), pomoCountDone: app.globalData.pomodoroCount||0 };
  const upcoming = computeUpcomingAchievements(this.data.achievementsMeta, stats, raw.map(r=>r.id));
  this.setData({ upcoming: upcoming.slice(0,3) });
    }).catch(()=>{});
  },
  mapAchievementIcon(id){
    const meta = this.data.achievementsMeta.find(m=>m.id===id);
    if(meta) return meta.icon||'🏅';
    const map={ xp_500:'⚡', habit_10:'🔥', pomo_20:'⏱️' };
    return map[id]||'🏅';
  },
  mapAchievementName(id){
    const meta = this.data.achievementsMeta.find(m=>m.id===id);
    if(meta){ return this.data.locale==='zh'? (meta.name_zh||meta.name_en||id):(meta.name_en||meta.name_zh||id); }
    const map={ xp_500:this.t('XP 500','XP 500'), habit_10:this.t('习惯10','Habit 10'), pomo_20:this.t('番茄20','Pomodoro 20') };
    return map[id]||id;
  },
  // 新增：切换推荐批次
  nextRecommendations(){
    this.setData({ recIndex: (this.data.recIndex + 2) % 4 });
    this.refreshAll();
    track('recommendation_switch');
  },
  buildTodaySummary(g, ctx){
    // 简要示例：番茄/习惯/运动与目标对比
    const sportTarget = (g.settings && g.settings.sportWeeklyTarget)||150;
    const summary = {
      sentence: '',
      sportGap: sportTarget - (g.sportWeeklyMinutes||0),
      habits: ctx.hb.habitCount,
      pomodoro: ctx.pomodoroCount
    };
    if(summary.sportGap>0){ summary.sentence = `再运动 ${summary.sportGap} 分钟接近周目标`; }
    else { summary.sentence = '本周运动目标已达成，保持！'; }
    this.setData({ todaySummary: summary });
  },
  onRecommendationTap(e){
    const id = e.currentTarget.dataset.id;
    if(id==='habit_add'){ wx.navigateTo({ url:'/pages/habit/habit' }); }
    else if(id==='pomo_start' || id==='gain_xp'){ wx.navigateTo({ url:'/pages/pomodoro/pomodoro' }); }
    else if(id==='finance_update'){ wx.navigateTo({ url:'/pages/finance/finance' }); }
    else if(id==='skill_new'){ wx.navigateTo({ url:'/pages/skill/skill' }); }
    else if(id==='habit_review'){ wx.navigateTo({ url:'/pages/habit/habit' }); }
    track('recommendation_click', { id });
    gainXP('recommend_click', 3).then(r=>{ if(r && r.unlocked && r.unlocked.length){ this.showUnlockToast(r.unlocked); } this.refreshAll(); }).catch(()=>{});
  },
  mapRecommendationIcon(id){
    const map={
      gain_xp:'⚡',
      habit_add:'🧩',
      habit_review:'🔄',
      pomo_start:'⏱️',
      finance_update:'📊',
      skill_new:'🛠️'
    };
    return map[id]||'👉';
  },
  onBadgeLongPress(e){
    const id = e.currentTarget.dataset.id;
    const meta = this.data.achievementsMeta.find(m=>m.id===id);
    if(!meta) return;
    const name = this.data.locale==='zh'? (meta.name_zh||meta.name_en||id):(meta.name_en||meta.name_zh||id);
    const desc = this.data.locale==='zh'? (meta.desc_zh||meta.desc_en||''):(meta.desc_en||meta.desc_zh||'');
    wx.showModal({ title:name, content:desc||'暂无描述', showCancel:false });
  },
  toggleAdvanced(){ this.setData({ showAdvanced: !this.data.showAdvanced }); track('toggle_advanced', { show: !this.data.showAdvanced }); },
  showUnlockToast(ids){
    const comp = this.selectComponent('#achToast');
    if(comp){ ids.forEach(id=> comp.show({ id, icon:this.mapAchievementIcon&&this.mapAchievementIcon(id), name:this.mapAchievementName&&this.mapAchievementName(id) })); }
  },
  pullRecentStats(){
    if(!wx.cloud || !this.data.loggedIn) return;
    // 缓存 5 分钟
    const cached = getCache('daily_stats_v1');
    if(cached){ this.applyDailyStats(cached); }
    wx.cloud.callFunction({ name:'daily-stats' }).then(res=>{
      const r=res.result||{}; if(r.ok){ setCache('daily_stats_v1', r, 5*60*1000); this.applyDailyStats(r); }
    }).catch(()=>{});
  }
  ,applyDailyStats(r){
    const d = r.daily||{}; const days = Object.keys(d);
    let totalPomo=0, totalHabit=0, totalXP=0;
    days.forEach(k=>{ totalPomo+=d[k].pomo; totalHabit+=d[k].habit; totalXP+=d[k].xp; });
    const avgPomo = days.length? totalPomo/days.length:0;
    const avgHabit = days.length? totalHabit/days.length:0;
    if(avgPomo<1){ const rec = this.data.recommendations||[]; if(!rec.find(r=>r.id==='pomo_start')){ rec.unshift({ id:'pomo_start', score:99, text:this.t('提升专注：开始一个番茄','Focus boost: start a pomodoro'), why:this.t('平均专注过低','Low recent focus') }); this.setData({ recommendations: rec.slice(0,2) }); } }
    const motivation = avgHabit>=2? this.t('习惯保持良好，继续巩固！','Great habit consistency—keep it!') : this.t('尝试坚持 2 个以上关键习惯提升节奏','Aim for 2+ key habits to build rhythm');
    if(this.data.todaySummary){ this.setData({ todaySummary: { ...this.data.todaySummary, motivation } }); }
    if(r.series){ this.setData({ series: r.series }); }
    // 生成或加载本周任务
    this.initWeeklyQuests({ avgPomo, avgHabit });
  this.computeInsight(null,null,null,null,{ avgPomo, avgHabit });
  }
  ,initWeeklyQuests(basis){
    // 读取已有进度
    let stored=[]; try{ stored = wx.getStorageSync('weekly_quests')||[]; }catch(e){}
    if(!stored.length){
      const quests = buildWeeklyQuests({ avgPomo: basis.avgPomo, avgHabit: basis.avgHabit, freedomPercent: this.data.freedomPercent });
      stored = quests.map(q=>({ ...q, progress:0, startedAt: Date.now(), week: this.getWeekKey() }));
      try{ wx.setStorageSync('weekly_quests', stored); }catch(e){}
    } else {
      // 校验周是否切换
      const wk = this.getWeekKey();
      if(!stored[0] || stored[0].week !== wk){
        const quests = buildWeeklyQuests({ avgPomo: basis.avgPomo, avgHabit: basis.avgHabit, freedomPercent: this.data.freedomPercent });
        stored = quests.map(q=>({ ...q, progress:0, startedAt: Date.now(), week:wk }));
        try{ wx.setStorageSync('weekly_quests', stored); }catch(e){}
      }
    }
    this.setData({ weeklyQuests: stored });
  }
  ,getWeekKey(){ const d=new Date(); const first = new Date(d.getFullYear(),0,1); const day = Math.floor((d - first)/86400000); return d.getFullYear() + '_w' + Math.floor(day/7); }
  ,updateQuestProgress(type, inc=1){
    let stored=[]; try{ stored = wx.getStorageSync('weekly_quests')||[]; }catch(e){}
    let changed=false;
    stored = stored.map(q=>{ if(q.type===type){ const np = Math.min(q.goal, (q.progress||0)+inc); if(np!==q.progress){ changed=true; return { ...q, progress:np }; } } return q; });
    if(changed){ try{ wx.setStorageSync('weekly_quests', stored); }catch(e){} this.setData({ weeklyQuests: stored }); }
  }
  ,computeInsight(xpObj, fin, hb, pomo, extra){
    // 根据当前数据生成 1~2 条组合洞察
    const msgs=[];
    if(fin && Number(fin.freedomPercent)<50){ msgs.push('财务自由进度关注资产积累'); }
    if(hb && hb.habitCount<3){ msgs.push('再设 1~2 个关键习惯建立节奏'); }
    if(typeof pomo==='number' && pomo<1){ msgs.push('来一个番茄启动专注'); }
    if(xpObj && xpObj.xpToNext<=50){ msgs.push('冲刺升级获取新徽章'); }
    if(extra){ if(extra.avgHabit>=2 && !msgs.length){ msgs.push('习惯保持良好，适度加挑战'); } }
    const line = msgs.slice(0,2).join(' · ');
    if(line && line!==this.data.insightLine){ this.setData({ insightLine: line }); }
  }
});