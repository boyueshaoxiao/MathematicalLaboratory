// 面积实验室 · 图形与公式数据
// 参数单位统一为 cm，面积精确值为 number（π 用 Math.PI，展示时保留 1 位）

export const AREA_SHAPES = [
  {
    key: 'square', name: '正方形', icon: '▢', grade: '三年级',
    formula: 'S = 边长 × 边长',
    params: [
      { key: 'a', label: '边长', min: 2, max: 10, step: 1, def: 6 }
    ],
    compute: p => p.a * p.a,
    zh: '边长', unit: 'cm'
  },
  {
    key: 'rect', name: '长方形', icon: '▭', grade: '三年级',
    formula: 'S = 长 × 宽',
    params: [
      { key: 'a', label: '长', min: 3, max: 12, step: 1, def: 8 },
      { key: 'b', label: '宽', min: 2, max: 8, step: 1, def: 5 }
    ],
    compute: p => p.a * p.b
  },
  {
    key: 'para', name: '平行四边形', icon: '▱', grade: '五年级',
    formula: 'S = 底 × 高',
    params: [
      { key: 'a', label: '底', min: 4, max: 10, step: 1, def: 8 },
      { key: 'h', label: '高', min: 3, max: 6, step: 1, def: 4 }
    ],
    compute: p => p.a * p.h
  },
  {
    key: 'tri', name: '三角形', icon: '△', grade: '五年级',
    formula: 'S = 底 × 高 ÷ 2',
    params: [
      { key: 'a', label: '底', min: 4, max: 10, step: 1, def: 8 },
      { key: 'h', label: '高', min: 3, max: 6, step: 1, def: 4 }
    ],
    compute: p => p.a * p.h / 2
  },
  {
    key: 'trap', name: '梯形', icon: '⏢', grade: '五年级',
    formula: 'S = (上底 + 下底) × 高 ÷ 2',
    params: [
      { key: 'a', label: '上底', min: 2, max: 6, step: 1, def: 4 },
      { key: 'b', label: '下底', min: 5, max: 10, step: 1, def: 8 },
      { key: 'h', label: '高', min: 3, max: 6, step: 1, def: 4 }
    ],
    compute: p => (p.a + p.b) * p.h / 2
  },
  {
    key: 'circle', name: '圆', icon: '●', grade: '六年级',
    formula: 'S = π × 半径 × 半径',
    params: [
      { key: 'r', label: '半径', min: 2, max: 4, step: 0.5, def: 3 }
    ],
    compute: p => Math.PI * p.r * p.r
  }
]

export function shapeByKey(k) {
  return AREA_SHAPES.find(s => s.key === k)
}

// 面积读数：整数直读，带小数保留 1 位
export function fmtArea(v) {
  const r = Math.round(v * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

// 生成随机题目：图形 key + 参数对象（整数或半整数）
export function randomAreaQuiz() {
  const pool = AREA_SHAPES
  const s = pool[Math.floor(Math.random() * pool.length)]
  const p = {}
  for (const def of s.params) {
    const steps = Math.floor((def.max - def.min) / def.step)
    p[def.key] = def.min + Math.round(Math.random() * steps) * def.step
  }
  return { key: s.key, params: p }
}

// 干扰项生成：围绕正确答案造 3 个易错值
export function makeOptions(q) {
  const s = shapeByKey(q.key)
  const p = q.params
  const ans = round1(s.compute(p))
  const wrongs = new Set()
  const feed = (v) => { const x = round1(v); if (x > 0 && x !== ans) wrongs.add(x) }
  if (s.key === 'square') { feed(p.a * 2 * p.a); feed((p.a + 1) * (p.a + 1)); feed(p.a * 4) }
  else if (s.key === 'rect') { feed(p.a * p.a); feed(p.b * p.b); feed(p.a * p.b / 2); feed((p.a + 1) * p.b) }
  else if (s.key === 'para') { feed(p.a * p.h / 2); feed((p.a + 1) * p.h); feed(p.a * (p.h + 1)) }
  else if (s.key === 'tri') { feed(p.a * p.h); feed(p.a * (p.h - 1) / 2); feed((p.a + 1) * p.h / 2) }
  else if (s.key === 'trap') { feed(p.b * p.h); feed(p.a * p.h); feed((p.a + p.b) * p.h); feed((p.b + 1) * p.h / 2) }
  else { feed(Math.PI * (p.r * 2) * (p.r * 2)); feed(2 * Math.PI * p.r); feed(Math.PI * (p.r + 1) * (p.r + 1)) }
  const list = [...wrongs]
  while (list.length < 3) { // 兜底随机小偏移
    const off = Math.max(1, Math.round(ans * 0.2)) || 1
    const v = round1(ans + (list.length % 2 ? -off : off) * (1 + Math.floor(Math.random() * 3)))
    if (v > 0 && !wrongs.has(v)) { list.push(v); wrongs.add(v) }
  }
  const pool2 = list.slice(0, 3)
  pool2.push(ans)
  // 打乱
  return pool2.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1])
}
const round1 = v => Math.round(v * 10) / 10

// 错的图形面积会是什么「典型错误」：给用户提示用
export function hintFor(key) {
  return {
    square: '正方形面积 = 边长×边长（周长才是 4×边长）',
    rect: '长方形面积 = 长×宽',
    para: '底和高必须互相垂直！面积 = 底×高（别忘 ÷2）',
    tri: '三角形面积 = 底×高÷2（两个三角形拼成平行四边形）',
    trap: '梯形面积 = (上底+下底)×高÷2',
    circle: '圆面积 = π×r²；周长 = 2πr，别混了'
  }[key]
}
