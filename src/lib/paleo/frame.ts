import { getGrid } from "./grid";
import { PLACES, placeNote, type Place } from "./locations";
import {
  allQuaternions,
  latLonToVec,
  rotateLatLon,
  type Q,
  type V3,
} from "./plates";
import {
  biomeByIndex,
  BIOME_META,
  chapterFor,
  classifyBiome,
  climateSentence,
  co2Forcing,
  co2ppm,
  orogenHeights,
  PLATE_NAMES,
  sampleZonalT,
  seaLevel,
  solarFactor,
  solveEbm,
  stripIceSheets,
  surfaceMeteo,
  type Ebm,
} from "./science";
import type { BiomeId, Mode, PinSnap, PlaceSnap } from "./types";

const NB = 36;

export type Frame = {
  age: number;
  co2: number;
  solar: number;
  forcing: number;
  sea: number;
  ebm: Ebm;
  qs: Q[];
  orogenH: Float64Array;
  landPct: number;
  landFrac: Float64Array;
};

export type CellClimate = {
  biome: BiomeId;
  temp: number;
  precip: number;
  elev: number;
  paleoLat: number;
  paleoLon: number;
  flooded: boolean;
  plate: number;
};

const tmpV: V3 = [0, 0, 0];
const tmpP: V3 = [0, 0, 0];

function rot(q: Q, x: number, y: number, z: number, out: V3): V3 {
  const tx = 2 * (q[1] * z - q[2] * y);
  const ty = 2 * (q[2] * x - q[0] * z);
  const tz = 2 * (q[0] * y - q[1] * x);
  out[0] = x + q[3] * tx + (q[1] * tz - q[2] * ty);
  out[1] = y + q[3] * ty + (q[2] * tx - q[0] * tz);
  out[2] = z + q[3] * tz + (q[0] * ty - q[1] * tx);
  return out;
}

