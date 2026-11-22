import test from 'node:test';
import assert from 'node:assert/strict';
import {sky,nightEvents,validDate} from '../src/domain/sky.mjs';
import {score} from '../src/domain/index.mjs';
import {forecast} from '../src/domain/weather.mjs';

const site = [-24.19,-65.3];
test('altura solar nocturna, luna nueva y fechas locales',() => {
  const noon = sky(new Date('2026-11-22T12:00:00-03:00'),...site);
  const night = sky(new Date('2026-11-22T00:00:00-03:00'),...site);
  assert.ok(noon.sunAlt > 70);
  assert.ok(night.sunAlt < -30);
  const eclipse = sky(new Date('2024-04-08T18:18:00Z'),...site);
  assert.ok(eclipse.illumination < .01);
  assert.equal(night.planets.length,4);
  assert.ok(night.planets.every(planet => Math.abs(planet.altitude) <= 90));
  const events = nightEvents('2026-11-22',...site);
  const sunset = events.find(e => e.body==='sol' && e.event==='se pone');
  const dark = events.find(e => e.body==='noche' && e.event==='se pone');
  assert.ok(Date.parse(dark.time) > Date.parse(sunset.time));
  assert.ok(events.some(e => e.body==='noche' && e.event==='sale'));
});

test('coordenadas extremas y fechas inexistentes',() => {
  assert.doesNotThrow(() => sky(new Date(),-90,180));
  assert.throws(() => sky(new Date(),-91,0),RangeError);
  assert.throws(() => sky(new Date(),0,Infinity),RangeError);
  assert.throws(() => sky(new Date('invalid'),0,0),RangeError);
  assert.equal(validDate('2026-02-29'),false);
  assert.equal(validDate('2028-02-29'),true);
});

test('índice acotado, luna brillante y ausencia de clima',() => {
  const high = {sunAlt:-30, galacticAlt:80, moonAlt:70, illumination:1, planets:[]};
  const clear = {cloud:0,rain:0,wind:0,temperature:10};
  assert.equal(score('luna',high,0,clear).score,100);
  assert.ok(score('galaxia',high,1,clear).score < 100);
  assert.equal(score('galaxia',{...high,moonAlt:-20},2,clear).score,100);
  assert.equal(score('galaxia',{...high,sunAlt:-10},1,clear).score,0);
  assert.equal(score('luna',{...high,moonAlt:0},1,clear).eligible,false);
  assert.equal(score('galaxia',high,1,null).coverage,70);
  assert.equal(score('luna',high,0,null).coverage,55);
  assert.ok(score('galaxia',high,-20,{cloud:150,rain:160,wind:100,temperature:-50}).score >= 0);
});

test('pronóstico valida UTC, errores, alcance y modo explícito',async () => {
  const now = new Date('2026-11-22T15:00Z');
  const instant = new Date('2026-11-23T01:30Z');
  const success = async url => {
    assert.equal(url.searchParams.get('timezone'),'UTC');
    assert.equal(url.searchParams.get('start_date'),'2026-11-23');
    return Response.json({hourly:{time:['2026-11-23T01:00'],cloud_cover:[11],precipitation_probability:[0],wind_speed_10m:[6],temperature_2m:[12]}});
  };
  assert.equal((await forecast(...site,instant,{now,request:success})).weather.cloud,11);
  const failure = async () => { throw new Error('offline'); };
  assert.equal((await forecast(...site,instant,{now,request:failure})).source,'unavailable');
  assert.equal((await forecast(...site,instant,{now,request:async () => new Response(null,{status:429})})).source,'unavailable');
  assert.equal((await forecast(...site,instant,{now,request:async () => Response.json({hourly:{time:['2026-11-23T01:00']}})})).weather,null);
  let calls = 0;
  const request = async () => { calls++; return new Response(null,{status:500}); };
  assert.equal((await forecast(...site,new Date('2026-11-30'),{now,request})).source,'unavailable');
  assert.equal((await forecast(...site,instant,{now,request,demo:true})).source,'demo');
  assert.equal(calls,0);
});
