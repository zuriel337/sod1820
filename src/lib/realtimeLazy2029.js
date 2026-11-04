// 2029-only adapter for the exact Realtime subset used by this browser SPA.
//
// SupabaseClient constructs RealtimeClient eagerly even when a public route only
// needs Auth + PostgREST. This adapter keeps that single Supabase/Auth client and
// the same access-token callback, but does not download Phoenix/Realtime until a
// caller subscribes, sends, tracks presence or explicitly connects. Legacy does
// not resolve this adapter (see the build-target alias in vite.config).

export const LAZY_REALTIME_2029_CONTRACT = Object.freeze({
  runtime: 'browser-vite-only',
  clientMethods: Object.freeze([
    'channel',
    'getChannels',
    'removeChannel',
    'removeAllChannels',
    'setAuth',
    'connect',
    'disconnect',
  ]),
  channelMethods: Object.freeze([
    'on',
    'subscribe',
    'send',
    'track',
    'untrack',
    'presenceState',
    'unsubscribe',
  ]),
});

function browserOnlyError() {
  const error = new Error(
    'The SOD1820 2029 lazy Realtime adapter can materialize only in a Vite browser build.',
  );
  error.code = 'SOD_2029_REALTIME_BROWSER_ONLY';
  return error;
}

const loadRealtimeModule = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(browserOnlyError());
  }
  return import('@supabase/realtime-js/dist/module/index.js');
};

function closedChannelError(topic) {
  return new Error(`Realtime channel '${topic}' is closed`);
}

function normalizeError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

class LazyRealtimeChannel2029 {
  constructor(owner, name, params) {
    this.owner = owner;
    this.name = name;
    this.params = params;
    this.topic = `realtime:${name}`;
    this.bindings = [];
    this.pending = [];
    this.real = null;
    this.realPromise = null;
    this.subscribeCalled = false;
    this.realSubscribed = false;
    this.closing = false;
    this.closed = false;
    this.cleanupPromise = null;
  }

  on(type, filter, callback) {
    if (this.closed || this.closing) return this;
    if (
      this.subscribeCalled
      && (type === 'presence' || type === 'postgres_changes')
    ) {
      throw new Error(`cannot add \`${type}\` callbacks for ${this.topic} after \`subscribe()\`.`);
    }

    const binding = [type, filter, callback];
    this.bindings.push(binding);
    if (this.real) this.real.on(...binding);
    else this.pending.push({ kind: 'on', args: binding });
    return this;
  }

  subscribe(callback, timeout) {
    if (this.closed || this.closing) return this;
    if (this.subscribeCalled) return this;
    this.subscribeCalled = true;

    if (this.real) {
      this.realSubscribed = true;
      this.real.subscribe(callback, timeout);
    } else {
      this.pending.push({ kind: 'subscribe', args: [callback, timeout] });
      this._materialize().catch(() => {});
    }
    return this;
  }

  send(args, opts) {
    return this._queueAction('send', [args, opts]);
  }

  track(payload, opts) {
    return this._queueAction('track', [payload, opts]);
  }

  untrack(opts) {
    return this._queueAction('untrack', [opts]);
  }

  presenceState() {
    return this.real?.presenceState() ?? {};
  }

  unsubscribe(timeout) {
    return this._beginCleanup('unsubscribe', [timeout]);
  }

  _remove() {
    return this._beginCleanup('remove', []);
  }

