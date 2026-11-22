import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {sites, experiences} from './domain/catalog.mjs';
import {sky, nightEvents, validDate} from './domain/sky.mjs';
import {score} from './domain/index.mjs';
import {forecast} from './domain/weather.mjs';

const publicFiles = {
  '/':['index.html','text/html; charset=utf-8'],
  '/app.mjs':['app.mjs','text/javascript; charset=utf-8'],
  '/style.css':['style.css','text/css; charset=utf-8'],
};
const targets = ['galaxia','luna','planetas'];
const invalid = message => Object.assign(new Error(message), {status:400});

export function app({weather=forecast}={}) {
  return createServer(async (req,res) => {
    const json = (status,data) => {
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(JSON.stringify(data));
    };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://gibs.earthdata.nasa.gov; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    try {
      const {pathname,searchParams:q} = new URL(req.url,'http://localhost');
      if (req.method === 'GET' && Object.hasOwn(publicFiles,pathname)) {
        const [file,type] = publicFiles[pathname];
        const body = await readFile(new URL('../public/'+file,import.meta.url));
        res.writeHead(200,{'Content-Type':type});
        return res.end(body);
      }
      if (req.method === 'GET' && pathname === '/api/catalog') return json(200,{sites,experiences});
      if (req.method === 'GET' && pathname === '/api/recommend') {
        const {site,date,time,target,mode} = Object.fromEntries(q);
        const selected = sites.find(item => item.id === site);
        if (!selected || !validDate(date ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? '') ||
            !targets.includes(target) || !['live','demo'].includes(mode)) throw invalid('Revisá lugar, fecha, hora y objetivo.');
        const instant = new Date(date+'T'+time+':00-03:00');
        const ranked = await Promise.all(sites.map(async place => {
          const conditions = await weather(place.lat,place.lon,instant,{demo:mode==='demo',key:process.env.OPEN_METEO_KEY});
          const astronomy = sky(instant,place.lat,place.lon);
          return {id:place.id, name:place.name, ...score(target,astronomy,place.darkness,conditions.weather), conditions, astronomy};
        }));
        const result = ranked.find(item => item.id === selected.id);
        const alternatives = ranked.filter(item => item.id !== selected.id && item.eligible)
          .filter(item => item.conditions.source === result.conditions.source)
          .sort((a,b) => b.score-a.score || a.name.localeCompare(b.name,'es'));
        return json(200,{instant:instant.toISOString(),target,result,alternatives,events:nightEvents(date,selected.lat,selected.lon)});
      }
      if (req.method === 'POST' && pathname === '/api/reservations') {
        if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw invalid('Se necesita JSON.');
        const chunks = [];
        let length = 0;
        for await (const chunk of req.iterator({destroyOnReturn:false})) {
          length += chunk.length;
          if (length > 2048) {
            res.setHeader('Connection','close');
            return json(413,{error:'Solicitud demasiado grande.'});
          }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw invalid('JSON inválido.'); }
        const experience = experiences.find(item => item.id === body?.experience);
        if (!experience || typeof body.date !== 'string' || !validDate(body.date) ||
            !Number.isInteger(body.guests) || body.guests < 1 || body.guests > experience.capacity) {
          throw invalid('Revisá fecha, experiencia y cantidad de personas.');
        }
        return json(201,{reference:'DEMO-'+randomUUID().slice(0,8).toUpperCase(),status:'simulada',
          experience:experience.id,date:body.date,guests:body.guests,total:experience.price*body.guests,currency:'ARS'});
      }
      return json(404,{error:'Ruta inexistente.'});
    } catch(error) {
      if (!res.headersSent) json(error.status || 500,{error:error.status ? error.message : 'No pudimos completar la consulta.'});
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  app().listen(port,host,() => console.log('PachaNoche · http://'+host+':'+port));
}
