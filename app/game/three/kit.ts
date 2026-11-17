/**
 * The building blocks every 3D model is made of: shared materials, shared shapes and textures
 * painted in code (no image files to download, so the game works offline and in the gateway).
 * Everything is made once and reused, so a scene full of chickens costs a handful of materials.
 */
import {
  BoxGeometry, CanvasTexture, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide,
  ExtrudeGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, RepeatWrapping, Shape, SphereGeometry,
  SRGBColorSpace, TorusGeometry, Vector2, Float32BufferAttribute, type BufferGeometry, type Material, type Object3D, type Texture,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/* ------------------------------ Materials ------------------------------ */

export interface MatOptions {
  rough?: number
  metal?: number
  emissive?: string
  emissiveIntensity?: number
  opacity?: number
  map?: Texture
  side?: 'double'
  flat?: boolean
}

const mats = new Map<string, MeshStandardMaterial>()

/** A shared, softly shiny material: the clean "toy" look of the game. */
export function mat(color: string, o: MatOptions = {}): MeshStandardMaterial {
  const key = `${color}|${o.rough ?? ''}|${o.metal ?? ''}|${o.emissive ?? ''}|${o.emissiveIntensity ?? ''}|${o.opacity ?? ''}|${o.map?.uuid ?? ''}|${o.side ?? ''}|${o.flat ? 1 : 0}`
  let m = mats.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      color: new Color(color),
      roughness: o.rough ?? 0.62,
      metalness: o.metal ?? 0,
      map: o.map ?? null,
      flatShading: !!o.flat,
    })
    if (o.emissive) {
      m.emissive = new Color(o.emissive)
      m.emissiveIntensity = o.emissiveIntensity ?? 1
    }
    if (o.opacity != null && o.opacity < 1) {
      m.transparent = true
      m.opacity = o.opacity
      m.depthWrite = false
    }
    if (o.side === 'double') m.side = DoubleSide
    mats.set(key, m)
  }
  return m
}

/* ------------------------------ Shapes ------------------------------ */

const geos = new Map<string, BufferGeometry>()
function cachedGeo<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geos.get(key) as T | undefined
  if (!g) geos.set(key, g = make())
  return g
}

