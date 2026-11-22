import {cp,mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for (const directory of ['src','public']) {
  await cp(directory,'dist/'+directory,{recursive:true});
}
console.log('Producción preparada en dist/.');
