import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PLACES } from "@/lib/paleo/locations";
import { BIOME_META, BIOME_ORDER, PLATE_COLORS } from "@/lib/paleo/science";
import { latLonToVec } from "@/lib/paleo/plates";
import type { PlaceSnap } from "@/lib/paleo/types";
import type { FramePayload } from "@/lib/globe/protocol";
import { atmosFragment, atmosVertex, landFragment, landVertex, oceanFragment, oceanVertex } from "@/lib/globe/shaders";
import { holdSpin, spinHeld, useAtlas } from "@/lib/atlas-store";

const RELIEF: ReadonlyArray<readonly [number, number, number]> = [
  [0.231, 0.549, 0.698],
  [0.835, 0.816, 0.604],
  [0.494, 0.667, 0.384],
  [0.769, 0.631, 0.353],
  [0.553, 0.384, 0.282],
  [0.957, 0.945, 0.918],
];

const SERIES = Array.from({ length: 41 }, (_, i) => i * 25);
const MARKER_R = 1.09;
const CAM_ELEV = 0.2;

type Marker = {
  id: string;
  hit: THREE.Mesh;
  sprite: THREE.Sprite;
  core: THREE.Mesh;
  target: THREE.Vector3;
};

type FrameMsg = {
  type: "frame";
  id: number;
  payload: FramePayload;
  qs: Float32Array;
  temp: Float32Array;
  orogen: Float32Array;
};

