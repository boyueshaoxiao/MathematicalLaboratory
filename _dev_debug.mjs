import * as THREE from 'three'
import { buildUnfold } from './src/geometry/unfold.js'

const m = buildUnfold('cube', 'crossA')
m.setProgress(1)
m.root.updateMatrixWorld(true)
let i = 0
m.root.traverse(o => {
  if (o.isMesh && o.matrixAutoUpdate === false) {
    const attr = o.geometry.attributes.position
    const tmp = new THREE.Vector3()
    const pts = []
    for (let k = 0; k < attr.count; k++) {
      tmp.fromBufferAttribute(attr, k).applyMatrix4(o.matrixWorld)
      pts.push(tmp.x.toFixed(2) + ',' + tmp.y.toFixed(2) + ',' + tmp.z.toFixed(2))
    }
    console.log('mesh', i, 'world=', pts.join('  '))
    i++
  }
})
