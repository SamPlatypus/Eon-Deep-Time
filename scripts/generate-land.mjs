/**
 * Rasterize Natural Earth land + PB2002 plates into a compact grid.
 * Run: node scripts/generate-land.mjs
 * Inputs (dev-only): /tmp/geo/land.geojson /tmp/geo/plates.geojson
 */
import { readFileSync, writeFileSync } from "node:fs";
import { geoContains } from "d3-geo";

const STEP = 1;
const land = JSON.parse(readFileSync("/tmp/geo/land.geojson", "utf8"));
const plates = JSON.parse(readFileSync("/tmp/geo/plates.geojson", "utf8"));

const NA = 0,
  GR = 1,
  SA = 2,
  AF = 3,
  EU = 4,
  SB = 5,
  CH = 6,
  IN = 7,
  AR = 8,
  AU = 9,
  AN = 10,
  MD = 11;

const CODE_TO_PLATE = {
  NA: NA,
  CA: NA,
  PM: NA,
  GP: NA,
  SA: SA,
  AP: SA,
  ND: SA,
  NB: SA,
  NH: SA,
  AF: AF,
  SO: AF,
  EU: EU,
  AS: EU,
  AT: EU,
  AM: CH,
  OK: CH,
  YA: CH,
  ON: CH,
  SU: CH,
  BU: CH,
  PS: CH,
  IN: IN,
  AR: AR,
  AU: AU,
  KE: AU,
  MO: AU,
  SB: AU,
  SS: AU,
  BH: AU,
  BS: AU,
  MS: AU,
  NZ: AU,
  AN: AN,
  SC: AN,
  SL: AN,
  SW: AN,
};

function walkCoords(coords, cb) {
  if (typeof coords[0] === "number") cb(coords[0], coords[1]);
  else for (const c of coords) walkCoords(c, cb);
}

