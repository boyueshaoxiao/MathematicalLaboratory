import * as THREE from 'three'
import { buildUnfold } from './src/geometry/unfold.js'

for (const [type, pats] of [['cube', ['crossA', 'crossB', 'strip']], ['cuboid', ['cuboidA', 'cuboidB']], ['triangularPrism', ['triA', 'triB']], ['squarePyramid', ['pyramidA', 'pyramidB']]]) {
  for (const p of pats) {
    const m = buildUnfold(type, p)
    m.setProgress(1)
    m.root.updateMatrixWorld(true)
    const tmp = new THREE.Vector3(), n = new THREE.Vector3()
    const bad = []
    m.root.traverse(o => {
      if (o.isMesh && o.matrixAutoUpdate === false) {
        const attr = o.geometry.attributes.position
        tmp.fromBufferAttribute(attr, 0).applyMatrix4(o.matrixWorld)
        const a = tmp.clone()
        tmp.fromBufferAttribute(attr, 1).applyMatrix4(o.matrixWorld)
        const b = tmp.clone()
        tmp.fromBufferAttribute(attr, 2).applyMatrix4(o.matrixWorld)
        const c = tmp.clone()
        n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
        if (n.z < 0.99) bad.push(n.z.toFixed(2))
      }
    })
    console.log(`[${type}/${p}] 反向面=${bad.length ? bad.join(',') : '无'}`)
    m.dispose()
  }
}
