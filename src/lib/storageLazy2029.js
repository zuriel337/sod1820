// 2029-only adapter for the exact Storage subset used by this browser SPA: `storage.from(bucket).upload(...)` and
// `storage.from(bucket).getPublicUrl(path)`.
//
// SupabaseClient constructs StorageClient eagerly, so every page carried @supabase/storage-js (and its iceberg dependency) although an
// anonymous reader never uploads. Same approach as the reviewed Realtime adapter (realtimeLazy2029.js): the single Supabase client keeps the
// same constructor arguments — the same URL, headers and the same authenticated fetch — and the real StorageClient is built from them on the
// first upload. getPublicUrl stays synchronous: it is a pure address, reproduced exactly from @supabase/storage-js for the option-free form
// the application uses; any option is refused loudly instead of building a different address. Shell budget, ZURIEL 16.11.2026.

export const LAZY_STORAGE_2029_CONTRACT = Object.freeze({
  runtime: "browser-vite-only",
  clientMethods: Object.freeze(["from"]),
  bucketMethods: Object.freeze(["upload", "getPublicUrl"]),
});

let storageModule = null;
const loadStorageModule = () => (storageModule ??= import("@supabase/storage-js/dist/index.mjs"));

// supabase-js re-exports this name; nothing in the application imports it. Real Storage failures come from the real client after it loads.
export class StorageApiError extends Error {
  constructor(message, status, statusCode) {
    super(message);
    this.name = "StorageApiError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

function unsupported(name) {
  const error = new Error(`The SOD1820 2029 lazy Storage adapter does not provide "${name}"; extend LAZY_STORAGE_2029_CONTRACT with its real behaviour first.`);
  error.code = "SOD_2029_STORAGE_UNSUPPORTED";
  return error;
}

export class StorageClient {
  constructor(url, headers = {}, fetch, opts) {
    this.url = url;
    this.headers = headers;
    this.fetch = fetch;
    this.opts = opts;
    this.real = null;
  }

  async materialize() {
    if (!this.real) {
      const { StorageClient: RealStorageClient } = await loadStorageModule();
      this.real ??= new RealStorageClient(this.url, this.headers, this.fetch, this.opts);
    }
    return this.real;
  }

  from(bucketId) {
    const client = this;
    const bucket = {
      // Exactly @supabase/storage-js 2.x StorageFileApi.getPublicUrl for a call without options: `${url}/object/public/${bucket}/${path}` with
      // leading slashes removed from the path, encodeURI over the whole address, no query string.
      getPublicUrl(path, options) {
        if (options != null) throw unsupported("getPublicUrl with options");
        const finalPath = `${bucketId}/${String(path).replace(/^\/+/, "")}`;
        return { data: { publicUrl: encodeURI(`${client.url}/object/public/${finalPath}`) } };
      },
      async upload(...args) {
        const real = await client.materialize();
        return real.from(bucketId).upload(...args);
      },
    };
    return new Proxy(bucket, {
      get(target, name) {
        if (name in target || typeof name === "symbol") return target[name];
        throw unsupported(`from().${String(name)}`);
      },
    });
  }
}
