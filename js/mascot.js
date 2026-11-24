/** 3D mascot "Vayu" (Three.js r128, loaded as a global script). */
import { $ } from './dom.js';
import { clamp } from './lib/util.js';

export const Mascot = (() => {
  const host = $('stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.35 : 1;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.1, 6.2);

  scene.add(new THREE.AmbientLight(0xfff5f5, 0.75));
  const key = new THREE.PointLight(0xffffff, 1.1, 30);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xe8b4b8, 0.7, 30);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  const body = new THREE.Group();
  scene.add(body);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), coreMat);
  body.add(core);

  const innerMat = new THREE.MeshBasicMaterial({ color: 0x2d3436, wireframe: true, transparent: true, opacity: 0.12 });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 12), innerMat);
  body.add(inner);

  // Visor: torus arc wrapped around the front of the sphere
  const visorGeo = new THREE.TorusGeometry(1.03, 0.085, 14, 64, 1.5);
  visorGeo.rotateZ(Math.PI / 2 - 0.75);
  visorGeo.rotateX(Math.PI / 2);
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x2d3436,
    emissive: 0xa8d5ba,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.4,
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.y = 0.16;
  body.add(visor);

  const eyes = new THREE.Group();
  body.add(eyes);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff5f5 });
  const eyeGeo = new THREE.SphereGeometry(0.075, 16, 16);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat),
    eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.27, 0.16, 1.13);
  eyeR.position.set(0.27, 0.16, 1.13);
  eyes.add(eyeL, eyeR);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2d3436, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.018, 8, 160), ringMat);
  const ringPivot = new THREE.Group();
  ringPivot.rotation.x = 1.15;
  ringPivot.rotation.y = 0.3;
  ringPivot.add(ring);
  scene.add(ringPivot);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), ringMat);
  sat.position.x = 1.6;
  ring.add(sat);

  const shieldMat = new THREE.MeshBasicMaterial({ color: 0xa0444b, transparent: true, opacity: 0, wireframe: true });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 1), shieldMat);
  scene.add(shield);
  const shieldRingMat = new THREE.MeshBasicMaterial({ color: 0xa0444b, transparent: true, opacity: 0 });
  const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.035, 8, 160), shieldRingMat);
  shieldRing.rotation.x = -0.9;
  scene.add(shieldRing);

  // Smog particles: fixed buffer of MAX, draw range scales with AQI
  const MAX = 1500;
  const pos = new Float32Array(MAX * 3),
    col = new Float32Array(MAX * 3),
    jit = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) {
    const r = 2.1 + Math.random() * 2.6,
      th = Math.random() * Math.PI * 2,
      ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 0.5;
    jit[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const smog = new THREE.Points(pGeo, pMat);
  scene.add(smog);

  const EMERALD = new THREE.Color('#A8D5BA'),
    AMBER = new THREE.Color('#E2C27A'),
    CRIMSON = new THREE.Color('#C4646C');
  function aqiColor(aqi) {
    const c = new THREE.Color();
    if (aqi <= 150) c.copy(EMERALD).lerp(AMBER, clamp((aqi - 25) / 125, 0, 1));
    else c.copy(AMBER).lerp(CRIMSON, clamp((aqi - 150) / 150, 0, 1));
    return c;
  }

  const STATES = {
    IDLE: { scale: 1.0, spin: 0.5, ring: 0.6, bob: 0.08, eye: 1.0, glow: 0.6, scan: 0 },
    LISTENING: { scale: 1.08, spin: 0.9, ring: 1.6, bob: 0.03, eye: 1.4, glow: 1.0, scan: 0 },
    THINKING: { scale: 0.94, spin: 2.6, ring: 3.4, bob: 0.02, eye: 0.35, glow: 0.8, scan: 1 },
    SPEAKING: { scale: 1.03, spin: 0.9, ring: 1.2, bob: 0.06, eye: 1.0, glow: 1.1, scan: 0 },
    SEVERE: { scale: 0.98, spin: 1.6, ring: 2.6, bob: 0.02, eye: 0.6, glow: 1.3, scan: 0 },
  };
  const ACCENT = { IDLE: 0x2d3436, LISTENING: 0x2f6b4a, THINKING: 0xd4af37, SPEAKING: null, SEVERE: 0xa0444b };
  const cur = { ...STATES.IDLE };
  let requested = 'IDLE',
    effective = 'IDLE',
    aqi = 80,
    emergencyUntil = 0;
  let targetCount = 300,
    drawCount = 300,
    aqiCol = aqiColor(aqi);
  const listeners = [];

  function resolve() {
    let s = requested;
    if (s === 'IDLE' && (aqi > 300 || performance.now() < emergencyUntil)) s = 'SEVERE';
    if (s !== effective) {
      effective = s;
      listeners.forEach((f) => f(s));
    }
  }
  function setMascotState(state) {
    if (STATES[state]) {
      requested = state;
      resolve();
    }
  }
  function setAQI(v) {
    aqi = clamp(v, 0, 500);
    aqiCol = aqiColor(aqi);
    targetCount = Math.round(300 + (aqi / 500) * 1200);
    const tmp = new THREE.Color();
    for (let i = 0; i < MAX; i++) {
      tmp.copy(aqiCol).offsetHSL((jit[i] - 0.5) * 0.06, -0.1, -0.18 + (jit[i] - 0.5) * 0.2);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    pGeo.attributes.color.needsUpdate = true;
    resolve();
  }
  function alarm(ms) {
    emergencyUntil = performance.now() + ms;
    resolve();
  }

  function resize() {
    const w = host.clientWidth || 1,
      h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 420 ? 7.2 : 6.2;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const look = { x: 0, y: 0 },
    lookT = { x: 0, y: 0 };
  addEventListener(
    'pointermove',
    (e) => {
      const r = host.getBoundingClientRect();
      lookT.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.8), -1, 1);
      lookT.y = clamp(-(e.clientY - (r.top + r.height / 2)) / (r.height * 0.8), -1, 1);
    },
    { passive: true },
  );
  let last = performance.now(),
    nextBlink = last + 3000;
  const tmpC = new THREE.Color();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000,
      k = 1 - Math.pow(0.002, dt);
    if (performance.now() >= emergencyUntil && effective === 'SEVERE' && aqi <= 300) resolve();
    const tgt = STATES[effective];
    for (const key in cur) cur[key] += (tgt[key] - cur[key]) * k;

    const talk = effective === 'SPEAKING' ? Math.abs(Math.sin(t * 13)) * 0.04 : 0;
    const shake = effective === 'SEVERE' ? Math.sin(t * 40) * 0.012 : 0;
    body.scale.setScalar(cur.scale + talk);
    body.position.y = Math.sin(t * 1.4) * cur.bob * reduce;
    body.position.x = shake;
    look.x += (lookT.x - look.x) * k;
    look.y += (lookT.y - look.y) * k;
    body.rotation.y = Math.sin(t * 0.5) * 0.15 * reduce + look.x * 0.35;
    body.rotation.x = -look.y * 0.2;
    inner.rotation.y += cur.spin * dt * reduce;
    inner.rotation.x += cur.spin * 0.4 * dt * reduce;
    ring.rotation.z += cur.ring * dt * reduce;

    // Eyes: blink, scan, widen
    let blink = 1;
    if (now > nextBlink) {
      if (now > nextBlink + 130) nextBlink = now + 2500 + Math.random() * 3000;
      else blink = 0.12;
    }
    const eyeY = cur.eye * blink;
    eyeL.scale.set(1, eyeY, 1);
    eyeR.scale.set(1, eyeY, 1);
    eyes.position.x = Math.sin(t * 4) * 0.12 * cur.scan + look.x * 0.07;
    eyes.position.y = look.y * 0.05;
    eyes.rotation.z = effective === 'SEVERE' ? 0.08 : 0;

    // Colours
    coreMat.color.copy(aqiCol);
    coreMat.emissive.copy(aqiCol);
    coreMat.emissiveIntensity = cur.glow * 0.3 * (0.85 + 0.15 * Math.sin(t * 2.2)) + talk * 3;
    const acc = ACCENT[effective];
    tmpC.set(acc === null ? aqiCol : acc);
    ringMat.color.lerp(tmpC, k);
    visorMat.emissive.lerp(tmpC, k);
    eyeMat.color.lerp(effective === 'SEVERE' ? tmpC.set(0xe8b4b8) : tmpC.set(0xfff5f5), k);
    visorMat.emissiveIntensity = 0.25 + talk * 6;

    // Shield above AQI 250
    const sOn = aqi > 250 ? 1 : 0;
    shieldMat.opacity += (sOn * 0.16 - shieldMat.opacity) * k;
    shieldRingMat.opacity += (sOn * 0.75 - shieldRingMat.opacity) * k;
    shield.rotation.y -= dt * 0.3 * reduce;
    shieldRing.rotation.z += dt * 1.1 * reduce;
    shield.visible = shieldMat.opacity > 0.005;
    shieldRing.visible = shieldRingMat.opacity > 0.005;

    // Smog
    drawCount += (targetCount - drawCount) * k;
    pGeo.setDrawRange(0, Math.round(drawCount));
    smog.rotation.y += dt * (0.04 + (aqi / 500) * 0.25) * reduce;
    smog.scale.setScalar(1 - (aqi > 300 ? 0.15 : 0) + Math.sin(t * 0.7) * 0.02);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setMascotState,
    setAQI,
    alarm,
    onState: (f) => listeners.push(f),
    get state() {
      return effective;
    },
  };
})();
