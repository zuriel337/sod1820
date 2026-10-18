// 2029-only adapter for @supabase/realtime-js.
//
// SupabaseClient constructs RealtimeClient eagerly even when a public route only
// needs Auth + PostgREST. This adapter keeps that single Supabase/Auth client and
// the same access-token callback, but does not download Phoenix/Realtime until a
// caller actually subscribes, sends, tracks presence or explicitly connects.
// Legacy does not resolve this adapter (see the build-target alias in vite.config).

const loadRealtimeModule = () => import('@supabase/realtime-js/dist/module/index.js');

class LazyRealtimeChannel2029 {
  constructor(owner, name, params) {
    this.owner = owner;
    this.name = name;
    this.params = params;
    this.topic = `realtime:${name}`;
    this.bindings = [];
    this.real = null;
    this.realPromise = null;
    this.subscribeCalled = false;
    this.realSubscribed = false;
    this.closed = false;
  }

  on(type, filter, callback) {
    if (this.closed) return this;
    const binding = [type, filter, callback];
    this.bindings.push(binding);
    if (this.real) this.real.on(...binding);
    return this;
  }

  subscribe(callback, timeout) {
    if (this.closed) return this;
    if (this.subscribeCalled) throw new Error(`tried to subscribe multiple times to '${this.topic}'`);
    this.subscribeCalled = true;
    this._materialize()
      .then((channel) => {
        if (this.closed) return;
        this.realSubscribed = true;
        channel.subscribe(callback, timeout);
      })
      .catch((error) => callback?.('CHANNEL_ERROR', error));
    return this;
  }

  async send(args, opts) {
    return (await this._materialize()).send(args, opts);
  }

  async track(payload, opts) {
    return (await this._materialize()).track(payload, opts);
  }

  async untrack(opts) {
    return (await this._materialize()).untrack(opts);
  }

  presenceState() {
    return this.real?.presenceState() ?? {};
  }

  async unsubscribe(timeout) {
    if (this.closed) return 'ok';
    this.closed = true;
    this.owner._forget(this);
    if (!this.realPromise) return 'ok';
    const channel = await this.realPromise;
    return channel.unsubscribe(timeout);
  }

  async _remove() {
    if (this.closed) return 'ok';
    this.closed = true;
    this.owner._forget(this);
    if (!this.realPromise) return 'ok';
    const channel = await this.realPromise;
    const client = await this.owner._materialize();
    return client.removeChannel(channel);
  }

  _materialize() {
    if (this.closed) return Promise.reject(new Error(`Realtime channel '${this.topic}' is closed`));
    if (!this.realPromise) {
      this.realPromise = this.owner._materialize().then((client) => {
        const channel = client.channel(this.name, this.params);
        this.real = channel;
        for (const binding of this.bindings) channel.on(...binding);
        return channel;
      });
    }
    return this.realPromise;
  }
}

export function createLazyRealtimeClientClass2029(load = loadRealtimeModule) {
  return class LazyRealtimeClient2029 {
    constructor(endpoint, options) {
      this.endpoint = endpoint;
      this.options = options;
      this.channels = [];
      this.real = null;
      this.realPromise = null;
      this.authToken = null;
      this.authVersion = 0;
      this.appliedAuthVersion = 0;
      this.applyingAuth = null;
    }

    channel(name, params = { config: {} }) {
      const topic = `realtime:${name}`;
      const existing = this.channels.find((channel) => channel.topic === topic && !channel.closed);
      if (existing) return existing;
      const channel = new LazyRealtimeChannel2029(this, name, params);
      this.channels.push(channel);
      return channel;
    }

    getChannels() {
      return [...this.channels];
    }

    removeChannel(channel) {
      if (channel instanceof LazyRealtimeChannel2029 && channel.owner === this) return channel._remove();
      return this._materialize().then((client) => client.removeChannel(channel));
    }

    async removeAllChannels() {
      if (this.channels.length === 0) {
        if (this.real) await this.real.disconnect();
        return [];
      }
      const channels = [...this.channels];
      const results = await Promise.all(channels.map((channel) => channel._remove()));
      if (this.real) await this.real.disconnect();
      return results;
    }

    setAuth(token = null) {
      this.authToken = token;
      this.authVersion += 1;
      return this.real ? this._applyLatestAuth() : Promise.resolve();
    }

    connect() {
      return this._materialize().then((client) => client.connect());
    }

    disconnect(code, reason) {
      return this.real ? this.real.disconnect(code, reason) : Promise.resolve('ok');
    }

    _forget(channel) {
      const index = this.channels.indexOf(channel);
      if (index >= 0) this.channels.splice(index, 1);
    }

    _materialize() {
      if (!this.realPromise) {
        this.realPromise = Promise.resolve(load()).then((module) => {
          const ActualRealtimeClient = module.RealtimeClient ?? module.default;
          if (typeof ActualRealtimeClient !== 'function') throw new Error('RealtimeClient export unavailable');
          this.real = new ActualRealtimeClient(this.endpoint, this.options);
          return this._applyLatestAuth().then(() => this.real);
        });
      }
      return this.realPromise;
    }

    _applyLatestAuth() {
      if (!this.real || this.appliedAuthVersion === this.authVersion) return Promise.resolve();
      if (this.applyingAuth) return this.applyingAuth;
      this.applyingAuth = (async () => {
        while (this.real && this.appliedAuthVersion !== this.authVersion) {
          const version = this.authVersion;
          const token = this.authToken;
          await this.real.setAuth(token);
          this.appliedAuthVersion = version;
        }
      })().finally(() => { this.applyingAuth = null; });
      return this.applyingAuth;
    }
  };
}

export const RealtimeClient = createLazyRealtimeClientClass2029();
