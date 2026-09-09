import { PATTERNS, buildUnfold } from './src/geometry/unfold.js'
import * as THREE from 'three'

for (const key of ['crossA', 'crossB', 'strip']) {
  const m = buildUnfold('cube', key)
  m.setProgress(1)
  m.root.updateMatrixWorld(true)
  let zMax = 0
  m.panelMeshes.forEach(mesh => {
    const pos = mesh.geometry.attributes.position
    const v = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
      zMax = Math.max(zMax, Math.abs(v.z))
    }
  })
  console.log(key, 'zMax=', zMax.toExponential(3), 'hinges=', m.hingeCount)
  m.dispose()
}
const tmp = '__t'
PATTERNS.cube[tmp] = { root: 0, tree: [[0, 2], [0, 3], [0, 4], [1, 2], [2, 5]] }
const m2 = buildUnfold('cube', tmp)
console.log('tmp hinges:', m2.hingeSteps.map(h => [h.child, +h.openAngleDeg.toFixed(1), +h.startDihedralDeg.toFixed(1)]))
m2.setProgress(1)
m2.root.updateMatrixWorld(true)
let z = 0
m2.panelMeshes.forEach(mesh => {
  const pos = mesh.geometry.attributes.position
  const v = new THREE.Vector3()
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
    z = Math.max(z, Math.abs(v.z))
  }
})
console.log('tmp zMax=', z.toExponential(3))
delete PATTERNS.cube[tmp]
m2.dispose()
