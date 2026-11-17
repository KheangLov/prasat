/**
 * Every 3D model in the game, built from simple shapes in code: the lotus-bud spire that crowns a
 * finished tower (and the golden spire of the palace), a carved stone, the stone lions guarding the
 * stairs, the jungle, far temple towers, lamps, and the two carvers of the story. One world unit is
 * a metre; models stand on y = 0.
 */
import { CatmullRomCurve3, Group, TubeGeometry, Vector3 } from 'three'
import { geo, group, mat, paint, part, shadows } from './kit'

export type ModelName = 'bud' | 'spire' | 'stone' | 'lion' | 'tree' | 'palm' | 'prang' | 'lamp' | 'sophal' | 'prom'

const PI = Math.PI

const krama = () => paint('krama', 64, (g, s) => {
  g.fillStyle = '#d93a2b'
  g.fillRect(0, 0, s, s)
  g.fillStyle = 'rgba(255,255,255,.85)'
  for (let i = 0; i < s; i += 16) {
    g.fillRect(i, 0, 5, s)
    g.fillRect(0, i, s, 5)
  }
})

/** The lotus-bud top of an Angkor tower, in tiers; about 1 m across at the base. */
function bud() {
  const root = new Group()
  const st = mat('#c8b08a', { rough: 0.85 })
  const dk = mat('#a8906a', { rough: 0.9 })
  part(root, geo.lathe('bud', [[0, 0], [0.5, 0], [0.48, 0.2], [0.4, 0.25], [0.4, 0.45], [0.33, 0.5], [0.32, 0.7], [0.25, 0.75], [0.22, 0.95], [0.14, 1.05], [0.07, 1.3], [0, 1.45]], 8), st, [0, 0, 0], [0, PI / 8, 0])
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4
    part(root, geo.cone(0.08, 0.3, 4), dk, [Math.cos(a) * 0.42, 0.38, Math.sin(a) * 0.42])
  }
  return shadows(root)
}

/** A golden spire, as on the Royal Palace's halls. */
function spire() {
  const root = new Group()
  const gold = mat('#ffc21a', { rough: 0.3, metal: 0.6 })
  part(root, geo.cyl(0.4, 0.5, 0.3, 8), mat('#f4ecd8', { rough: 0.8 }), [0, 0.15, 0])
  part(root, geo.lathe('pspire', [[0, 0], [0.38, 0], [0.3, 0.3], [0.32, 0.4], [0.2, 0.8], [0.22, 0.9], [0.1, 1.4], [0.04, 2.0], [0, 2.2]], 10), gold, [0, 0.3, 0])
  for (let i = 0; i < 3; i++) part(root, geo.torus(0.24 - i * 0.06, 0.03), gold, [0, 0.5 + i * 0.35, 0], [PI / 2, 0, 0])
  return shadows(root)
}

/** One carved stone (the icon). */
function stone() {
  const root = new Group()
  part(root, geo.rbox(1, 0.5, 1, 0.03), mat('#b8a078', { rough: 0.85 }), [0, 0.25, 0])
  part(root, geo.box(1.02, 0.08, 1.02), mat('#8a7454'), [0, 0.25, 0])
  return shadows(root)
}

/** A stone lion on a plinth, sitting up. Faces +z. */
function lion() {
  const root = new Group()
  const st = mat('#a89878', { rough: 0.9 })
  part(root, geo.box(0.6, 0.3, 0.8), st, [0, 0.15, 0])
  part(root, geo.capsule(0.18, 0.3), st, [0, 0.55, -0.05], [0.3, 0, 0])
  part(root, geo.sphere(0.2), st, [0, 0.85, 0.08])
  part(root, geo.sphere(0.25, 12, 8), mat('#988868', { rough: 0.9 }), [0, 0.82, 0.02], [0, 0, 0], [1, 1, 0.7])
  part(root, geo.sphere(0.08), st, [0, 0.8, 0.26])
  for (const x of [-0.12, 0.12]) part(root, geo.capsule(0.06, 0.25), st, [x, 0.42, 0.18])
  return shadows(root)
}

function tree() {
  const root = new Group()
  part(root, geo.cyl(0.25, 0.35, 3, 8), mat('#6a4a2a', { rough: 1 }), [0, 1.5, 0])
  for (const [x, y, z, s] of [[0, 3.8, 0, 1.8], [1.1, 3.3, 0.2, 1.2], [-1.1, 3.4, -0.1, 1.3], [0.1, 4.8, 0.1, 1.2]] as const) {
    part(root, geo.sphere(1, 12, 9), mat(s > 1.5 ? '#3f8f3a' : '#4fa04a', { rough: 0.85 }), [x, y, z], [0, 0, 0], s)
  }
  return shadows(root, false)
}