export const geo = {
  sphere: (r: number, w = 22, h = 16) => cachedGeo(`s${r}|${w}|${h}`, () => new SphereGeometry(r, w, h)),
  hemi: (r: number) => cachedGeo(`h${r}`, () => new SphereGeometry(r, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
  box: (w: number, h: number, d: number) => cachedGeo(`b${w}|${h}|${d}`, () => new BoxGeometry(w, h, d)),
  rbox: (w: number, h: number, d: number, r = 0.04) => cachedGeo(`rb${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01))),
  cyl: (rt: number, rb: number, h: number, seg = 20, open = false) => cachedGeo(`c${rt}|${rb}|${h}|${seg}|${open}`, () => new CylinderGeometry(rt, rb, h, seg, 1, open)),
  cone: (r: number, h: number, seg = 18) => cachedGeo(`k${r}|${h}|${seg}`, () => new ConeGeometry(r, h, seg)),
  /** Half a tube along x, open at the ends: a canopy or a vault. */
  vault: (r: number, len: number) => cachedGeo(`v${r}|${len}`, () => new CylinderGeometry(r, r, len, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2)),
  capsule: (r: number, len: number) => cachedGeo(`p${r}|${len}`, () => new CapsuleGeometry(r, len, 6, 16)),
  torus: (r: number, t: number, arc = Math.PI * 2) => cachedGeo(`t${r}|${t}|${arc}`, () => new TorusGeometry(r, t, 10, 28, arc)),
  lathe: (key: string, pts: [number, number][], seg = 24) => cachedGeo(`l${key}`, () => new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), seg)),
  /** A gable roof `len` long (its ridge along x), spanning `span` across (z), `h` tall, `t` thick. */
  gable: (len: number, span: number, h: number, t = 0.06) => cachedGeo(`g${len}|${span}|${h}|${t}`, () => {
    const s = new Shape()
    s.moveTo(-span / 2, 0)
    s.lineTo(0, h)
    s.lineTo(span / 2, 0)
    s.lineTo(span / 2 - t * 1.6, 0)
    s.lineTo(0, h - t * 1.9)
    s.lineTo(-span / 2 + t * 1.6, 0)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: len, bevelEnabled: false })
    g.translate(0, 0, -len / 2)
    g.rotateY(Math.PI / 2)
    return g
  }),
  /** The solid triangle under a gable roof (the attic), ridge along x. */
  gableWall: (len: number, span: number, h: number) => cachedGeo(`gw${len}|${span}|${h}`, () => {
    const s = new Shape()
    s.moveTo(-span / 2, 0)
    s.lineTo(0, h)
    s.lineTo(span / 2, 0)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: len, bevelEnabled: false })
    g.translate(0, 0, -len / 2)
    g.rotateY(Math.PI / 2)
    return g
  }),
  /** A flat outline (a leaf, a star) given its points, extruded `depth`. */
  shape: (key: string, pts: [number, number][], depth: number, bevel = 0) => cachedGeo(`sh${key}`, () => {
    const s = new Shape()
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 })
    g.translate(0, 0, -depth / 2)
    return g
  }),
}

/* ------------------------------ Putting models together ------------------------------ */

type V3 = [number, number, number]

/** Adds a mesh to a group: shape, material, position, rotation (radians) and scale. */
export function part(parent: Object3D, g: BufferGeometry, m: Material, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 | number = 1): Mesh {
  const mesh = new Mesh(g, m)
  mesh.position.set(...p)
  mesh.rotation.set(...r)
  if (typeof s === 'number') mesh.scale.setScalar(s)
  else mesh.scale.set(...s)
  parent.add(mesh)
  return mesh
}

export function group(parent?: Object3D, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s = 1): Group {
  const g = new Group()
  g.position.set(...p)
  g.rotation.set(...r)
  g.scale.setScalar(s)
  parent?.add(g)
  return g
}

/** Every mesh in it casts (and receives) shadows. */
export function shadows<T extends Object3D>(root: T, receive = true): T {
  root.traverse((o) => {
    if ((o as Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = receive
    }
  })
  return root
}

/**
 * Merges everything in a group that never moves into one mesh per material, so a yard full of
 * trees, rice and fence posts costs a handful of draw calls instead of hundreds.
 */
export function bake(root: Object3D, castShadow: boolean): Group {
  root.updateMatrixWorld(true)
  const byMat = new Map<Material, BufferGeometry[]>()
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const m = mesh.material as Material
    let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
    g.applyMatrix4(mesh.matrixWorld)
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name)
    if (!g.attributes.uv) {
      g = g.clone()
      g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2))
    }
    let list = byMat.get(m)
    if (!list) byMat.set(m, list = [])
    list.push(g)
  })
  const out = new Group()
  for (const [m, list] of byMat) {
    const merged = mergeGeometries(list)
    for (const g of list) g.dispose()
    if (!merged) continue
    const mesh = new Mesh(merged, m)
    mesh.castShadow = castShadow
    mesh.receiveShadow = true
    out.add(mesh)
  }
  return out
}

/* ------------------------------ Textures painted in code ------------------------------ */

export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const texs = new Map<string, Texture>()

/** A texture painted once on a canvas, repeated `rx` × `ry` times. */
export function paint(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, rx = 1, ry = 1): Texture {
  const full = `${key}|${rx}|${ry}`
  let t = texs.get(full)
  if (t) return t
  let base = texs.get(key)
  if (!base) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    draw(c.getContext('2d')!, size)
    base = new CanvasTexture(c)
    base.colorSpace = SRGBColorSpace
    base.wrapS = base.wrapT = RepeatWrapping
    base.anisotropy = 4
    texs.set(key, base)
  }
  if (rx === 1 && ry === 1) return base
  t = base.clone()
  t.repeat.set(rx, ry)
  t.needsUpdate = true
  texs.set(full, t)
  return t
}

/** Speckles of lighter and darker colour: grain, dirt, grass. */
export function speckle(g: CanvasRenderingContext2D, s: number, seed: number, colors: string[], count: number, size = [1, 3]) {
  const r = rng(seed)
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)]!
    const w = size[0]! + r() * (size[1]! - size[0]!)
    g.beginPath()
    g.ellipse(r() * s, r() * s, w, w * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
}

/** Throws away every material, shape and texture (the game is gone). */
export function disposeKit() {
  for (const m of mats.values()) m.dispose()
  for (const g of geos.values()) g.dispose()
  for (const t of texs.values()) t.dispose()
  mats.clear()
  geos.clear()
  texs.clear()
}
