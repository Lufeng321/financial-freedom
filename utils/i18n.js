// 简易 i18n 字典与取词函数
// 当前仅 zh-CN，可扩展 en 等
const locale = 'zh-CN';
const dict = {
  'zh-CN': {
    achievement: {
      unlockTitle: '成就解锁',
      unlockAria: '解锁成就',
      badgesTitle: '成就徽章',
      badgesNote: '成就将根据你的行为自动解锁。'
    },
    messages: {
      tab: { achievement: '成就', budget: '预算', remind: '提醒', system: '系统' }
    },
    sparkline: { empty: '暂无数据' }
  }
};

function t(path){
  const parts = path.split('.');
  let cur = dict[locale];
  for(const p of parts){ if(cur==null) break; cur = cur[p]; }
  return cur == null ? path : cur;
}

module.exports = { t };
