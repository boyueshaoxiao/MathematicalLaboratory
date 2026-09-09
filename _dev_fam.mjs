import { VALID_CUBE_NETS } from './src/data/cubeQuizNets.js'
const TF = []
for (let r = 0; r < 4; r++) {
  TF.push(r === 0 ? c => [c[0], c[1]] : r === 1 ? c => [-c[1], c[0]] : r === 2 ? c => [-c[0], -c[1]] : c => [c[1], -c[0]])
}
for (let r = 0; r < 4; r++) { const f = TF[r]; TF.push(c => { const [x, y] = f(c); return [x, -y] }) }
function rows(cells) {
  const byRow = {}
  cells.forEach(([x, y]) => { (byRow[y] ||= []).push(x) })
  return Object.keys(byRow).map(Number).sort((a, b) => b - a).map(y => byRow[y].sort((a, b) => a - b))
}
function famOf(cells) {
  for (const f of TF) {
    const t = cells.map(f)
    const minx = Math.min(...t.map(c => c[0])), miny = Math.min(...t.map(c => c[1]))
    const n = t.map(c => [c[0] - minx, c[1] - miny])
    const lens = rows(n).map(r => r.length)
    const key = lens.join('-')
    if (key === '1-4-1') return '1-4-1'
    if (key === '1-3-2' || key === '2-3-1') return '2-3-1'
    if (key === '2-2-2') return '2-2-2'
    if (key === '3-3') return '3-3'
  }
  return '?'
}
const fams = {}
for (const net of VALID_CUBE_NETS) {
  const fam = famOf(net.cells)
  fams[fam] = (fams[fam] || 0) + 1
  console.log(net.key, '→', fam)
}
console.log(fams)
