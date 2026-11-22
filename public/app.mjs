const $ = selector => document.querySelector(selector);
const planner = $('#planner');
const site = $('#site');
const dialog = $('#booking');
const reservation = $('#reservation');
const timeFormat = new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Jujuy',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
const currency = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
const dateInJujuy = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Jujuy'});
const sourceLabel = {forecast:'Pronóstico Open-Meteo',demo:'Meteorología de muestra',unavailable:'Meteorología no disponible'};
const factorLabel = {darkness:'Oscuridad estimada · muestra',clouds:'Cielo despejado',moon:'Ausencia de brillo lunar',visibility:'Altura del objetivo',weather:'Viento y precipitación'};
let catalog;
let current;
let activeExperience;
let bookingRequest;
let evaluation;
let zoomed = false;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

async function api(path, options) {
  const response = await fetch(path,options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Consulta fallida.');
  return data;
}

function renderMap() {
  const place = catalog.sites.find(item => item.id === site.value);
  const [west,south,east,north] = zoomed ?
    [place.lon-.30,place.lat-.19,place.lon+.30,place.lat+.19] : [-66.65,-24.52,-64.91,-23.10];
  const bbox = [west,south,east,north].join(',');
  const layer = $('#layer').value;
  const params = new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',
    LAYERS:layer,STYLES:'',SRS:'EPSG:4326',BBOX:bbox,WIDTH:'1024',HEIGHT:'600',FORMAT:'image/jpeg'});
  if (layer === 'VIIRS_Black_Marble') params.set('TIME','2016-01-01');
  const image = $('#map-image');
  const url = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'+params;
  if (image.src !== url || image.hidden) {
    $('#map-note').textContent = 'Cargando capa satelital…';
    image.hidden = false;
    image.src = url;
  }
  const condition = evaluation?.find(item => item.id === place.id);
  const summary = condition ? ' · Objetivo '+condition.altitude.toFixed(1)+'° · '+sourceLabel[condition.conditions.source] : '';
  $('#place-details').textContent = place.name+' · '+place.region+' · '+place.lat.toFixed(3)+'°, '+place.lon.toFixed(3)+'°'+summary;
  const markers = catalog.sites.flatMap(item => {
    const x = 100*(item.lon-west)/(east-west);
    const y = 100*(north-item.lat)/(north-south);
    if (x < 0 || x > 100 || y < 0 || y > 100) return [];
    const button = element('button',undefined,'marker');
    button.style.left = x+'%';
    button.style.top = y+'%';
    button.setAttribute('aria-label',item.name);
    button.setAttribute('aria-pressed',String(item.id === site.value));
    button.append(element('span',item.name));
    button.addEventListener('click',() => {
      site.value = item.id;
      renderMap();
      $('#markers').querySelector('[aria-pressed="true"]')?.focus();
    });
    return [button];
  });
  $('#markers').replaceChildren(...markers);
}

function resultCard(data) {
  const {result,alternatives,events} = data;
  const box = element('article');
  const weather = result.conditions.weather;
  box.append(element('h3',result.name),element('p',result.score+' / 100','score'),
    element('p',result.reason),element('p',sourceLabel[result.conditions.source]+' · '+result.coverage+'% del peso con datos o supuestos'));
  if (weather) box.append(element('p',weather.cloud+'% nubes · '+weather.rain+'% precipitación · '+weather.wind+' km/h · '+weather.temperature+' °C'));
  const factors = element('ul');
  for (const {key,value,weight} of result.components) {
    factors.append(element('li',factorLabel[key]+' · peso '+weight+'% · '+(value === null ? 'sin dato' : Math.round(value*100)+'/100')));
  }
  box.append(factors);
  const sky = result.astronomy;
  const details = element('article');
  const phaseNames = ['nueva','creciente','cuarto creciente','gibosa creciente','llena','gibosa menguante','cuarto menguante','menguante'];
  const phase = phaseNames[Math.round(sky.phase/45)%8];
  details.append(element('h3','Qué hay en el cielo'),element('p','Luna '+phase+' · '+Math.round(sky.illumination*100)+'% iluminada'),
    element('p','Altura del objetivo '+result.altitude.toFixed(1)+'° · Sol '+sky.sunAlt.toFixed(1)+'°'));
  if (data.target === 'planetas') {
    details.append(element('p',sky.planets.map(p => p.name+' '+p.altitude.toFixed(0)+'°').join(' · ')));
  }
  const eventList = element('ul');
  for (const event of events) {
    const name = event.body === 'noche' ? (event.event === 'sale' ? 'Fin de noche astronómica' : 'Inicio de noche astronómica') :
      (event.event === 'sale' ? 'Salida' : 'Puesta') + (event.body === 'sol' ? ' del Sol' : ' de la Luna');
    eventList.append(element('li',name+' · '+timeFormat.format(new Date(event.time))));
  }
  details.append(eventList);
  const comparison = element('article');
  comparison.append(element('h3','Otros lugares a esta hora'));
  if (!alternatives.length) comparison.append(element('p','Sin lugares comparables para estas condiciones.'));
  for (const item of alternatives) {
    const row = element('p');
    const pick = element('button',item.name+' · '+item.score+'/100','secondary');
    pick.addEventListener('click',() => {
      site.value = item.id;
      renderMap();
      planner.requestSubmit();
    });
    row.append(pick);
    comparison.append(row);
  }
  const grid = element('div',undefined,'results');
  grid.append(box,details,comparison);
  const container = $('#result');
  container.replaceChildren(grid, element('p','Índice experimental. Los valores de oscuridad son supuestos de demostración y no provienen del mapa VIIRS.','small'));
  container.hidden = false;
}

