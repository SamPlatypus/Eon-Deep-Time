import type { BiomeId } from "./types";

/** Ages are million years from now. Negative is the past. */

export const AGE_MIN = -540;
export const AGE_MAX = 250;

const SLIDER_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, -540],
  [0.12, -420],
  [0.22, -300],
  [0.34, -200],
  [0.46, -100],
  [0.56, -66],
  [0.66, -23],
  [0.74, -2.58],
  [0.79, -0.021],
  [0.84, 0],
  [0.92, 50],
  [1, 250],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function sliderToAge(slider: number): number {
  const s = Math.min(1000, Math.max(0, slider)) / 1000;
  for (let i = 0; i < SLIDER_STOPS.length - 1; i++) {
    const [p0, a0] = SLIDER_STOPS[i];
    const [p1, a1] = SLIDER_STOPS[i + 1];
    if (s <= p1 || i === SLIDER_STOPS.length - 2) {
      const t = (s - p0) / (p1 - p0);
      return lerp(a0, a1, Math.min(1, Math.max(0, t)));
    }
  }
  return 0;
}

export function ageToSlider(age: number): number {
  const a = Math.min(AGE_MAX, Math.max(AGE_MIN, age));
  for (let i = 0; i < SLIDER_STOPS.length - 1; i++) {
    const [p0, a0] = SLIDER_STOPS[i];
    const [p1, a1] = SLIDER_STOPS[i + 1];
    const lo = Math.min(a0, a1);
    const hi = Math.max(a0, a1);
    if (a >= lo && a <= hi) {
      const t = (a - a0) / (a1 - a0);
      return Math.round(lerp(p0, p1, t) * 1000);
    }
  }
  return 800;
}

export function formatAge(ageMa: number): string {
  const abs = Math.abs(ageMa);
  if (abs < 0.0008) return "Present day";
  if (abs < 1) {
    const ka = Math.max(1, Math.round(abs * 1000));
    return ageMa < 0 ? `${ka} thousand years ago` : `${ka} thousand years ahead`;
  }
  const n = abs < 10 ? abs.toFixed(1) : String(Math.round(abs));
  return ageMa < 0 ? `${n} million years ago` : `${n} million years ahead`;
}

export function formatAgeShort(ageMa: number): string {
  const abs = Math.abs(ageMa);
  if (abs < 0.0008) return "Now";
  if (abs < 1) {
    const ka = Math.max(1, Math.round(abs * 1000));
    return ageMa < 0 ? `${ka} ka` : `+${ka} ka`;
  }
  const n = abs < 10 ? abs.toFixed(1) : String(Math.round(abs));
  return ageMa < 0 ? `−${n} Ma` : `+${n} Ma`;
}

type Chapter = { from: number; to: number; era: string; period: string; stage: string; text: string };

