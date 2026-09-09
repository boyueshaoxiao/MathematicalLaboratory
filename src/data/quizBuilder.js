// 展开图判断题题库
// 正方体：六连方枚举题（11 种合法 + 24 种非法，来自 cubeQuizNets.js）
// 其它多面体：以引擎真实展开图为合法项；把其中一块移出整体作为非法项
import { buildUnfold, PATTERNS } from '../geometry/unfold.js'
import { VALID_CUBE_NETS, INVALID_HEXOMINOES } from './cubeQuizNets.js'

export const QUIZ_SHAPES = [
  { type: 'cube', name: '正方体' },
  { type: 'cuboid', name: '长方体' },
  { type: 'triangularPrism', name: '三棱柱' },
  { type: 'pentagonalPrism', name: '五棱柱' },
  { type: 'hexagonalPrism', name: '六棱柱' },
  { type: 'squarePyramid', name: '四棱锥' },
  { type: 'triangularPyramid', name: '三棱锥' }
]

function flatPanelsOf(type, key) {
  const m = buildUnfold(type, key)
  const panels = m.flatPanels()
  m.dispose()
  return panels
}

function panelBox(panels, exceptIdx) {
  const pts = panels.flatMap((p, i) => (i === exceptIdx ? [] : p.pts))
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys)
  }
}

// 非法项：把某一块平移到整体外（保证与其它块不连接 → 无法折成立体）
function detachOne(panels, idx, dirX, dirY) {
  const b = panelBox(panels, idx)
  const dx = (b.maxX - b.minX) * 1.3 + 2.2
  const dy = (b.maxY - b.minY) * 1.3 + 2.2
  const ox = dirX * dx
  const oy = dirY * dy
  return panels.map((p, i) => i === idx
    ? { ...p, pts: p.pts.map(q => [q[0] + ox, q[1] + oy]) }
    : p)
}

function polyDeck(type) {
  const keys = Object.keys(PATTERNS[type] || {})
  const valid = []
  const invalid = []
  keys.forEach((key, ki) => {
    const panels = flatPanelsOf(type, key)
    valid.push({ kind: 'panels', panels, valid: true, patternKey: key })
    const n = panels.length
    if (n < 2) return
    // 每种展开图生成 2 个“错位”的非法项：分别把第 1、第 2 块移走（方向错开）
    const picks = []
    picks.push((ki * 2 + 1) % n)
    picks.push((ki * 2 + 2) % n)
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
    picks.forEach((idx, k2) => {
      const d = dirs[(ki + k2) % dirs.length]
      invalid.push({
        kind: 'panels', valid: false,
        panels: detachOne(panels, idx, d[0], d[1])
      })
    })
  })
  return { valid, invalid }
}

function cubeDeck() {
  const valid = VALID_CUBE_NETS.map(e => ({
    kind: 'cells', cells: e.cells, valid: true, patternKey: e.key, family: e.family
  }))
  const invalid = INVALID_HEXOMINOES.map(cells => ({
    kind: 'cells', cells, valid: false
  }))
  return { valid, invalid }
}

export function buildDeck(type, filter) {
  const src = type === 'cube' ? cubeDeck() : polyDeck(type)
  const items = []
  if (filter !== 'invalid') items.push(...src.valid)
  if (filter !== 'valid') items.push(...src.invalid)
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
