// 数据模型 schema 与基础工具 (Phase 0 最小版本)
// 统一时间：UTC ms

const Schemas = {
  Skill: {
    name: 'string',
    investedHours: 'number',
    investedCost: 'number',
    expectedAnnualUplift: 'number',
    confidence: 'number', // 0-1
    lastSessionAt: 'number',
    roiValue: 'number',
    createdAt: 'number',
    updatedAt: 'number'
  },
  Goal: {
    type: 'string', // FI_STAGE / EMERGENCY / PASSIVE_INCOME / CUSTOM
    targetValue: 'number',
    currentValue: 'number',
    progress: 'number', // 0-1
    status: 'string',
    deadline: 'number',
    createdAt: 'number',
    updatedAt: 'number'
  },
  ActivitySession: {
    type: 'string', // RUN/WALK/GYM/...
    durationMinutes: 'number',
    intensity: 'number', // 1-5
    calories: 'number',
    ts: 'number'
  },
  Session: {
    skillId: 'string',
    minutes: 'number',
    focusQuality: 'number',
    ts: 'number'
  }
};

function stamp(doc){
  const now = Date.now();
  if(!doc.createdAt) doc.createdAt = now;
  doc.updatedAt = now;
  return doc;
}

function validate(schemaName, obj){
  const schema = Schemas[schemaName];
  if(!schema) return { ok:false, error: 'Unknown schema '+schemaName };
  for(const k in schema){
    const t = schema[k];
    if(obj[k] == null) continue; // 允许部分字段缺省
    if(t === 'number' && typeof obj[k] !== 'number') return { ok:false, error: `${k} should be number` };
    if(t === 'string' && typeof obj[k] !== 'string') return { ok:false, error: `${k} should be string` };
  }
  return { ok:true };
}

module.exports = { Schemas, stamp, validate };
