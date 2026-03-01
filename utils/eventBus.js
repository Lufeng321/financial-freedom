// 简易事件总线（同步调用版，可后续扩展为异步队列/优先级）
const listeners = {};
function on(event, handler){ if(!listeners[event]) listeners[event]=[]; listeners[event].push(handler); return ()=>off(event, handler); }
function off(event, handler){ const arr=listeners[event]; if(!arr) return; const i=arr.indexOf(handler); if(i>-1) arr.splice(i,1); }
function emit(event, payload){ const arr=listeners[event]; if(arr){ arr.slice().forEach(fn=>{ try{ fn(payload); }catch(e){ console.warn('[eventBus] handler error', event, e); } }); } }
module.exports = { on, off, emit };
