import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url, { alias: { "@": "/workspace/src" } });
const { computeFrame, placeSnapshots } = await jiti.import("/workspace/src/lib/paleo/frame.ts");
const { rotateLatLon, plateQuaternion, ANCHORS } = await jiti.import("/workspace/src/lib/paleo/plates.ts");
const { PLATE_NAMES } = await jiti.import("/workspace/src/lib/paleo/science.ts");

console.time("one");
const f0 = computeFrame(0);
console.timeEnd("one");
console.log("TODAY gmst", f0.ebm.gmst.toFixed(2), "eq", f0.ebm.eqTemp.toFixed(1), "poleN", f0.ebm.poleN.toFixed(1), "poleS", f0.ebm.poleS.toFixed(1), "ice", f0.ebm.iceN.toFixed(0), f0.ebm.iceS.toFixed(0), "land%", f0.landPct.toFixed(1), "co2", Math.round(f0.co2), "sea", f0.sea.toFixed(0), "solar", f0.solar.toFixed(3), "F", f0.forcing.toFixed(2));
console.log("--- zonal");
for (let i = 0; i < 36; i += 2) {
  const lat = -87.5 + i * 5;
  console.log(String(lat).padStart(6), f0.ebm.temp[i].toFixed(1), "land", f0.landFrac[i].toFixed(2));
}
console.log("--- places");
for (const p of placeSnapshots(f0)) {
  console.log(p.name.padEnd(16), p.biomeLabel.padEnd(18), "T", p.temp.toFixed(1), "P", Math.round(p.precip), "elev", Math.round(p.elev), "plat", p.paleoLat.toFixed(1));
}
console.log("--- identity");
for (let i = 0; i < 12; i++) {
  const q = plateQuaternion(i, 0);
  const p = rotateLatLon(q, ANCHORS[i].lat, ANCHORS[i].lon);
  const dlat = p.lat - ANCHORS[i].lat;
  let dlon = p.lon - ANCHORS[i].lon;
  if (dlon > 180) dlon -= 360;
  if (dlon < -180) dlon += 360;
  if (Math.hypot(dlat, dlon) > 0.2) console.log("DRIFT", PLATE_NAMES[i], dlat.toFixed(2), dlon.toFixed(2));
}
console.log("identity ok if no DRIFT lines");
const ages = [0, -0.021, -34, -56, -66, -95, -175, -250, -310, -445, -520, 50, 250];
for (const age of ages) {
  console.time("f"+age);
  const f = computeFrame(age);
  console.timeEnd("f"+age);
  const india = rotateLatLon(f.qs[7], 22, 79);
  const capetown = rotateLatLon(f.qs[3], -33.9, 18.4);
  const sahara = rotateLatLon(f.qs[3], 24.5, 2.5);
  const london = rotateLatLon(f.qs[4], 51.5, -0.1);
  const ny = rotateLatLon(f.qs[0], 40.7, -74);
  const aus = rotateLatLon(f.qs[9], -25, 134);
  console.log(
    String(age).padStart(7),
    "T", f.ebm.gmst.toFixed(1),
    "sea", String(Math.round(f.sea)).padStart(4),
    "co2", String(Math.round(f.co2)).padStart(5),
    "ice", f.ebm.iceN.toFixed(0) + "/" + f.ebm.iceS.toFixed(0),
    "IN", india.lat.toFixed(0),
    "CT", capetown.lat.toFixed(0),
    "Sah", sahara.lat.toFixed(0),
    "Lon", london.lat.toFixed(0),
    "NY", ny.lat.toFixed(0),
    "AU", aus.lat.toFixed(0),
  );
}
