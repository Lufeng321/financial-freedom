// 云函数调用统一封装 (Phase 0)
// 使用方式：const cloud = require('../../utils/cloud'); cloud.call('snapshot-daily',{date:'2025-09-01'})
const { envId } = require('../config/cloud-env');

let _inited = false;
function ensureInit(){
	if(_inited) return;
	if(!wx.cloud){
		console.warn('[cloud] wx.cloud 不可用，可能基础库版本过低');
		return;
	}
	if(envId && envId !== 'REPLACE_WITH_ENV_ID'){
		try{ wx.cloud.init({ env: envId }); _inited = true; }catch(e){ console.error('wx.cloud.init error', e); }
	}else{
		console.warn('[cloud] 未配置 envId，调用将直接返回占位');
	}
}

function normalizeError(err){
	if(!err) return { code:'UNKNOWN', message:'Unknown error' };
	if(typeof err === 'string') return { code:'ERROR', message:err };
	return { code: err.errCode || err.code || 'ERROR', message: err.errMsg || err.message || 'error' };
}

function call(name, data){
	ensureInit();
	if(!_inited){
		// 返回占位，避免前端崩溃
		return Promise.resolve({ fromMock:true, data:{ placeholder:true } });
	}
	return wx.cloud.callFunction({ name, data })
		.then(res=>({ data: res.result, raw: res }))
		.catch(e=>{ throw normalizeError(e); });
}

module.exports = { call };
