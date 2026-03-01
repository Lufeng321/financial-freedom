// 轻量 memo：基于输入对象的版本号（通过引用与关键字段时间戳）减少重复聚合
// 用法：const dash = memo('dashboard', globalData, ()=> expensiveCalc(globalData));

const _cache = new Map();

function memo(key, versionSeed, factory){
  try{
    const prev = _cache.get(key);
    const version = _buildVersion(versionSeed);
    if(prev && prev.version === version){ return prev.value; }
    const value = factory();
    _cache.set(key, { version, value });
    return value;
  }catch(e){
    return factory();
  }
}

function _buildVersion(g){
  // 选取会影响 dashboard 的关键集合长度 + 最近更新时间戳，降低字符串长度
  const parts=[];
  if(!g) return '0';
  parts.push('b'+(g.bills&&g.bills.length));
  parts.push('h'+(g.habits&&g.habits.length));
  parts.push('t'+(g.todos&&g.todos.length));
  parts.push('s'+(g.sessions&&g.sessions.length));
  parts.push('sr'+(g.sportRecords&&g.sportRecords.length));
  parts.push('as'+(g.assets&&g.assets.length));
  parts.push('li'+(g.liabilities&&g.liabilities.length));
  // 可附加本月 key（预算等）
  parts.push(new Date().toISOString().slice(0,7));
  return parts.join('|');
}

module.exports = { memo };