  _queueAction(kind, args) {
    if (this.closed || this.closing) return Promise.reject(closedChannelError(this.topic));
    if (this.real) {
      try {
        return Promise.resolve(this.real[kind](...args));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    const result = new Promise((resolve, reject) => {
      this.pending.push({ kind, args, resolve, reject });
    });
    this._materialize().catch(() => {});
    return result;
  }

  _beginCleanup(kind, args) {
    if (this.closed) return Promise.resolve('ok');
    if (this.cleanupPromise) return this.cleanupPromise;

    this.closing = true;
    this.owner._forget(this);

    const materializationStarted = Boolean(this.real || this.realPromise);
    const hasTrigger = this.pending.some((operation) => operation.kind !== 'on');
    if (!materializationStarted && !hasTrigger) {
      this._finishCleanup();
      return Promise.resolve('ok');
    }

    if (this.real) {
      this.cleanupPromise = this._runCleanup(kind, args);
      return this.cleanupPromise;
    }

    this.cleanupPromise = new Promise((resolve, reject) => {
      this.pending.push({ kind, args, resolve, reject });
    });
    this._materialize().catch(() => {});
    return this.cleanupPromise;
  }

  _runCleanup(kind, args) {
    let result;
    try {
      result = kind === 'remove'
        ? this.owner._removeRealChannel(this.real)
        : this.real.unsubscribe(...args);
    } catch (error) {
      this._finishCleanup();
      return Promise.reject(error);
    }

    return Promise.resolve(result).then(
      (value) => {
        this._finishCleanup();
        return value;
      },
      (error) => {
        this._finishCleanup();
        throw error;
      },
    );
  }

  _finishCleanup() {
    this.owner._forget(this);
    this.pending = [];
    this.bindings = [];
    this.real = null;
    this.realPromise = null;
    this.realSubscribed = false;
    this.closing = false;
    this.closed = true;
  }

  _materialize() {
    if (this.real) return Promise.resolve(this.real);
    if (this.realPromise) return this.realPromise;
    if (this.closed) return Promise.reject(closedChannelError(this.topic));

    let materialization;
    materialization = this.owner._materialize()
      .then((client) => {
        const channel = client.channel(this.name, this.params);
        this.real = channel;
        this._flushPending(channel);
        return channel;
      })
      .catch((error) => {
        if (this.realPromise === materialization) this.realPromise = null;
        this.real = null;
        this.realSubscribed = false;
        this._failPendingMaterialization(error);
        throw error;
      });
    this.realPromise = materialization;
    return materialization;
  }

  _flushPending(channel) {
    const operations = this.pending;
    this.pending = [];

    for (const operation of operations) {
      const { kind, args } = operation;
      try {
        if (kind === 'on') {
          channel.on(...args);
        } else if (kind === 'subscribe') {
          this.realSubscribed = true;
          channel.subscribe(...args);
        } else if (kind === 'remove' || kind === 'unsubscribe') {
          const cleanup = this._runCleanup(kind, args);
          cleanup.then(operation.resolve, operation.reject);
        } else {
          Promise.resolve(channel[kind](...args)).then(operation.resolve, operation.reject);
        }
      } catch (error) {
        if (kind === 'subscribe') {
          this.subscribeCalled = false;
          this.realSubscribed = false;
          try { args[0]?.('CHANNEL_ERROR', normalizeError(error)); } catch { /* consumer callback */ }
        } else if (kind === 'remove' || kind === 'unsubscribe') {
          this._finishCleanup();
          operation.reject(error);
        } else if (operation.reject) {
          operation.reject(error);
        } else {
          throw error;
        }
      }
    }
  }

  _failPendingMaterialization(reason) {
    const error = normalizeError(reason);
    const operations = this.pending;
    this.pending = [];
    let cleanupQueued = false;

    for (const operation of operations) {
      if (operation.kind === 'subscribe') {
        try { operation.args[0]?.('CHANNEL_ERROR', error); } catch { /* consumer callback */ }
      } else if (operation.kind === 'remove' || operation.kind === 'unsubscribe') {
        cleanupQueued = true;
        operation.resolve('ok');
      } else if (operation.reject) {
        operation.reject(error);
      }
    }

    this.subscribeCalled = false;
    if (cleanupQueued || this.closing) {
      this._finishCleanup();
      return;
    }

    // Bindings have no external side effect and are safe to replay on an
    // explicit later retry. Sends, presence updates and cleanup are not replayed.
    this.pending = this.bindings.map((args) => ({ kind: 'on', args }));
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
      this.connectGeneration = 0;
      this.controlTail = Promise.resolve();
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

    removeAllChannels() {
      this.connectGeneration += 1;
      const removals = [...this.channels].map((channel) => channel._remove());
      return this._enqueueControl(async () => {
        const results = await Promise.all(removals);
        if (this.real) await this.real.disconnect();
        return results;
      });
    }

    setAuth(token = null) {
      this.authToken = token;
      this.authVersion += 1;
      return this.real ? this._applyLatestAuth() : Promise.resolve();
    }

    connect() {
      const generation = ++this.connectGeneration;
      return this._enqueueControl(async () => {
        const client = await this._materialize();
        if (generation !== this.connectGeneration) return 'ok';
        return client.connect();
      });
    }

    disconnect(code, reason) {
      this.connectGeneration += 1;
      return this._enqueueControl(async () => {
        const pending = this.realPromise;
        if (pending) {
          try { await pending; } catch { return 'ok'; }
        }
        return this.real ? this.real.disconnect(code, reason) : 'ok';
      });
    }

    _forget(channel) {
      const index = this.channels.indexOf(channel);
      if (index >= 0) this.channels.splice(index, 1);
    }

    _removeRealChannel(channel) {
      return this.real ? this.real.removeChannel(channel) : Promise.resolve('ok');
    }

    _enqueueControl(operation) {
      const result = this.controlTail.then(operation, operation);
      this.controlTail = result.catch(() => {});
      return result;
    }

    _materialize() {
      if (this.real) return Promise.resolve(this.real);
      if (this.realPromise) return this.realPromise;

      let materialization;
      materialization = Promise.resolve()
        .then(() => load())
        .then((module) => {
          const ActualRealtimeClient = module.RealtimeClient ?? module.default;
          if (typeof ActualRealtimeClient !== 'function') {
            throw new Error('RealtimeClient export unavailable');
          }
          this.real = new ActualRealtimeClient(this.endpoint, this.options);
          return this._applyLatestAuth().then(() => this.real);
        })
        .catch((error) => {
          if (this.realPromise === materialization) this.realPromise = null;
          this.real = null;
          this.appliedAuthVersion = 0;
          throw error;
        });
      this.realPromise = materialization;
      return materialization;
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
