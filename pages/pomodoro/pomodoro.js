// pages/pomodoro/pomodoro.js
const SESSION_DUR = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
let rafId = null;

const app = getApp();
const { track } = require('../../utils/track');
const { updateSkillHours, calcSkillROI } = require('../../utils/roi');
const { updateQuestProgress } = require('../../utils/quest');
const { award } = require('../../utils/growthService');
Page({
  data: {
    sessionTypes: ['work', 'short', 'long'],
    sessionTypeOptions: ['专注 25\'', '短休 5\'', '长休 15\''],
    sessionTypeIndex: 0,
    taskNames: ['撰写文档', '阅读', '编码练习'],
    selectedTaskIndex: -1,
    timeDisplay: '25:00',
    totalDuration: SESSION_DUR.work,
    remaining: SESSION_DUR.work,
    running: false,
    hasStarted: false,
    showReward: false,
    workMinutes: 25,
  history: [],
  bindSkillIndex: -1,
  skillNames: []
  },

  onLoad(options) {
    this.drawProgress(0);
    this.refreshSkills();
    if(options && options.task){
      const taskName = decodeURIComponent(options.task);
      let { taskNames } = this.data;
      if(!taskNames.includes(taskName)){
        taskNames = [taskName, ...taskNames].slice(0,30);
      }
      const selectedTaskIndex = taskNames.indexOf(taskName);
      this.setData({ taskNames, selectedTaskIndex });
    }
  },
  refreshSkills(){
    const list = (app.globalData.skills||[]).map(s=>s.name);
    this.setData({ skillNames:list });
  },
  onShow(){ this.refreshSkills(); },
  pickBindSkill(e){ this.setData({ bindSkillIndex: Number(e.detail.value) }); },

  fmt(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  onTaskChange(e) {
    this.setData({ selectedTaskIndex: parseInt(e.detail.value, 10) });
  },

  onSessionTypeChange(e) {
    if (this.data.running) return; // 禁止运行中切换
    const idx = parseInt(e.detail.value, 10);
    const key = this.data.sessionTypes[idx];
    const dur = SESSION_DUR[key];
    this.setData({
      sessionTypeIndex: idx,
      totalDuration: dur,
      remaining: dur,
      timeDisplay: this.fmt(dur),
      showReward: false,
      hasStarted: false,
      workMinutes: key === 'work' ? 25 : key === 'short' ? 5 : 15
    });
    this.drawProgress(0);
  },

  startTimer() {
    if (this.data.running) return;
    const now = Date.now();
    this._startTS = now;
    this._pausedElapsed = this._pausedElapsed || 0;
    this.setData({ running: true, hasStarted: true, showReward: false });
    const loop = () => {
      if (!this.data.running) return;
      const elapsed = (Date.now() - this._startTS) / 1000 + this._pausedElapsed;
      const left = Math.max(0, this.data.totalDuration - elapsed);
      const remaining = Math.round(left);
      const percent = (1 - remaining / this.data.totalDuration) * 100;
      this.setData({ remaining, timeDisplay: this.fmt(remaining) });
      this.drawProgress(percent);
      if (left <= 0) {
        this.finishTimer();
        return;
      }
      rafId = this._raf(loop);
    };
    rafId = this._raf(loop);
  },

  pauseTimer() {
    if (!this.data.running) return;
    this.data.running = false; // 直接改，减少 setData 频率
    if (rafId) this._cancelRaf(rafId);
    if (this._startTS) {
      this._pausedElapsed = (this._pausedElapsed || 0) + (Date.now() - this._startTS) / 1000;
    }
    this.setData({ running: false });
  },

  resetTimer() {
    if (rafId) this._cancelRaf(rafId);
    const dur = this.data.totalDuration;
    this._pausedElapsed = 0;
    this.setData({
      remaining: dur,
      timeDisplay: this.fmt(dur),
      running: false,
      showReward: false
    });
    this.drawProgress(0);
  },

  finishTimer() {
    if (rafId) this._cancelRaf(rafId);
    this._pausedElapsed = 0;
    const key = this.data.sessionTypes[this.data.sessionTypeIndex];
    const task = this.data.selectedTaskIndex >= 0 ? this.data.taskNames[this.data.selectedTaskIndex] : '未指定';
    const now = new Date();
    const timeStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newItem = { id: Date.now(), time: timeStr, task };
    const history = [newItem, ...this.data.history].slice(0, 20);
    this.setData({
      running: false,
      remaining: 0,
      timeDisplay: '00:00',
      showReward: key === 'work',
      history
    });
    this.drawProgress(100);
    // 如果是工作番茄，记录 session
    if(key==='work'){
      const minutes = Math.round(this.data.totalDuration/60);
      app.globalData.sessions = app.globalData.sessions || [];
      const sess = { id:'ps'+Date.now(), ts: Date.now(), minutes, task };
      // 绑定技能
      if(this.data.bindSkillIndex>=0){
        const skill = (app.globalData.skills||[])[this.data.bindSkillIndex];
        if(skill){
          updateSkillHours(skill, minutes);
          sess.skillId = skill.id;
          try{
            const hourCost = (app.globalData.settings && app.globalData.settings.hourCost) || 100;
            const { roiPercent, effectiveAnnual } = calcSkillROI(skill, hourCost);
            track && track('skill_roi_calculated', { skillId: skill.id, roiPercent, effectiveAnnual });
          }catch(e){}
        }
      }
      app.globalData.sessions.unshift(sess);
  try{ award(app,'pomo_finish',{ minutes }); }catch(e){ app.addXP && app.addXP(8,'专注番茄'); }
      track && track('focus_session', { minutes, skillId: sess.skillId });
      track && track('skill_session_logged', { minutes, skillId: sess.skillId });
      app.persist && app.persist();
  // Weekly quest: 番茄任务进度
  try{ updateQuestProgress('pomo',1); }catch(e){}
    }
  },

  // 兼容 requestAnimationFrame (小程序没有 window)
  _raf(cb) { return setTimeout(() => cb(Date.now()), 1000 / 30); },
  _cancelRaf(id) { clearTimeout(id); },

  drawProgress(percent) {
    // percent 0-100 -> 绘制圆环 (背景灰, 前景主色)
    const ctx = wx.createCanvasContext('pomoRing', this);
    const size = 220; // 与样式 circle-timer 大小一致
    const center = size / 2;
    const r = center - 8;
    ctx.clearRect(0, 0, size, size);
    ctx.setLineWidth(12);
    ctx.setLineCap('round');
    // 背景
    ctx.setStrokeStyle('#e5e7eb');
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
    // 前景
    ctx.setStrokeStyle('#3366ff');
    const start = -Math.PI / 2;
    const end = start + Math.PI * 2 * (percent / 100);
    ctx.beginPath();
    ctx.arc(center, center, r, start, end);
    ctx.stroke();
    ctx.draw();
  },

  onUnload() {
    if (rafId) this._cancelRaf(rafId);
  }
});