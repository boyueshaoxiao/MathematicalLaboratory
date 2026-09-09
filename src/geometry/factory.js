import * as THREE from 'three'

function material(color = 0x4f8cff, transparent = false) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.68, metalness: 0.04,
    transparent, opacity: transparent ? 0.48 : 1,
    side: THREE.DoubleSide
  })
}

export function createGeometry(shape) {
  const p = shape.params || {}
  let geometry

  switch (shape.type) {
    case 'box':
      geometry = new THREE.BoxGeometry(p.size ?? 2, p.size ?? 2, p.size ?? 2)
      break
    case 'cuboid':
      geometry = new THREE.BoxGeometry(p.width ?? 2.8, p.height ?? 1.8, p.depth ?? 2)
      break
    case 'sphere':
      geometry = new THREE.SphereGeometry(p.radius ?? 1.2, 48, 32)
      break
    case 'hemisphere':
      geometry = new THREE.SphereGeometry(p.radius ?? 1.25, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2)
      break
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(p.radius ?? 1.1, p.radius ?? 1.1, p.height ?? 2.2, 48)
      break
    case 'cone':
      geometry = new THREE.ConeGeometry(p.radius ?? 1.2, p.height ?? 2.4, 48)
      break
    case 'frustum':
      geometry = new THREE.CylinderGeometry(p.radiusTop ?? 0.65, p.radiusBottom ?? 1.25, p.height ?? 1.9, 48)
      break
    case 'torus':
      geometry = new THREE.TorusGeometry(p.radius ?? 1.2, p.tube ?? 0.35, 20, 64)
      break
    case 'prism':
      geometry = new THREE.CylinderGeometry(p.radius ?? 1.2, p.radius ?? 1.2, p.height ?? 2.2, p.sides ?? 6)
      break
    case 'pyramid': {
      const n = p.sides ?? 4
      const r = p.radius ?? 1.35
      const h = p.height ?? 2.3
      const vertices = []
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + i * Math.PI * 2 / n
        vertices.push(r * Math.cos(a), -h / 2, r * Math.sin(a))
      }
      vertices.push(0, h / 2, 0)
      const indices = []
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n
        indices.push(i, j, n)
      }
      for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i)
      geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      break
    }
    default:
      geometry = new THREE.BoxGeometry(2, 2, 2)
  }
  return geometry
}

export function createShapeObject(shape) {
  const group = new THREE.Group()
  const mesh = new THREE.Mesh(createGeometry(shape), material(shape.color))
  group.add(mesh)

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 18),
    new THREE.LineBasicMaterial({ color: 0x19324d, transparent: true, opacity: 0.45 })
  )
  edges.visible = shape.showEdges !== false
  group.add(edges)

  group.userData.shapeId = shape.id
  group.userData.kind = shape.type
  group.userData.mesh = mesh
  group.userData.edges = edges
  return group
}

/**
 * 应用“半透明/透视”外观。
 * - transparent：面半透明，且不写深度 → 能透过前面看到内部/背面的棱线（透视效果）；
 *   此时棱线强制显示并提亮、置顶。
 * - 非 transparent：恢复为实心；棱线跟随 showEdges 开关。
 */
export function applyAppearance(obj, { transparent = false, showEdges = true } = {}) {
  const mesh = obj?.userData?.mesh
  const edges = obj?.userData?.edges
  if (!mesh || !edges) return
  const m = mesh.material
  const was = m.transparent
  m.transparent = transparent
  if (m.transparent !== was) m.needsUpdate = true // transparent 属于程序参数，切换时需重编译
  const opacity = transparent ? 0.25 : 1
  if (m.opacity !== opacity) m.opacity = opacity
  m.depthWrite = !transparent
  mesh.renderOrder = 0
  edges.material.opacity = transparent ? 0.95 : 0.45
  edges.visible = transparent || showEdges
  edges.renderOrder = transparent ? 1 : 0
}
