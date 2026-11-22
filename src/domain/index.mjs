/** @typedef {import('./sky.mjs').Target} Target */
/** @typedef {{cloud:number, rain:number, wind:number, temperature:number}} Weather */
const weights = {
  galaxia: {darkness:30, clouds:25, moon:20, visibility:20, weather:5},
  luna: {darkness:0, clouds:35, moon:0, visibility:55, weather:10},
  planetas: {darkness:5, clouds:35, moon:0, visibility:50, weather:10},
};
/** @param {number} value */
const clamp = value => Math.min(1, Math.max(0, value));

/** @param {Target} target @param {ReturnType<import('./sky.mjs').sky>} sky @param {number} darkness @param {Weather|null} weather */
export function score(target, sky, darkness, weather) {
  const altitude = target === 'galaxia' ? sky.galacticAlt :
    target === 'luna' ? sky.moonAlt : Math.max(...sky.planets.map(planet => planet.altitude));
  const night = sky.sunAlt <= (target === 'galaxia' ? -18 : -6);
  const eligible = night && altitude >= 10;
  const factors = {
    darkness: clamp(darkness),
    clouds: weather ? 1-clamp(weather.cloud/100) : null,
    moon: 1-sky.illumination*clamp((sky.moonAlt+1)/30),
    visibility: clamp((altitude-10)/45),
    weather: weather ? .55*(1-clamp(weather.rain/100)) + .45*(1-clamp(weather.wind/60)) : null,
  };
  let points = 0;
  let coverage = 0;
  const components = Object.entries(weights[target]).filter(([, weight]) => weight > 0).map(([key, weight]) => {
    const value = factors[/** @type {keyof typeof factors} */ (key)];
    if (value !== null) {
      coverage += weight;
      points += weight * value;
    }
    return {key, weight, value};
  });
  return {score: eligible ? Math.round(100*points/coverage) : 0, coverage, eligible, altitude,
    reason: !night ? 'El cielo aún está demasiado claro para este objetivo.' :
      altitude < 10 ? 'El objetivo está por debajo de 10° sobre el horizonte.' :
        weather ? 'El objetivo supera 10° y hay pronóstico para la hora elegida.' :
          'El objetivo supera 10°. La evaluación es parcial porque falta el pronóstico.',
    components};
}
