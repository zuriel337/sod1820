// Input validation only; runs before the OS-isolated job and performs no I/O to a service.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const kind=process.argv[2];
if(!['browser','navigation','performance'].includes(kind))throw new Error('Unknown snapshot contract');
const dir=path.resolve('test/fixtures/ci-2029'),manifest=path.join(dir,'manifest.json');
if(!fs.existsSync(manifest))throw new Error('BLOCKED: reviewed frozen CI snapshots are not provisioned (test/fixtures/ci-2029/manifest.json). No live capture or empty substitute.');
const entry=JSON.parse(fs.readFileSync(manifest))[kind],file=path.join(dir,`${kind}.json.gz`);
if(!entry||!/^[a-f0-9]{64}$/.test(entry.sha256||''))throw new Error('Exact reviewed snapshot hash required');
if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==entry.sha256)throw new Error('Snapshot digest mismatch');
process.stdout.write(entry.sha256+'\n');