const CHAPTERS: Chapter[] = [
  {
    from: -540,
    to: -485,
    era: "Paleozoic",
    period: "Cambrian",
    stage: "Gondwana gathering",
    text: "Continents are still scattered. A southern Gondwana is taking shape while Laurentia, Baltica, and Siberia drift on their own. Shelves are flooded. Carbon dioxide is high enough to offset a fainter sun.",
  },
  {
    from: -485,
    to: -444,
    era: "Paleozoic",
    period: "Ordovician",
    stage: "Hirnantian ice",
    text: "Gondwana slides over the south pole. The period ends in the Hirnantian glaciation — ice on the Sahara side of Gondwana — and one of the great extinctions.",
  },
  {
    from: -444,
    to: -419,
    era: "Paleozoic",
    period: "Silurian",
    stage: "Ice retreats",
    text: "The ice pulls back. Vascular plants take the land. The Caledonian mountains begin to rise as Baltica closes on Laurentia.",
  },
  {
    from: -419,
    to: -359,
    era: "Paleozoic",
    period: "Devonian",
    stage: "Laurussia",
    text: "Laurentia and Baltica have joined near the equator. Forests spread. The Rheic Ocean still separates this Laurussia from Gondwana.",
  },
  {
    from: -359,
    to: -299,
    era: "Paleozoic",
    period: "Carboniferous",
    stage: "Coal and ice",
    text: "Gondwana collides with Laurussia. Equatorial coal swamps bury carbon, CO₂ falls, and ice sheets cover the southern supercontinent. The Appalachians are a Himalayan-scale range.",
  },
  {
    from: -299,
    to: -252,
    era: "Paleozoic",
    period: "Permian",
    stage: "Pangea",
    text: "Pangea is whole. The interior dries into enormous deserts while the Ural and Alleghanian ranges still stand high. The era ends in the largest extinction on record.",
  },
  {
    from: -252,
    to: -201,
    era: "Mesozoic",
    period: "Triassic",
    stage: "One continent",
    text: "Pangea is still intact, hot, and strongly seasonal. The Tethys bites into its eastern shore. Late in the period, rifts begin to open the Atlantic.",
  },
  {
    from: -201,
    to: -145,
    era: "Mesozoic",
    period: "Jurassic",
    stage: "Atlantic opening",
    text: "The central Atlantic is a narrow ocean. Dinosaurs inherit the continents. Gondwana starts to unzip between Africa and South America.",
  },
  {
    from: -145,
    to: -66,
    era: "Mesozoic",
    period: "Cretaceous",
    stage: "High seas",
    text: "The South Atlantic widens. India leaves Madagascar and races north. Sea level floods the Western Interior and parts of the Sahara. It is a greenhouse world, without permanent ice sheets, and it ends at the K–Pg impact.",
  },
  {
    from: -66,
    to: -34,
    era: "Cenozoic",
    period: "Paleogene",
    stage: "India arrives",
    text: "India closes the Tethys and starts the Himalaya. The Paleocene–Eocene Thermal Maximum spikes global heat near 56 Ma. Antarctica is still largely free of a permanent ice sheet until the epoch’s end.",
  },
  {
    from: -34,
    to: -5,
    era: "Cenozoic",
    period: "Oligocene–Miocene",
    stage: "Ice and grass",
    text: "As Australia pulls away and the southern gateways open, the Antarctic ice sheet locks in. The Himalaya and the Andes climb. Grasslands spread across cooling, drier interiors.",
  },
  {
    from: -5,
    to: -0.03,
    era: "Cenozoic",
    period: "Pliocene",
    stage: "Northern ice begins",
    text: "The Isthmus of Panama is closed and the northern ice ages are getting started. CO₂ is low enough for continental ice to survive the summers.",
  },
  {
    from: -0.03,
    to: -0.012,
    era: "Cenozoic",
    period: "Pleistocene",
    stage: "Last Glacial Maximum",
    text: "Ice sheets bury Canada, northern Europe, and Patagonia. Sea level is about 125 meters lower. The Bering and Sunda shelves are dry land. CO₂ sits near 190 ppm.",
  },
  {
    from: -0.012,
    to: 0.0008,
    era: "Cenozoic",
    period: "Quaternary",
    stage: "Holocene",
    text: "The interglacial you live in. Greenland and Antarctica still hold their ice. CO₂ has already left the Holocene band.",
  },
  {
    from: 0.0008,
    to: 50,
    era: "Future",
    period: "Near geological future",
    stage: "Oceans still opening",
    text: "In this scenario Africa keeps closing the Mediterranean, Australia drifts into southeast Asia, and the Atlantic is still widening. The Antarctic ice sheet thins if CO₂ stays elevated.",
  },
  {
    from: 50,
    to: 150,
    era: "Future",
    period: "Collisions",
    stage: "New sutures",
    text: "Australia has sutured to Asia. Africa and Europe are one margin. In the Scotese path, a new generation of subduction begins to consume the Atlantic.",
  },
  {
    from: 150,
    to: 260,
    era: "Future",
    period: "Pangea Proxima",
    stage: "Supercontinent",
    text: "The oceans that opened after Pangea have closed. A future supercontinent assembles. Its interior, far from the sea, is a desert larger than any on Earth today. Amasia — gathered over the Arctic — is the other published ending.",
  },
];

