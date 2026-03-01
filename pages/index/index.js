const app = getApp();
const { track } = require('../../utils/track');
const { genTodayActions, calcDashboard, markActionCompleted } = require('../../utils/dashboardService');
const { buildActionPool } = require('../../utils/actionPool');
const { memo } = require('../../utils/stateMemo');
const { getActivationState } = require('../../utils/activation');
const { awardAction } = require('../../utils/award');
// metricsInfo 改为按需加载，减小首屏包体
let _metricsInfoCache = null;
const { formatDate } = require('../../utils/date');
const { estimateImpact } = require('../../utils/impactEstimator');
// 新增：复利引擎与推荐
const { buildEngine } = require('../../utils/compoundingEngine');
const { buildRecommendations } = require('../../utils/recommendation');
const { decaySkills } = require('../../utils/roi');
// XP 周倍增读取
const { getXPBoost, getXPBoostState } = require('../../utils/xpMultiplier');
const { listRecent } = require('../../utils/eventLog');

Page({
	data:{
		focusList:[],
		// MVP: 今日行动推荐（1-3 条）
		todayActionList:[], // [{id,type,title,cta,go}]
		// 新增：关键指标速览（顶部三栏）
		summaryMetrics:[], // [{key,label,value,unit}]
		// 新增：今日重点建议（基于最大改善空间指标）
		prioritySuggestion:null, // 新：来自 recommendation.primary
		quickActions:[],
		highlightSummaryKeys:[],
		// 激活引导
		activationSteps:[], // [{key,title,cta,go,done}]
		activationProgress:0,
		activationAllDone:true,
		// 核心信息架构优化：新增扩展区折叠（把次级/延展性指标与列表统一折叠）
		extendedCollapsed:true,
		// 指标分层（去重：growth 由独立主卡展示，不再出现在网格中）
		coreDashKeys:['fi','goal','focus'],
		extendedDashKeys:['budget','savings','roi','lever','habit','health'],
		coreDashRender:[],
		extendedDashRender:[],
		showMetricInfo:false,
		metricInfoContent:{},
		habits:[],
		finance:{ freedom:0, dayPassive:0, dayExpense:0 },
		todayDate:'',
		weekday:'',
		greeting:'',
		sport:{ time:0, distance:0, cal:0, percent:0 },
		progressStyle:'',
		freedomWidth:'0%',
		// 新 Dashboard 占位指标
		dashFiProgress:0,
		dashSavingsRate:null,
		dashSkillROI:[], // [{name,roiPercent}]
		dashFocusHours:0,
		dashHabitImpact:0,
		dashHealthPercent:0,
		dashHealthColor:'linear-gradient(90deg,#16a34a,#4ade80)',
		dashLeverCompleted:0,
		dashLeverBonus:0,
		dashGrowthScore:0,
		// 排序相关（移除 growth，避免与主 Growth Card 重复）
		dashOrder:['fi','goal','budget','savings','focus','roi','lever','habit','health'],
		dashReorder:false,
		dashDisplay:{ fi:true, goal:true, budget:true, savings:true, focus:true, roi:true, lever:true, habit:true, health:true },
		allDashKeys:['fi','goal','budget','savings','focus','roi','lever','habit','health'],
		dashOrderRender:[],
		unreadCount:0,
		showFullDashboard:false,
		showActionFeedback:false,
		lastActionFeedback:{},
		showUnlock:false,
		// 新增：昨日对比 & 改进洞察
		dayDiff:[], // [{key,label,value,prev,diff,unit,trend}]
		improvementInsights:[] // 新：由 recommendation.alternatives 替换
		,
		// 已精简：机会卡折叠状态移除（合并至 insights-card）
		opportunityExpanded:false,
		// 新增：概览卡合并成长 + summary
		overviewMetrics:[], // summaryMetrics 改写后的最终展示数组
		// 新用户精简模式
		newUserSimpleMode:true,
		// 新增：复利引擎数据与 velocity
		engineMetrics:[],
		velocity:null,
		xpMultiplier:1,
		velocityColor:'#2563eb',
		habitConsistencyPercent:null,
		compoundScore:null,
		fiCoverage:null,
		stageStrategy:null,
		recommendedDashKey:null,
		showGrowthBreak:false,
		growthBreakItems:[],
		growthBalancePenalty:1
		, recentEvents:[]
		, xpCriteria:{}
	},
	// velocity 说明
	showVelocityInfo:false,
	// Tooltip 引导相关（首次展示核心指标说明）
	activeMetricTooltip:false,
	metricTooltipQueue:[],
	metricTooltipStep:0,
	metricTooltipTotal:0,
	metricTooltipContent:{},
	metricTooltipPos:{ top:120, left:40 },
	// 指标区域折叠
	metricsCollapsed:true,
	onLoad(){
		// 读取本地排序
		try{
			const order = wx.getStorageSync('dashboard:order');
			if(order && Array.isArray(order) && order.length){ this.setData({ dashOrder:order.filter(k=>k!=='growth') }); }
			const display = wx.getStorageSync('dashboard:display');
			if(display && typeof display==='object'){ const nd={ ...display }; delete nd.growth; this.setData({ dashDisplay:{ ...this.data.dashDisplay, ...nd } }); }
			// 初始化快捷操作使用统计
			this._quickActionUsage = wx.getStorageSync('quickAction:usage') || {};
		}catch(e){}
		// 初始化快捷操作集合
		this._initQuickActions();
		this._checkSimpleMode();
	},
	_initQuickActions(){
		const usage = this._quickActionUsage || {};
		const actions = [
			{ key:'record', label:'记录', handler:'openQuickCapture' },
			{ key:'todo', label:'任务', handler:'goTodo' },
			{ key:'habit', label:'习惯', handler:'goHabit' },
			{ key:'sport', label:'运动', handler:'goSport' },
			{ key:'bill', label:'记账', handler:'goBill' }
		];
		// 根据使用频次排序（记录越多越靠前）
		actions.sort((a,b)=> (usage[b.key]||0) - (usage[a.key]||0));
		this.setData({ quickActions: actions.slice(0,4) });
	},
	onShow(){
		this.refresh();
		track && track('dashboard_open', { ts: Date.now(), cardCount:6 });
		const tabBar = this.getTabBar && this.getTabBar();
		if(tabBar){ tabBar.setSelectedByRoute(this.route); }
		// 首次目标引导
		const g = app.globalData;
		if(g._needGoalOnboard){
			setTimeout(()=>{ wx.showModal({ title:'设定你的关键财务目标', content:'先设定应急金、储蓄率或被动收入目标，Dashboard 才能显示进度。', confirmText:'去设置', success:res=>{ if(res.confirm){ wx.navigateTo({ url:'/pages/goal/goal' }); } } }); }, 400);
		}
		// 指标首次引导（仅展示一次）
		this.tryStartMetricTooltip();
	},
	refresh(){
		const g = app.globalData;
		this._lastRefreshTs = Date.now();
		// 技能信心衰减（每日一次）
		try{ decaySkills(g); }catch(e){}
		// 激活状态计算
		const activation = getActivationState(g);
		// 统一行动池
		const pool = buildActionPool(g);
		const typeLabelMap = { goal:'目标', focus:'专注', sport:'运动', todo:'任务', bill:'记账' };
		const quickDoneTypes = new Set(['focus','todo','bill']);
		const todayActionList = pool.top.map(a=>({ id:a.id, type:a.type, title:a.title, cta:a.cta, go:a.go, typeLabel: typeLabelMap[a.type]||a.type, quickDone: quickDoneTypes.has(a.type), completed:false }));
		// 激活奖励逻辑
		try{
			const rewarded = new Set(wx.getStorageSync('activation:rewarded')||[]);
			const newly = activation.steps.filter(s=> s.done && !rewarded.has(s.key));
			if(newly.length){
				let totalXp=0; newly.forEach(st=>{ totalXp += awardAction(app,'activation_step',{ step:st.key }); rewarded.add(st.key); });
				wx.setStorageSync('activation:rewarded', Array.from(rewarded));
				wx.showToast({ title:`+${totalXp}XP 激活`, icon:'none' });
			}
			if(!this._prevActivationAllDone && activation.allDone){
				awardAction(app,'activation_all',{});
				wx.showToast({ title:'激活完成 · 解锁更多指标', icon:'success' });
			}
			this._prevActivationAllDone = activation.allDone;
		}catch(e){}
		// 未完成激活时强制收起扩展
		if(!activation.allDone && !this.data.extendedCollapsed){ this.setData({ extendedCollapsed:true }); }
		if(!this._actionsTracked){ track('dashboard_actions_generated', { count: todayActionList.length, poolTotal: pool.list.length }); this._actionsTracked=true; }
		// habits 转换 todayDone
		const today = this.formatDate(new Date());
		const habits = g.habits.map(h=>({
			id:h.id,
			name:h.name,
			todayDone:h.days instanceof Set ? h.days.has(today) : (h.days||[]).includes(today)
		}));
		const dash = memo('dashboard', g, ()=> calcDashboard(g));
		const percent = dash.sport.percent;
		// ===== 日切换 & 昨日快照管理 =====
		try {
			const todayStr = this.formatDate(new Date());
			const currentDayStored = wx.getStorageSync('dashboard:currentDay');
			if(currentDayStored && currentDayStored !== todayStr){
				// 将昨日 todaySnapshot 迁移为 prevDay
				const yesterdaySnapshot = wx.getStorageSync('dashboard:todaySnapshot');
				if(yesterdaySnapshot){ wx.setStorageSync('dashboard:prevDay', yesterdaySnapshot); }
			}
			if(currentDayStored !== todayStr){ wx.setStorageSync('dashboard:currentDay', todayStr); }
		}catch(e){}
		// 今日快照（用于次日对比）
		const todaySnapshot = {
			fiProgress: dash.fiProgress,
			focusHours: dash.focusHours,
			savingsRate: dash.savingsRate,
			healthPercent: dash.healthPercent,
			growthScore: dash.growthScore
		};
		try{ wx.setStorageSync('dashboard:todaySnapshot', todaySnapshot); }catch(e){}
		// 生成昨日对比
		let dayDiff = [];
		try{
			const prevDay = wx.getStorageSync('dashboard:prevDay')||null;
			if(prevDay){
				dayDiff = this._buildDayDiff(prevDay, todaySnapshot);
			}
		}catch(e){}
		const now = new Date();
		const focusList = g.todos.filter(t=>t.focus).slice(0,5).map(t=>({
			...t,
			priorityIcon: t.priority==='high' ? 'arrow-up-rectangle' : t.priority==='low' ? 'arrow-down-rectangle' : 'time'
		}));
		// 目标进度 & 渲染数组（分层：核心 / 扩展）
		const visible = this.data.dashOrder.filter(k=> this.data.dashDisplay[k]);
		let coreDashRender = visible.filter(k=> this.data.coreDashKeys.includes(k));
		let extendedDashRender = visible.filter(k=> this.data.extendedDashKeys.includes(k));
		// 折叠：动态需要度评分 (进度差值 + 最近交互时间)
		if(this.data.metricsCollapsed){
			const needScores = {};
			const nowTs = Date.now();
			const lastTouch = g._metricTouch || {};
			const progressMap = {
				fi: (dash.fiProgress||0)/100,
				goal: Math.min(1,(dash.goalEmergencyPct+dash.goalPassivePct+dash.goalSavingsPct)/300),
				budget: 1 - Math.min(1, Math.max(0,(dash.budgetPct||0)/100)),
				savings: (dash.savingsRate||0)/100,
				focus: Math.min(1,(dash.focusHours||0)/4),
				roi: 0.5,
				lever: Math.min(1,(dash.leverCompleted||0)/5),
				growth: Math.min(1,(dash.growthScore||0)/100),
				habit: Math.min(1,(dash.habitImpact||0)/100),
				health: Math.min(1,(dash.healthPercent||0)/100)
			};
			Object.keys(progressMap).forEach(k=>{
				const p = progressMap[k];
				const recencyHrs = (nowTs - (lastTouch[k]||0))/3600000;
				const recencyFactor = Math.min(2, recencyHrs/12);
				const gap = 1 - p;
				needScores[k] = gap * 0.7 + recencyFactor * 0.3;
			});
			// 折叠态：核心保持（上限3），扩展挑选若干优先级最高项（用于展开后初始顺序优化）
			coreDashRender = coreDashRender.slice(0,3);
			extendedDashRender = extendedDashRender.sort((a,b)=> (needScores[b]||0)-(needScores[a]||0));
		}
		const unreadCount = (g.messages||[]).filter(m=>!m.read).length;
		const unreadDisplay = unreadCount>99? '99+': unreadCount;
		const unlockPopup = (!this._unlockShownOnce && activation.allDone && !this._prevActivationAllDone);
		if(unlockPopup){ this._unlockShownOnce=true; }
		// 记录刷新前仪表基线（用于后续行动真实增量）
		this._dashboardBaseline = {
			focusHours: dash.focusHours,
			growthScore: dash.growthScore,
			fiProgress: dash.fiProgress,
			savingsRate: dash.savingsRate
		};
		// ===== 动态 summary 指标选择 =====
		const cand = [
			{ key:'fi', label:'FI', value: dash.fiProgress, unit:'%', target:100, base:2 },
			{ key:'focus', label:'专注', value: dash.focusHours, unit:'h', target:4, base:1 },
			{ key:'savings', label:'储蓄率', value: dash.savingsRate, unit:'%', target:50, base:1 },
			{ key:'habit', label:'习惯', value: dash.habitImpact, unit:'', target:100, base:.8 },
			{ key:'health', label:'健康', value: dash.healthPercent, unit:'%', target:100, base:1 }
		];
		// 复合分数（若可用）加入候选，不强制保留
		if(this.data.compoundScore!=null){ cand.push({ key:'compound', label:'复合', value: this.data.compoundScore, unit:'', target:100, base:1.4 }); }
		// FI 永远保留，其余按“差距” + 基础权重排序
		const fiItem = cand.find(c=>c.key==='fi');
		const others = cand.filter(c=>c.key!=='fi');
		others.forEach(o=>{ if(o.value==null) o._score = 1.5; else { const gap = Math.max(0, (o.target - o.value)/o.target); o._score = gap*0.7 + o.base*0.3; } });
		others.sort((a,b)=> (b._score||0)-(a._score||0));
		const chosen = [fiItem, ...others.slice(0,2)];
		// 计算高亮：对比上一次值是否提升
		const prev = this._prevSummaryValues || {};
		const highlightKeys = [];
		chosen.forEach(it=>{ const v = Number(it.value); if(!isNaN(v) && prev[it.key]!=null){ if(v>prev[it.key]) highlightKeys.push(it.key); } });
		this._prevSummaryValues = chosen.reduce((m,it)=>{ if(it.value!=null && it.value!=='--') m[it.key]=Number(it.value); return m; }, {});
		let summaryMetrics = chosen.map(it=>({ key:it.key, label:it.label, value: it.value!=null? it.value : '--', unit:it.unit }));
		// 概览卡 metrics（可能受简化模式约束）
		let overviewMetrics = summaryMetrics.slice();
		if(this.data.newUserSimpleMode){ overviewMetrics = overviewMetrics.slice(0,2); }
		// 新：构建复利引擎 + 推荐
		const engine = buildEngine(app, dash);
		// 从引擎抽取习惯保持率
		let habitConsistencyPercent=null; try{ const hc=engine.metrics.find(m=>m.key==='habitCons'); if(hc) habitConsistencyPercent = hc.value; }catch(e){}
		// 读取周 XP 倍增（不触发 skill 计入）
		let xpMultiplier=1; let xpCriteria={}; try{
			if(getXPBoostState){ const st=getXPBoostState(app); xpMultiplier=st.multiplier||1; xpCriteria=st.criteria||{}; }
			else if(getXPBoost){ xpMultiplier = getXPBoost(app,'_display') || 1; }
		}catch(e){}
		// velocity 颜色
		let velocityColor='#2563eb'; if(engine.velocity){ const p=engine.velocity.percent||0; if(p<30) velocityColor='#dc2626'; else if(p<70) velocityColor='#f59e0b'; else velocityColor='#16a34a'; }
		const rec = buildRecommendations(engine);
		const prioritySuggestion = rec.primary || null;
		const improvementInsights = rec.alternatives || [];
		// 阶段策略文案
		let stageStrategy=null;
		const stage = rec.stage;
		if(stage){
			if(stage==='early') stageStrategy={ stage, label:'早期加速', bullets:['提高储蓄率与专注小时','建立 2~3 个高价值习惯','积累可复利资产基数'] };
			else if(stage==='transition') stageStrategy={ stage, label:'结构平衡', bullets:['补齐习惯/健康短板','稳步拉升技能年化','维持 ≥50% 储蓄率'] };
			else if(stage==='sprint') stageStrategy={ stage, label:'冲刺优化', bullets:['提升技能资本与健康稳定性','微调支出结构','聚焦高杠杆项目'] };
		}
		// 推荐 dash 卡高亮映射
		let recommendedDashKey=null;
		if(prioritySuggestion){
			const map={ focus:'focus', savings:'savings', habit:'habit', health:'health', skill:'roi' };
			const rk = map[prioritySuggestion.key];
			if(rk) recommendedDashKey=rk;
		}
		// 倍增升级 & 指标跃升事件记录
		try{
			if(this._prevXPMult && xpMultiplier>this._prevXPMult){
				logEvent && logEvent({ type:'multiplier_upgrade', xp:0, desc:`倍增至x${xpMultiplier.toFixed(2)}` });
				wx.showToast({ title:`XP倍增 x${xpMultiplier.toFixed(2)}`, icon:'none' });
			}
			this._prevXPMult = xpMultiplier;
			const prevJump = this._prevMetricJump || {};
			const velocityP = engine.velocity ? (engine.velocity.percent||0):0;
			const jumpMsgs=[];
			if(prevJump.fi!=null && dash.fiProgress - prevJump.fi >= 1) jumpMsgs.push(`FI +${(dash.fiProgress - prevJump.fi).toFixed(1)}%`);
			if(prevJump.savings!=null && dash.savingsRate - prevJump.savings >= 2) jumpMsgs.push(`储蓄率 +${(dash.savingsRate - prevJump.savings).toFixed(1)}%`);
			if(prevJump.focus!=null && dash.focusHours - prevJump.focus >= 0.5) jumpMsgs.push(`专注 +${(dash.focusHours - prevJump.focus).toFixed(1)}h`);
			if(prevJump.velocity!=null && velocityP - prevJump.velocity >= 5) jumpMsgs.push(`动能 +${(velocityP - prevJump.velocity).toFixed(1)}%`);
			if(jumpMsgs.length){ logEvent && logEvent({ type:'metric_jump', xp:0, desc: jumpMsgs.join(' · ') }); }
			this._prevMetricJump = { fi: dash.fiProgress, savings: dash.savingsRate, focus: dash.focusHours, velocity: velocityP };
		}catch(e){}
		this.setData({
			todayActionList,
			summaryMetrics,
			prioritySuggestion,
			dayDiff,
			improvementInsights,
			engineMetrics: engine.metrics,
			velocity: engine.velocity,
			compoundScore: engine.compoundScore,
			fiCoverage: engine.fiCoverage,
			stageStrategy,
			recommendedDashKey,
			xpMultiplier: +xpMultiplier.toFixed(2),
			velocityColor,
			habitConsistencyPercent,
			xpCriteria,
			overviewMetrics,
			newUserSimpleMode: this._checkSimpleMode(),
			highlightSummaryKeys: highlightKeys,
			activationSteps: activation.steps,
			activationProgress: activation.progress,
			activationAllDone: activation.allDone,
			focusList,
			habits,
			finance: dash.finance,
			todayDate: today,
			weekday: this.getWeekday(now.getDay()),
			greeting: this.getGreeting(now.getHours()),
			progressStyle: `conic-gradient(#3366ff ${percent}%, #e5e7eb ${percent}%)`,
			freedomWidth: `${dash.finance.freedom>100?100:dash.finance.freedom}%`,
			dashFiProgress: dash.fiProgress,
			dashSavingsRate: dash.savingsRate,
			dashSkillROI: dash.skillROIExt,
			dashFocusHours: dash.focusHours,
			dashHabitImpact: dash.habitImpact,
			dashHealthPercent: dash.healthPercent,
			dashHealthColor: dash.healthColor,
			dashLeverCompleted: dash.leverCompleted,
			dashLeverBonus: dash.leverBonus,
			dashGrowthScore: dash.growthScore,
			budgetPct: dash.budgetPct, budgetUsed: dash.budgetUsed, budgetState: dash.budgetState,
			goalEmergencyPct: dash.goalEmergencyPct,
			goalPassivePct: dash.goalPassivePct,
			goalSavingsPct: dash.goalSavingsPct,
			goalPassiveETA: dash.goalPassiveETA,
			coreDashRender,
			extendedDashRender,
			unreadCount,
			unreadDisplay,
			showUnlock: unlockPopup,
			unlockMetricsText: unlockPopup ? this._buildUnlockMetricsText() : (this.data.unlockMetricsText||''),
			growthBreakItems:[
				{ key:'focus', label:'专注', val: +(dash.focusComponent*100).toFixed(1), weight: 'w'+(Number.isFinite(dash.focusComponent)?'':'') },
				{ key:'health', label:'健康', val: +(dash.healthComponent*100).toFixed(1) },
				{ key:'fi', label:'FI进度', val: +(dash.fiComponent*100).toFixed(1) },
				{ key:'lever', label:'杠杆', val: +(dash.leverageComponent*100).toFixed(1) },
				{ key:'roi', label:'技能ROI', val: +(dash.roiComponent*100).toFixed(1) },
				engine.compoundScore!=null? { key:'compound', label:'复合', val: engine.compoundScore } : null
			],
			growthBalancePenalty: dash.balancedPenalty || 1,
			growthBalancePenaltyPct: Math.round((dash.balancedPenalty||1)*100),
			recentEvents: listRecent(8)
		});
		this._markDataFreshness(g);
	},
	// 首屏更多展开
	expandFullDashboard(){ this.setData({ showFullDashboard:true }); track && track('dashboard_more_expand',{ ts:Date.now() }); },
	openGrowthBreak(){ this.setData({ showGrowthBreak:true }); track && track('growth_break_open'); },
	closeGrowthBreak(){ this.setData({ showGrowthBreak:false }); },
	completeAction(e){
		const id = e.currentTarget.dataset.id;
		const idx = this.data.todayActionList.findIndex(a=>a.id===id);
		if(idx<0) return;
		const act = this.data.todayActionList[idx];
		// 快速完成只适用于定义的 quickDone
		if(!act.quickDone){ this.goAction({ currentTarget:{ dataset:{ go:act.go, id:act.id } } }); return; }
		let xp=0; try{ xp = awardAction(app, act.type, { reason:'快速完成', cooldownType: act.type }); }catch(err){}
		// 保存前状态（已在 refresh 中 baseline），执行后延迟重新计算获取真实差值
		this.setData({ [`todayActionList[${idx}].completed`]: true });
		const before = this._dashboardBaseline || {};
		setTimeout(()=>{
			this.refresh(); // refresh 后 baseline 会被覆盖，先抓取 diff
			const after = this._dashboardBaseline || {};
			const focusDelta = +( (after.focusHours - before.focusHours) || 0 ).toFixed(2);
			const growthDelta = +( (after.growthScore - before.growthScore) || 0 ).toFixed(2);
			const fiDelta = +( (after.fiProgress - before.fiProgress) || 0 ).toFixed(2);
			const savingsDelta = +( (after.savingsRate - before.savingsRate) || 0 ).toFixed(2);
			this.showActionFeedbackBar({ xp, focusDelta, growthDelta, fiDelta, savingsDelta });
			track && track('dashboard_action_quick_done',{ id:act.id, type:act.type, xp, focusDelta, growthDelta, fiDelta, savingsDelta });
		}, 450);
	},
	showActionFeedbackBar(payload){
		const parts=[`XP +${payload.xp||0}`];
		if(payload.focusDelta>0) parts.push(`专注 +${payload.focusDelta}h`);
		if(payload.growthDelta>0) parts.push(`成长 +${payload.growthDelta}%`);
		if(payload.fiDelta>0) parts.push(`FI +${payload.fiDelta}%`);
		if(payload.savingsDelta>0) parts.push(`储蓄率 +${payload.savingsDelta}%`);
		this.setData({ showActionFeedback:true, lastActionFeedback:payload, lastActionFeedbackText: parts.join(' · ') });
		if(this._fbTimer){ clearTimeout(this._fbTimer); }
		this._fbTimer = setTimeout(()=>{ this.setData({ showActionFeedback:false }); }, 2500);
	},
	hideActionFeedback(){ if(this._fbTimer){ clearTimeout(this._fbTimer); } this.setData({ showActionFeedback:false }); },
	closeUnlock(){ this.setData({ showUnlock:false }); track && track('activation_unlock_dialog_close'); },
	_buildUnlockMetricsText(){
		// 简化：展示当前已显示且属于扩展层的指标名称
		const map={ budget:'预算', savings:'储蓄率', roi:'技能ROI', lever:'杠杆', growth:'成长', habit:'习惯', health:'健康' };
		const vis = this.data.extendedDashRender.concat(this.data.coreDashRender).filter(k=> this.data.extendedDashKeys.includes(k));
		return vis.map(k=> map[k]||k).slice(0,5).join('、');
	},
	_markDataFreshness(g){
		// 简易过期策略：账单>7天无新增；资产>14天无新增；技能>7天无练习
		let lastBill=0, lastAsset=0, lastSkill=0;
		(g.bills||[]).forEach(b=>{ const t= Date.parse(b.datetime||'')||0; if(t>lastBill) lastBill=t; });
		(g.assets||[]).forEach(a=>{ const t= a.updatedAt || 0; if(t>lastAsset) lastAsset=t; });
		(g.skills||[]).forEach(s=>{ const t= s.updatedAt || 0; if(t>lastSkill) lastSkill=t; });
		const now=Date.now();
		this.setData({
			staleFinance: (now - lastBill) > 7*86400000,
			staleAsset: (now - lastAsset) > 14*86400000,
			staleSkill: (now - lastSkill) > 7*86400000
		});
	},
	// 打开快速录入（支持指定 tab）
	openQuickCapture(e){ const comp=this.selectComponent('#qc'); if(comp){ comp.open(); if(e && e.detail && e.detail.tab){ comp.setData({ currentTab:e.detail.tab }); } } },
	onQuickCaptureClose(){ /* 预留 */ },
	// 进入行动项跳转
	goAction(e){
		const url = e.currentTarget.dataset.go;
		const id = e.currentTarget.dataset.id;
		track('dashboard_action_click',{ id });
		if(url){ wx.navigateTo({ url }); }
	},
	goGrowthDetail(){ track('dashboard_growth_card_click',{ score: this.data.dashGrowthScore }); wx.navigateTo({ url:'/pages/growthDetail/growthDetail' }); },
	expandMetrics(){ this.setData({ metricsCollapsed:false }, ()=> track('dashboard_metrics_expand',{ ts:Date.now() })); },
	collapseMetrics(){ this.setData({ metricsCollapsed:true }, ()=> track('dashboard_metrics_collapse',{ ts:Date.now() })); },
	// 扩展区折叠开关（首页瘦身：非核心模块统一收纳）
	expandExtended(){ this.setData({ extendedCollapsed:false }); track('dashboard_extended_expand'); },
	collapseExtended(){ this.setData({ extendedCollapsed:true }); track('dashboard_extended_collapse'); },
	// 下拉刷新支持（小程序原生）
	onPullDownRefresh(){
		this.refresh();
		setTimeout(()=>{ wx.stopPullDownRefresh(); }, 400);
	},
	// 今日重点 CTA
	goPrioritySuggestion(){ const ps=this.data.prioritySuggestion; if(!ps) return; track && track('priority_suggestion_tap',{ key:ps.key }); if(ps.go){ wx.navigateTo({ url:ps.go }); } },
	// 核心卡 CTA 统一处理
	coreCardCTA(e){
		const type = e.currentTarget.dataset.type;
		let url='';
		switch(type){
			case 'fi': url='/pages/finance/finance'; break;
			case 'goal': url='/pages/goal/goal'; break;
			case 'focus': url='/pages/pomodoro/pomodoro'; break;
			default: break;
		}
		if(url){ track('dashboard_core_cta_click',{ type }); wx.navigateTo({ url }); }
	},
	// 点击快捷操作
	tapQuickAction(e){
		const key = e.currentTarget.dataset.key;
		const item = (this.data.quickActions||[]).find(x=>x.key===key);
		if(!item) return;
		// 统计使用
		this._quickActionUsage[key] = (this._quickActionUsage[key]||0)+1;
		try{ wx.setStorageSync('quickAction:usage', this._quickActionUsage); }catch(err){}
		// 触发实际处理
		if(typeof this[item.handler] === 'function'){
			this[item.handler]();
		}else if(key==='bill'){
			wx.navigateTo({ url:'/pages/bill/bill' });
		}
		track && track('quick_action_tap',{ key, usage:this._quickActionUsage[key] });
		// 使用后可能需要重新排序（轻量延迟刷新）
		clearTimeout(this._qaRerankTimer);
		this._qaRerankTimer = setTimeout(()=> this._initQuickActions(), 300);
	},
	goBill(){ wx.navigateTo({ url:'/pages/bill/bill' }); },
	// 顶部 summary metric 点击
	tapSummaryMetric(e){
		const key = e.currentTarget.dataset.key;
		track && track('summary_metric_tap',{ key });
		switch(key){
			case 'fi': wx.navigateTo({ url:'/pages/goal/goal' }); break;
			case 'focus': wx.navigateTo({ url:'/pages/pomodoro/pomodoro' }); break;
			case 'savings': wx.navigateTo({ url:'/pages/budget/budget' }); break;
			default: break;
		}
	},
	tapDashCard(e){
		const type = e.currentTarget.dataset.type;
			switch(type){
			case 'budget': wx.navigateTo({ url:'/pages/budget/budget' }); break;
			case 'goal': wx.navigateTo({ url:'/pages/goal/goal' }); break;
			case 'savings': wx.navigateTo({ url:'/pages/budget/budget' }); break; // 储蓄率
			case 'fi': wx.navigateTo({ url:'/pages/goal/goal' }); break; // FI 进度 -> 目标详情
			case 'roi': this.goSkill(); break;
			case 'focus': wx.navigateTo({ url:'/pages/pomodoro/pomodoro' }); break;
			case 'habit': wx.navigateTo({ url:'/pages/habit/habit' }); break;
			case 'health': wx.navigateTo({ url:'/pages/sport/sport' }); break;
			case 'lever': wx.navigateTo({ url:'/pages/todo/todo' }); break;
			default: break;
		}
	},
	enterReorder(){ if(this.data.dashReorder) return; this.setData({ dashReorder:true }); },
	exitReorder(){ this.setData({ dashReorder:false }); try{ wx.setStorageSync('dashboard:order', this.data.dashOrder); wx.setStorageSync('dashboard:display', this.data.dashDisplay); }catch(e){} },
	moveCard(e){
		if(!this.data.dashReorder) return;
		const key = e.currentTarget.dataset.key; const dir = e.currentTarget.dataset.dir; // dir: -1 or 1
		const arr = this.data.dashOrder.slice();
		const idx = arr.indexOf(key); if(idx<0) return;
		const target = idx + Number(dir);
		if(target<0 || target>=arr.length) return;
		[arr[idx], arr[target]] = [arr[target], arr[idx]];
		this.setData({ dashOrder:arr });
	},
	toggleCardDisplay(e){
		const key=e.currentTarget.dataset.key; const val=e.detail.value;
		this.setData({ [`dashDisplay.${key}`]: val }, ()=>{
			this.refresh();
		});
	},
	goSkill(){
		track && track('dashboard_skill_card_tap',{ count: (this.data.dashSkillROI||[]).length });
		wx.navigateTo({ url:'/pages/skill/skill' });
	},
	goHabit(){ wx.navigateTo({ url:'/pages/habit/habit' }); },
	goSport(){ wx.navigateTo({ url:'/pages/sport/sport' }); },
	goTodo(){ wx.navigateTo({ url:'/pages/todo/todo' }); },
	toggleFocusDone(e){
		const id = e.currentTarget.dataset.id;
		const todo = app.globalData.todos.find(t=>t.id===id);
		if(todo){
			const nowState = !todo.done;
			todo.done = nowState;
			if(nowState){ todo.doneAt = Date.now(); awardAction(app,'todo',{ id }); }
			app.persist(); this.refresh();
		}
	},
	tapHabit(e){
		const id = e.currentTarget.dataset.id;
		const h = app.globalData.habits.find(x=>x.id===id);
		if(!h) return;
		const today = this.formatDate(new Date());
		if(!(h.days instanceof Set)) h.days = new Set(h.days||[]);
		if(!h.days.has(today)){
			h.days.add(today);
			let streak=0; let d=new Date(); while(h.days.has(this.formatDate(d))){ streak++; d.setDate(d.getDate()-1); }
			h.streak = streak;
			awardAction(app,'habit',{ id });
			app.persist(); this.refresh();
		}
	},
	async _ensureMetricsInfo(){
		if(_metricsInfoCache) return _metricsInfoCache;
		// 动态 require（同步即可，但包首次解析放到用户交互时）
		try{ _metricsInfoCache = require('../../utils/metricsInfo'); }catch(e){ _metricsInfoCache = {}; }
		return _metricsInfoCache;
	},
	openMetricInfo(e){ const type=e.currentTarget.dataset.type; this._ensureMetricsInfo().then(mi=>{ const info=mi[type]; if(info){ this.setData({ showMetricInfo:true, metricInfoContent:{...info, key:type} }); (app.globalData._metricTouch||(app.globalData._metricTouch={}))[type]=Date.now(); } }); },
	metricQuickAction(e){
		const idx = e.currentTarget.dataset.idx; const info = this.data.metricInfoContent; if(!info||!info.actions||!info.actions[idx]) return;
		const act = info.actions[idx];
		switch(act.type){
			case 'nav': wx.navigateTo({ url: act.action }); break;
			case 'task': {
				const tag = 'cta_'+act.action; const today = this.formatDate(new Date());
				const exists = app.globalData.todos.find(t=> t._cta===tag && t.date===today);
				if(!exists){ app.globalData.todos.push({ id:'cta'+Date.now(), title: act.label, done:false, priority:'high', focus:true, _cta:tag, date:today }); app.persist(); }
				wx.showToast({ title:'已添加任务', icon:'success' });
				break;
			}
			case 'habit': {
				wx.navigateTo({ url:'/pages/habit/habit' });
				break;
			}
			default: break;
		}
	},
	closeMetricInfo(){ this.setData({ showMetricInfo:false }); },
	// ===== 指标 Tooltip 引导逻辑 =====
	tryStartMetricTooltip(){
		try{
			const shown = wx.getStorageSync('metric:guide:shown');
			if(shown) return; // 已展示
			const queue = [
				{ key:'fi', title:'FI 进度', desc:'你的被动收入相对日常支出的进展，达到 100% 即基本财务自由。' },
				{ key:'goal', title:'目标进度', desc:'应急金 / 被动收入 / 储蓄率三大目标的阶段性完成情况。' },
				{ key:'focus', title:'专注小时', desc:'高质量深度工作的累计，用番茄或专注记录提升它。' },
				{ key:'savings', title:'储蓄率', desc:'(收入-支出)/收入 的月度百分比，越高越快实现目标。' }
			];
			this._metricTooltipQueue = queue;
			this.setData({ metricTooltipQueue: queue, metricTooltipTotal: queue.length, metricTooltipStep:1, metricTooltipContent: queue[0], activeMetricTooltip:true }, ()=>{
				this.positionMetricTooltip(queue[0].key);
			});
		}catch(e){}
	},
	positionMetricTooltip(key){
		try{
			const q = this.createSelectorQuery();
			q.select(`.dash-card[data-type="${key}"]`).boundingClientRect(rect=>{
				if(!rect) return;
				const top = rect.top + rect.height + 6;
				const left = Math.max(8, rect.left + 4);
				this.setData({ metricTooltipPos:{ top, left } });
			}).exec();
		}catch(e){}
	},
	metricTooltipAction(e){},
	skipMetricTooltips(){ try{ wx.setStorageSync('metric:guide:shown',1); }catch(e){} this.hideMetricTooltip(); },
	nextMetricTooltip(){
		const step = this.data.metricTooltipStep + 1;
		if(step>this.data.metricTooltipTotal){
			this.hideMetricTooltip();
			try{ wx.setStorageSync('metric:guide:shown', 1); }catch(e){}
			return;
		}
		const next = this.data.metricTooltipQueue[step-1];
		this.setData({ metricTooltipStep: step, metricTooltipContent: next }, ()=> this.positionMetricTooltip(next.key));
	},
	hideMetricTooltip(){ this.setData({ activeMetricTooltip:false }); },
	noop(){},
	formatDate(d){ return formatDate(d); },
	getWeekday(n){ return ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][n]; },
	getGreeting(h){ if(h<6) return '凌晨好，注意休息'; if(h<12) return '上午好，保持专注'; if(h<14) return '中午好，适度休息'; if(h<18) return '下午好！继续加油'; if(h<22) return '晚上好，稳步前进'; return '夜深了，准备收尾'; }
,
	openPassiveSim(){ wx.navigateTo({ url:'/pages/passiveSimulator/passiveSimulator' }); }
,
	// 复利引擎：点击 velocity （如后续在 WXML 绑定）
	tapVelocity(){ const v=this.data.velocity; if(!v) return; if(v.eta){ wx.showToast({ title:`预计ETA ${v.eta}`, icon:'none' }); } }
,
	openVelocityInfo(){ this.setData({ showVelocityInfo:true }); },
	closeVelocityInfo(){ this.setData({ showVelocityInfo:false }); },
	goWeeklyReview(){ wx.navigateTo({ url:'/pages/weeklyReview/weeklyReview' }); }
,
	goMessages(){ wx.navigateTo({ url:'/pages/messages/messages' }); }
,
	// ====== 新增：昨日对比构建 ======
	_buildDayDiff(prev, now){
		const spec = [
			{ key:'fiProgress', label:'FI', unit:'%', format:v=>v },
			{ key:'focusHours', label:'专注', unit:'h', format:v=>v },
			{ key:'savingsRate', label:'储蓄率', unit:'%', format:v=>v },
			{ key:'healthPercent', label:'健康', unit:'%', format:v=>v },
			{ key:'growthScore', label:'成长', unit:'%', format:v=>v }
		];
		return spec.map(s=>{
			const pv = prev[s.key]; const cv = now[s.key];
			if(pv==null || cv==null || isNaN(pv) || isNaN(cv)) return null;
			const diff = +(cv - pv).toFixed(2);
			return { key:s.key, label:s.label, value:cv, prev:pv, diff, unit:s.unit, trend: diff>0?'up': (diff<0?'down':'flat') };
		}).filter(Boolean);
	},
	// ====== 新增：改进洞察生成（轻量规则） ======
// _genImprovementInsights 已被统一 recommendation 替代
	// ===== 简化模式判定：行为触发后退出（完成至少一次番茄 + 1 次习惯 + 1 条记账 or todo） =====
	_checkSimpleMode(){
		try{
			const g = app.globalData;
			const doneTomato = (g.pomodoros||[]).some(p=> p.done || p.completedAt);
			const habitDone = (g.habits||[]).some(h=> (h.days instanceof Set ? h.days.size>0 : (h.days||[]).length>0));
			const billDone = (g.bills||[]).length>0 || (g.todos||[]).some(t=>t.done);
			const exit = doneTomato && habitDone && billDone;
			if(exit){ if(this.data.newUserSimpleMode){ this.setData({ newUserSimpleMode:false }); try{ wx.setStorageSync('dashboard:simpleModeExit',1); }catch(e){} } return false; }
			const stored = wx.getStorageSync('dashboard:simpleModeExit');
			if(stored){ if(this.data.newUserSimpleMode) this.setData({ newUserSimpleMode:false }); return false; }
			return true;
		}catch(e){ return this.data.newUserSimpleMode; }
	},
	// 精简后无更多展开，仅保留空函数避免引用报错
	toggleOpportunity(){}
});
