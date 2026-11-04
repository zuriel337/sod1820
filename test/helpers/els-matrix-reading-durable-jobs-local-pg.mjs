// A test-only PostgreSQL wire client: trusted Unix socket, text queries, no URL,
// password, TLS, TCP, or external database configuration is accepted.
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

class LocalPgClient {
  constructor(socketPath) {
    this.socket = net.createConnection({ path: socketPath });
    this.buffer = Buffer.alloc(0);
    this.pending = null;
    this.socket.on('data', chunk => { this.buffer = Buffer.concat([this.buffer, chunk]); this.read(); });
    this.socket.on('error', error => this.pending?.reject(error));
    this.ready = new Promise((resolve, reject) => { this.pending = { resolve, reject, rows: [] }; });
    this.socket.on('connect', () => {
      const body = Buffer.from('user\0els_test_superuser\0database\0postgres\0client_encoding\0UTF8\0\0');
      const header = Buffer.alloc(8);
      header.writeInt32BE(body.length + 8); header.writeInt32BE(196608, 4);
      this.socket.write(Buffer.concat([header, body]));
    });
  }
  read() {
    while (this.buffer.length >= 5) {
      const length = this.buffer.readInt32BE(1);
      if (this.buffer.length < length + 1) return;
      const tag = String.fromCharCode(this.buffer[0]);
      const body = this.buffer.subarray(5, length + 1);
      this.buffer = this.buffer.subarray(length + 1);
      if (!this.pending) continue;
      if (tag === 'D') {
        const row = []; let offset = 2;
        for (let i = 0; i < body.readInt16BE(0); i++) {
          const size = body.readInt32BE(offset); offset += 4;
          row.push(size === -1 ? null : body.toString('utf8', offset, offset + size));
          if (size >= 0) offset += size;
        }
        this.pending.rows.push(row);
      } else if (tag === 'E') {
        const fields = {}; let offset = 0;
        while (body[offset]) {
          const key = String.fromCharCode(body[offset++]);
          const end = body.indexOf(0, offset); fields[key] = body.toString('utf8', offset, end); offset = end + 1;
        }
        this.pending.error = Object.assign(new Error(fields.M), { code: fields.C });
      } else if (tag === 'Z') {
        const pending = this.pending; this.pending = null;
        pending.error ? pending.reject(pending.error) : pending.resolve(pending.rows);
      }
    }
  }
  async query(sql) {
    await this.ready;
    if (this.pending) throw new Error('Test client only supports one in-flight query');
    const result = new Promise((resolve, reject) => { this.pending = { resolve, reject, rows: [] }; });
    const body = Buffer.from(sql + '\0'); const header = Buffer.alloc(5);
    header[0] = 81; header.writeInt32BE(body.length + 4, 1);
    this.socket.write(Buffer.concat([header, body]));
    return result;
  }
  close() { this.socket.destroy(); }
}

export function localPgBin() {
  const candidates = [process.env.ELS_DURABLE_TEST_PG_BIN, '/usr/lib/postgresql/18/bin', '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/15/bin'].filter(Boolean);
  return candidates.find(path => ['postgres', 'initdb', 'pg_ctl'].every(name => existsSync(join(path, name))));
}

export function startLocalPg(bin) {
  const root = mkdtempSync(join(tmpdir(), 'els-durable-pg-'));
  const data = join(root, 'data'); const socket = join(root, 'socket'); mkdirSync(socket, { mode: 0o700 });
  const env = { ...process.env, LD_LIBRARY_PATH: join(dirname(bin), 'lib'), LC_ALL: 'C', LANG: 'C' };
  // Never inherit a connection/service definition, preload library, or SQL init.
  for (const key of Object.keys(env)) if (key.startsWith('PG')) delete env[key];
  delete env.LD_PRELOAD;
  const run = (command, args) => {
    const result = spawnSync(join(bin, command), args, { env, encoding: 'utf8', timeout: 30000 });
    if (result.status !== 0) throw new Error(`${command}: ${result.error?.message || result.stderr || result.stdout}`);
  };
  const clients = new Set(); let started = false;
  try {
    run('initdb', ['-D', data, '-U', 'els_test_superuser', '-A', 'trust', '--no-locale', '--encoding=UTF8']);
    run('pg_ctl', ['-D', data, '-l', join(root, 'server.log'), '-o', `-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c max_connections=40 -c fsync=off`, '-w', 'start']);
    started = true;
  } catch (error) {
    if (existsSync(join(data, 'postmaster.pid'))) run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
    rmSync(root, { recursive: true, force: true }); throw error;
  }
  return {
    async connect() { const client = new LocalPgClient(join(socket, '.s.PGSQL.5432')); clients.add(client); await client.ready; return client; },
    stop() {
      for (const client of clients) client.close();
      if (started) run('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
      rmSync(root, { recursive: true, force: true });
    },
  };
}
