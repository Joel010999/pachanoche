/** @typedef {import('./index.mjs').Weather} Weather */
const variables = ['cloud_cover','precipitation_probability','wind_speed_10m','temperature_2m'];

/**
 * @param {number} lat @param {number} lon @param {Date} instant
 * @param {{request?:typeof fetch, now?:Date, key?:string, demo?:boolean}} options
 * @returns {Promise<{source:'forecast'|'unavailable'|'demo', weather:Weather|null}>}
 */
export async function forecast(lat, lon, instant, {request=fetch, now=new Date(), key='', demo=false}={}) {
  if (demo) return {source:'demo', weather:{cloud:24, rain:8, wind:16, temperature:12}};
  const unavailable = /** @type {const} */ ({source:'unavailable', weather:null});
  const delta = +instant - +now;
  if (delta < 0 || delta > 6*86400000) return unavailable;
  const day = instant.toISOString().slice(0,10);
  const hour = instant.toISOString().slice(0,13) + ':00';
  const url = new URL('https://' + (key ? 'customer-api' : 'api') + '.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude:String(lat), longitude:String(lon), hourly:variables.join(','),
    timezone:'UTC', start_date:day, end_date:day,
  }).toString();
  if (key) url.searchParams.set('apikey',key);
  try {
    const response = await request(url, {signal:AbortSignal.timeout(3500)});
    if (!response.ok) return unavailable;
    const {hourly} = await response.json();
    const index = hourly?.time?.indexOf(hour) ?? -1;
    if (index < 0) return unavailable;
    const [cloud,rain,wind,temperature] = variables.map(key => hourly[key]?.[index]);
    if (![cloud,rain,wind,temperature].every(Number.isFinite) ||
        cloud < 0 || cloud > 100 || rain < 0 || rain > 100 || wind < 0) return unavailable;
    return {source:'forecast', weather:{cloud,rain,wind,temperature}};
  } catch {
    return unavailable;
  }
}
