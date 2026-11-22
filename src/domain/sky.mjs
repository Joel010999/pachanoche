// Low-precision orbital elements after Paul Schlyter. Angles are degrees.
const rad = Math.PI / 180;
/** @param {number} a */
const sin = a => Math.sin(a * rad);
/** @param {number} a */
const cos = a => Math.cos(a * rad);
/** @param {number} a */
const wrap = a => (a % 360 + 360) % 360;

export const planets = /** @type {const} */ (['Venus', 'Marte', 'Júpiter', 'Saturno']);
/** @typedef {typeof planets[number]} Planet */
/** @typedef {'galaxia'|'luna'|'planetas'} Target */

/** @param {number[]} elements */
function orbit([node, tilt, peri, axis, eccentricity, mean]) {
  const m = wrap(mean) * rad;
  let anomaly = m;
  for (let step = 0; step < 6; step++) {
    anomaly -= (anomaly - eccentricity * Math.sin(anomaly) - m) /
      (1 - eccentricity * Math.cos(anomaly));
  }
  const x = axis * (Math.cos(anomaly) - eccentricity);
  const y = axis * Math.sqrt(1 - eccentricity ** 2) * Math.sin(anomaly);
  const distance = Math.hypot(x, y);
  const u = Math.atan2(y, x) / rad + peri;
  return [
    distance * (cos(node) * cos(u) - sin(node) * sin(u) * cos(tilt)),
    distance * (sin(node) * cos(u) + cos(node) * sin(u) * cos(tilt)),
    distance * sin(u) * sin(tilt),
  ];
}

/** @param {number} d */
function elements(d) {
  return {
    Venus: [76.6799 + 2.4659e-5*d, 3.3946 + 2.75e-8*d, 54.891 + 1.38374e-5*d, .72333, .006773 - 1.302e-9*d, 48.0052 + 1.6021302244*d],
    Marte: [49.5574 + 2.11081e-5*d, 1.8497 - 1.78e-8*d, 286.5016 + 2.92961e-5*d, 1.523688, .093405 + 2.516e-9*d, 18.6021 + .5240207766*d],
    Júpiter: [100.4542 + 2.76854e-5*d, 1.303 - 1.557e-7*d, 273.8777 + 1.64505e-5*d, 5.20256, .048498 + 4.469e-9*d, 19.895 + .0830853001*d],
    Saturno: [113.6634 + 2.3898e-5*d, 2.4886 - 1.081e-7*d, 339.3939 + 2.97661e-5*d, 9.55475, .055546 - 9.499e-9*d, 316.967 + .0334442282*d],
  };
}

/** @param {Date} instant @param {number} lat @param {number} lon */
export function sky(instant, lat, lon) {
  if (!Number.isFinite(instant.getTime()) || !Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new RangeError('Coordenadas o fecha inválidas');
  const d = (instant.getTime() - Date.UTC(1999, 11, 31)) / 86400000;
  const sidereal = 280.46061837 + 360.98564736629 * (d - 1.5) + lon;
  const tilt = 23.4393 - 3.563e-7 * d;
  /** @param {number} ra @param {number} dec */
  const altitude = (ra, dec) => Math.asin(Math.max(-1, Math.min(1,
    sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(sidereal-ra)))) / rad;
  /** @param {number[]} vector */
  const fromEcliptic = ([x, y, z]) => {
    const eqY = y*cos(tilt) - z*sin(tilt);
    const eqZ = y*sin(tilt) + z*cos(tilt);
    return altitude(Math.atan2(eqY,x)/rad, Math.atan2(eqZ,Math.hypot(x,eqY))/rad);
  };
  const sun = orbit([0, 0, 282.9404 + 4.70935e-5*d, 1, .016709 - 1.151e-9*d, 356.047 + .9856002585*d]);
  const moon = orbit([125.1228 - .0529538083*d, 5.1454, 318.0634 + .1643573223*d, 60.2666, .0549, 115.3654 + 13.0649929509*d]);
  const sunAlt = fromEcliptic(sun);
  const moonGeo = fromEcliptic(moon);
  const moonAlt = moonGeo - Math.asin(cos(moonGeo) / Math.hypot(...moon)) / rad;
  const phase = wrap((Math.atan2(moon[1],moon[0])-Math.atan2(sun[1],sun[0]))/rad);
  const orbits = elements(d);
  const visible = planets.map(name => {
    const vector = orbit(orbits[name]);
    return {name, altitude: fromEcliptic(vector.map((value, axis) => value + sun[axis]))};
  });
  return {
    sunAlt, moonAlt, illumination: (1-cos(phase))/2, phase,
    galacticAlt: altitude(266.4168, -29.0078), planets: visible,
  };
}

/** @param {string} date */
export function validDate(date) {
  if (!/^20[2-4]\d-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
}

/** @param {string} date @param {number} lat @param {number} lon */
export function nightEvents(date, lat, lon) {
  const noon = Date.parse(date + 'T12:00:00-03:00');
  const thresholds = {sol: -.833, luna: -.3, noche: -18};
  /** @type {{body:string; event:'sale'|'se pone'; time:string}[]} */
  const events = [];
  let previous = sky(new Date(noon), lat, lon);
  for (let minute = 5; minute <= 1440; minute += 5) {
    const instant = noon + minute*60000;
    const current = sky(new Date(instant), lat, lon);
    for (const [body, threshold] of Object.entries(thresholds)) {
      const a = body === 'luna' ? previous.moonAlt : previous.sunAlt;
      const b = body === 'luna' ? current.moonAlt : current.sunAlt;
      if ((a >= threshold) !== (b >= threshold)) {
        const fraction = (threshold-a)/(b-a);
        events.push({body, event: b > a ? 'sale' : 'se pone', time: new Date(instant-(1-fraction)*300000).toISOString()});
      }
    }
    previous = current;
  }
  return events;
}
