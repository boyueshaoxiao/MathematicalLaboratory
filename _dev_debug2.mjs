import { buildPolyData } from './src/geometry/unfold.js'

const d = buildPolyData('cube')
console.log('corners ok', d.corners.every(c => c.every(v => Number.isFinite(v))))
d.faces.forEach((f, i) => {
  console.log('face', i, 'idx=', f.idx.join(','), 'normal=', f.normal?.toArray().map(x => +x.toFixed(2)), 'center=', f.center?.toArray().map(x => +x.toFixed(2)))
})
