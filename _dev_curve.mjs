import * as THREE from 'three'
import { buildUnfold } from './src/geometry/unfold.js'

for (const [type, pats] of [['cylinder', ['cylinderA', 'cylinderB']], ['cone', ['coneA', 'coneB']]]) {
  for (const p of pats) {
    const m = buildUnfold(type, p)
    let nan = false
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      m.setProgress(t)
      m.root.updateMatrixWorld(true)
      m.root.traverse(o => {
        if (o.isMesh) {
          const g = o.geometry
          const a = g.attributes.position
          if (a) {
            for (let i = 0; i < a.count; i++) {
              const x = a.getX(i), y = a.getY(i), z = a.getZ(i)
              if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) nan = true
            }
          }
          if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) nan = true
        }
      })
    }
    console.log(`[${type}/${p}] NaN=${nan} size=${m.netSize.toArray().map(x => +x.toFixed(2))} center=${m.netCenter.toArray().map(x => +x.toFixed(2))}`)
    m.dispose()
  }
}