function wrapLon(d: number) {
  let x = d;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function oceanOffset(lat: number, lon: number, bearingByte: number): { lat: number; lon: number } {
  const brg = (bearingByte / 255) * Math.PI * 2;
  const δ = 3 * (Math.PI / 180);
  const φ1 = lat * (Math.PI / 180);
  const λ1 = lon * (Math.PI / 180);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(brg),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
}

export function computeFrame(age: number): Frame {
  const grid = getGrid();
  const qs = allQuaternions(age);
  const sea = seaLevel(age);
  const co2 = co2ppm(age);
  const solar = solarFactor(age);
  const orogenH = orogenHeights(age);
  const landArea = new Float64Array(NB);
  const bandArea = new Float64Array(NB);
  for (let i = 0; i < NB; i++) {
    const lat = -87.5 + i * 5;
    const φ1 = ((lat - 2.5) * Math.PI) / 180;
    const φ2 = ((lat + 2.5) * Math.PI) / 180;
    bandArea[i] = 2 * Math.PI * (Math.sin(φ2) - Math.sin(φ1));
  }
  const ster = (Math.PI / 180) * (Math.PI / 180) * grid.step * grid.step;
  let emerged = 0;
  const n = grid.count;
  for (let k = 0; k < n; k++) {
    const q = qs[grid.plate[k]];
    rot(q, grid.cx[k], grid.cy[k], grid.cz[k], tmpV);
    const paleoLat = (Math.asin(Math.max(-1, Math.min(1, tmpV[1]))) * 180) / Math.PI;
    const elev = elevOf(grid.elev[k], grid.orogen[k], grid.odist[k], orogenH);
    const area = ster * Math.max(0.05, Math.cos(grid.lat[k] * (Math.PI / 180)));
    if (elev >= sea) {
      const bi = Math.max(0, Math.min(NB - 1, Math.floor((paleoLat + 90) / 5)));
      landArea[bi] += area;
      emerged += area;
    }
  }
  const landFrac = new Float64Array(NB);
  const sheet = new Float64Array(NB);
  for (let i = 0; i < NB; i++) {
    const lat = -87.5 + i * 5;
    const frac = Math.max(0, Math.min(1, landArea[i] / bandArea[i]));
    landFrac[i] = frac;
    sheet[i] = iceSheetCover(lat, frac, sea);
  }
  const ebm = solveEbm(solar, co2, landFrac, sheet);
  return {
    age,
    co2,
    solar,
    forcing: co2Forcing(co2),
    sea,
    ebm,
    qs,
    orogenH,
    landPct: (emerged / (4 * Math.PI)) * 100,
    landFrac,
  };
}

function iceSheetCover(lat: number, landFrac: number, sea: number): number {
  if (sea > -10 || landFrac < 0.12) return 0;
  const vol = Math.max(0, Math.min(1, (-sea - 10) / 115));
  let belt = 0;
  if (lat > 48) belt = Math.max(0, Math.min(1, (lat - 48) / 18));
  else if (lat < -62) belt = Math.max(0, Math.min(1, (-62 - lat) / 14));
  return vol * Math.min(1, landFrac * 1.6) * belt;
}

function oceanEastOf(q: Q, lat: number, lon: number, bear: number, paleoLon: number): number {
  if (!bear) return 0;
  const off = oceanOffset(lat, lon, bear);
  const v = vecOf(off.lat, off.lon);
  rot(q, v[0], v[1], v[2], tmpP);
  const olon = (Math.atan2(tmpP[0], tmpP[2]) * 180) / Math.PI;
  return Math.sin((wrapLon(olon - paleoLon) * Math.PI) / 180);
}

function mountainEastOf(q: Q, lat: number, lon: number, oeast: number, paleoLon: number): number {
  const sign = oeast ? 1 : -1;
  const v = vecOf(lat, lon + sign * 2.2);
  rot(q, v[0], v[1], v[2], tmpP);
  const mlon = (Math.atan2(tmpP[0], tmpP[2]) * 180) / Math.PI;
  return wrapLon(mlon - paleoLon) > 0 ? 1 : -1;
}

function elevOf(base: number, orogen: number, odist: number, orogenH: Float64Array): number {
  if (!orogen) return base;
  const w = 1 - odist;
  const s = w * w;
  return base * (1 - 0.88 * s) + orogenH[orogen] * s;
}

export function climateAt(
  frame: Frame,
  lat: number,
  lon: number,
  plate: number,
  interior: number,
  baseElev: number,
  orogen: number,
  odist: number,
  bear: number,
  oeast: number,
): CellClimate {
  const q = frame.qs[plate];
  const paleo = rotateLatLon(q, lat, lon);
  let h = baseElev;
  if (orogen) {
    const w = 1 - odist;
    const s = w * w;
    h = h * (1 - 0.88 * s) + frame.orogenH[orogen] * s;
  }
  h = stripIceSheets(h, plate, frame.sea, frame.co2);
  const flooded = h < frame.sea;
  const Tzon = sampleZonalT(frame.ebm.temp, paleo.lat);
  const oceanEast = oceanEastOf(q, lat, lon, bear, paleo.lon);
  const tall = orogen && odist < 0.48 && frame.orogenH[orogen] > 1700;
  const mountainEast = tall ? mountainEastOf(q, lat, lon, oeast, paleo.lon) : 0;
  const met = surfaceMeteo(
    paleo.lat,
    Tzon,
    frame.ebm.thermalEq,
    frame.ebm.grad,
    interior,
    h,
    orogen,
    odist,
    oceanEast,
    mountainEast,
    plate,
    frame.orogenH[1] ?? 0,
    orogen ? frame.orogenH[orogen] : 0,
  );
  const biome = classifyBiome(met.temp, met.precip, h, frame.sea);
  return {
    biome,
    temp: met.temp,
    precip: met.precip,
    elev: h,
    paleoLat: paleo.lat,
    paleoLon: paleo.lon,
    flooded,
    plate,
  };
}

/** Hot path for the mesh. Writes biome index into `outBiome[k]`. */
export function paintCells(
  frame: Frame,
  outBiome: Uint8Array,
  mode: Mode,
  colors: Float32Array,
  palette: Float32Array,
  platePalette: Float32Array,
  landCounts?: Uint32Array,
) {
  const grid = getGrid();
  const n = grid.count;
  const sea = frame.sea;
  const oh = frame.orogenH;
  const temp = frame.ebm.temp;
  const teq = frame.ebm.thermalEq;
  const grad = frame.ebm.grad;
  const him = oh[1];
  for (let k = 0; k < n; k++) {
    const q = frame.qs[grid.plate[k]];
    rot(q, grid.cx[k], grid.cy[k], grid.cz[k], tmpV);
    const y = tmpV[1] < -1 ? -1 : tmpV[1] > 1 ? 1 : tmpV[1];
    const paleoLat = Math.asin(y) * (180 / Math.PI);
    const paleoLon = Math.atan2(tmpV[0], tmpV[2]) * (180 / Math.PI);
    const id = grid.orogen[k];
    let h = grid.elev[k];
    if (id) {
      const w = 1 - grid.odist[k];
      const s = w * w;
      h = h * (1 - 0.88 * s) + oh[id] * s;
    }
    h = stripIceSheets(h, grid.plate[k], sea, frame.co2);
    const interior = grid.interior[k];
    const x = (paleoLat + 87.5) / 5;
    const bi = x < 0 ? 0 : x > 34 ? 34 : (x | 0);
    const tf = x - bi;
    const Tzon = temp[bi] * (1 - tf) + temp[bi + 1] * tf;
    const oceanEast = oceanEastOf(q, grid.lat[k], grid.lon[k], grid.bear[k], paleoLon);
    const tall = id && grid.odist[k] < 0.48 && oh[id] > 1700;
    const mountainEast = tall ? mountainEastOf(q, grid.lat[k], grid.lon[k], grid.oeast[k], paleoLon) : 0;
    const met = surfaceMeteo(
      paleoLat,
      Tzon,
      teq,
      grad,
      interior,
      h,
      id,
      grid.odist[k],
      oceanEast,
      mountainEast,
      grid.plate[k],
      him,
      id ? oh[id] : 0,
    );
    const T = met.temp;
    const P = met.precip;

    const biome = classifyBiome(T, P, h, sea);
    const bIndex = biome === "ice" ? 0
      : biome === "tundra" ? 1
      : biome === "boreal" ? 2
      : biome === "tempForest" ? 3
      : biome === "rainforest" ? 4
      : biome === "savanna" ? 5
      : biome === "grass" ? 6
      : biome === "desert" ? 7
      : biome === "alpine" ? 8
      : biome === "shrub" ? 9
      : 10;
  if (outBiome.length) outBiome[k] = bIndex;
    if (landCounts && h >= sea) landCounts[bIndex]++;
    if (colors.length === 0) continue;

    let pr = 0, pg = 0, pb = 0;
    if (mode === "plates") {
      const p = grid.plate[k] * 3;
      pr = platePalette[p];
      pg = platePalette[p + 1];
      pb = platePalette[p + 2];
      if (h < sea) {
        pr = palette[30];
        pg = palette[31];
        pb = palette[32];
      }
    } else if (mode === "relief") {
      const col = reliefRGB(h, sea);
      pr = col[0];
      pg = col[1];
      pb = col[2];
    } else {
      const p = bIndex * 3;
      pr = palette[p];
      pg = palette[p + 1];
      pb = palette[p + 2];
    }
    const c = k * 12;
    for (let t = 0; t < 4; t++) {
      colors[c + t * 3] = pr;
      colors[c + t * 3 + 1] = pg;
      colors[c + t * 3 + 2] = pb;
    }
  }
}

function vecOf(lat: number, lon: number): [number, number, number] {
  const φ = lat * (Math.PI / 180);
  const λ = lon * (Math.PI / 180);
  const cl = Math.cos(φ);
  return [cl * Math.sin(λ), Math.sin(φ), cl * Math.cos(λ)];
}

const RELIEF = [
  [0.231, 0.549, 0.698],
  [0.835, 0.816, 0.604],
  [0.494, 0.667, 0.384],
  [0.769, 0.631, 0.353],
  [0.553, 0.384, 0.282],
  [0.957, 0.945, 0.918],
];

function reliefRGB(elev: number, sea: number): number[] {
  if (elev < sea) return RELIEF[0];
  const h = elev - sea;
  if (h < 150) return RELIEF[1];
  if (h < 600) return RELIEF[2];
  if (h < 1500) return RELIEF[3];
  if (h < 2800) return RELIEF[4];
  return RELIEF[5];
}

export function radiusFor(elev: number, sea: number): number {
  if (elev < sea) {
    const depth = sea - elev;
    if (depth > 240) return 0;
    return 0.972;
  }
  const km = Math.max(0, elev) / 1000;
  return 1 + km * 0.0085;
}

export function writePositions(frame: Frame, positions: Float32Array, normals: Float32Array) {
  const grid = getGrid();
  const n = grid.count;
  const sea = frame.sea;
  const oh = frame.orogenH;
  for (let k = 0; k < n; k++) {
    const q = frame.qs[grid.plate[k]];
    const id = grid.orogen[k];
    let h = grid.elev[k];
    if (id) {
      const w = 1 - grid.odist[k];
      const s = w * w;
      h = h * (1 - 0.88 * s) + oh[id] * s;
    }
    const radius = radiusFor(h, sea);
    const base = k * 12;
    if (radius === 0) {
      for (let t = 0; t < 12; t++) {
        positions[base + t] = 0;
        normals[base + t] = t % 3 === 1 ? 1 : 0;
      }
      continue;
    }
    let nxx = 0, nyy = 0, nzz = 0;
    const px = [0, 0, 0, 0];
    const py = [0, 0, 0, 0];
    const pz = [0, 0, 0, 0];
    for (let t = 0; t < 4; t++) {
      const o = base + t * 3;
      rot(q, grid.corners[o], grid.corners[o + 1], grid.corners[o + 2], tmpV);
      const inv = 1 / (Math.hypot(tmpV[0], tmpV[1], tmpV[2]) || 1);
      px[t] = tmpV[0] * inv * radius;
      py[t] = tmpV[1] * inv * radius;
      pz[t] = tmpV[2] * inv * radius;
      nxx += tmpV[0];
      nyy += tmpV[1];
      nzz += tmpV[2];
    }
    const ax = px[1] - px[0];
    const ay = py[1] - py[0];
    const az = pz[1] - pz[0];
    const bx = px[2] - px[0];
    const by = py[2] - py[0];
    const bz = pz[2] - pz[0];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (nx * nxx + ny * nyy + nz * nzz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    for (let t = 0; t < 4; t++) {
      const o = base + t * 3;
      positions[o] = px[t];
      positions[o + 1] = py[t];
      positions[o + 2] = pz[t];
      normals[o] = nx;
      normals[o + 1] = ny;
      normals[o + 2] = nz;
    }
  }
}

function nearestCell(lat: number, lon: number, accept?: (k: number) => boolean): number {
  const grid = getGrid();
  let best = -1;
  let bestD = 1e9;
  for (let k = 0; k < grid.count; k++) {
    if (accept && !accept(k)) continue;
    let dlon = grid.lon[k] - lon;
    if (dlon > 180) dlon -= 360;
    else if (dlon < -180) dlon += 360;
    const dlat = grid.lat[k] - lat;
    const d = dlat * dlat + dlon * dlon;
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

const placeCell = new Map<string, number>();

function cellForPlace(place: Place): number {
  const hit = placeCell.get(place.id);
  if (hit != null) return hit;
  const grid = getGrid();
  let k = nearestCell(
    place.lat,
    place.lon,
    (i) => grid.elev[i] > 0 && grid.plate[i] === place.plate,
  );
  if (k < 0) k = nearestCell(place.lat, place.lon, (i) => grid.elev[i] > 0);
  if (k < 0) k = nearestCell(place.lat, place.lon);
  placeCell.set(place.id, k);
  return k;
}

export function placeSnapshots(frame: Frame): PlaceSnap[] {
  return PLACES.map((p) => snapPlace(frame, p));
}

function snapPlace(frame: Frame, place: Place): PlaceSnap {
  const grid = getGrid();
  const k = cellForPlace(place);
  const orogen = place.id === "everest" ? 1 : grid.orogen[k];
  const odist = place.id === "everest" ? 0.04 : grid.odist[k];
  const oeast = grid.oeast[k];
  const c = climateAt(
    frame,
    place.lat,
    place.lon,
    place.plate,
    grid.interior[k],
    grid.elev[k],
    orogen,
    odist,
    grid.bear[k] || 128,
    oeast,
  );
  const meta = BIOME_META[c.biome];
  return {
    id: place.id,
    name: place.name,
    region: place.region,
    biome: c.biome,
    biomeLabel: meta.label,
    color: meta.color,
    paleoLat: c.paleoLat,
    paleoLon: c.paleoLon,
    temp: c.temp,
    precip: c.precip,
    elev: c.elev,
    note: placeNote(place, frame.age, c.paleoLat, c.biome, meta.label),
    plate: PLATE_NAMES[place.plate] ?? "Plate",
  };
}

const cellCache = new Map<string, number>();
function nearestCached(lat: number, lon: number): number {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cellCache.get(key);
  if (hit != null) return hit;
  const k = nearestCell(lat, lon);
  cellCache.set(key, k);
  return k;
}

export function pinAt(frame: Frame, cellIndex: number): PinSnap {
  const grid = getGrid();
  const k = cellIndex;
  const c = climateAt(
    frame,
    grid.lat[k],
    grid.lon[k],
    grid.plate[k],
    grid.interior[k],
    grid.elev[k],
    grid.orogen[k],
    grid.odist[k],
    grid.bear[k],
    grid.oeast[k],
  );
  const meta = BIOME_META[c.biome];
  return {
    paleoLat: c.paleoLat,
    paleoLon: c.paleoLon,
    biome: c.biome,
    biomeLabel: meta.label,
    color: meta.color,
    temp: c.temp,
    precip: c.precip,
    elev: c.elev,
    plate: PLATE_NAMES[c.plate] ?? "Plate",
    flooded: c.flooded,
  };
}

export function summary(frame: Frame) {
  const ch = chapterFor(frame.age);
  return {
    era: ch.era,
    period: ch.period,
    stage: ch.stage,
    chapter: ch.text,
    climateLine: climateSentence(frame.ebm.gmst, frame.ebm.iceN, frame.ebm.iceS, frame.sea),
    gmst: frame.ebm.gmst,
    eqTemp: frame.ebm.eqTemp,
    poleN: frame.ebm.poleN,
    poleS: frame.ebm.poleS,
    iceN: frame.ebm.iceN,
    iceS: frame.ebm.iceS,
  };
}

export function paleoOfPlace(frame: Frame, place: Place) {
  return rotateLatLon(frame.qs[place.plate], place.lat, place.lon);
}

const NO_BIOME = new Uint8Array(0);
const NO_COLOR = new Float32Array(0);

/** Share of emerged land in each biome. Index matches BIOME_ORDER. Shallow is always 0. */
export function landBiomeShares(frame: Frame): number[] {
  const counts = new Uint32Array(11);
  paintCells(frame, NO_BIOME, "biomes", NO_COLOR, NO_COLOR, NO_COLOR, counts);
  let total = 0;
  for (let i = 0; i < 10; i++) total += counts[i];
  const out = new Array<number>(11).fill(0);
  if (!total) return out;
  for (let i = 0; i < 10; i++) out[i] = counts[i] / total;
  return out;
}

/** Nearest grid cell to a paleolatitude / paleolongitude. `ang` is degrees. */
export function pickCell(frame: Frame, lat: number, lon: number): { index: number; ang: number } {
  const grid = getGrid();
  const target = latLonToVec(lat, lon);
  let best = 0;
  let bestDot = -2;
  for (let k = 0; k < grid.count; k++) {
    rot(frame.qs[grid.plate[k]], grid.cx[k], grid.cy[k], grid.cz[k], tmpV);
    const d = tmpV[0] * target[0] + tmpV[1] * target[1] + tmpV[2] * target[2];
    if (d > bestDot) {
      bestDot = d;
      best = k;
    }
  }
  const ang = (Math.acos(Math.max(-1, Math.min(1, bestDot))) * 180) / Math.PI;
  return { index: best, ang };
}

export { biomeByIndex, nearestCached };
