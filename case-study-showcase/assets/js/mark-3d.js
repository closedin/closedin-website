/* closed:in glass mark in Three.js. Geometry mirrors assets/brand/closedin-mark.svg (favicon measurement, 500 px space).
   init(box, { gsap, ScrollTrigger, lenis, isMobile, trigger }) mounts a canvas in the box and binds rotation to scroll and pointer.
   renderStatic(canvas, size) renders the rest pose once (poster and OG pipeline). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CONFIG = {
  restPose: { x: 0.18, y: -0.35 },
  cameraZ: 6.5,
  fov: 32,
  exposure: 1.05,
  envIntensity: 1.2,
  envRotationY: 0.6,
  material: {
    color: '#e3ecfa', roughness: 0.14, transmission: 0.92, thickness: 0.7, ior: 1.6,
    attenuationDistance: 0.6, attenuationMix: 0.35,
    clearcoat: 1, clearcoatRoughness: 0.1,
    iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
    dispersion: 0.1, envMapIntensity: 1.3, specularIntensity: 1.2
  },
  scroll: { turns: 1, rotXEnd: -0.12, scaleEnd: 0.94, scrub: 0.8, start: 'top 70%', end: 'bottom 30%' },
  tilt: 0.30,
  idleSpeed: 0.06,
  idleAfterMs: 1200
};

export const MARK = {
  stroke: 9, fat: 1.6, dotFat: 1.25,
  tr: { x1: 267, y1: 105, x2: 395, y2: 229 },
  bl: { x1: 105, y1: 271, x2: 233, y2: 395 },
  dots: [{ cx: 249.5, cy: 213.5 }, { cx: 249.5, cy: 274.5 }], side: 15,
  unitsPerPx: 3.3 / 500, depthFactor: 1.3, bevelFactor: 0.22, bevelSegments: 4
};

function cssVar(name, fallback) {
  try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; }
}
const u = MARK.unitsPerPx;
const sx = (px) => (px - 250) * u;
const sy = (py) => (250 - py) * u;

function bracketShape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => { if (i === 0) s.moveTo(sx(x), sy(y)); else s.lineTo(sx(x), sy(y)); });
  s.closePath();
  return s;
}

export function buildMark(material) {
  const t = MARK.stroke * MARK.fat;
  const tr = MARK.tr, bl = MARK.bl;
  const shapes = [
    bracketShape([[tr.x1, tr.y1], [tr.x2, tr.y1], [tr.x2, tr.y2], [tr.x2 - t, tr.y2], [tr.x2 - t, tr.y1 + t], [tr.x1, tr.y1 + t]]),
    bracketShape([[bl.x1, bl.y1], [bl.x1 + t, bl.y1], [bl.x1 + t, bl.y2 - t], [bl.x2, bl.y2 - t], [bl.x2, bl.y2], [bl.x1, bl.y2]])
  ];
  const tScene = t * u;
  const depth = tScene * MARK.depthFactor;
  const bevel = tScene * MARK.bevelFactor;
  const group = new THREE.Group();
  shapes.forEach((shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: MARK.bevelSegments, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    group.add(new THREE.Mesh(geo, material));
  });
  const side = MARK.side * MARK.dotFat * u;
  MARK.dots.forEach((d) => {
    const geo = new RoundedBoxGeometry(side, side, depth + bevel * 2, 4, side * 0.18);
    const m = new THREE.Mesh(geo, material);
    m.position.set(sx(d.cx), sy(d.cy), 0);
    group.add(m);
  });
  const center = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
  group.children.forEach((c) => c.position.sub(center));
  return group;
}

function makeMaterial(accentHex, isMobile) {
  const m = CONFIG.material;
  const accent = new THREE.Color(accentHex || '#0066cc');
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.color || '#ffffff'), metalness: 0, roughness: m.roughness,
    transmission: m.transmission, thickness: m.thickness, ior: m.ior,
    attenuationColor: accent.clone().lerp(new THREE.Color('#ffffff'), m.attenuationMix),
    attenuationDistance: m.attenuationDistance,
    clearcoat: m.clearcoat, clearcoatRoughness: m.clearcoatRoughness,
    iridescence: m.iridescence, iridescenceIOR: m.iridescenceIOR, iridescenceThicknessRange: m.iridescenceThicknessRange,
    specularIntensity: m.specularIntensity || 1, envMapIntensity: m.envMapIntensity || 1, side: THREE.FrontSide
  });
  if (!isMobile && 'dispersion' in mat) mat.dispersion = m.dispersion;
  return mat;
}

function makeScene(renderer, { transparent, bgHex, accentHex, isMobile }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CONFIG.fov, 1, 0.1, 50);
  camera.position.set(0, 0, CONFIG.cameraZ);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  if ('environmentIntensity' in scene) scene.environmentIntensity = CONFIG.envIntensity;
  if (scene.environmentRotation) scene.environmentRotation.y = CONFIG.envRotationY;
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-3, 4, 5);
  scene.add(light);
  const group = buildMark(makeMaterial(accentHex, isMobile));
  group.rotation.set(CONFIG.restPose.x, CONFIG.restPose.y, 0);
  scene.add(group);
  renderer.setClearColor(new THREE.Color(bgHex || '#f5f5f7'), transparent ? 0 : 1);
  return { scene, camera, group };
}

function makeRenderer(canvas, { transparent, dpr, isMobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: !!transparent, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!transparent });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = isMobile ? 0.5 : 0.6;   /* the refraction pass is the expensive part; 0.6 is visually identical at this size */
  return renderer;
}

