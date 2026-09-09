// 单位换算实验室：模块注册表（UnitLab 外壳据此渲染模块导航）
// 每个 key 会作为 URL 参数 ?lab=unit&umod=<key> 直达
export const UNIT_MODULES = [
  {
    key: 'convert',
    name: '换算器',
    icon: '🔁',
    grade: '三~六年级',
    desc: '选好两个单位随便输入：米↔厘米、元↔角……双向换算，放大镜看看要 ×10 几次。'
  },
  {
    key: 'ladder',
    name: '进率阶梯',
    icon: '🪜',
    grade: '三~六年级',
    desc: '把单位按大小摆到阶梯上：从这头到那头跳几级？每级 ×10 还是 ÷10？'
  },
  {
    key: 'quiz',
    name: '换算挑战',
    icon: '🎯',
    grade: '三~六年级',
    desc: '3 米 = ( ) 厘米？换算填空，做对一题得一分，还有一步一步的讲解。'
  },
  {
    key: 'compare',
    name: '比大小',
    icon: '⚖️',
    grade: '三~六年级',
    desc: '5 千克 ○ 500 克？先换算成同一单位再比，小心别被“数字大”骗了。'
  }
]

export function moduleByKey(key) {
  return UNIT_MODULES.find(m => m.key === key) || UNIT_MODULES[0]
}
