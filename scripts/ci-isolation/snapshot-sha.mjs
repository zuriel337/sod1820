// Input validation only; runs before the OS-isolated job and performs no I/O to a service.
import fs from 'node:fs';
import path from 'node:path';
import contract from './snapshot-contract.cjs';
const kind=process.argv[2];
if(!['browser','navigation','performance'].includes(kind))throw new Error('Unknown snapshot contract');
const dir=path.resolve('test/fixtures/ci-2029'),manifest=path.join(dir,'manifest.json');
if(!fs.existsSync(manifest))throw new Error('BLOCKED: reviewed frozen CI snapshots are not provisioned (test/fixtures/ci-2029/manifest.json). No live capture or empty substitute.');
const entry=JSON.parse(fs.readFileSync(manifest))[kind],file=path.join(dir,`${kind}.json.gz`);
const bytes=fs.readFileSync(file);
contract.verifyManifestEntry(entry,bytes);
contract.requireCoverage(contract.decodeSnapshot(bytes),kind);
process.stdout.write(entry.sha256+'\n');
