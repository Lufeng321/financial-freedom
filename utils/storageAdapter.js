// 统一存取与版本迁移适配层
// schemaVersion 在 version.js 中维护；此处负责：
// 1. 读取本地数据 -> 检查 dataVersion -> 逐步迁移 -> 保存
// 2. 提供 get/set 简化并保证后续字段变更集中处理

const { schemaVersion } = require('./version');
const STORAGE_KEY = 'pg_data';

// 迁移步骤数组：每个函数接收 data（可变更），若做了修改返回 true
const migrations = [
	// v1 -> v2: habits 添加 category 与 estimatedAnnualImpact 字段；skills 规范化数值字段
	function v1_to_v2(data){
		let changed = false;
		if(Array.isArray(data.habits)){
			data.habits.forEach(h=>{
				if(!h.category){ h.category = '增收'; changed = true; }
				if(h.estimatedAnnualImpact == null){ h.estimatedAnnualImpact = 0; changed = true; }
			});
		}
		if(Array.isArray(data.skills)){
			data.skills.forEach(s=>{
				if(s.investedHours == null) { s.investedHours = 0; changed = true; }
				if(s.investedCost == null) { s.investedCost = 0; changed = true; }
				if(s.expectedAnnualUplift == null) { s.expectedAnnualUplift = 0; changed = true; }
				if(s.confidence == null) { s.confidence = 1; changed = true; }
			});
		}
		return changed;
	}
];

function runMigrations(data){
	const from = Number(data._dataVersion||1);
	let current = from;
	if(current < schemaVersion){
		// 顺序应用迁移
		for(let target=current+1; target<=schemaVersion; target++){
			const fn = migrations[target-2]; // v2 在数组索引0
			if(typeof fn === 'function'){
				try{ fn(data); }catch(e){ console.warn('migration failed v'+(target-1)+'->v'+target, e); }
			}
			data._dataVersion = target;
		}
	}
	return data;
}

function load(){
	let data = {};
	try{ data = wx.getStorageSync(STORAGE_KEY) || {}; }catch(e){ data={}; }
	if(!data._dataVersion){ data._dataVersion = 1; }
	if(data._dataVersion < schemaVersion){ runMigrations(data); save(data); }
	return data;
}
function save(data){
	try{ wx.setStorageSync(STORAGE_KEY, data); }catch(e){}
}

function get(key){ const data = load(); return data[key]; }
function set(key, value){ const data = load(); data[key]=value; save(data); }

module.exports = { load, save, get, set };