export function chapterFor(age: number): Chapter {
  for (const c of CHAPTERS) {
    if (age >= c.from && age < c.to) return c;
  }
  return CHAPTERS[CHAPTERS.length - 1];
}

/** Gough 1981 faint-young-sun approximation. 1.0 = present luminosity. */
export function solarFactor(ageMa: number): number {
  const t0 = 4.57;
  const t = t0 + ageMa / 1000;
  return 1 / (1 + 0.4 * (1 - t / t0));
}

const CO2_KEYS: ReadonlyArray<readonly [number, number]> = [
  [-540, 4500],
  [-500, 4000],
  [-450, 3000],
  [-445, 2200],
  [-420, 2800],
  [-360, 900],
  [-310, 400],
  [-270, 380],
  [-252, 2000],
  [-230, 1100],
  [-200, 1400],
  [-150, 1300],
  [-110, 1000],
  [-90, 1200],
  [-66, 750],
  [-56, 1600],
  [-50, 1000],
  [-40, 820],
  [-34, 620],
  [-23, 420],
  [-15, 480],
  [-3, 320],
  [-0.021, 190],
  [0, 422],
  [25, 520],
  [50, 680],
  [100, 540],
  [250, 900],
];

function logLerpKeys(keys: ReadonlyArray<readonly [number, number]>, age: number): number {
  if (age <= keys[0][0]) return keys[0][1];
  if (age >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a0, y0] = keys[i];
    const [a1, y1] = keys[i + 1];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      const logY = lerp(Math.log(y0), Math.log(y1), t);
      return Math.exp(logY);
    }
  }
  return keys[keys.length - 1][1];
}

function linLerpKeys(keys: ReadonlyArray<readonly [number, number]>, age: number): number {
  if (age <= keys[0][0]) return keys[0][1];
  if (age >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a0, y0] = keys[i];
    const [a1, y1] = keys[i + 1];
    if (age >= a0 && age <= a1) return lerp(y0, y1, (age - a0) / (a1 - a0));
  }
  return keys[keys.length - 1][1];
}

/** Compiled curve in the range of Foster et al. 2017, ice cores, and GEOCARB. ppm. */
export function co2ppm(ageMa: number): number {
  return logLerpKeys(CO2_KEYS, ageMa);
}

/** Myhre et al. 1998. Watts per square meter relative to 280 ppm. */
export function co2Forcing(ppm: number): number {
  return 5.35 * Math.log(ppm / 280);
}

const SEA_KEYS: ReadonlyArray<readonly [number, number]> = [
  [-540, 40],
  [-480, 110],
  [-450, 150],
  [-444, 20],
  [-420, 90],
  [-390, 120],
  [-340, 70],
  [-300, 10],
  [-270, -20],
  [-252, 5],
  [-200, 35],
  [-150, 70],
  [-110, 140],
  [-90, 175],
  [-66, 85],
  [-50, 65],
  [-34, 35],
  [-20, 20],
  [-5, 10],
  [-0.021, -125],
  [0, 0],
  [20, 12],
  [50, 35],
  [100, 20],
  [250, -20],
];

/** Meters relative to present mean sea level. Haq / Miller mid-range composite. */
export function seaLevel(ageMa: number): number {
  return linLerpKeys(SEA_KEYS, ageMa);
}

export type Orogen = {
  id: number;
  name: string;
  onset: number;
  peak: number;
  tau: number;
  peakElev: number;
  floor: number;
};

export const OROGENS: Orogen[] = [
  { id: 1, name: "Himalaya–Tibet", onset: -55, peak: -8, tau: 75, peakElev: 7000, floor: 600 },
  { id: 2, name: "Andes", onset: -45, peak: 8, tau: 95, peakElev: 5600, floor: 500 },
  { id: 3, name: "North American Cordillera", onset: -85, peak: -50, tau: 58, peakElev: 4300, floor: 1100 },
  { id: 4, name: "Appalachians", onset: -335, peak: -285, tau: 42, peakElev: 5800, floor: 450 },
  { id: 5, name: "Alps", onset: -48, peak: -8, tau: 65, peakElev: 4000, floor: 700 },
  { id: 6, name: "Urals", onset: -325, peak: -295, tau: 38, peakElev: 4200, floor: 400 },
  { id: 7, name: "Caledonides", onset: -460, peak: -415, tau: 32, peakElev: 4800, floor: 280 },
];

