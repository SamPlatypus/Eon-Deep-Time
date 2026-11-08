/**
 * Rigid-plate teaching reconstruction.
 * Each plate is a quaternion taking present-day crust to its paleoposition.
 * Keyframes are anchored on published paleolatitude constraints
 * (Gondwana over the south pole in the late Paleozoic, India's flight
 * north, the Atlantic opening). The future follows Scotese's Pangea Proxima,
 * not the Arctic-centered Amasia alternative.
 * Plates that stayed welded share one quaternion so their present-day
 * fit does not tear (Greenland with North America, Arabia with Africa,
 * Europe and Siberia with Asia after they had sutured).
 */

export type V3 = [number, number, number];
export type Q = [number, number, number, number];

export const PLATE_COUNT = 12;
export const NA = 0;
export const GR = 1;
export const SA = 2;
export const AF = 3;
export const EU = 4;
export const SB = 5;
export const CH = 6;
export const IN = 7;
export const AR = 8;
export const AU = 9;
export const AN = 10;
export const MD = 11;

type Anchor = { lat: number; lon: number };
type Row = [number, number, number, number];

export const ANCHORS: Anchor[] = [
  { lat: 45, lon: -100 },
  { lat: 72, lon: -40 },
  { lat: -15, lon: -60 },
  { lat: 5, lon: 20 },
  { lat: 50, lon: 15 },
  { lat: 62, lon: 95 },
  { lat: 35, lon: 105 },
  { lat: 22, lon: 79 },
  { lat: 24, lon: 45 },
  { lat: -25, lon: 134 },
  { lat: -78, lon: 80 },
  { lat: -19, lon: 47 },
];

