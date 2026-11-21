// Browser-only SDK boundary. Empty canonical public-reader sessions may defer Auth;
// stored sessions, callback/login routes, storage uncertainty and every Auth action
// use the unmodified SDK. Stored bytes are a loading hint, never authorization.
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from './publicReadingRelease2029.js';
const realImport = () => import('@supabase/auth-js/dist/module/index.js');
let importer = realImport;
export function _setAuthImportForTests(load = realImport) { importer = load; }

export class AuthClient {
  constructor(options = {}) {
    this.options = options;
    this.real = null;
    this.pending = null;
    this.listeners = new Set();
    const loc = globalThis.location;
    this.canDefer = PUBLIC_READING_PRODUCTION_ARTIFACT && loc?.origin === 'https://sod1820.co.il'
      && !/^\/(login|auth)(\/|$)/.test(loc.pathname)
      && !/[?#&](code|access_token|refresh_token|error|type)=/.test((loc.search || '') + (loc.hash || ''));
    this.ready = this.checkGuest();
    // A login in another tab must wake this tab even before it has opened Auth.
    this.onStorage = e => {
      if (this.options.persistSession !== false && (e.key === this.options.storageKey || e.key === null)) void this.materialize().catch(() => {});
    };
    globalThis.addEventListener?.('storage', this.onStorage);
  }
  async checkGuest() {
    if (!this.canDefer) return this.materialize();
    // The existing anonymous public projection deliberately has no account store.
    if (this.options.persistSession === false && this.options.autoRefreshToken === false && this.options.detectSessionInUrl === false) return null;
    if (!this.options.storage || !this.options.persistSession) return this.materialize();
    try {
      if (this.options.storage.probe?.() !== 'durable') return this.materialize();
      const key = this.options.storageKey;
      if (!key || await this.options.storage.getItem(key) || await this.options.storage.getItem(key + '-code-verifier')) return this.materialize();
    } catch { return this.materialize(); }
    return null;
  }
  materialize() {
    if (!this.pending) this.pending = importer().then(({ AuthClient: Real }) => {
      const client = new Real(this.options);
      this.real = client;
      for (const entry of this.listeners) entry.subscription = client.onAuthStateChange(entry.callback).data.subscription;
      globalThis.removeEventListener?.('storage', this.onStorage);
      return client;
    }).catch(error => { this.pending = null; throw error; });
    return this.pending;
  }
  async getSession() {
    await this.ready;
    if (this.pending) return (await this.pending).getSession();
    return { data: { session: null }, error: null };
  }
  onAuthStateChange(callback) {
    const entry = { callback, subscription: null };
    this.listeners.add(entry);
    if (this.real) entry.subscription = this.real.onAuthStateChange(callback).data.subscription;
    else this.ready.then(() => {
      if (!this.pending && this.listeners.has(entry)) callback('INITIAL_SESSION', null);
    }).catch(() => { /* getSession owns the initialization error path. */ });
    return { data: { subscription: { unsubscribe: () => {
      this.listeners.delete(entry);
      entry.subscription?.unsubscribe();
    } } } };
  }
}
// Preserve the SDK's argument/result/error contracts by forwarding each operation.
for (const method of ['getUser', 'signInWithOAuth', 'signInWithOtp', 'signInWithPassword',
  'verifyOtp', 'resetPasswordForEmail', 'updateUser', 'signOut', 'setSession',
  'refreshSession', 'exchangeCodeForSession', 'startAutoRefresh', 'stopAutoRefresh']) {
  AuthClient.prototype[method] = async function (...args) {
    return (await this.materialize())[method](...args);
  };
}
