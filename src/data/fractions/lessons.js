// 分数实验室：模块注册表（FractionLab 外壳据此渲染模块导航）
// 每个 key 会作为 URL 参数 ?lab=fraction&fmod=<key> 直达
export const FRACTION_MODULES = [
  {
    key: 'intro',
    name: '认识分数',
    icon: '🍰',
    grade: '三年级',
    desc: '把 1 个整体平均分成几份，取其中几份，就是几分之几。'
  },
  {
    key: 'wall',
    name: '分数墙',
    icon: '🧱',
    grade: '三年级',
    desc: '不同分母的分数条叠成墙，比长短、找等值一眼看清。'
  },
  {
    key: 'line',
    name: '数轴定位',
    icon: '📏',
    grade: '三年级',
    desc: '分数也是数，能在数轴上找到它的位置。'
  },
  {
    key: 'addsub',
    name: '加减实验室',
    icon: '➕',
    grade: '三~五年级',
    desc: '同分母直接加减；异分母先通分成同分母。'
  },
  {
    key: 'equal',
    name: '等值与约分',
    icon: '♻️',
    grade: '四年级',
    desc: '分子分母同乘同除一个数，分数大小不变。'
  },
  {
    key: 'mixed',
    name: '假分数·带分数',
    icon: '🍱',
    grade: '四年级',
    desc: '分子比分母大也能读——数数能凑成几个整体。'
  },
  {
    key: 'ofgrid',
    name: '取几分之几',
    icon: '🎯',
    grade: '五~六年级',
    desc: '整体平均分成几份取几份，就是求一个数的几分之几。'
  }
]

export function moduleByKey(key) {
  return FRACTION_MODULES.find(m => m.key === key) || FRACTION_MODULES[0]
}
