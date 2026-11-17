/**
 * Pictures of the 3D models for the interface (workshop, briefing, story, home): each model is
 * rendered once, in a three-quarter view with soft light, into a PNG kept for the whole visit. One
 * small WebGL renderer does them all, so the page never holds more than one extra GL context.
 */
import {
  ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace,
  Vector3, WebGLRenderer,
} from 'three'
import { makeModel, type ModelName } from './models'

const SIZE = 192
const urls = new Map<ModelName, string>()
const waiting = new Set<() => void>()
let renderer: WebGLRenderer | null = null
let failed = false
let scene: Scene
let camera: PerspectiveCamera

/** How each kind of model is looked at: a little from the side, and from above. */
function viewOf(name: ModelName): { yaw: number, pitch: number, zoom?: number } {
  if (name === 'sophal' || name === 'prom') return { yaw: -1.25, pitch: 0.12, zoom: 1.05 }
  return { yaw: -0.55, pitch: 0.42 }
}

function setup() {
  if (renderer || failed) return !!renderer
  try {
    const canvas = document.createElement('canvas')
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setSize(SIZE, SIZE, false)
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.setClearColor(0x000000, 0)
    scene = new Scene()
    scene.add(new HemisphereLight('#fff6e0', '#7a8a6a', 1.6))
    scene.add(new AmbientLight('#ffffff', 0.35))
    const sun = new DirectionalLight('#fff1d6', 2.2)
    sun.position.set(-2, 4, 3)
    scene.add(sun)
    const rim = new DirectionalLight('#cfe6ff', 0.9)
    rim.position.set(3, 2, -3)
    scene.add(rim)
    camera = new PerspectiveCamera(26, 1, 0.05, 100)
    return true
  }
  catch {
    failed = true
    renderer = null
    return false
  }
}

function build(name: ModelName) {
  return makeModel(name)
}

function render(name: ModelName): string | null {
  if (!setup()) return null
  const model = build(name)
  const view = viewOf(name)
  model.rotation.y = view.yaw
  scene.add(model)
  const box = new Box3().setFromObject(model)
  const centre = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3()).length()
  const dist = (size / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.02 / (view.zoom ?? 1)
  camera.position.set(centre.x, centre.y + Math.sin(view.pitch) * dist, centre.z + Math.cos(view.pitch) * dist)
  camera.lookAt(centre)
  renderer!.render(scene, camera)
  const url = renderer!.domElement.toDataURL('image/png')
  scene.remove(model)
  return url
}

/** The picture of a model, if it's been made (or null: use `whenIcon`). */
export function iconUrl(name: ModelName): string | null {
  return urls.get(name) ?? null
}

const queue: ModelName[] = []
const pending = new Map<ModelName, Promise<void>>()
const resolvers = new Map<ModelName, () => void>()
let running = false

function pump() {
  running = true
  requestAnimationFrame(() => {
    const start = performance.now()
    while (queue.length && performance.now() - start < 12) {
      const name = queue.shift()!
      const url = render(name)
      if (url) urls.set(name, url)
      resolvers.get(name)?.()
      resolvers.delete(name)
      if (!url) {
        // No WebGL: give up on all of them (the interface keeps its flat drawings).
        for (const n of queue) resolvers.get(n)?.()
        queue.length = 0
      }
    }
    for (const cb of waiting) cb()
    if (queue.length) pump()
    else running = false
  })
}

/** Makes the pictures (a few per frame, so the page stays responsive). */
export function ensureIcons(names: ModelName[]): Promise<void> {
  if (typeof document === 'undefined' || failed) return Promise.resolve()
  const all: Promise<void>[] = []
  for (const name of names) {
    if (urls.has(name)) continue
    let p = pending.get(name)
    if (!p) {
      p = new Promise<void>(resolve => resolvers.set(name, resolve))
      pending.set(name, p)
      queue.push(name)
    }
    all.push(p)
  }
  if (queue.length && !running) pump()
  return Promise.all(all).then(() => {})
}

/** Called whenever new pictures are ready. */
export function onIcons(cb: () => void) {
  waiting.add(cb)
  return () => waiting.delete(cb)
}