/* One-off render for the poster and OG pipeline (transparent background, rest pose). */
export function renderStatic(canvas, size, opts = {}) {
  const renderer = makeRenderer(canvas, { transparent: true, dpr: 1, isMobile: false });
  renderer.setSize(size, size, false);
  const { scene, camera } = makeScene(renderer, { transparent: true, bgHex: opts.bg || '#f3f3f3', accentHex: opts.accent || cssVar('--accent', '#0066cc'), isMobile: false });
  renderer.render(scene, camera);
  return { renderer, scene, camera };
}

export function init(box, opts = {}) {
  const { gsap, ScrollTrigger, lenis } = opts;
  const isMobile = !!opts.isMobile;
  if (!box || !gsap || !ScrollTrigger) return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  box.appendChild(canvas);

  let renderer;
  try {
    renderer = makeRenderer(canvas, { transparent: true, dpr: Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5), isMobile });
  } catch (err) { box.removeChild(canvas); throw err; }

  const bgHex = cssVar('--mark-bg', '') || cssVar('--surface-1', '#f5f5f7');
  const accentHex = cssVar('--accent', '#0066cc');
  const { scene, camera, group } = makeScene(renderer, { transparent: true, bgHex, accentHex, isMobile });

  const state = { rotY: CONFIG.restPose.y, rotX: CONFIG.restPose.x, scale: 1 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let idle = 0, idleSpeed = 0, lastScrollTs = performance.now(), lastChange = performance.now(), lastRender = 0;
  let visible = true, live = false, disposed = false, frames = 0, frameTimeSum = 0, degraded = false;

  function size() {
    const r = box.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    lastChange = performance.now();
  }
  size();
  const ro = new ResizeObserver(size); ro.observe(box);

  /* Scroll binding: one full turn across the trigger section */
  const tl = gsap.timeline({
    scrollTrigger: { trigger: opts.trigger || '.process', start: opts.start || CONFIG.scroll.start, end: opts.end || CONFIG.scroll.end, scrub: CONFIG.scroll.scrub, onUpdate: () => { lastScrollTs = performance.now(); lastChange = lastScrollTs; } }
  });
  tl.to(state, { rotY: CONFIG.restPose.y + Math.PI * 2 * CONFIG.scroll.turns, rotX: CONFIG.scroll.rotXEnd, scale: CONFIG.scroll.scaleEnd, ease: 'none', onUpdate: () => { lastChange = performance.now(); } }, 0);

  /* Pointer tilt, fine pointers only */
  const onPointer = (e) => {
    tilt.tx = ((e.clientX / window.innerWidth) - 0.5) * CONFIG.tilt;
    tilt.ty = ((e.clientY / window.innerHeight) - 0.5) * CONFIG.tilt;
    lastChange = performance.now();
  };
  if (!isMobile) window.addEventListener('pointermove', onPointer, { passive: true });

  /* Visibility */
  const io = new IntersectionObserver((entries) => { visible = entries.some((en) => en.isIntersecting); if (visible) lastChange = performance.now(); }, { rootMargin: '20% 0px' });
  io.observe(box);
  const onVis = () => { if (!document.hidden) lastChange = performance.now(); };
  document.addEventListener('visibilitychange', onVis);

  function showPoster() { box.classList.remove('is-live'); }
  function dispose() {
    if (disposed) return; disposed = true;
    gsap.ticker.remove(tick);
    if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill();
    ro.disconnect(); io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVis);
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose();
    showPoster();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dispose(); });

  function degrade() {
    if (degraded) { dispose(); return; }
    degraded = true; frames = 0; frameTimeSum = 0;
    renderer.setPixelRatio(1);
    if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.5;
    size();
  }

  function tick(time, deltaMs) {
    if (disposed || document.hidden || !visible) return;
    const now = performance.now();
    const dt = Math.min(0.05, (deltaMs || 16) / 1000);
    /* idle spin on desktop when the page is not scrolling */
    if (!isMobile) {
      const scrolling = (lenis && Math.abs(lenis.velocity || 0) > 0.5) || (now - lastScrollTs < 120);
      const target = (!scrolling && now - lastScrollTs > CONFIG.idleAfterMs) ? CONFIG.idleSpeed : 0;
      idleSpeed += (target - idleSpeed) * 0.05;
      idle += idleSpeed * dt;
    }
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    const moving = Math.abs(tilt.tx - tilt.x) > 0.0005 || Math.abs(tilt.ty - tilt.y) > 0.0005 || idleSpeed > 0.001;
    if (isMobile && !moving && now - lastChange > 400 && live) return;
    const tiltMoving = Math.abs(tilt.tx - tilt.x) > 0.0005 || Math.abs(tilt.ty - tilt.y) > 0.0005;
    const fast = tiltMoving || (now - lastScrollTs < 400);
    if (now - lastRender < (fast ? 15 : 32)) return;   /* 60 fps while the user moves, 30 fps for the idle spin */
    group.rotation.y = state.rotY + tilt.x + idle;
    group.rotation.x = state.rotX + tilt.y;
    group.scale.setScalar(state.scale);
    const t0 = performance.now();
    renderer.render(scene, camera);
    const cost = performance.now() - t0;
    lastRender = now;
    if (!live) { live = true; box.classList.add('is-live'); }
    if (frames < 20) {
      frames++; frameTimeSum += cost;
      if (frames === 20) {
        const avg = frameTimeSum / 20;
        if (avg > 30) degrade();
        if (avg > 22 && !degraded) degrade();
      }
    }
  }
  gsap.ticker.add(tick);
  return { dispose, renderer, scene, group, state };
}
