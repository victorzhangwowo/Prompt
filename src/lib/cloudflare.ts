import { getRequestContext } from '@cloudflare/next-on-pages';

export interface KVNamespaceLike {
  get(key: string, type?: 'text'): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpMetadata?: {
    contentType?: string;
  };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2BucketLike {
  get(
    key: string,
    options?: { range?: { offset: number; length: number } }
  ): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

// Global in-memory fallback for plain `next dev` without Cloudflare bindings
const globalForFallback = globalThis as unknown as {
  __mypromptMemoryKv?: Map<string, string>;
  __mypromptMemoryR2?: Map<string, { data: Uint8Array; contentType: string }>;
};

function getMemoryKv(): KVNamespaceLike {
  if (!globalForFallback.__mypromptMemoryKv) {
    globalForFallback.__mypromptMemoryKv = new Map();
  }
  const store = globalForFallback.__mypromptMemoryKv;
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list(options?: { prefix?: string }) {
      const prefix = options?.prefix || '';
      const keys = Array.from(store.keys())
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

function getMemoryR2(): R2BucketLike {
  if (!globalForFallback.__mypromptMemoryR2) {
    globalForFallback.__mypromptMemoryR2 = new Map();
  }
  const store = globalForFallback.__mypromptMemoryR2;
  return {
    async get(key: string, options?: { range?: { offset: number; length: number } }) {
      const item = store.get(key);
      if (!item) return null;
      const slice = options?.range
        ? item.data.slice(
            options.range.offset,
            options.range.offset + options.range.length
          )
        : item.data;

      return {
        size: item.data.byteLength,
        httpMetadata: { contentType: item.contentType },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(slice);
            controller.close();
          },
        }),
        async arrayBuffer() {
          const copy = new Uint8Array(slice.byteLength);
          copy.set(slice);
          return copy.buffer;
        },
      };
    },
    async put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream | string, options?: { httpMetadata?: { contentType?: string } }) {
      let bytes: Uint8Array;
      if (value instanceof Uint8Array) {
        bytes = value;
      } else if (value instanceof ArrayBuffer) {
        bytes = new Uint8Array(value);
      } else if (typeof value === 'string') {
        bytes = new TextEncoder().encode(value);
      } else {
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
          total += chunk.byteLength;
        }
        bytes = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.byteLength;
        }
      }
      store.set(key, {
        data: bytes,
        contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
      });
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

export function getCloudflareBindings(): {
  kv: KVNamespaceLike;
  r2: R2BucketLike;
  isCloudflare: boolean;
} {
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.PROMPTS_KV || env?.MEDIA_BUCKET) {
      return {
        kv: (env.PROMPTS_KV as KVNamespaceLike) || getMemoryKv(),
        r2: (env.MEDIA_BUCKET as R2BucketLike) || getMemoryR2(),
        isCloudflare: true,
      };
    }
  } catch {
    // Not running inside Cloudflare Pages / Wrangler context
  }

  return {
    kv: getMemoryKv(),
    r2: getMemoryR2(),
    isCloudflare: Boolean(process.env.CF_PAGES),
  };
}
