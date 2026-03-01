// 通用格式化函数
function formatMoney(v, digits=2){
  if(v==null || isNaN(v)) return '-';
  return Number(v).toFixed(digits);
}
function formatPercent(v, digits=1){
  if(v==null || isNaN(v)) return '-';
  return Number(v).toFixed(digits)+'%';
}
function formatDate(ts){
  if(!ts) return '';
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
module.exports = { formatMoney, formatPercent, formatDate };
