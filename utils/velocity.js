// velocity.js
// 财务自由路径动能计算：基于最近月度快照的被动收入（月度被动=已实现+预估）增长速度
// 思路：
// 1. 取最近 3~6 个 month snapshot（少于2个无法计算返回 null）
// 2. 计算相邻差分平均值 avgDelta (月均新增被动收入)
// 3. 剩余缺口 remaining = passiveTarget - passiveCurrent (<=0 视为完成 value=1)
// 4. velocity = clamp( avgDelta / (remaining/12) / 12? -> 简化： (avgDelta / (remaining/12)) = avgDelta*12/remaining ) 太激进；
//    为稳定，使用 normalized = avgDelta / max(remaining/24,1)  => 代表若保持速度是否可在 24 个月内完成
//    然后 value = clamp(normalized, 0, 1)
// 5. 估算 ETA = 当前月份 + ceil( remaining / max(avgDelta,1) )
// 返回 { value:0~1, percent: value*100, monthlyDelta, remaining, eta }

function computeVelocity({ snapshots, passiveTarget, passiveCurrent }){
  if(!Array.isArray(snapshots)) return null;
  const list = snapshots.slice(-6); // 最近 6
  if(list.length < 2) return null;
  // 按月份排序（假设 month: YYYY-MM）
  list.sort((a,b)=> a.month < b.month ? -1 : 1);
  const totals = list.map(s=> (Number(s.passiveRealized||0) + Number(s.passiveEstimated||0)) );
  const deltas=[]; for(let i=1;i<totals.length;i++){ deltas.push(totals[i]-totals[i-1]); }
  const avgDelta = deltas.reduce((s,v)=>s+v,0)/deltas.length || 0; // 每月
  passiveTarget = Number(passiveTarget)||0; passiveCurrent = Number(passiveCurrent)||0;
  const remaining = passiveTarget - passiveCurrent;
  if(remaining <= 0){ return { value:1, percent:100, monthlyDelta:avgDelta, remaining:0, eta:'' }; }
  // 目标在 24 个月达成的速度要求
  const requiredPerMonthFor24 = remaining / 24;
  const normalized = requiredPerMonthFor24>0? (avgDelta / requiredPerMonthFor24):0;
  let value = normalized; if(value<0) value=0; if(value>1) value=1;
  let months = '';
  if(avgDelta > 0){ const m = Math.ceil(remaining / avgDelta); const now = new Date(); const eta = new Date(now.getFullYear(), now.getMonth()+m, 1); months = eta.toISOString().slice(0,7); }
  return { value, percent: +(value*100).toFixed(1), monthlyDelta: +avgDelta.toFixed(2), remaining: +remaining.toFixed(2), eta: months };
}

module.exports = { computeVelocity };
