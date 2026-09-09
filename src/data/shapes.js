export const shapeCategories = [
  {
    name: '基础立体',
    items: [
      { type: 'box', name: '正方体', icon: '■', defaults: { size: 2 } },
      { type: 'cuboid', name: '长方体', icon: '▣', defaults: { width: 2.8, height: 1.8, depth: 2 } },
      { type: 'sphere', name: '球体', icon: '●', defaults: { radius: 1.2 } },
      { type: 'cylinder', name: '圆柱', icon: '◉', defaults: { radius: 1.1, height: 2.2 } },
      { type: 'cone', name: '圆锥', icon: '▲', defaults: { radius: 1.2, height: 2.4 } },
      { type: 'torus', name: '圆环', icon: '◎', defaults: { radius: 1.2, tube: 0.35 } }
    ]
  },
  {
    name: '棱柱',
    items: [
      { type: 'prism', name: '三棱柱', icon: '△', defaults: { sides: 3, radius: 1.2, height: 2.2 } },
      { type: 'prism', name: '四棱柱', icon: '□', defaults: { sides: 4, radius: 1.2, height: 2.2 } },
      { type: 'prism', name: '五棱柱', icon: '⬟', defaults: { sides: 5, radius: 1.2, height: 2.2 } },
      { type: 'prism', name: '六棱柱', icon: '⬢', defaults: { sides: 6, radius: 1.2, height: 2.2 } },
      { type: 'prism', name: '八棱柱', icon: '⯃', defaults: { sides: 8, radius: 1.2, height: 2.2 } }
    ]
  },
  {
    name: '棱锥',
    items: [
      { type: 'pyramid', name: '三棱锥', icon: '△', defaults: { sides: 3, radius: 1.35, height: 2.3 } },
      { type: 'pyramid', name: '四棱锥', icon: '◇', defaults: { sides: 4, radius: 1.35, height: 2.3 } },
      { type: 'pyramid', name: '五棱锥', icon: '⬟', defaults: { sides: 5, radius: 1.35, height: 2.3 } },
      { type: 'pyramid', name: '六棱锥', icon: '⬢', defaults: { sides: 6, radius: 1.35, height: 2.3 } }
    ]
  },
  {
    name: '特殊图形',
    items: [
      { type: 'hemisphere', name: '半球', icon: '◓', defaults: { radius: 1.25 } },
      { type: 'frustum', name: '圆台', icon: '⏃', defaults: { radiusTop: 0.65, radiusBottom: 1.25, height: 1.9 } }
    ]
  }
]