const OROGEN_BY_ID: (Orogen | undefined)[] = [];
for (const o of OROGENS) OROGEN_BY_ID[o.id] = o;

/** Uplift on a smoothstep, then exponential erosion. Meters. */
export function orogenHeight(age: number, id: number): number {
  const o = OROGEN_BY_ID[id];
  if (!o || age <= o.onset) return 0;
  if (age < o.peak) {
    const u = (age - o.onset) / (o.peak - o.onset);
    const s = u * u * (3 - 2 * u);
    return o.peakElev * s;
  }
  const dt = age - o.peak;
  return o.floor + (o.peakElev - o.floor) * Math.exp(-dt / o.tau);
}

export function orogenHeights(age: number): Float64Array {
  const h = new Float64Array(8);
  for (const o of OROGENS) h[o.id] = orogenHeight(age, o.id);
  return h;
}

const NB = 36;

function bandLat(i: number) {
  return -87.5 + i * 5;
}

/** Annual-mean insolation distribution, North 1975. Integral of S over μ is 1. */
function insolationFactor(mu: number) {
  const p2 = 0.5 * (3 * mu * mu - 1);
  return 1 - 0.482 * p2;
}

function albedoOf(temp: number, landFrac: number, sheet: number) {
  // Effective albedos, clouds included. Bare ocean would be ~0.06 and the
  // energy balance would run away warm. Ice waits until the band is truly cold
  // so a small cap does not snowball the planet.
  const ocean = 0.304;
  const land = 0.358;
  const ice = 0.62;
  const base = ocean * (1 - landFrac) + land * landFrac;
  const iceW = clamp((-12 - temp) / 8, 0, 1);
  const w = Math.max(iceW, clamp(sheet, 0, 1));
  return base * (1 - w) + ice * w;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export type Ebm = {
  temp: Float64Array;
  gmst: number;
  eqTemp: number;
  poleN: number;
  poleS: number;
  iceN: number;
  iceS: number;
  thermalEq: number;
  grad: number;
};

/**
 * Budyko–Sellers zonal energy-balance model.
 * OLR = A + B·T − ΔF, with ΔF from Myhre et al. 1998.
 * Meridional diffusion (D / cos φ) ∂/∂φ (cos φ ∂T/∂φ).
 * `iceSheet` is the fraction of the band covered by a continental ice sheet,
 * inferred from sea-level drawdown (stored ice) on high-latitude land.
 * Tuned so 422 ppm sits near a 15°C modern mean with ice still on the poles.
 */
export function solveEbm(
  solar: number,
  co2: number,
  landFrac: Float64Array,
  iceSheet?: Float64Array,
): Ebm {
  const Q = (1361 / 4) * solar;
  const dF = co2Forcing(co2);
  const A = 203;
  const B = 2.05;
  const D = 0.6;
  const T = new Float64Array(NB);
  for (let i = 0; i < NB; i++) {
    const mu = Math.sin((bandLat(i) * Math.PI) / 180);
    T[i] = 15 + dF * 0.4 - 34 * mu * mu;
  }
  const diff = new Float64Array(NB);
  const dφ = (5 * Math.PI) / 180;
  const gain = 0.004;
  let iter = 0;
  for (; iter < 1600; iter++) {
    for (let i = 0; i < NB; i++) {
      const φ = (bandLat(i) * Math.PI) / 180;
      const cosφ = Math.max(0.08, Math.cos(φ));
      const dSouth = i === 0 ? 0 : (T[i] - T[i - 1]) / dφ;
      const dNorth = i === NB - 1 ? 0 : (T[i + 1] - T[i]) / dφ;
      const fs = Math.cos(Math.max(-1.5, φ - dφ / 2)) * dSouth;
      const fn = Math.cos(Math.min(1.5, φ + dφ / 2)) * dNorth;
      diff[i] = (D / cosφ) * ((fn - fs) / dφ);
    }
    let maxStep = 0;
    for (let i = 0; i < NB; i++) {
      const mu = Math.sin((bandLat(i) * Math.PI) / 180);
      const absorbed =
        Q * insolationFactor(mu) * (1 - albedoOf(T[i], landFrac[i] ?? 0, iceSheet?.[i] ?? 0));
      const olr = A + B * T[i] - dF;
      const net = absorbed - olr + diff[i];
      const step = clamp(net * gain, -1.2, 1.2);
      T[i] = clamp(T[i] + step, -70, 42);
      const ad = Math.abs(step);
      if (ad > maxStep) maxStep = ad;
    }
    if (maxStep < 0.012 && iter > 500) break;
  }

  let sum = 0;
  let wsum = 0;
  let eq = T[18];
  let bestEq = -Infinity;
  let thermalEq = 0;
  for (let i = 0; i < NB; i++) {
    const lat = bandLat(i);
    const φ1 = ((lat - 2.5) * Math.PI) / 180;
    const φ2 = ((lat + 2.5) * Math.PI) / 180;
    const area = Math.sin(φ2) - Math.sin(φ1);
    sum += T[i] * area;
    wsum += area;
    if (T[i] > bestEq) {
      bestEq = T[i];
      thermalEq = lat;
      eq = T[i];
    }
  }
  let iceN = 90;
  for (let i = NB - 1; i >= 0; i--) {
    if (T[i] < -5) iceN = bandLat(i) - 2.5;
    else break;
  }
  let iceS = -90;
  for (let i = 0; i < NB; i++) {
    if (T[i] < -5) iceS = bandLat(i) + 2.5;
    else break;
  }
  return {
    temp: T,
    gmst: sum / wsum,
    eqTemp: eq,
    poleN: T[NB - 1],
    poleS: T[0],
    iceN,
    iceS,
    thermalEq,
    grad: eq - 0.5 * (T[0] + T[NB - 1]),
  };
}

/** Greenland and Antarctica lose their modern ice load in a high-sea greenhouse. */
export function stripIceSheets(elev: number, plate: number, sea: number, co2: number): number {
  if (sea > 45 && co2 > 560 && (plate === 1 || plate === 10)) return Math.min(elev, 650);
  return elev;
}

export function sampleZonalT(temp: Float64Array, lat: number): number {
  const x = (lat + 87.5) / 5;
  const i = clamp(Math.floor(x), 0, NB - 2);
  const t = x - i;
  return temp[i] * (1 - t) + temp[i + 1] * t;
}

/** Hadley / Ferrel belts. Millimetres per year, before land-surface corrections. */
export function zonalPrecip(lat: number, thermalEq: number, grad: number): number {
  const x = lat - thermalEq;
  const ax = Math.abs(x);
  let p = 2900 * Math.exp(-(x * x) / (8.2 * 8.2));
  const sub = Math.exp(-((ax - 26) ** 2) / (7.2 * 7.2));
  p *= 1 - 0.97 * sub;
  const storm = 0.8 + 0.35 * clamp(grad / 48, 0.45, 1.3);
  p += 980 * storm * Math.exp(-((ax - 48) ** 2) / (16 * 16));
  p += 140 * Math.exp(-((ax - 72) ** 2) / (12 * 12));
  p += 45;
  return Math.max(25, p);
}

const meteo = { temp: 0, precip: 0 };

/**
 * Local temperature and rainfall on top of the zonal fields.
 * `oceanEast` is sin(Δpaleolongitude) of a short step toward the nearest sea
 * (about ±0.05). `mountainEast` is +1 when the crest is paleo-east of the cell,
 * −1 when it is paleo-west, 0 when the cell is not in a tall range.
 * Constants are mirrored in the land vertex shader.
 */
export function surfaceMeteo(
  paleoLat: number,
  Tzon: number,
  teq: number,
  grad: number,
  interior: number,
  elev: number,
  orogen: number,
  odist: number,
  oceanEast: number,
  mountainEast: number,
  plate: number,
  him: number,
  orogenMeters: number,
) {
  const absLat = Math.abs(paleoLat);
  const km = elev > 0 ? elev / 1000 : 0;
  let T = Tzon - 6.5 * km;
  if (absLat < 14) T += 1.15 + interior * 0.45;
  else if (absLat < 35) T += 3.4 + interior * 4.8;
  else if (interior < 0.45 && absLat > 45 && absLat < 68) T += 9.2 * (1 - interior / 0.45);
  else if (absLat >= 35) T -= interior * Math.min(6, (absLat - 34) * 0.18);

  let P = zonalPrecip(paleoLat, teq, grad);
  const itcz = Math.exp(-((paleoLat - teq) ** 2) / (11 * 11));
  const horse = Math.exp(-((absLat - 25) ** 2) / (9 * 9));
  const mid = Math.exp(-((absLat - 50) ** 2) / (16 * 16));
  const dry = interior * (0.18 * itcz + 0.96 * horse + 0.42 * mid * (1 - itcz));
  P *= 1 - 0.82 * Math.min(1, dry);

  const west = oceanEast < -0.01;
  const east = oceanEast > 0.01;
  if (absLat > 20 && absLat < 34 && !east && !west) P *= 0.5;

  if (interior < 0.5 && oceanEast !== 0) {
    const monsoon = him > 1800 && plate === 7 && west && absLat > 8 && absLat < 25;
    if (monsoon) {
      const m = clamp((him - 1800) / 3200, 0, 1);
      P += 2100 * m * Math.exp(-((absLat - 18) ** 2) / (8 * 8));
    } else if (west && absLat > 6 && absLat < 30) P *= 0.14;
    else if (west && absLat >= 30 && absLat < 43) P = P * 0.7 + 240;
    else if (east && absLat > 12 && absLat < 52) P *= 1.9;
    else if (!west && absLat > 33 && absLat < 58) P *= 1.28;
  }

  if (orogen && odist < 0.48 && orogenMeters > 1700 && mountainEast !== 0) {
    const eastSide = mountainEast > 0;
    if (absLat > 32) P *= eastSide ? 0.62 : 1.28;
    else if (absLat < 24) P *= eastSide ? 0.5 : 1.4;
    if (odist < 0.12) P *= 1.12;
  }

  if (him > 2000 && orogen === 1 && odist < 0.4 && absLat > 6 && absLat < 32) {
    const m = clamp((him - 2000) / 3500, 0, 1);
    const belt = Math.exp(-((absLat - 26) ** 2) / (7 * 7));
    P += 700 * m * belt;
  }

  meteo.temp = T;
  meteo.precip = clamp(P, 15, 5400);
  return meteo;
}

export const BIOME_ORDER: BiomeId[] = [
  "ice",
  "tundra",
  "boreal",
  "tempForest",
  "rainforest",
  "savanna",
  "grass",
  "desert",
  "alpine",
  "shrub",
  "shallow",
];

export const BIOME_META: Record<BiomeId, { label: string; color: string }> = {
  ice: { label: "Ice sheet", color: "#d7e6f0" },
  tundra: { label: "Tundra", color: "#a3b496" },
  boreal: { label: "Boreal forest", color: "#2a6848" },
  tempForest: { label: "Temperate forest", color: "#3c9148" },
  rainforest: { label: "Rainforest", color: "#0d6842" },
  savanna: { label: "Savanna", color: "#c9a44c" },
  grass: { label: "Grassland", color: "#b4ad62" },
  desert: { label: "Desert", color: "#d2a56c" },
  alpine: { label: "Alpine", color: "#8d7460" },
  shrub: { label: "Shrubland", color: "#7f9448" },
  shallow: { label: "Shallow sea", color: "#3b8cb2" },
};

const BIOME_INDEX: Record<BiomeId, number> = {
  ice: 0,
  tundra: 1,
  boreal: 2,
  tempForest: 3,
  rainforest: 4,
  savanna: 5,
  grass: 6,
  desert: 7,
  alpine: 8,
  shrub: 9,
  shallow: 10,
};

export function biomeIndex(id: BiomeId): number {
  return BIOME_INDEX[id];
}

export function biomeByIndex(i: number): BiomeId {
  return BIOME_ORDER[i] ?? "desert";
}

/** Whittaker-style diagram from mean annual temperature (°C) and rainfall (mm/yr). */
export function classifyBiome(T: number, P: number, elev: number, sea: number): BiomeId {
  if (elev < sea) return "shallow";
  const km = Math.max(0, elev) / 1000;
  const seaLevelT = T + 6.5 * km;
  if (km > 2.2 && seaLevelT > 0 && T < 8) return "alpine";
  if (T < -8) return "ice";
  if (km > 1.6 && T < 0) return "ice";
  if (T < 0) return P < 160 ? "ice" : "tundra";
  if (T < 5) return P < 220 ? "grass" : "boreal";
  if (T >= 18 && P >= 1700) return "rainforest";
  if (T < 16) {
    if (P < 220) return "desert";
    if (P < 480) return "grass";
    return "tempForest";
  }
  if (T < 23) {
    if (P < 280) return "desert";
    if (P < 620) return "shrub";
    if (P < 1500) return "savanna";
    return "tempForest";
  }
  if (P < 280) return "desert";
  if (P < 780) return "savanna";
  if (P < 1600) return "shrub";
  return "rainforest";
}

export function reliefColor(elev: number, sea: number): string {
  if (elev < sea) return "#3b8cb2";
  const h = elev - sea;
  if (h < 150) return "#d5d09a";
  if (h < 600) return "#7eaa62";
  if (h < 1500) return "#c4a15a";
  if (h < 2800) return "#8d6248";
  return "#f4f1ea";
}

export const PLATE_NAMES = [
  "North America",
  "Greenland",
  "South America",
  "Africa",
  "Europe",
  "Siberia",
  "Asia",
  "India",
  "Arabia",
  "Australia",
  "Antarctica",
  "Madagascar",
] as const;

export const PLATE_COLORS = [
  "#c46b4a",
  "#d2bc78",
  "#5eaa62",
  "#d39a3e",
  "#6a8ed0",
  "#8d78c4",
  "#c45d6e",
  "#d4688c",
  "#c9a06a",
  "#3e9e94",
  "#c5d2de",
  "#6eae62",
];

export function climateSentence(gmst: number, iceN: number, iceS: number, sea: number): string {
  const noIce = iceN > 85 && iceS < -85;
  const ice = noIce
    ? "The energy-balance model keeps no year-round polar ice."
    : `Year-round ice reaches about ${Math.round(Math.min(89, iceN))}°N and ${Math.round(Math.max(-89, iceS))}°S.`;
  const sl =
    Math.abs(sea) < 2
      ? "Sea level is at the modern datum."
      : `Sea level is ${sea > 0 ? "+" : "−"}${Math.abs(Math.round(sea))} m against today.`;
  return `Global mean temperature ${gmst.toFixed(1)}°C. ${ice} ${sl}`;
}

export const PRESETS: { id: string; label: string; age: number }[] = [
  { id: "cambrian", label: "Cambrian", age: -520 },
  { id: "hirnantian", label: "Hirnantian", age: -445 },
  { id: "coal", label: "Coal forests", age: -310 },
  { id: "pangea", label: "Pangea", age: -250 },
  { id: "jurassic", label: "Jurassic", age: -175 },
  { id: "seas", label: "High seas", age: -95 },
  { id: "kpg", label: "K–Pg", age: -66 },
  { id: "petm", label: "PETM", age: -56 },
  { id: "antarctic", label: "Antarctic ice", age: -34 },
  { id: "lgm", label: "Ice age", age: -0.021 },
  { id: "now", label: "Today", age: 0 },
  { id: "plus50", label: "+50 Ma", age: 50 },
  { id: "proxima", label: "Proxima", age: 250 },
];