planner.addEventListener('submit',async event => {
  event.preventDefault();
  const params = new URLSearchParams(new FormData(planner));
  params.set('mode',planner.elements.demo.checked ? 'demo' : 'live');
  params.delete('demo');
  current?.abort();
  const request = new AbortController();
  current = request;
  $('#analyze').disabled = true;
  $('#result').hidden = true;
  evaluation = undefined;
  renderMap();
  $('#status').textContent = 'Evaluando la noche…';
  try {
    const data = await api('/api/recommend?'+params,{signal:request.signal});
    evaluation = [data.result,...data.alternatives];
    renderMap();
    resultCard(data);
    $('#status').textContent = 'Resultado para '+timeFormat.format(new Date(data.instant))+' (hora de Jujuy).';
  } catch (error) {
    if (error.name !== 'AbortError') $('#status').textContent = error.message;
  } finally {
    if (request === current) $('#analyze').disabled = false;
  }
});

$('#map-image').addEventListener('load',() => { $('#map-note').textContent = 'Capa satelital cargada.'; });
$('#map-image').addEventListener('error',() => {
  $('#map-image').hidden = true;
  $('#map-note').textContent = 'Capa satelital no disponible. Podés seguir explorando en la cuadrícula de coordenadas.';
});
site.addEventListener('change',renderMap);
$('#layer').addEventListener('change',renderMap);
$('#zoom').addEventListener('click',event => {
  zoomed = !zoomed;
  event.currentTarget.setAttribute('aria-pressed',String(zoomed));
  event.currentTarget.textContent = zoomed ? 'Ver región' : 'Centrar en el lugar';
  renderMap();
});

function total() {
  const quantity = reservation.elements.guests.valueAsNumber;
  $('#booking-total').textContent = Number.isInteger(quantity) && quantity >= 1 && quantity <= activeExperience.capacity ?
    'Total de ejemplo · '+currency.format(quantity*activeExperience.price) : 'Elegí una cantidad entre 1 y '+activeExperience.capacity+'.';
}

function openBooking(experience) {
  activeExperience = experience;
  reservation.reset();
  reservation.elements.date.value = planner.elements.date.value || dateInJujuy.format(new Date());
  reservation.elements.guests.max = experience.capacity;
  $('#booking-title').textContent = experience.title;
  $('#booking-text').textContent = 'Fecha y cupos de prueba. Esta simulación no cobra ni contacta a un prestador.';
  $('#booking-status').textContent = '';
  $('#confirm').disabled = false;
  total();
  dialog.showModal();
}

$('#close').addEventListener('click',() => dialog.close());
dialog.addEventListener('close',() => bookingRequest?.abort());
reservation.elements.guests.addEventListener('input',total);
reservation.addEventListener('submit',async event => {
  event.preventDefault();
  const confirm = $('#confirm');
  const request = new AbortController();
  bookingRequest = request;
  confirm.disabled = true;
  $('#booking-status').textContent = 'Generando referencia…';
  try {
    const {reference,total} = await api('/api/reservations',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({experience:activeExperience.id,date:reservation.elements.date.value,guests:reservation.elements.guests.valueAsNumber}),
      signal:request.signal,
    });
    if (request.signal.aborted || !dialog.open) return;
    $('#booking-status').textContent = 'Simulación confirmada · '+reference+' · '+currency.format(total)+'.';
  } catch(error) {
    if (request.signal.aborted || !dialog.open) return;
    $('#booking-status').textContent = error.message;
    confirm.disabled = false;
  }
});

async function init() {
  $('#analyze').disabled = true;
  try {
    catalog = await api('/api/catalog');
    const options = catalog.sites.map(place => new Option(place.name,place.id));
    site.replaceChildren(...options);
    planner.elements.date.value = dateInJujuy.format(new Date());
    renderMap();
    const cards = catalog.experiences.map(experience => {
      const place = catalog.sites.find(item => item.id === experience.site);
      const card = element('article');
      const details = element('details');
      details.append(element('summary','Requisitos y condiciones'),
        element('p',experience.provider+' · '+experience.duration+' min · hasta '+experience.capacity+' personas.'),
        element('p','Disponibilidad simulada para la fecha seleccionada.'),
        element('p',experience.requirements),element('p',experience.cancellation),element('p',experience.safety));
      const button = element('button','Simular reserva');
      button.addEventListener('click',() => openBooking(experience));
      card.append(element('p',experience.kind+' · '+place.name,'small'),element('h3',experience.title),
        element('p',experience.description),element('p',currency.format(experience.price)+' por persona · precio demo'),details,button);
      return card;
    });
    $('#catalog').replaceChildren(...cards);
    $('#analyze').disabled = false;
  } catch (error) {
    $('#status').textContent = 'No se pudo cargar el catálogo. '+error.message;
  }
}
init();