function bboxOf(feature) {
  let minLon = 180,
    maxLon = -180,
    minLat = 90,
    maxLat = -90;
  walkCoords(feature.geometry.coordinates, (lon, lat) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  return [minLon, minLat, maxLon, maxLat];
}

function prepare(fc) {
  return fc.features.map((feature) => ({
    feature,
    bbox: feature.bbox || bboxOf(feature),
    code: feature.properties?.Code || null,
  }));
}

const landFeats = prepare(land);
const plateFeats = prepare(plates);

function inBbox(b, lon, lat) {
  return lon >= b[0] - 0.2 && lon <= b[2] + 0.2 && lat >= b[1] - 0.2 && lat <= b[3] + 0.2;
}

function hitLand(lon, lat) {
  for (const f of landFeats) {
    if (!inBbox(f.bbox, lon, lat)) continue;
    if (geoContains(f.feature, [lon, lat])) return true;
  }
  return false;
}

function hitPlateCode(lon, lat) {
  for (const f of plateFeats) {
    if (!inBbox(f.bbox, lon, lat)) continue;
    if (geoContains(f.feature, [lon, lat])) return f.code;
  }
  return null;
}

function assignPlate(code, lon, lat) {
  if (lat < -60 && (code === "AN" || code === "SC" || code === "SL" || code == null)) return AN;
  if (lon > 42 && lon < 51 && lat > -26.5 && lat < -11.5) return MD;
  if (code === "NA" && lat > 59 && lat < 84 && lon > -73 && lon < -12) return GR;
  let plate = code ? CODE_TO_PLATE[code] : undefined;
  if (plate === undefined) {
    if (lat < -60) return AN;
    return null;
  }
  if (code === "EU" || code === "AM" || code === "OK" || code === "YA") {
    if (code === "EU" && lat > 54 && lon > 62 && lon < 145) return SB;
    if ((code === "EU" || code === "AS" || code === "AT") && lon < 58 && lat >= 34) return EU;
    if (code === "EU" && lon < 52) return EU;
    if (code === "OK" || code === "YA" || code === "AM") return CH;
    if (code === "EU") return CH;
  }
  return plate;
}

const lonN = Math.round(360 / STEP);
const latN = Math.round(180 / STEP);
const landAt = new Uint8Array(lonN * latN);
const plateAt = new Int8Array(lonN * latN);
plateAt.fill(-1);

function idx(i, j) {
  return j * lonN + i;
}
function lonOf(i) {
  return -180 + (i + 0.5) * STEP;
}
function latOf(j) {
  return -90 + (j + 0.5) * STEP;
}

console.time("raster");
let landCells = 0;
for (let j = 0; j < latN; j++) {
  const lat = latOf(j);
  for (let i = 0; i < lonN; i++) {
    const lon = lonOf(i);
    if (!hitLand(lon, lat)) continue;
    const code = hitPlateCode(lon, lat);
    const plate = assignPlate(code, lon, lat);
    if (plate == null) continue;
    landAt[idx(i, j)] = 1;
    plateAt[idx(i, j)] = plate;
    landCells++;
  }
}
console.timeEnd("raster");
console.log("land cells", landCells);
console.log("probe ant -80,40", hitLand(40, -80), hitPlateCode(40, -80));
console.log("probe uk", hitLand(-1.5, 52.5), assignPlate(hitPlateCode(-1.5, 52.5), -1.5, 52.5));
console.log("probe nz", hitLand(174, -41), assignPlate(hitPlateCode(174, -41), 174, -41));
console.log("probe india", hitLand(78, 22), assignPlate(hitPlateCode(78, 22), 78, 22));
console.log("probe greenland", hitLand(-42, 72), assignPlate(hitPlateCode(-42, 72), -42, 72));
console.log("probe madagascar", hitLand(46, -20), assignPlate(hitPlateCode(46, -20), 46, -20));
console.log("probe siberia", hitLand(95, 62), assignPlate(hitPlateCode(95, 62), 95, 62));
console.log("probe china", hitLand(105, 35), assignPlate(hitPlateCode(105, 35), 105, 35));
console.log("probe japan", hitLand(138, 36), assignPlate(hitPlateCode(138, 36), 138, 36));

const OROGENS = [
  {
    id: 1,
    width: 850,
    line: [
      [72.5, 35.5],
      [76, 34.2],
      [80, 30.5],
      [84, 28.3],
      [88, 27.8],
      [92, 27.6],
      [96, 28.2],
    ],
  },
  {
    id: 2,
    width: 480,
    line: [
      [-76, 6],
      [-78, 0],
      [-76, -6],
      [-74, -12],
      [-70, -16],
      [-68, -22],
      [-66, -28],
      [-68, -34],
      [-70, -40],
      [-72, -46],
      [-73, -51],
    ],
  },
  {
    id: 3,
    width: 520,
    line: [
      [-124, 49],
      [-121, 44],
      [-118, 38],
      [-112, 40],
      [-108, 44],
      [-110, 50],
      [-118, 54],
      [-125, 58],
    ],
  },
  {
    id: 4,
    width: 380,
    line: [
      [-86, 33],
      [-83, 36],
      [-80, 38],
      [-78, 40],
      [-76, 42],
      [-73, 44],
      [-70, 46],
    ],
  },
  {
    id: 5,
    width: 260,
    line: [
      [5.5, 44.5],
      [7.5, 46],
      [10, 46.8],
      [12.5, 47],
      [14.5, 47.2],
    ],
  },
  {
    id: 6,
    width: 340,
    line: [
      [58, 50],
      [60, 55],
      [60, 60],
      [62, 64],
      [66, 67],
    ],
  },
  {
    id: 7,
    width: 300,
    line: [
      [-6, 57],
      [-4, 58.5],
      [5, 62],
      [8, 63],
      [15, 67],
      [20, 69],
    ],
  },
];

function hav(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function nearestOrogen(lat, lon) {
  let best = null;
  for (const o of OROGENS) {
    for (const [olon, olat] of o.line) {
      const d = hav(lat, lon, olat, olon);
      const norm = d / o.width;
      if (norm > 1) continue;
      if (!best || norm < best.norm) {
        const east = Math.sin(((olon - lon) * Math.PI) / 180) * Math.cos((olat * Math.PI) / 180);
        best = { id: o.id, norm, east };
      }
    }
  }
  return best;
}

function nearestOceanBearing(i, j) {
  const lat = latOf(j);
  const lon = lonOf(i);
  for (let r = 1; r <= 10; r++) {
    let best = null;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ii = (i + di + lonN) % lonN;
        const jj = j + dj;
        if (jj < 0 || jj >= latN) continue;
        if (landAt[idx(ii, jj)]) continue;
        const olat = latOf(jj);
        const olon = lonOf(ii);
        let dlon = olon - lon;
        if (dlon > 180) dlon -= 360;
        if (dlon < -180) dlon += 360;
        const east = dlon * Math.cos((lat * Math.PI) / 180);
        const north = olat - lat;
        const b = (Math.atan2(east, north) * 180) / Math.PI;
        const dist2 = east * east + north * north;
        if (!best || dist2 < best.dist2) best = { b, dist2 };
      }
    }
    if (best) {
      const deg = (best.b + 360) % 360;
      return Math.round((deg / 360) * 255) & 255;
    }
  }
  return 0;
}

