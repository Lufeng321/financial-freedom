const app = getApp();
const { calcSkillROI, updateSkillHours } = require('../../utils/roi');
const { track } = require('../../utils/track');
const { award } = require('../../utils/growthService');
Page({
  data:{
    form:{ targetSkill:'', dailyMinutes:'60', currentLevel:'basic', goal:'' },
    levelRange:['零基础 / 从未接触','有基础 / 看过教程','已掌握核心概念','较熟练 / 需要进阶'],
    levelValues:['zero','basic','intermediate','advanced'],
    levelIndex:1,
    planTasks:[],
    planSummary:'',
    allSelected:false,
  newSkill:{ name:'', level:'', investedHours:'', investedCost:'', expectedAnnualUplift:'', confidence:'80' },
  skills:[]
  },
  onShow(){ this.refreshSkills(); const tabBar=this.getTabBar&&this.getTabBar(); if(tabBar){ tabBar.setSelectedByRoute(this.route); } },
  onInput(e){ const f=e.currentTarget.dataset.field; this.setData({ [`form.${f}`]: e.detail.value }); },
  pickLevel(e){ const idx=Number(e.detail.value); this.setData({ levelIndex:idx, 'form.currentLevel': this.data.levelValues[idx] }); },
  genPlan(){
    const { targetSkill, dailyMinutes, currentLevel } = this.data.form;
    if(!targetSkill){ wx.showToast({title:'填技能',icon:'none'}); return; }
    const baseWeeksMap={zero:12,basic:10,intermediate:8,advanced:6};
    const dm = Number(dailyMinutes)||30;
    const timeFactor = dm>=120?0.8: dm>=60?1:1.2;
    const weeks = Math.ceil(baseWeeksMap[currentLevel]*timeFactor);
    const phases=[
      { key:'基础认知', p:0.25, focuses:['概念地图','核心术语','环境安装'] },
      { key:'结构深化', p:0.30, focuses:['关键组件','模式实践','常见陷阱'] },
      { key:'实战项目', p:0.30, focuses:['小项目设计','实现迭代','上线复盘'] },
      { key:'巩固提升', p:0.15, focuses:['复习错题','性能优化','总结输出'] }
    ];
    let tasks=[]; let id=0;
    phases.forEach(ph=>{
      ph.focuses.forEach((f,i)=>{
        tasks.push({ id:'pt'+(++id), title:`${ph.key}:${f}`, phase:ph.key, est: Math.ceil(weeks*ph.p*dm/60/ph.focuses.length), focus: ph.key==='实战项目' && i===0, selected:false });
      });
    });
    this.setData({ planTasks:tasks, planSummary:`${targetSkill} 预计 ${weeks} 周`, allSelected:false });
  },
  toggleSelect(e){ const id=e.currentTarget.dataset.id; this.setData({ planTasks:this.data.planTasks.map(t=>t.id===id?{...t,selected:!t.selected}:t) }); },
  toggleSelectAll(){ const all=!this.data.allSelected; this.setData({ allSelected:all, planTasks:this.data.planTasks.map(t=>({...t,selected:all})) }); },
  importTodos(){
    const selected=this.data.planTasks.filter(t=>t.selected);
    if(!selected.length){ wx.showToast({title:'未选择',icon:'none'}); return; }
  selected.forEach(t=> app.globalData.todos.push({ id:'ai'+t.id, title:t.title, done:false, priority:t.focus?'high':'normal', focus:t.focus }));
  try{ award(app,'todo_create',{ batchImport:true, count:selected.length, xpOverride:selected.length*4 }); }catch(e){ app.addXP && app.addXP(selected.length*4,'导入AI计划'); }
    app.persist();
    wx.showToast({ title:'已导入', icon:'success' });
  }
  ,refreshSkills(){
    const raw = app.globalData.skills || [];
    const hourCost = (app.globalData.settings && app.globalData.settings.hourCost) || 100;
    const mapped = raw.map(s=>{
      const level = Math.floor(s.xp/100)+1;
      const percent = Math.min(100, s.xp%100);
      const { roiPercent, effectiveAnnual } = calcSkillROI(s, hourCost);
      return { id:s.id, name:s.name, xp:s.xp, level, percent, roiPercent, confidence: s.confidence, effectiveAnnual };
    }).sort((a,b)=> (b.roiPercent||-1) - (a.roiPercent||-1));
    this.setData({ skills:mapped });
  },
  onNewSkillInput(e){
    const f = e.currentTarget.dataset.field;
    this.setData({ newSkill:{ ...this.data.newSkill, [f]: e.detail.value } });
  },
  addSkill(){
    const { name, level, investedHours, investedCost, expectedAnnualUplift, confidence } = this.data.newSkill;
    if(!name){ wx.showToast({ title:'填名称', icon:'none'}); return; }
    const lv = Number(level)||1;
    const xp = (lv-1)*100 + 10; // 给一个起始 xp
    app.globalData.skills.push({
      id:'s'+Date.now(),
      name,
      xp,
      investedHours: Number(investedHours)||0,
      investedCost: Number(investedCost)||0,
      expectedAnnualUplift: Number(expectedAnnualUplift)||0,
      confidence: Number(confidence)||80
    });
  try{ award(app,'skill_new',{ name }); }catch(e){ app.addXP && app.addXP(10,'新增技能'); }
    track && track('skill_created', { name });
    app.persist();
    this.setData({ newSkill:{ name:'', level:'', investedHours:'', investedCost:'', expectedAnnualUplift:'', confidence:'80' } });
    this.refreshSkills();
    wx.showToast({ title:'已添加', icon:'success' });
  },
  addExp(e){
    const id = e.currentTarget.dataset.id;
    const skill = app.globalData.skills.find(s=>s.id===id);
    if(!skill){ return; }
    skill.xp += 20;
    // 经验增加同时记一次 25 分钟练习（可后续改成输入）用于更新投入 & confidence 恢复
    try{ updateSkillHours(skill, 25); }catch(err){}
  try{ award(app,'skill_practice',{ id }); }catch(e){ app.addXP && app.addXP(6,'技能练习'); }
    track && track('skill_exp_added', { id });
    app.persist();
    this.refreshSkills();
  }
});