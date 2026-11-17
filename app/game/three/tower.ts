/**
 * The temple in 3D, in plain three.js: a stepped stone terrace in the jungle, the tower rising from
 * it stone by stone, the sliding stone above, cut pieces tumbling away, and, when the tower is done,
 * a lotus-bud spire on top as the camera draws back to show it whole. The view never changes the
 * game: it reads the engine's state each frame and reacts to its events with effects.
 *
 * World axes: x and z across, y up; floor n sits at y = n × FLOOR above the terrace.
 * Quality 'high': shadows, antialiasing, up to 2x pixel ratio. 'low': no shadows, 1x pixels.
 */
import type { MeshStandardMaterial } from 'three'
import {
  ACESFilmicToneMapping, BoxGeometry, Color, DirectionalLight, Fog, Group, HemisphereLight, IcosahedronGeometry,
  InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PCFSoftShadowMap, PerspectiveCamera,
  PlaneGeometry, Quaternion, RingGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three'
import { FLOOR, WORLDS, type Engine, type GameEvent, type LevelDef, type Stone } from '#shared/game'
import { bake, geo, mat, paint, part, rng } from './kit'
import { makeModel, type ModelName } from './models'

export type Quality = 'high' | 'low'

interface Particle { on: boolean, p: Vector3, v: Vector3, life: number, max: number, size: number, g: number }
interface Popup { el: HTMLElement, p: Vector3, t: number }
interface Falling { mesh: Mesh, v: Vector3, spin: Vector3, t: number }

/** Height of the terrace the tower stands on. */
const BASE = 1.2

export class TowerView {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(40, 1, 0.3, 300)
  private root = new Group()
  private sun: DirectionalLight
  private unit = new BoxGeometry(1, 1, 1)
  private stoneMat: MeshStandardMaterial[]
  private stones: Mesh[] = []
  private moving: Mesh
  private falling: Falling[] = []
  private spire: Group | null = null
  private flash: Mesh
  private flashT = 0
  private parts: Particle[] = []
  private partMesh: InstancedMesh
  private popups: Popup[] = []
  private time = 0
  private lastStats = -1
  private width = 1
  private height = 1
  private camY = 3
  private camDist = 16
  private yaw = 0.78
  private wonT = 0
  private v = new Vector3()
  private m4 = new Matrix4()
  private q = new Quaternion()
  reducedMotion = false

  constructor(private canvas: HTMLCanvasElement, private overlay: HTMLElement, readonly quality: Quality, readonly level: LevelDef, private scenic = false) {
    this.renderer = new WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = quality === 'high'
    this.renderer.shadowMap.type = PCFSoftShadowMap
    const world = WORLDS[level.world]!
    const p = world.palette
    this.scene.background = paint(`sky${world.id}`, 256, (c, s) => {
      const g = c.createLinearGradient(0, 0, 0, s)
      g.addColorStop(0, world.night ? '#0a0a24' : '#7ab8f0')
      g.addColorStop(1, p.sky)
      c.fillStyle = g
      c.fillRect(0, 0, s, s)
    })
    this.scene.fog = new Fog(p.sky, 60, 180)
    this.scene.add(new HemisphereLight(world.night ? '#8a90d8' : '#eaf4ff', world.night ? '#2a2a3a' : '#6a7a4a', world.night ? 1.2 : 1.3))
    this.sun = new DirectionalLight(world.night ? '#ffe0a8' : '#fff1d6', world.night ? 1.4 : 2.3)
    this.sun.castShadow = quality === 'high'
    this.sun.shadow.mapSize.set(1024, 1024)
    Object.assign(this.sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 60 })
    this.sun.shadow.bias = -0.0005
    this.scene.add(this.sun, this.sun.target)
    this.scene.add(this.root)

    // Stone with a carved band, in the temple's own style; two shades so floors read apart.
    this.stoneMat = [0, 1].map(i => mat('#ffffff', { rough: 0.85, map: this.carving(i) }))
    this.buildGround()

    this.moving = new Mesh(this.unit, this.stoneMat[0])
    this.moving.castShadow = quality === 'high'
    this.root.add(this.moving)
    this.flash = new Mesh(new RingGeometry(0.9, 1, 48), new MeshBasicMaterial({ color: '#fff2a0', transparent: true, opacity: 0, depthWrite: false }))
    this.flash.rotation.x = -Math.PI / 2
    this.root.add(this.flash)

    const n = quality === 'high' ? 300 : 150
    this.partMesh = new InstancedMesh(new IcosahedronGeometry(1, 0), mat('#ffffff', { rough: 0.6 }), n)
    this.partMesh.frustumCulled = false
    for (let i = 0; i < n; i++) {
      this.parts.push({ on: false, p: new Vector3(), v: new Vector3(), life: 0, max: 1, size: 0, g: 0 })
      this.partMesh.setMatrixAt(i, this.m4.makeScale(0, 0, 0))
      this.partMesh.setColorAt(i, new Color('#ffffff'))
    }
    this.root.add(this.partMesh)
  }

  /** A stone texture: sandstone speckle, a carved band in the middle, edges darker. */
  private carving(shade: number) {
    const world = WORLDS[this.level.world]!
    const p = world.palette
    return paint(`stone${world.id}${shade}`, 128, (c, s) => {
      const base = new Color(p.stone).offsetHSL(0, 0, shade ? -0.04 : 0)
      c.fillStyle = `#${base.getHexString()}`
      c.fillRect(0, 0, s, s)
      const R = rng(11 + shade)
      for (let i = 0; i < 500; i++) {
        c.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'
        c.fillRect(R() * s, R() * s, 2, 2)
      }
      c.fillStyle = p.trim
      c.fillRect(0, 0, s, 6)
      c.fillRect(0, s - 6, s, 6)
      // The band: a row of motifs.
      c.fillStyle = p.trim
      c.strokeStyle = p.trim
      c.lineWidth = 3
      const y = s / 2
      for (let x = 12; x < s; x += 26) {
        switch (world.carving) {
          case 'lotus':
            c.beginPath()
            c.ellipse(x, y, 7, 12, 0, 0, Math.PI * 2)
            c.stroke()
            break
          case 'faces':
            c.beginPath()
            c.arc(x, y, 10, 0, Math.PI * 2)
            c.stroke()
            c.fillRect(x - 5, y - 3, 3, 3)
            c.fillRect(x + 2, y - 3, 3, 3)
            c.fillRect(x - 4, y + 4, 8, 2)
            break
          case 'flowers':
            for (let a = 0; a < 6; a++) {
              c.beginPath()
              c.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4, 0, Math.PI * 2)
              c.fill()
            }
            break
          case 'steps':
            c.fillRect(x - 10, y + 4, 20, 4)
            c.fillRect(x - 6, y - 2, 12, 4)
            c.fillRect(x - 2, y - 8, 4, 4)
            break
          case 'naga':
            c.beginPath()
            c.moveTo(x - 13, y)
            c.quadraticCurveTo(x - 6, y - 10, x, y)
            c.quadraticCurveTo(x + 6, y + 10, x + 13, y)
            c.stroke()
            break
          case 'gold':
            c.beginPath()
            c.moveTo(x, y - 12)
            c.lineTo(x + 8, y)
            c.lineTo(x, y + 12)
            c.lineTo(x - 8, y)
            c.closePath()
            c.fill()
            break
        }
      }
    })
  }

  private buildGround() {
    const world = WORLDS[this.level.world]!
    const p = world.palette
    const statics = new Group()
    const R = rng(this.level.world * 13 + 3)
    part(statics, new PlaneGeometry(200, 200), mat(p.ground, { rough: 1 }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true
    // The terrace: three steps up, with a stair on each side.
    const terrace = mat(p.stone, { rough: 0.9 })
    const trim = mat(p.trim, { rough: 0.8 })
    const s = this.level.size
    for (let i = 0; i < 3; i++) {
      const w = s + 3.6 - i * 1.2
      part(statics, geo.box(w, BASE / 3, w), i % 2 ? trim : terrace, [0, BASE / 6 + (i * BASE) / 3, 0]).receiveShadow = true
    }
    for (const [x, z, r] of [[0, s / 2 + 2.2, 0], [0, -(s / 2 + 2.2), Math.PI], [s / 2 + 2.2, 0, Math.PI / 2], [-(s / 2 + 2.2), 0, -Math.PI / 2]] as const) {
      const stair = new Group()
      for (let i = 0; i < 4; i++) part(stair, geo.box(1.2, 0.3, 0.3), terrace, [0, 0.15 + i * 0.3, -i * 0.3])
      stair.position.set(x, 0, z)
      stair.rotation.y = r
      statics.add(stair)
    }
    // Lions guarding the stairs, and jungle and far towers around.
    for (const [x, z] of [[0.9, s / 2 + 2.6], [-0.9, s / 2 + 2.6], [s / 2 + 2.6, 0.9], [s / 2 + 2.6, -0.9]] as const) this.place(statics, 'lion', x, z, Math.atan2(x, z), 0.7)
    for (let i = 0; i < 60; i++) {
      const a = R() * Math.PI * 2
      // Well beyond the camera, which circles the tower about 15 to 30 m out.
      const d = 34 + R() * 40
      this.place(statics, R() < 0.5 ? 'tree' : 'palm', Math.cos(a) * d, Math.sin(a) * d, R() * 6, 1 + R() * 0.8)
    }
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.3 + R() * 0.1
      this.place(statics, world.id === 'palace' ? 'spire' : 'prang', Math.cos(a + Math.PI) * 85, Math.sin(a + Math.PI) * 85, 0, 3.5 + R() * 2)
    }
    if (world.night) {
      const moon = new Mesh(geo.sphere(5, 24, 16), new MeshBasicMaterial({ color: '#fff6d8', fog: false }))
      moon.position.set(-60, 50, -70)
      statics.add(moon)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        this.place(statics, 'lamp', Math.cos(a) * (s / 2 + 3.4), Math.sin(a) * (s / 2 + 3.4), 0, 0.8)
      }
    }
    this.root.add(bake(statics, this.quality === 'high'))
  }

  private place(parent: Group, name: ModelName, x: number, z: number, yaw = 0, scale = 1) {
    const m = makeModel(name)
    m.position.set(x, 0, z)
    m.rotation.y = yaw
    m.scale.setScalar(scale)
    parent.add(m)
    return m
  }

  /* ------------------------------ Camera ------------------------------ */

  resize(cssWidth: number, cssHeight: number, dpr: number) {
    this.width = cssWidth
    this.height = cssHeight
    this.renderer.setPixelRatio(this.quality === 'high' ? Math.min(dpr, 2) : 1)
    this.renderer.setSize(cssWidth, cssHeight, false)
    this.camera.aspect = cssWidth / cssHeight
    this.camera.fov = this.camera.aspect < 0.8 ? 52 : 40
    this.camera.updateProjectionMatrix()
  }

  /* ------------------------------ Effects ------------------------------ */

  private emit(at: Vector3, n: number, colors: string[], o: { speed?: [number, number], life?: [number, number], size?: [number, number], g?: number } = {}) {
    if (this.reducedMotion) n = Math.ceil(n / 3)
    const [s0, s1] = o.speed ?? [1, 3]
    const [l0, l1] = o.life ?? [0.4, 0.8]
    const [z0, z1] = o.size ?? [0.04, 0.08]
    const color = new Color()
    let i = 0
    for (let k = 0; k < n; k++) {
      while (i < this.parts.length && this.parts[i]!.on) i++
      if (i >= this.parts.length) break
      const p = this.parts[i]!
      const a = Math.random() * Math.PI * 2
      const s = s0 + Math.random() * (s1 - s0)
      p.on = true
      p.p.copy(at)
      p.v.set(Math.cos(a) * s, (0.3 + Math.random()) * s, Math.sin(a) * s)
      p.max = p.life = l0 + Math.random() * (l1 - l0)
      p.size = z0 + Math.random() * (z1 - z0)
      p.g = o.g ?? 9
      this.partMesh.setColorAt(i, color.set(colors[Math.floor(Math.random() * colors.length)]!))
    }
    if (this.partMesh.instanceColor) this.partMesh.instanceColor.needsUpdate = true
  }

  private popup(at: Vector3, html: string, cls = '') {
    const el = document.createElement('div')
    el.className = `sv-popup ${cls}`
    el.innerHTML = html
    this.overlay.appendChild(el)
    this.popups.push({ el, p: at.clone(), t: 0 })
  }

  private yOf(floor: number) {
    return BASE + (floor - 0.5) * FLOOR
  }

  /** Something falling away (a cut piece, or a missed stone). */
  private fall(piece: Stone, push: Vector3) {
    const mesh = new Mesh(this.unit, this.stoneMat[piece.floor % 2])
    mesh.position.set(piece.x, this.yOf(piece.floor), piece.z)
    mesh.scale.set(piece.w, FLOOR, piece.d)
    mesh.castShadow = this.quality === 'high'
    this.root.add(mesh)
    this.falling.push({ mesh, v: push, spin: new Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3), t: 0 })
  }

  /** Effects for what just happened in the game. */
  handle(events: GameEvent[], engine: Engine) {
    for (const e of events) {
      switch (e.type) {
        case 'place': {
          const top = engine.top
          const at = new Vector3(top.x, this.yOf(top.floor) + FLOOR / 2, top.z)
          this.emit(at, e.perfect ? 22 : 10, e.perfect ? ['#fff2a0', '#ffffff', '#ffd23f'] : ['#d8c8a8', '#a89878'], { speed: [1, e.perfect ? 3.5 : 2], g: 6, size: [0.03, 0.07] })
          if (e.perfect) {
            this.flashT = 1
            this.flash.position.set(top.x, at.y + 0.02, top.z)
            this.flash.scale.setScalar(Math.max(top.w, top.d) * 0.75)
            this.popup(at.clone().setY(at.y + 0.8), e.streak >= 2 ? `×${e.streak}` : '✦', 'gold')
          }
          break
        }
        case 'cut': {
          const push = e.axis === 'x' ? new Vector3(e.dir * 1.5, 0, 0) : new Vector3(0, 0, e.dir * 1.5)
          this.fall(e.piece, push)
          break
        }
        case 'miss':
          this.fall(e.piece, new Vector3(0, 0, 0))
          this.moving.visible = false
          break
        case 'won': {
          const top = engine.top
          const spire = makeModel(WORLDS[this.level.world]!.id === 'palace' ? 'spire' : 'bud')
          spire.position.set(top.x, this.yOf(top.floor) + FLOOR / 2, top.z)
          spire.scale.setScalar(Math.min(top.w, top.d) * 0.9)
          this.root.add(spire)
          this.spire = spire
          this.moving.visible = false
          this.wonT = 0.001
          for (let i = 0; i < 6; i++) this.emit(spire.position.clone().add(new Vector3(0, 1, 0)), 22, ['#ffe14d', '#8fd36a', '#ff9cc9', '#4fc3f7', '#ffffff'], { speed: [2, 5], g: 5, life: [1, 2] })
          break
        }
        default:
          break
      }
    }
  }

  /** Moves effects on (only while the game runs). */
  update(dt: number) {
    this.time += dt
    if (this.wonT > 0) this.wonT += dt
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i]!
      if (!p.on) continue
      p.life -= dt
      if (p.life <= 0) {
        p.on = false
        this.partMesh.setMatrixAt(i, this.m4.makeScale(0, 0, 0))
        continue
      }
      p.v.y -= p.g * dt
      p.p.addScaledVector(p.v, dt)
      const s = p.size * Math.min(1, (p.life / p.max) * 2)
      this.m4.compose(p.p, this.q, this.v.set(s, s, s))
      this.partMesh.setMatrixAt(i, this.m4)
    }
    this.partMesh.instanceMatrix.needsUpdate = true
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i]!
      f.t += dt
      f.v.y -= 14 * dt
      f.mesh.position.addScaledVector(f.v, dt)
      f.mesh.rotation.x += f.spin.x * dt
      f.mesh.rotation.z += f.spin.z * dt
      if (f.mesh.position.y < -2 || f.t > 3) {
        this.root.remove(f.mesh)
        this.falling.splice(i, 1)
      }
    }
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 2.5)
      ;(this.flash.material as MeshBasicMaterial).opacity = this.flashT * 0.9
      this.flash.scale.multiplyScalar(1 + dt * 1.5)
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!
      p.t += dt
      if (p.t > 1) {
        p.el.remove()
        this.popups.splice(i, 1)
      }
    }
  }

  /* ------------------------------ Every frame ------------------------------ */

  render(engine: Engine) {
    // Placed stones: add meshes for new floors.
    while (this.stones.length < engine.tower.length - 1) {
      const s = engine.tower[this.stones.length + 1]!
      const mesh = new Mesh(this.unit, this.stoneMat[s.floor % 2])
      mesh.position.set(s.x, this.yOf(s.floor), s.z)
      mesh.scale.set(s.w, FLOOR, s.d)
      mesh.castShadow = this.quality === 'high'
      mesh.receiveShadow = this.quality === 'high'
      this.root.add(mesh)
      this.stones.push(mesh)
    }
    // The base stone (floor 0) is the terrace top.
    if (!this.stones.length && !this.root.getObjectByName('base')) {
      const b = engine.tower[0]!
      const base = new Mesh(this.unit, this.stoneMat[0])
      base.name = 'base'
      base.position.set(b.x, BASE - FLOOR / 2, b.z)
      base.scale.set(b.w, FLOOR, b.d)
      base.castShadow = base.receiveShadow = this.quality === 'high'
      this.root.add(base)
    }
    const m = engine.moving
    if (engine.state === 'playing') {
      this.moving.visible = true
      this.moving.material = this.stoneMat[m.floor % 2]!
      this.moving.position.set(m.x, this.yOf(m.floor) + (this.reducedMotion ? 0 : Math.sin(this.time * 6) * 0.02), m.z)
      this.moving.scale.set(m.w, FLOOR, m.d)
    }

    // Camera: looking at the top of the tower, drawing back to show it all when it's done.
    const topY = this.yOf(engine.top.floor)
    const tall = this.camera.aspect < 0.8
    let wantY = topY + 0.8
    let wantDist = (tall ? 19 : 14) + Math.max(engine.level.size, 3) * 0.6
    if (this.wonT > 0 || this.scenic) {
      const h = topY + 2
      wantY = h * 0.55
      wantDist = Math.max(wantDist, h * (tall ? 2.4 : 1.6) + 6)
      if (!this.reducedMotion) this.yaw += 0.003
    }
    this.camY += (wantY - this.camY) * 0.06
    this.camDist += (wantDist - this.camDist) * 0.04
    const pitch = 0.3
    this.camera.position.set(Math.sin(this.yaw) * this.camDist * Math.cos(pitch), this.camY + Math.sin(pitch) * this.camDist, Math.cos(this.yaw) * this.camDist * Math.cos(pitch))
    this.camera.lookAt(0, this.camY + 0.6, 0)
    this.sun.position.set(-8, this.camY + 18, 10)
    this.sun.target.position.set(0, this.camY - 4, 0)

    this.renderer.render(this.scene, this.camera)
    if (this.time - this.lastStats > 1) {
      this.lastStats = this.time
      this.canvas.dataset.drawCalls = String(this.renderer.info.render.calls)
    }
    for (const p of this.popups) {
      const s = this.v.copy(p.p).project(this.camera)
      p.el.style.transform = `translate(${((s.x + 1) / 2 * this.width).toFixed(1)}px, ${((1 - s.y) / 2 * this.height - p.t * 40).toFixed(1)}px) translate(-50%, -50%)`
      p.el.style.opacity = String(Math.max(0, 1 - Math.max(0, p.t - 0.6) / 0.4))
    }
  }

  dispose() {
    for (const p of this.popups) p.el.remove()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}

export const ICON_MODELS: ModelName[] = ['bud', 'spire', 'stone', 'lion', 'sophal', 'prom', 'prang']
