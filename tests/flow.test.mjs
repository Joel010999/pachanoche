import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {app} from '../src/server.mjs';
import {forecast} from '../src/domain/weather.mjs';

test('landing, catálogo, evaluación y reserva demo por HTTP',async t => {
  const server = app({weather:(lat,lon,instant,options) => forecast(lat,lon,instant,{
    ...options,now:new Date('2026-11-22T15:00Z'),request:async () => { throw new Error('offline'); },
  })});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:'+server.address().port;
  const landing = await fetch(base);
  assert.match(await landing.text(),/PachaNoche/);
  assert.match(landing.headers.get('content-security-policy'),/gibs\.earthdata/);
  assert.equal((await fetch(base+'/app.mjs')).status,200);
  const {sites,experiences} = await (await fetch(base+'/api/catalog')).json();
  assert.equal(sites.length,5);
  assert.equal(experiences.length,3);
  const query = '/api/recommend?date=2026-11-22&time=22:00&site=tilcara&target=luna&mode=';
  const result = await (await fetch(base+query+'demo')).json();
  assert.equal(result.instant,'2026-11-23T01:00:00.000Z');
  assert.equal(result.result.conditions.source,'demo');
  assert.ok(result.result.eligible);
  assert.ok(result.alternatives.length > 0);
  assert.equal((await (await fetch(base+query+'live')).json()).result.conditions.source,'unavailable');
  assert.equal((await fetch(base+query+'other')).status,400);
  const post = (body) => fetch(base+'/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body});
  const purchase = await post(JSON.stringify({experience:experiences[0].id,date:'2026-11-22',guests:2}));
  assert.equal(purchase.status,201);
  const booking = await purchase.json();
  assert.match(booking.reference,/^DEMO-[A-F0-9]{8}$/);
  assert.equal(booking.total,experiences[0].price*2);
  assert.equal(booking.status,'simulada');
  assert.equal((await post(JSON.stringify({experience:experiences[0].id,date:'2026-11-22',guests:99}))).status,400);
  assert.equal((await post('x'.repeat(3000))).status,413);
  assert.equal((await fetch(base+'/.env')).status,404);
});
