// 小数实验室：模块注册表（DecimalLab 外壳据此渲染模块导航）
// 每个 key 会作为 URL 参数 ?lab=decimal&dmod=<key> 直达
export const DECIMAL_MODULES = [
  {
    key: 'intro',
    name: '认识小数',
    icon: '🔍',
    grade: '四年级',
    desc: '1 拆成 10 个 0.1，0.1 再拆成 10 个 0.01——放大镜里看小数的位值。'
  },
  {
    key: 'grid',
    name: '方格写小数',
    icon: '🧩',
    grade: '四年级',
    desc: '一条 = 0.1，一格 = 0.01。数一数涂了几格，把它写成小数、读出分数。'
  },
  {
    key: 'line',
    name: '数轴与比较',
    icon: '📏',
    grade: '四年级',
    desc: '小数也住在数轴上——放回它的位置，再和另一个小数比一比大小。'
  },
  {
    key: 'addsub',
    name: '加减实验室',
    icon: '➕',
    grade: '四~五年级',
    desc: '小数点对齐才能加减，满十向前进一——图形和竖式一起算。'
  }
]

export function moduleByKey(key) {
  return DECIMAL_MODULES.find(m => m.key === key) || DECIMAL_MODULES[0]
}
