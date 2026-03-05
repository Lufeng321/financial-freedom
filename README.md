# 个人成长小程序

> 聚焦个人财务自由、技能成长、专注效率、健康打卡的综合成长仪表盘

## 项目简介

本小程序是一个全功能的个人成长管理工具，帮助用户通过数据驱动的方式实现财务自由、技能提升和健康生活的目标。

### 核心特性

- **财务自由追踪** - 自由指数计算、资产管理、负债管理、财务进度可视化
- **技能成长管理** - 技能ROI分析、AI学习计划生成、经验值追踪
- **专注效率提升** - 番茄钟计时、任务焦点管理、每日目标追踪
- **健康习惯养成** - 运动记录、习惯打卡、数据可视化
- **反思日记** - 情绪追踪、反思记录、图片附件

## 技术栈

- **框架**: 微信小程序原生开发
- **UI组件**: TDesign 微信小程序组件库
- **云服务**: 腾讯云云开发 (CloudBase)
- **云函数**: Node.js 18.15
- **数据库**: 云数据库
- **运行时**: 云函数 + 前端逻辑

## 项目结构

```
├── pages/                 # 页面目录
│   ├── index/            # 首页-今日视图
│   ├── finance/          # 财务管理
│   ├── skill/            # 技能管理
│   ├── sport/            # 运动记录
│   ├── todo/             # 待办任务
│   ├── habit/            # 习惯打卡
│   ├── pomodoro/         # 番茄钟
│   ├── diary/            # 反思日记
│   ├── bill/             # 记账
│   ├── budget/           # 预算管理
│   ├── goal/             # 目标管理
│   ├── me/               # 我的
│   └── ...               # 其他页面
├── components/           # 自定义组件
├── utils/                # 工具函数
│   ├── cloud.js         # 云开发封装
│   ├── models.js        # 数据模型
│   ├── roi.js           # ROI计算
│   ├── track.js         # 事件追踪
│   ├── storage.js       # 本地存储
│   └── format.js        # 格式化工具
├── cloudfunctions/       # 云函数目录
│   ├── login/           # 用户登录
│   ├── events-batch/    # 事件批量上报
│   ├── snapshot-daily/  # 每日快照
│   └── create-user/     # 创建用户
├── config/              # 配置文件
├── styles/              # 全局样式
├── app.js               # 小程序入口
├── app.json             # 小程序配置
└── app.wxss             # 全局样式
```

## 核心功能