function interiorScore(i, j) {
  for (let r = 1; r <= 8; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ii = (i + di + lonN) % lonN;
        const jj = j + dj;
        if (jj < 0 || jj >= latN || !landAt[idx(ii, jj)]) return r;
      }
    }
  }
  return 8;
}

function baseElev(plate, interior, lat, lon) {
  const t = Math.pow(interior, 1.05);
  let e = 30 + t * 620;
  if (plate === AN) e = 120 + Math.pow(interior, 0.85) * 3400;
  else if (plate === GR) e = 80 + Math.pow(interior, 0.9) * 2600;
  if (plate === NA && lon <= -96 && lon >= -112 && lat >= 32 && lat <= 66) e = Math.min(e, 70);
  if (plate === AF && lat >= 14 && lat <= 28 && lon >= -14 && lon <= 22) e = Math.min(e, 95);
  if (plate === EU && lat >= 49 && lat <= 60 && lon >= -1 && lon <= 24) e = Math.min(e, 120);
  if (plate === SB && lon >= 62 && lon <= 88 && lat >= 56 && lat <= 70) e = Math.min(e, 60);
  if (plate === NA && lon <= -75 && lon >= -95 && lat >= 52 && lat <= 64) e = Math.min(e, 90);
  if (plate === SA && lon <= -50 && lon >= -70 && lat >= -8 && lat <= 2) e = Math.min(e, 80);
  return Math.round(e);
}

const cells = [];
const counts = Array(12).fill(0);

for (let j = 0; j < latN; j++) {
  for (let i = 0; i < lonN; i++) {
    if (!landAt[idx(i, j)]) continue;
    const plate = plateAt[idx(i, j)];
    const lat = latOf(j);
    const lon = lonOf(i);
    const rings = interiorScore(i, j);
    const interior = Math.max(0, Math.min(255, Math.round((Math.min(rings, 6) / 6) * 255)));
    const o = nearestOrogen(lat, lon);
    const orogen = o ? o.id : 0;
    const odist = o ? Math.max(0, Math.min(255, Math.round(o.norm * 255))) : 255;
    const oeast = o ? (o.east >= 0 ? 1 : 0) : 0;
    const bear = nearestOceanBearing(i, j);
    const elev = baseElev(plate, interior / 255, lat, lon);
    counts[plate]++;
    cells.push([i, j, plate, interior, elev, orogen, odist, bear, oeast]);
  }
}

// Continental shelf halo (emerges when sea level drops — Beringia, Sunda).
let shelf = 0;
for (let j = 1; j < latN - 1; j++) {
  for (let i = 0; i < lonN; i++) {
    if (landAt[idx(i, j)]) continue;
    let nearest = null;
    let bestR = 99;
    for (let r = 1; r <= 2; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const ii = (i + di + lonN) % lonN;
          const jj = j + dj;
          if (jj < 0 || jj >= latN) continue;
          if (!landAt[idx(ii, jj)]) continue;
          if (r < bestR) {
            bestR = r;
            nearest = plateAt[idx(ii, jj)];
          }
        }
      }
      if (nearest != null) break;
    }
    if (nearest == null) continue;
    const elev = bestR === 1 ? -45 : -105;
    cells.push([i, j, nearest, 0, elev, 0, 255, 0, 0]);
    shelf++;
  }
}

const names = ["na", "gr", "sa", "af", "eu", "sb", "ch", "in", "ar", "au", "an", "md"];
console.log(
  "counts",
  Object.fromEntries(names.map((n, i) => [n, counts[i]])),
);
console.log("shelf", shelf, "total", cells.length);

const payload = { step: STEP, cells };
writeFileSync("src/lib/paleo/land-grid.json", JSON.stringify(payload));
console.log("wrote", cells.length, "cells");