function vec3FromHex(hex: string) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.Texture();
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.75)");
  grad.addColorStop(0.48, "rgba(255,255,255,0.18)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function graticuleGeometry() {
  const R = 0.958;
  const seg = 72;
  const positions: number[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const p = (lat * Math.PI) / 180;
    const y = Math.sin(p) * R;
    const r = Math.cos(p) * R;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      positions.push(Math.sin(a0) * r, y, Math.cos(a0) * r, Math.sin(a1) * r, y, Math.cos(a1) * r);
    }
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const l = (lon * Math.PI) / 180;
    for (let i = 0; i < seg; i++) {
      const p0 = ((-80 + (160 * i) / seg) * Math.PI) / 180;
      const p1 = ((-80 + (160 * (i + 1)) / seg) * Math.PI) / 180;
      positions.push(
        Math.cos(p0) * Math.sin(l) * R,
        Math.sin(p0) * R,
        Math.cos(p0) * Math.cos(l) * R,
        Math.cos(p1) * Math.sin(l) * R,
        Math.sin(p1) * R,
        Math.cos(p1) * Math.cos(l) * R,
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function writeRing(attr: THREE.BufferAttribute, latDeg: number, radius: number) {
  const lat = (latDeg * Math.PI) / 180;
  const y = Math.sin(lat) * radius;
  const r = Math.cos(lat) * radius;
  const seg = 96;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    attr.setXYZ(i, Math.sin(a) * r, y, Math.cos(a) * r);
  }
  attr.needsUpdate = true;
}

function ringGeometry() {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array((96 + 1) * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function GlobeView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const label = labelRef.current;
    if (!host || !label) return;
    const root = host;
    const tag = label;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dead = false;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x07111a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.domElement.className = "globe-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
    const spin = new THREE.Group();
    scene.add(spin);

    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const z = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - z * z));
      const rad = 16 + Math.random() * 14;
      starPos[i * 3] = r * Math.cos(t) * rad;
      starPos[i * 3 + 1] = z * rad;
      starPos[i * 3 + 2] = r * Math.sin(t) * rad;
    }
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPos, 3)),
      new THREE.PointsMaterial({
        color: 0xd5e4ee,
        size: 0.045,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    const oceanMat = new THREE.ShaderMaterial({
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      uniforms: {
        uDeep: { value: vec3FromHex("#0e3a4e") },
        uShallow: { value: vec3FromHex("#2a8eab") },
      },
    });
    const ocean = new THREE.Mesh(new THREE.SphereGeometry(0.955, 72, 56), oceanMat);
    spin.add(ocean);

    const grat = new THREE.LineSegments(
      graticuleGeometry(),
      new THREE.LineBasicMaterial({ color: 0xb7c9d2, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    spin.add(grat);

    const iceMat = new THREE.LineBasicMaterial({
      color: 0xd5e8f2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const iceN = new THREE.Line(ringGeometry(), iceMat);
    const iceS = new THREE.Line(ringGeometry(), iceMat.clone());
    iceN.visible = false;
    iceS.visible = false;
    iceN.frustumCulled = false;
    iceS.frustumCulled = false;
    spin.add(iceN, iceS);

    const atmos = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 72, 56),
      new THREE.ShaderMaterial({
        vertexShader: atmosVertex,
        fragmentShader: atmosFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    );
    atmos.renderOrder = 3;
    spin.add(atmos);

    const markerRoot = new THREE.Group();
    spin.add(markerRoot);
    const glow = glowTexture();
    const markers: Marker[] = PLACES.map((place) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glow,
          color: 0xe4b15a,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      sprite.scale.setScalar(0.16);
      sprite.position.set(0, MARKER_R, 0);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xe4b15a }),
      );
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 10, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.userData.id = place.id;
      const node = new THREE.Group();
      node.add(sprite, core, hit);
      markerRoot.add(node);
      return { id: place.id, hit, sprite, core, target: new THREE.Vector3(0, MARKER_R, 0) };
    });

    const pinSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: 0xe4b15a,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    pinSprite.scale.setScalar(0.22);
    pinSprite.visible = false;
    const pinCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xe4b15a }),
    );
    const pinNode = new THREE.Group();
    pinNode.add(pinSprite, pinCore);
    pinNode.visible = false;
    markerRoot.add(pinNode);
    const pinTarget = new THREE.Vector3();

    const uQ = Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 0, 1));
    const landUniforms = {
      uQ: { value: uQ },
      uTemp: { value: new Float32Array(36) },
      uOrogen: { value: new Float32Array(8) },
      uSea: { value: 0 },
      uCo2: { value: 422 },
      uTeq: { value: 0 },
      uGrad: { value: 42 },
      uMode: { value: 0 },
      uBiome: { value: BIOME_ORDER.map((id) => vec3FromHex(BIOME_META[id].color)) },
      uPlateCol: { value: PLATE_COLORS.map((hex) => vec3FromHex(hex)) },
      uRelief: { value: RELIEF.map((c) => new THREE.Vector3(c[0], c[1], c[2])) },
    };
    let land: THREE.Mesh | null = null;

    const curQ = Array.from({ length: 12 }, () => new THREE.Quaternion());
    const tgtQ = Array.from({ length: 12 }, () => new THREE.Quaternion());
    const curTemp = new Float32Array(36);
    const tgtTemp = new Float32Array(36);
    const curOrogen = new Float32Array(8);
    const tgtOrogen = new Float32Array(8);
    let curSea = 0;
    let tgtSea = 0;
    let curCo2 = 422;
    let tgtCo2 = 422;
    let curTeq = 0;
    let tgtTeq = 0;
    let curGrad = 42;
    let tgtGrad = 42;
    let curIceN = 66;
    let tgtIceN = 66;
    let curIceS = -66;
    let tgtIceS = -66;
    let haveFrame = false;

    const yaw = { v: 0.35, vel: 0 };
    const pitch = { v: 0.08 };
    const dist = { v: 3.45, target: 3.45 };
    const focusMix = { v: 0 };
    let lastSentKey = "";
    let ageDirty = true;
    let inflight = false;
    let seq = 0;
    let seriesI = 0;
    let pickSeq = 0;
    let pendingPick: { lat: number; lon: number } | null = null;

    const worker = new Worker(new URL("../../lib/globe/worker.ts", import.meta.url), { type: "module" });

    function adoptScience(msg: FrameMsg, snap: boolean) {
      const { qs, temp, orogen, payload } = msg;
      for (let i = 0; i < 12; i++) {
        tgtQ[i].set(qs[i * 4], qs[i * 4 + 1], qs[i * 4 + 2], qs[i * 4 + 3]);
        if (snap) curQ[i].copy(tgtQ[i]);
      }
      tgtTemp.set(temp);
      tgtOrogen.set(orogen);
      if (snap) {
        curTemp.set(temp);
        curOrogen.set(orogen);
      }
      tgtSea = payload.sea;
      tgtCo2 = payload.co2;
      tgtTeq = payload.thermalEq;
      tgtGrad = payload.grad;
      tgtIceN = payload.iceN;
      tgtIceS = payload.iceS;
      if (snap) {
        curSea = tgtSea;
        curCo2 = tgtCo2;
        curTeq = tgtTeq;
        curGrad = tgtGrad;
        curIceN = tgtIceN;
        curIceS = tgtIceS;
      }
      haveFrame = true;
      if (land) land.visible = true;
      const byId = new Map(payload.places.map((p) => [p.id, p]));
      for (const marker of markers) {
        const place = byId.get(marker.id);
        if (!place) continue;
        const v = latLonToVec(place.paleoLat, place.paleoLon);
        marker.target.set(v[0] * MARKER_R, v[1] * MARKER_R, v[2] * MARKER_R);
        if (snap) marker.hit.parent?.position.copy(marker.target);
        const color = new THREE.Color(place.color);
        (marker.sprite.material as THREE.SpriteMaterial).color.copy(color);
        (marker.core.material as THREE.MeshBasicMaterial).color.copy(color);
      }
    }

    function pump() {
      if (dead || inflight) return;
      const st = useAtlas.getState();
      if (pendingPick) {
        const pick = pendingPick;
        pendingPick = null;
        inflight = true;
        worker.postMessage({ type: "pick", id: ++pickSeq, age: st.age, lat: pick.lat, lon: pick.lon });
        return;
      }
      const key = `${Math.round(st.slider)}:${st.pinCell ?? "-"}`;
      if (key !== lastSentKey) {
        lastSentKey = key;
        ageDirty = true;
      }
      if (ageDirty) {
        ageDirty = false;
        inflight = true;
        worker.postMessage({ type: "age", id: ++seq, age: st.age, pinCell: st.pinCell });
        return;
      }
      if (st.frame && seriesI < SERIES.length) {
        inflight = true;
        worker.postMessage({ type: "series", slider: SERIES[seriesI] });
        seriesI += 1;
      }
    }

    worker.onmessage = (ev: MessageEvent) => {
      if (dead) return;
      const msg = ev.data as { type: string };
      if (msg.type === "error") {
        useAtlas.getState().setError((ev.data as { message: string }).message);
        inflight = false;
        return;
      }
      if (msg.type === "mesh") {
        const data = ev.data as {
          pos: Float32Array;
          center: Float32Array;
          plate: Float32Array;
          elev: Float32Array;
          orogen: Float32Array;
          odist: Float32Array;
          interior: Float32Array;
          bear: Float32Array;
          oeast: Float32Array;
          lat: Float32Array;
          lon: Float32Array;
          index: Uint32Array;
        };
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
        geo.setAttribute("aCenter", new THREE.BufferAttribute(data.center, 3));
        geo.setAttribute("aPlate", new THREE.BufferAttribute(data.plate, 1));
        geo.setAttribute("aElev", new THREE.BufferAttribute(data.elev, 1));
        geo.setAttribute("aOrogen", new THREE.BufferAttribute(data.orogen, 1));
        geo.setAttribute("aOdist", new THREE.BufferAttribute(data.odist, 1));
        geo.setAttribute("aInterior", new THREE.BufferAttribute(data.interior, 1));
        geo.setAttribute("aBear", new THREE.BufferAttribute(data.bear, 1));
        geo.setAttribute("aOeast", new THREE.BufferAttribute(data.oeast, 1));
        geo.setAttribute("aLat", new THREE.BufferAttribute(data.lat, 1));
        geo.setAttribute("aLon", new THREE.BufferAttribute(data.lon, 1));
        geo.setIndex(new THREE.BufferAttribute(data.index, 1));
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.25);
        const mat = new THREE.ShaderMaterial({
          vertexShader: landVertex,
          fragmentShader: landFragment,
          uniforms: landUniforms,
        });
        land = new THREE.Mesh(geo, mat);
        land.frustumCulled = false;
        land.visible = false;
        spin.add(land);
        ocean.renderOrder = 0;
        land.renderOrder = 1;
        pump();
        return;
      }
      if (msg.type === "frame") {
        inflight = false;
        const frame = ev.data as FrameMsg;
        if (frame.id === seq) {
          useAtlas.getState().applyFrame(frame.payload);
          adoptScience(frame, !haveFrame);
        }
        pump();
        return;
      }
      if (msg.type === "pick") {
        inflight = false;
        const pick = ev.data as {
          id: number;
          kind: "ocean" | "land";
          lat?: number;
          lon?: number;
          cell?: number;
          pin?: FramePayload["pin"];
        };
        if (pick.id === pickSeq) {
          if (pick.kind === "land" && pick.cell != null && pick.pin) {
            useAtlas.getState().selectPin(pick.cell, pick.pin);
          } else if (pick.lat != null && pick.lon != null) {
            useAtlas.getState().selectOcean(pick.lat, pick.lon);
          }
        }
        pump();
        return;
      }
      if (msg.type === "series") {
        inflight = false;
        const point = ev.data as { age: number; gmst: number; sea: number };
        useAtlas.getState().pushSeries(point);
        pump();
      }
    };
    worker.onerror = () => {
      if (!dead) useAtlas.getState().setError("The reconstruction worker stopped.");
    };
    worker.postMessage({ type: "boot" });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const localRay = new THREE.Ray();
    const hitPoint = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    const tmp = new THREE.Vector3();
    const camN = new THREE.Vector3();

    const pointers = new Map<number, { x: number; y: number }>();
    let gestureMoved = false;
    let gesturePinched = false;
    let pinch0 = 0;
    let zoom0 = dist.target;
    let originX = 0;
    let originY = 0;
    let lastX = 0;
    let lastY = 0;

    function resize() {
      const w = root.clientWidth || 1;
      const h = root.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    function pointerAngle() {
      const rect = renderer.domElement.getBoundingClientRect();
      return rect;
    }

    function onPointerDown(ev: PointerEvent) {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      renderer.domElement.setPointerCapture(ev.pointerId);
      holdSpin(10000);
      if (pointers.size === 1) {
        gestureMoved = false;
        gesturePinched = false;
        originX = lastX = ev.clientX;
        originY = lastY = ev.clientY;
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoom0 = dist.target;
        gesturePinched = true;
        gestureMoved = true;
      }
    }

    function onPointerMove(ev: PointerEvent) {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        dist.target = Math.min(6.6, Math.max(1.8, zoom0 * (pinch0 / d)));
        return;
      }
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (!gestureMoved) {
        if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 6) return;
        gestureMoved = true;
        useAtlas.getState().clearSelection();
        renderer.domElement.classList.add("is-dragging");
      }
      yaw.v += dx * 0.0052;
      pitch.v = Math.max(-1.05, Math.min(1.05, pitch.v + dy * 0.0042));
      yaw.vel = dx * 0.4;
      holdSpin(10000);
    }

    function onClick(ev: PointerEvent) {
      const rect = pointerAngle();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      spin.updateWorldMatrix(true, true);
      const hits = raycaster.intersectObjects(markers.map((m) => m.hit), false);
      if (hits[0]) {
        const id = hits[0].object.userData.id as string;
        const st = useAtlas.getState();
        if (st.focusId === id) st.clearSelection();
        else st.selectPlace(id);
        holdSpin(2600);
        return;
      }
      inv.copy(spin.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inv);
      const hit = localRay.intersectSphere(new THREE.Sphere(new THREE.Vector3(), 1), hitPoint);
      if (!hit) {
        useAtlas.getState().clearSelection();
        return;
      }
      const lat = (Math.asin(Math.max(-1, Math.min(1, hit.y))) * 180) / Math.PI;
      const lon = (Math.atan2(hit.x, hit.z) * 180) / Math.PI;
      useAtlas.getState().glanceAt(lat, lon);
      pendingPick = { lat, lon };
      holdSpin(2600);
      pump();
    }

    function onPointerUp(ev: PointerEvent) {
      const wasLast = pointers.size === 1;
      pointers.delete(ev.pointerId);
      if (pointers.size === 0) {
        renderer.domElement.classList.remove("is-dragging");
        if (wasLast && !gestureMoved && !gesturePinched) onClick(ev);
        holdSpin(gestureMoved ? 2400 : 800);
      }
    }

    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      dist.target = Math.min(6.6, Math.max(1.8, dist.target * Math.exp(ev.deltaY * 0.0011)));
      holdSpin(900);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", (ev) => ev.preventDefault());

    let last = performance.now();
    let raf = 0;
    let seenNonce = useAtlas.getState().viewNonce;

    function viewTarget(places: PlaceSnap[] | undefined) {
      const st = useAtlas.getState();
      if (st.focusId && places) {
        const place = places.find((p) => p.id === st.focusId);
        if (place) return { lat: place.paleoLat, lon: place.paleoLon, name: place.name };
      }
      if (st.pin) return { lat: st.pin.paleoLat, lon: st.pin.paleoLon, name: st.pin.biomeLabel };
      if (st.ocean) return { lat: st.ocean.lat, lon: st.ocean.lon, name: "Open ocean" };
      if (st.glance) return { lat: st.glance.lat, lon: st.glance.lon, name: "" };
      return null;
    }

    function frame(now: number) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = useAtlas.getState();

      if (st.viewNonce !== seenNonce) {
        seenNonce = st.viewNonce;
        yaw.v = 0.35;
        yaw.vel = 0;
        pitch.v = 0.08;
        dist.target = 3.45;
        focusMix.v = 0;
      }

      if (st.playing && !st.scrubbing) {
        let slider = st.slider + dt * 11;
        if (slider >= 1000) {
          slider = 1000;
          st.setPlaying(false);
        }
        st.setSlider(slider);
      }

      const target = haveFrame ? viewTarget(st.frame?.places) : null;
      const locked = Boolean(target);
      const hold = locked || st.scrubbing || spinHeld() || st.playing;
      if (st.spin && !reduce && !hold) {
        yaw.v += dt * 0.15;
        yaw.vel = 0;
      } else if (!locked && !reduce) {
        yaw.v += yaw.vel * dt;
        yaw.vel *= Math.exp(-dt * 2.2);
      } else {
        yaw.vel = 0;
      }

      const ease = reduce ? 1 : 1 - Math.exp(-dt * (locked ? 4.2 : 3.2));
      if (target) {
        let ty = (-target.lon * Math.PI) / 180;
        const tx = (target.lat * Math.PI) / 180 - CAM_ELEV;
        let dYaw = ty - yaw.v;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        yaw.v += dYaw * ease;
        pitch.v += (Math.max(-1.05, Math.min(1.05, tx)) - pitch.v) * ease;
        focusMix.v += (1 - focusMix.v) * ease;
      } else {
        focusMix.v += (0 - focusMix.v) * ease;
      }

      spin.rotation.order = "YXZ";
      spin.rotation.y = yaw.v;
      spin.rotation.x = pitch.v;

      const desired = dist.target * (1 - focusMix.v * 0.3);
      dist.v += (desired - dist.v) * (reduce ? 1 : 1 - Math.exp(-dt * 5));
      camera.position.set(0, Math.sin(CAM_ELEV) * dist.v, Math.cos(CAM_ELEV) * dist.v);
      camera.lookAt(0, 0, 0);

      if (haveFrame) {
        const k = reduce || !land?.visible ? 1 : 1 - Math.exp(-dt * 8);
        for (let i = 0; i < 12; i++) {
          curQ[i].slerp(tgtQ[i], k);
          uQ[i].set(curQ[i].x, curQ[i].y, curQ[i].z, curQ[i].w);
        }
        for (let i = 0; i < 36; i++) curTemp[i] += (tgtTemp[i] - curTemp[i]) * k;
        for (let i = 0; i < 8; i++) curOrogen[i] += (tgtOrogen[i] - curOrogen[i]) * k;
        curSea += (tgtSea - curSea) * k;
        curCo2 += (tgtCo2 - curCo2) * k;
        curTeq += (tgtTeq - curTeq) * k;
        curGrad += (tgtGrad - curGrad) * k;
        curIceN += (tgtIceN - curIceN) * k;
        curIceS += (tgtIceS - curIceS) * k;
        landUniforms.uTemp.value.set(curTemp);
        landUniforms.uOrogen.value.set(curOrogen);
        landUniforms.uSea.value = curSea;
        landUniforms.uCo2.value = curCo2;
        landUniforms.uTeq.value = curTeq;
        landUniforms.uGrad.value = curGrad;
        landUniforms.uMode.value = st.mode === "plates" ? 2 : st.mode === "relief" ? 1 : 0;
        const showN = curIceN < 85;
        const showS = curIceS > -85;
        iceN.visible = showN;
        iceS.visible = showS;
        if (showN) writeRing(iceN.geometry.getAttribute("position") as THREE.BufferAttribute, curIceN, 1.055);
        if (showS) writeRing(iceS.geometry.getAttribute("position") as THREE.BufferAttribute, curIceS, 1.055);

        for (const marker of markers) {
          const node = marker.hit.parent;
          if (!node) continue;
          node.position.lerp(marker.target, k);
          const on = st.focusId === marker.id;
          const s = on ? 0.3 : 0.15;
          marker.sprite.scale.setScalar(s);
          marker.core.scale.setScalar(on ? 1.45 : 1);
        }

        const showPin = !st.focusId && (st.pin != null || st.ocean != null);
        pinNode.visible = showPin;
        if (showPin && target) {
          const v = latLonToVec(target.lat, target.lon);
          pinTarget.set(v[0] * MARKER_R, v[1] * MARKER_R, v[2] * MARKER_R);
          pinNode.position.lerp(pinTarget, k);
        }
      }

      if (target && haveFrame) {
        const v = latLonToVec(target.lat, target.lon);
        tmp.set(v[0] * MARKER_R, v[1] * MARKER_R, v[2] * MARKER_R);
        spin.localToWorld(tmp);
        camN.copy(camera.position).normalize();
        const front = tmp.clone().normalize().dot(camN);
        if (front > 0.05 && target.name) {
          const projected = tmp.project(camera);
          const w = root.clientWidth;
          const h = root.clientHeight;
          const x = (projected.x * 0.5 + 0.5) * w;
          const y = (-projected.y * 0.5 + 0.5) * h;
          tag.hidden = false;
          tag.textContent = target.name;
          tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 14px))`;
        } else {
          tag.hidden = true;
        }
      } else {
        tag.hidden = true;
      }

      stars.rotation.y += dt * 0.004;
      pump();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    pump();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      worker.terminate();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      glow.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <div
        ref={labelRef}
        hidden
        className="pointer-events-none absolute left-0 top-0 z-10 rounded-full bg-surface/90 px-3 py-1 text-sm text-fg shadow-panel"
      />
    </div>
  );
}