const KEYS: Row[][] = [
  // North America — Kansas. Atlantic closure to the east in the Mesozoic,
  // equatorial Laurussia in the late Paleozoic, back against Africa at +250.
  [
    [-540, 0, -55, 20],
    [-450, -8, -35, 30],
    [-400, 8, -20, 8],
    [-320, 10, -8, -12],
    [-250, 18, -5, -18],
    [-200, 25, -12, -12],
    [-150, 34, -35, -8],
    [-100, 40, -62, -4],
    [-66, 43, -78, -2],
    [-34, 44, -90, -1],
    [0, 45, -100, 0],
    [50, 47, -112, 1],
    [100, 46, -70, -4],
    [250, 22, 5, -16],
  ],
  [],
  // South America — Brazil. Bullard fit against Africa until the Cretaceous.
  [
    [-540, -48, 0, 28],
    [-450, -55, -5, 22],
    [-300, -42, -8, 32],
    [-250, -32, -2, 36],
    [-200, -28, 0, 34],
    [-150, -22, -6, 26],
    [-120, -20, -22, 16],
    [-90, -18, -35, 10],
    [-66, -17, -42, 6],
    [-34, -16, -52, 3],
    [0, -15, -60, 0],
    [50, -17, -74, -3],
    [100, -16, -48, 6],
    [250, -18, 8, 22],
  ],
  // Africa. South in the Paleozoic so Gondwanan ice and the Hirnantian Sahara ice are possible.
  [
    [-540, -42, 8, -15],
    [-450, -58, 18, 150],
    [-400, -38, 14, -8],
    [-300, -32, 12, -6],
    [-250, -22, 14, 0],
    [-200, -16, 15, 4],
    [-150, -10, 16, 6],
    [-100, -4, 18, 3],
    [-66, 0, 19, 1],
    [-34, 3, 20, 0],
    [0, 5, 20, 0],
    [50, 16, 18, 4],
    [100, 20, 16, 6],
    [250, 6, 12, 4],
  ],
  // Europe, used only before it welds to Asia (~270 Ma).
  [
    [-540, -48, 28, 18],
    [-450, -32, 22, 12],
    [-400, 2, 8, -8],
    [-320, 6, 8, -6],
    [-270, 28, 20, 0],
  ],
  // Siberia, own track until it welds.
  [
    [-540, 8, 130, 25],
    [-450, 0, 115, 18],
    [-400, 18, 105, 10],
    [-300, 40, 95, 4],
    [-240, 48, 100, 0],
  ],
  // Asia / Eurasia block after assembly. Modest motion; the reference most plates move against.
  [
    [-540, 8, 145, 30],
    [-450, -5, 135, 18],
    [-350, 22, 115, 6],
    [-250, 34, 100, -4],
    [-150, 36, 102, -2],
    [-66, 36, 104, -1],
    [0, 35, 105, 0],
    [50, 33, 108, 2],
    [100, 30, 90, 6],
    [250, 26, 40, 10],
  ],
  // India — the fast northward flight.
  [
    [-540, -52, 28, -8],
    [-450, -58, 22, -4],
    [-300, -55, 30, -12],
    [-200, -50, 38, -18],
    [-150, -46, 48, -24],
    [-120, -40, 58, -22],
    [-90, -28, 68, -16],
    [-66, -14, 74, -10],
    [-50, -2, 76, -6],
    [-20, 12, 78, -2],
    [0, 22, 79, 0],
    [50, 24, 82, 2],
    [250, 12, 48, 8],
  ],
  [],
  // Australia, rifting from Antarctica and later hitting Asia.
  [
    [-540, -48, 40, 16],
    [-400, -52, 48, 12],
    [-250, -58, 55, 14],
    [-150, -60, 80, 18],
    [-100, -55, 115, 12],
    [-66, -50, 122, 8],
    [-34, -40, 128, 4],
    [0, -25, 134, 0],
    [50, -2, 122, -6],
    [100, 10, 108, -4],
    [250, 0, 58, 6],
  ],
  // Antarctica. Polar through the Cenozoic; farther north inside Gondwana and again in the far future.
  [
    [-540, -58, 15, 12],
    [-300, -70, 20, 8],
    [-150, -72, 40, 18],
    [-66, -76, 60, 10],
    [0, -78, 80, 0],
    [100, -68, 70, -8],
    [250, -42, 75, -16],
  ],
  // Madagascar, against East Africa until the Early Cretaceous, then left behind.
  [
    [-250, -28, 32, -8],
    [-160, -26, 34, -6],
    [-120, -24, 38, -4],
    [-90, -22, 42, -2],
    [0, -19, 47, 0],
    [250, -8, 28, 4],
  ],
];

const DEG = Math.PI / 180;

export function latLonToVec(lat: number, lon: number): V3 {
  const φ = lat * DEG;
  const λ = lon * DEG;
  const cl = Math.cos(φ);
  return [cl * Math.sin(λ), Math.sin(φ), cl * Math.cos(λ)];
}

export function vecToLatLon(v: V3): { lat: number; lon: number } {
  const lat = (Math.asin(Math.max(-1, Math.min(1, v[1]))) * 180) / Math.PI;
  const lon = (Math.atan2(v[0], v[2]) * 180) / Math.PI;
  return { lat, lon };
}

