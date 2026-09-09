// 单位换算实验室 · 数据层
// 类别统一按「最小单位」当基本单位：
//  - pow 单位：基本单位数量 = 数值 × 10^pow（长度/质量/面积/体积容积/人民币，进率是 10 的幂）
//  - factor 单位：基本单位数量 = 数值 × factor[0]/factor[1]（时间，进率是 60/24/7）
// 换算全程走整数的有理数运算（见 unitUtils.js），不出现浮点误差。
// refs：生活中的参照物（obj 已带量词，如“枚一元硬币”），v 是该物体的约值（以本单位为尺度）。

export const UNIT_CATEGORIES = [
  {
    key: 'length', name: '长度', icon: '📏', color: '#3772e8',
    desc: '毫米、厘米、分米、米、千米：相邻进率大多是 10。',
    units: [
      { key: 'mm', name: '毫米', sym: '毫米', pow: 0, refs: [{ v: 1, obj: '张身份证的厚度' }, { v: 2, obj: '枚一元硬币的厚度' }] },
      { key: 'cm', name: '厘米', sym: '厘米', pow: 1, refs: [{ v: 1, obj: '个手指甲盖的宽' }, { v: 20, obj: '支铅笔的长度' }] },
      { key: 'dm', name: '分米', sym: '分米', pow: 2, refs: [{ v: 2, obj: '支铅笔的长度' }] },
      { key: 'm', name: '米', sym: '米', pow: 3, refs: [{ v: 1, obj: '张课桌的高度' }, { v: 2, obj: '扇教室门的高度' }] },
      { key: 'km', name: '千米', sym: '千米', pow: 6, refs: [{ v: 1, obj: '段公交车两站的路程' }, { v: 3, obj: '次骑车从家到公园' }] }
    ]
  },
  {
    key: 'mass', name: '质量', icon: '⚖️', color: '#e07a2f',
    desc: '克、千克、吨：1 千克 = 1000 克，1 吨 = 1000 千克。',
    units: [
      { key: 'g', name: '克', sym: '克', pow: 0, refs: [{ v: 6, obj: '枚一元硬币' }, { v: 500, obj: '袋食盐' }] },
      { key: 'kg', name: '千克', sym: '千克', pow: 3, refs: [{ v: 0.5, obj: '瓶 500 毫升矿泉水' }, { v: 30, obj: '个小学生的体重' }] },
      { key: 't', name: '吨', sym: '吨', pow: 6, refs: [{ v: 1, obj: '辆家用小汽车' }, { v: 5, obj: '头亚洲象' }] }
    ]
  },
  {
    key: 'time', name: '时间', icon: '🕐', color: '#7a55d8',
    desc: '秒、分、时、日、周：不进十，改按 60 / 24 / 7 换算。',
    units: [
      { key: 's', name: '秒', sym: '秒', factor: [1, 1], refs: [{ v: 1, obj: '次眨眼睛' }, { v: 3, obj: '个“滴答”读秒' }] },
      { key: 'min', name: '分', sym: '分', factor: [60, 1], refs: [{ v: 1, obj: '首《小星星》' }, { v: 10, obj: '次课间休息' }] },
      { key: 'h', name: '时', sym: '时', factor: [3600, 1], refs: [{ v: 1, obj: '集动画片' }, { v: 2, obj: '场电影' }] },
      { key: 'd', name: '日', sym: '日', factor: [86400, 1], refs: [{ v: 1, obj: '天白天加黑夜' }] },
      { key: 'wk', name: '周', sym: '周', factor: [604800, 1], refs: [{ v: 1, obj: '个 7 天的星期' }] }
    ]
  },
  {
    key: 'area', name: '面积', icon: '⬜', color: '#2a9d63',
    desc: '平方厘米、平方分米、平方米、公顷、平方千米：面积进率要“两个 10”相乘。',
    units: [
      { key: 'cm2', name: '平方厘米', sym: '平方厘米', pow: 0, refs: [{ v: 1, obj: '个手指甲盖' }, { v: 300, obj: '本字典的封面' }] },
      { key: 'dm2', name: '平方分米', sym: '平方分米', pow: 2, refs: [{ v: 1, obj: '个手掌心(不含手指)' }] },
      { key: 'm2', name: '平方米', sym: '平方米', pow: 4, refs: [{ v: 1, obj: '张方桌的桌面' }, { v: 60, obj: '间教室的地面' }] },
      { key: 'hm2', name: '公顷', sym: '公顷', pow: 8, feel: '1 公顷 = 边长 100 米的正方形' },
      { key: 'km2', name: '平方千米', sym: '平方千米', pow: 10, feel: '1 平方千米 = 边长 1000 米的正方形' }
    ]
  },
  {
    key: 'volume', name: '体积·容积', icon: '🧊', color: '#0e9d94',
    desc: '毫升 = 立方厘米，升 = 立方分米，1 升 = 1000 毫升。',
    units: [
      { key: 'cm3', name: '立方厘米', sym: '立方厘米', pow: 0, refs: [{ v: 1, obj: '颗小骰子' }] },
      { key: 'ml', name: '毫升', sym: '毫升', pow: 0, refs: [{ v: 250, obj: '盒 250 毫升的牛奶' }] },
      { key: 'dm3', name: '立方分米', sym: '立方分米', pow: 3 },
      { key: 'l', name: '升', sym: '升', pow: 3, refs: [{ v: 1, obj: '瓶 1 升的大可乐' }, { v: 2, obj: '瓶 1.5 升的果汁' }] },
      { key: 'm3', name: '立方米', sym: '立方米', pow: 6, feel: '1 立方米 = 边长 1 米的大箱子' }
    ]
  },
  {
    key: 'money', name: '人民币', icon: '🪙', color: '#d8a427',
    desc: '元、角、分：1 元 = 10 角 = 100 分。',
    units: [
      { key: 'fen', name: '分', sym: '分', pow: 0, refs: [{ v: 5, obj: '枚五角硬币的分值' }] },
      { key: 'jiao', name: '角', sym: '角', pow: 1 },
      { key: 'yuan', name: '元', sym: '元', pow: 2, refs: [{ v: 2, obj: '瓶矿泉水' }, { v: 5, obj: '支中性笔' }] }
    ]
  }
]

// 各类别打开时的默认换算（大单位 → 常用小单位）
export const CAT_DEFAULT = {
  length: { from: 'm', to: 'cm' },
  mass: { from: 'kg', to: 'g' },
  time: { from: 'h', to: 'min' },
  area: { from: 'm2', to: 'dm2' },
  volume: { from: 'l', to: 'ml' },
  money: { from: 'yuan', to: 'jiao' }
}

export function catByKey(key) {
  return UNIT_CATEGORIES.find(c => c.key === key) || UNIT_CATEGORIES[0]
}

export function unitByKey(cat, key) {
  return cat.units.find(u => u.key === key) || cat.units[0]
}