function palm() {
  const root = new Group()
  const trunk = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.2, 3, 0), new Vector3(-0.1, 6, 0)])
  part(root, new TubeGeometry(trunk, 12, 0.2, 8), mat('#5a4a3a', { rough: 1 }))
  const leaf = mat('#3f8a3a', { rough: 0.75, side: 'double' })
  const frond: [number, number][] = [[0, 0], [0.25, 0.5], [0.22, 1.4], [0, 2.2], [-0.22, 1.4], [-0.25, 0.5]]
  for (let i = 0; i < 9; i++) {
    const g = group(root, [-0.1, 6, 0], [0, (i / 9) * PI * 2, 0])
    part(g, geo.shape('frond', frond, 0.01), leaf, [0, 0, 0], [-1.1 - (i % 2) * 0.3, 0, 0])
  }
  return shadows(root, false)
}

/** A far temple tower (Angkor style), seen against the sky. */
function prang() {
  const root = new Group()
  const st = mat('#9a8a70', { rough: 1 })
  part(root, geo.box(4, 1.5, 4), st, [0, 0.75, 0])
  part(root, geo.box(3, 2, 3), st, [0, 2.5, 0])
  part(root, geo.lathe('fprang', [[0, 0], [1.4, 0], [1.3, 0.8], [1.1, 1.0], [1.0, 1.8], [0.8, 2.0], [0.7, 2.8], [0.45, 3.0], [0.3, 3.8], [0, 4.4]], 8), st, [0, 3.5, 0], [0, PI / 8, 0])
  return root
}

function lamp() {
  const root = new Group()
  part(root, geo.cyl(0.06, 0.08, 1.4, 8), mat('#3a3a40', { metal: 0.5 }), [0, 0.7, 0])
  part(root, geo.sphere(0.18), mat('#fff2c8', { emissive: '#ffcc66', emissiveIntensity: 1.8 }), [0, 1.5, 0])
  return root
}

function person(kind: 'sophal' | 'prom') {
  const root = new Group()
  const skin = mat(kind === 'sophal' ? '#c98a5a' : '#a8703a', { rough: 0.6 })
  const shirt = kind === 'sophal' ? '#ff9a3a' : '#f4efe4'
  part(root, geo.capsule(0.2, 0.22), mat(shirt, { rough: 0.8 }), [0, 0.32, 0], [0, 0, 0], [0.85, 1, 1.3])
  for (const z of [-1, 1]) {
    part(root, geo.capsule(0.06, 0.24), mat(shirt, { rough: 0.8 }), [0.04, 0.38, z * 0.25], [z * 0.25, 0, -0.25])
    part(root, geo.sphere(0.06), skin, [0.1, 0.22, z * 0.29])
  }
  part(root, geo.torus(0.1, 0.045), mat('#ffffff', { rough: 0.8, map: krama() }), [0, 0.6, 0], [PI / 2, 0, 0])
  const head = group(root, [0, 0.86, 0], [0, 0, 0], 1.12)
  part(head, geo.sphere(0.19), skin)
  for (const z of [-0.07, 0.07]) {
    part(head, geo.sphere(0.024), mat('#2a1a10', { rough: 0.2 }), [0.17, 0.02, z])
    part(head, geo.sphere(0.008), mat('#ffffff'), [0.188, 0.03, z * 1.05])
  }
  part(head, geo.torus(0.05, 0.01, PI), mat('#8a3a2a'), [0.18, -0.07, 0], [0, PI / 2, PI])
  if (kind === 'sophal') {
    part(head, geo.hemi(0.2), mat('#1a1010', { rough: 0.5 }), [-0.01, 0.03, 0], [0, 0, 0.25])
    // A chisel in hand.
    part(root, geo.cyl(0.02, 0.02, 0.3, 6), mat('#8a8a90', { metal: 0.7 }), [0.15, 0.25, 0.3], [0, 0, 0.6])
  }
  else {
    part(head, geo.hemi(0.198), mat('#e8e8e8', { rough: 0.9 }), [-0.03, 0.02, 0], [0, 0, 0.5])
    part(head, geo.cone(0.09, 0.2, 8), mat('#ececec', { rough: 0.9 }), [0.13, -0.18, 0], [0, 0, 0.3 + PI])
    // A mallet.
    part(root, geo.cyl(0.02, 0.02, 0.35, 6), mat('#6a4a2a'), [0.15, 0.3, 0.3], [0, 0, 0.6])
    part(root, geo.box(0.12, 0.1, 0.1), mat('#8a5a34'), [0.25, 0.45, 0.3])
  }
  return shadows(root)
}

const MAKERS: Record<ModelName, () => Group> = {
  bud, spire, stone, lion, tree, palm, prang, lamp,
  sophal: () => person('sophal'),
  prom: () => person('prom'),
}

/** A fresh copy of a model (geometry and materials are shared). */
export function makeModel(name: ModelName): Group {
  const g = MAKERS[name]()
  g.name = name
  return g
}