function qNorm(q: Q): Q {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function qFromUnitVectors(a: V3, b: V3): Q {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (dot > 0.999999) return [0, 0, 0, 1];
  if (dot < -0.999999) {
    const ax = Math.abs(a[0]) > Math.abs(a[2]) ? [-a[1], a[0], 0] : [0, -a[2], a[1]];
    const n = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    return [ax[0] / n, ax[1] / n, ax[2] / n, 0];
  }
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  return qNorm([cx, cy, cz, 1 + dot]);
}

export function qAxisAngle(axis: V3, rad: number): Q {
  const h = rad / 2;
  const s = Math.sin(h);
  const n = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  return [axis[0] * (s / n), axis[1] * (s / n), axis[2] * (s / n), Math.cos(h)];
}

export function qMul(a: Q, b: Q): Q {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function qRotate(q: Q, v: V3): V3 {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [
    v[0] + qw * tx + (qy * tz - qz * ty),
    v[1] + qw * ty + (qz * tx - qx * tz),
    v[2] + qw * tz + (qx * ty - qy * tx),
  ];
}

export function qSlerp(a: Q, b: Q, t: number): Q {
  let bx = b[0],
    by = b[1],
    bz = b[2],
    bw = b[3];
  let dot = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (dot < 0) {
    dot = -dot;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (dot > 0.9995) {
    return qNorm([
      a[0] + t * (bx - a[0]),
      a[1] + t * (by - a[1]),
      a[2] + t * (bz - a[2]),
      a[3] + t * (bw - a[3]),
    ]);
  }
  const θ = Math.acos(Math.min(1, dot));
  const s = Math.sin(θ);
  const w1 = Math.sin((1 - t) * θ) / s;
  const w2 = Math.sin(t * θ) / s;
  return [a[0] * w1 + bx * w2, a[1] * w1 + by * w2, a[2] * w1 + bz * w2, a[3] * w1 + bw * w2];
}

function poseQ(anchor: Anchor, lat: number, lon: number, spinDeg: number): Q {
  const from = latLonToVec(anchor.lat, anchor.lon);
  const to = latLonToVec(lat, lon);
  const align = qFromUnitVectors(from, to);
  if (Math.abs(spinDeg) < 1e-6) return align;
  const spin = qAxisAngle(to, spinDeg * DEG);
  return qMul(spin, align);
}

const KEY_Q: Q[][] = ANCHORS.map((anchor, plate) =>
  (KEYS[plate] ?? []).map(([age, lat, lon, spin]) => {
    void age;
    return poseQ(anchor, lat, lon, spin);
  }),
);

function sampleOwn(plate: number, age: number): Q {
  const rows = KEYS[plate];
  const qs = KEY_Q[plate];
  if (!rows.length) return [0, 0, 0, 1];
  if (age <= rows[0][0]) return qs[0];
  if (age >= rows[rows.length - 1][0]) return qs[qs.length - 1];
  for (let i = 0; i < rows.length - 1; i++) {
    const a0 = rows[i][0];
    const a1 = rows[i + 1][0];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      return qSlerp(qs[i], qs[i + 1], t);
    }
  }
  return qs[qs.length - 1];
}

/** Parent lock, with a 40 Ma blend so a suture does not pop. */
function follow(parent: number, age: number, join: number, ownPlate: number): Q {
  const pq = sampleOwn(parent, age);
  if (age >= join) return pq;
  if (age <= join - 40) return sampleOwn(ownPlate, age);
  const t = (age - (join - 40)) / 40;
  return qSlerp(sampleOwn(ownPlate, age), pq, t * t * (3 - 2 * t));
}

export function plateQuaternion(plate: number, age: number): Q {
  if (plate === GR) return plateQuaternion(NA, age);
  if (plate === AR) return plateQuaternion(AF, age);
  if (plate === EU) return follow(CH, age, -270, EU);
  if (plate === SB) return follow(CH, age, -240, SB);
  if (plate === MD) {
    // East Africa until the Early Cretaceous rift, then its own track.
    const rift = -145;
    const parent = plateQuaternion(AF, age);
    if (age <= rift - 35) return parent;
    const own = sampleOwn(MD, age);
    if (age >= rift) return own;
    const t = (age - (rift - 35)) / 35;
    const s = t * t * (3 - 2 * t);
    return qSlerp(parent, own, s);
  }
  return sampleOwn(plate, age);
}

export function allQuaternions(age: number): Q[] {
  const out: Q[] = new Array(PLATE_COUNT);
  for (let i = 0; i < PLATE_COUNT; i++) out[i] = plateQuaternion(i, age);
  return out;
}

export function rotateLatLon(q: Q, lat: number, lon: number): { lat: number; lon: number } {
  return vecToLatLon(qRotate(q, latLonToVec(lat, lon)));
}
