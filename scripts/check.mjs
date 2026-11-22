import {readdirSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';

for (const directory of ['src','public','tests','scripts']) {
  for (const file of readdirSync(directory,{recursive:true}).filter(path => /\.(mjs|html|css)$/.test(path))) {
    const path = join(directory,file);
    const body = readFileSync(path,'utf8');
    if (/[^\S\r\n]+\r?$/m.test(body) || !body.endsWith('\n')) {
      console.error(path+': espacios finales o falta salto de línea final');
      process.exitCode = 1;
    }
    if (file.endsWith('.mjs')) {
      const result = spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
      if (result.status !== 0) process.exitCode = 1;
    }
  }
}
if (!process.exitCode) console.log('Sintaxis JavaScript y formato básico correctos.');