### 1. 财务管理 (Finance)
- **自由指数计算** - 日被动收入 / 日支出
- **资产管理** - 添加资产、计算年化收益
- **负债管理** - 负债追踪、利率计算
- **记账功能** - 收支记录、分类统计
- **预算管理** - 月度预算、支出追踪
- **被动收入模拟器** - 计算器、五年规划
![2d99bf3baa6027ccbde90f65d87038ab](https://github.com/user-attachments/assets/bb505d60-30d2-4a96-8c9a-c0ba046d982b)

### 2. 技能成长 (Skill)
- **技能列表** - 添加技能、进度追踪
- **ROI计算** - 投入收益比、排序展示
- **经验值系统** - XP累积、等级提升
- **AI学习计划** - 智能生成学习路径
- **任务导入** - 自动导入待办列表
![4270f6e3cb335687381c27bc56096079](https://github.com/user-attachments/assets/7c129554-175a-4cb4-b2d6-c2cd423cf7b5)

### 3. 运动健康 (Sport)
- **运动记录** - 多维指标采集 (时间/距离/次数/卡路里)
- **分类管理** - 基础训练、耐力有氧、球类、计数运动
- **数据同步** - 支持微信运动同步 (待接入)
- **周统计** - 运动时长、达标率
![2f25f91c25494a3f5372957e2260ad08](https://github.com/user-attachments/assets/03e1dfb6-460b-4990-9dd7-9bace932d24d)

### 4. 专注效率 (Pomodoro + Todo)
- **番茄钟** - 25分钟专注计时
- **任务管理** - 添加、编辑、删除、焦点标记
- **习惯打卡** - 连续天数追踪、日历视图
- **每日焦点** - 重点任务展示
![b6617cc5e90a29ecb7bdb4b6d2136f86](https://github.com/user-attachments/assets/333e8aef-a8ab-4745-8d1c-703c80f893e2)

### 5. 反思日记 (Diary)
- **日记记录** - 文本、日期、备注
- **情绪评分** - 5级情感评分
- **图片附件** - 支持上传图片
- **历史回顾** - 日记列表查看
![92cff64b3a2399d0ff39fcd386e0f326](https://github.com/user-attachments/assets/b8870cb4-af9d-43a4-a173-29badc1f9b53)

### 6. 数据可视化 (Dashboard)
- **六大核心指标**:
  - FI进度 (财务自由进度)
  - 储蓄率
  - 技能ROI Top3
  - 今日专注小时
  - 习惯年化影响
  - 健康达标率
- **趋势图表** - 数据趋势展示
- **成长详情** - 深度数据分析


有什么好的功能建议可以扫描下方二维码添加我的微信共同交流哦！
![72521ee2b4410d9dedeb6a3169f26ea5](https://github.com/user-attachments/assets/6276a214-fcbb-4170-a8dc-9b60ea42e886)


## 云函数

### login
用户登录认证，获取用户信息

### events-batch
批量上报事件数据，优化网络请求

### snapshot-daily
每日数据快照，用于趋势分析和历史数据保存

### create-user
创建新用户账户

## 开发指南

### 环境要求
- 微信开发者工具 (最新版本)
- Node.js 18.15+
- 腾讯云云开发账户

### 安装依赖

```bash
npm install
```

### 配置云开发

1. 在 `config/cloud-env.js` 中配置环境ID:
```javascript
module.exports = {
  envId: 'your-env-id'
}
```

2. 确保云开发环境已配置:
   - 数据库已创建
   - 云函数已部署
   - 权限已设置

### 本地开发

1. 使用微信开发者工具打开项目
2. 点击"编译"按钮
3. 在模拟器中预览效果
4. 调试查看控制台输出

### 云函数部署

1. 在微信开发者工具中右键云函数文件夹
2. 选择"上传并部署:云端安装依赖"
3. 等待部署完成

## 数据模型

### 账单 (Bill)
```javascript
{
  id: string,
  kind: 'in' | 'out',
  incomeType: 'active' | 'passive',
  expenseType: 'necessary' | 'optional',
  category: string,
  amount: number,
  datetime: string,
  remark: string
}
```

### 资产 (Asset)
```javascript
{
  id: string,
  name: string,
  amount: number,
  roi: number // 年化收益率
}
```

### 技能 (Skill)
```javascript
{
  id: string,
  name: string,
  investedHours: number,
  estimatedReturn: number,
  roi: number,
  level: number,
  exp: number
}
```

### 运动记录 (SportRecord)
```javascript
{
  id: string,
  typeId: number,
  time?: number,        // 分钟
  distance?: number,     // 米
  number?: number,       // 次
  calorie: number,
  datetime: string,
  synced: boolean
}
```

### 事件追踪 (Event)
```javascript
{
  type: string,          // dashboard_open, skill_created 等
  timestamp: number,
  userId: string,
  data?: object
}
```

## 事件追踪

支持的事件类型:
- `dashboard_open` - 首页打开
- `skill_created` - 技能创建
- `skill_exp_added` - 技能经验增加
- `focus_session` - 专注会话
- `sport_session_added` - 运动记录添加

上报规则:
- 本地累计 ≥10 条或超过 60 秒自动触发上传
- 通过 `events-batch` 云函数批量处理

## 已完成功能 (MVP Sprint 1)

✅ Dashboard 六大指标展示
✅ 财务管理 (资产/负债/记账/预算)
✅ 技能管理 (ROI计算/经验值/AI计划)
✅ 番茄钟 (25分钟计时/关联技能)
✅ 运动记录 (多维指标/周统计)
✅ 待办管理 (任务列表/焦点标记)
✅ 习惯打卡 (连续天数/日历视图)
✅ 反思日记 (情绪评分/图片附件)
✅ 云开发集成 (云函数/数据库)
✅ 事件追踪系统
✅ TDesign组件库集成

## 待完善功能

- [ ] 数据持久化优化
- [ ] 图表可视化接入 (ECharts)
- [ ] 微信运动API对接
- [ ] AI学习计划接入真实LLM
- [ ] 深色模式支持
- [ ] 数据导出功能
- [ ] 消息推送
- [ ] 分享功能
- [ ] 无障碍优化
- [ ] 国际化支持

## 路线图

### Milestone 1 - 数据可留存
- [ ] 完善本地存储
- [ ] 数据备份恢复
- [ ] 云端数据同步

### Milestone 2 - 目标强化
- [ ] 完善自由指数算法
- [ ] 模板记账功能
- [ ] 图表可视化

### Milestone 3 - 成长体系
- [ ] 统一经验值系统
- [ ] 成就系统
- [ ] 等级奖励

### Milestone 4 - 可视强化
- [ ] 动画优化
- [ ] 响应式布局
- [ ] 深色模式

### Milestone 5 - 上线前
- [ ] 表单校验
- [ ] 性能优化
- [ ] 错误处理
- [ ] 可访问性

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT Licensed

## 数据库集合清单

本项目需要创建以下云数据库集合（Collection）：

### 用户相关

#### 1. `user`
**用途**: 存储用户基本信息
```javascript
{
  _id: string,              // 自动生成
  openid: string,           // 微信 openid (唯一标识)
  bizId: string,            // 业务ID (2字母+5数字, 如 "AB12345")
  nickname: string,         // 昵称
  avatarEmoji: string,      // 头像表情
  avatarUrl: string,        // 头像URL
  avatarFileID: string,     // 云存储头像文件ID
  createdAt: number,        // 创建时间戳
  updatedAt: number         // 更新时间戳
}
```
**权限**: 用户可读写自己的记录

### 财务相关

#### 2. `bills`
**用途**: 账单记录（收入/支出）
```javascript
{
  _id: string,
  userId: string,          // 用户openid
  kind: 'in' | 'out',      // 收入/支出
  incomeType: 'active' | 'passive',  // 收入类型（仅收入）
  expenseType: 'necessary' | 'optional', // 支出类型（仅支出）
  category: string,        // 分类 (餐饮/交通/住房等)
  amount: number,          // 金额
  grossAmount: number,     // 税前金额（可选）
  currency: string,        // 货币类型 (CNY/USD等)
  taxType: 'after' | 'before',  // 税前/税后
  necessityScore: number,  // 必要性评分 1-5（仅支出）
  datetime: string,       // 日期时间 "YYYY-MM-DD HH:mm"
  remark: string,          // 备注
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+datetime, userId+kind

#### 3. `assets`
**用途**: 资产信息
```javascript
{
  _id: string,
  userId: string,
  name: string,            // 资产名称
  amount: number,          // 资产金额
  roi: number,             // 年化收益率 (0-1)
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId

#### 4. `liabilities`
**用途**: 负债信息
```javascript
{
  _id: string,
  userId: string,
  name: string,            // 负债名称
  amount: number,          // 负债金额
  rate: number,            // 利率 (0-1)
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId

#### 5. `recurring_bills`
**用途**: 周期性账单（自动记账模板）
```javascript
{
  _id: string,
  userId: string,
  kind: 'in' | 'out',
  incomeType: string,
  expenseType: string,
  category: string,
  amount: number,
  day: number,             // 每月几号
  mode: 'monthly' | 'weekly',
  weekdays: array,         // 周几
  intervalDays: string,    // 间隔天数
  startDate: string,       // 开始日期
  remark: string,
  enabled: boolean,
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+day

#### 6. `budgets`
**用途**: 预算管理
```javascript
{
  _id: string,
  userId: string,
  category: string,        // 分类
  month: string,           // 月份 "YYYY-MM"
  budgetAmount: number,    // 预算金额
  actualAmount: number,    // 实际支出
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+month

### 技能成长相关

#### 7. `skills`
**用途**: 技能管理
```javascript
{
  _id: string,
  userId: string,
  name: string,            // 技能名称
  investedHours: number,   // 投入小时数
  investedCost: number,    // 投入成本
  expectedAnnualUplift: number, // 预期年收益
  confidence: number,      // 信心程度 0-1
  lastSessionAt: number,   // 最后练习时间
  roiValue: number,        // ROI值
  level: number,           // 等级
  exp: number,             // 经验值
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId

#### 8. `sessions`
**用途**: 专注会话（番茄钟）
```javascript
{
  _id: string,
  userId: string,
  skillId: string,         // 关联技能ID (可选)
  minutes: number,         // 时长(分钟)
  focusQuality: number,    // 专注质量 1-5
  ts: number,              // 时间戳
  createdAt: number
}
```
**索引**: userId+ts, userId+skillId

#### 9. `ai_plans`
**用途**: AI学习计划
```javascript
{
  _id: string,
  userId: string,
  skillId: string,
  targetSkill: string,     // 目标技能
  currentLevel: string,    // 当前水平
  dailyMinutes: number,    // 每日投入分钟
  goal: string,            // 学习目标
  estimatedWeeks: number,  // 估算周数
  tasks: array,            // 任务列表
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+skillId

### 健康相关

#### 10. `habits`
**用途**: 习惯管理
```javascript
{
  _id: string,
  userId: string,
  name: string,            // 习惯名称
  goalType: 'daily' | 'weekly',  // 目标类型
  allowRetro: boolean,     // 允许补打卡
  category: string,        // 分类 (增收/节支/风险/健康)
  estimatedAnnualImpact: number, // 预估年影响
  days: array,             // 打卡日期数组 ["2025-03-01"]
  streak: number,          // 连续打卡天数
  archived: boolean,       // 是否归档
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId

#### 11. `sport_records`
**用途**: 运动记录
```javascript
{
  _id: string,
  userId: string,
  typeId: number,          // 运动类型ID (1001/2001/3001/4001)
  time: number,            // 时长(分钟)
  distance: number,        // 距离(米)
  number: number,          // 次数
  calorie: number,         // 卡路里
  datetime: number,        // 时间戳
  syncWanted: boolean,     // 是否同步
  synced: boolean,         // 已同步
  createdAt: number
}
```
**索引**: userId+datetime

### 反思日记相关

#### 12. `diary_entries`
**用途**: 反思日记
```javascript
{
  _id: string,
  userId: string,
  date: string,            // 日期 "YYYY-MM-DD"
  mood: number,            // 心情 1-5
  text: string,            // 日记内容
  images: array,           // 图片 [{id, url, fileID}]
  summary: object,         // AI总结
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+date

### 任务目标相关

#### 13. `todos`
**用途**: 待办任务
```javascript
{
  _id: string,
  userId: string,
  title: string,          // 任务标题
  priority: number,        // 优先级 1-3
  focus: boolean,          // 是否焦点
  completed: boolean,      // 是否完成
  completedAt: number,     // 完成时间
  dueDate: string,         // 截止日期
  skillId: string,         // 关联技能
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId, userId+completed

#### 14. `goals`
**用途**: 目标管理
```javascript
{
  _id: string,
  userId: string,
  type: string,           // 类型 (FI_STAGE/EMERGENCY/PASSIVE_INCOME/CUSTOM)
  targetValue: number,     // 目标值
  currentValue: number,    // 当前值
  progress: number,        // 进度 0-1
  status: string,          // 状态
  deadline: number,        // 截止时间
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId

### 数据分析相关

#### 15. `kpi_snapshots`
**用途**: 每日KPI快照（历史趋势）
```javascript
{
  _id: string,
  userId: string,
  date: string,            // 日期 "YYYY-MM-DD"
  fiProgress: number,      // FI进度
  savingsRate: number,     // 储蓄率
  focusHours: number,      // 专注小时
  habitImpact: number,     // 习惯影响
  healthPercent: number,   // 健康达标率
  topSkillROI: array,      // 技能ROI Top3
  updatedAt: number,
  createdAt: number,
  schemaVersion: number   // 版本号
}
```
**索引**: userId+date (唯一索引)

### 事件追踪相关

#### 16. `events`
**用途**: 事件埋点记录
```javascript
{
  _id: string,
  userId: string,
  name: string,            // 事件名称
  payload: object,         // 事件数据
  ts: number,              // 时间戳
  sessionId: string,        // 会话ID
  clientTs: number,        // 客户端时间戳
  createdAt: number,
  schemaVersion: number,
  meta: {
    appId: string,
    env: string,
    source: string,
    sdk: string
  }
}
```
**索引**: userId+ts, userId+sessionId

#### 17. `weekly_stats`
**用途**: 每周统计数据
```javascript
{
  _id: string,
  userId: string,
  week: string,            // 周标识 "2025-W09"
  pomodoroCount: number,   // 番茄数
  habitCheckCount: number, // 习惯打卡数
  sportMinutes: number,    // 运动分钟
  diaryCount: number,      // 日记数
  billCount: number,       // 记账数
  xpGained: number,        // 获得XP
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+week (唯一索引)

### 成就系统相关

#### 18. `achievements`
**用途**: 成就定义（静态数据）
```javascript
{
  _id: string,
  id: string,              // 成就ID
  icon: string,            // 图标
  name_zh: string,         // 中文名称
  name_en: string,         // 英文名称
  description: string,     // 描述
  condition: object,       // 触发条件
  xpReward: number,        // XP奖励
  category: string         // 分类
}
```
**权限**: 所有用户可读

#### 19. `user_achievements`
**用途**: 用户成就解锁记录
```javascript
{
  _id: string,
  userId: string,
  achievementId: string,   // 成就ID
  unlockedAt: number,      // 解锁时间
  progress: number,        // 进度
  createdAt: number
}
```
**索引**: userId+achievementId (唯一索引)

#### 20. `user_quests`
**用途**: 用户每周任务
```javascript
{
  _id: string,
  userId: string,
  week: string,            // 周标识
  questId: string,         // 任务ID
  title: string,           // 任务标题
  desc: string,            // 描述
  progress: number,        // 进度
  goal: number,            // 目标
  type: string,            // 类型 (pomo/habit/finance)
  status: string,          // 状态 (active/completed/expired)
  completedAt: number,     // 完成时间
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId+week, userId+status

### 设置相关

#### 21. `user_settings`
**用途**: 用户设置
```javascript
{
  _id: string,
  userId: string,
  hourCost: number,        // 小时成本
  taxRateDefault: number,  // 默认税率
  theme: string,           // 主题
  language: string,        // 语言
  notifications: object,   // 通知设置
  createdAt: number,
  updatedAt: number
}
```
**索引**: userId (唯一索引)

### 数据库创建步骤

1. **登录云开发控制台**
   - 打开腾讯云云开发控制台
   - 选择对应环境

2. **创建数据库集合**
   - 进入"数据库"模块
   - 点击"新建集合"
   - 按顺序创建上述21个集合

3. **设置集合权限**
   - `user`: 用户可读写自己的记录
   - `achievements`: 所有用户可读
   - 其他集合: 用户可读写自己的记录

4. **创建索引**
   - 为每个集合的索引字段创建复合索引
   - 优化查询性能

5. **验证集合**
   - 在云函数中测试读写操作
   - 确保数据结构正确

## 联系方式

如有问题或建议，欢迎添加下方微信共同交流学习！
![72521ee2b4410d9dedeb6a3169f26ea5](https://github.com/user-attachments/assets/ee4d5afc-52ac-4bb4-a74e-952994056867)

