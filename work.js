const ALLOWED_ORIGIN = 'https://tools.eu.org';
const CLIENT_CODE = 'Niuniu-Toolbox-2026';
const TTL_SEC = 172800; // 48h
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHORT_ID_SUFFIX_LEN = 4; // 62^4 ≈ 1477 万/月；1 万条/月 + 冲突重试足够

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-My-Custom-Client',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function monthBucket() {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return yy + mm;
}

function randomBase62(len) {
  const out = [];
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out.push(BASE62[bytes[i] % 62]);
  return out.join('');
}

async function generateUniqueId(env) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = monthBucket() + randomBase62(SHORT_ID_SUFFIX_LEN);
    const exists = await env.KEY_STORE.get(id, { type: 'arrayBuffer' })
      || await env.KEY_STORE.get(id);
    if (!exists) return id;
  }
  throw new Error('short id collision');
}

function decodeKeyInput(str) {
  if (!str || typeof str !== 'string') return null;
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  try {
    const bin = atob(b64);
    if (bin.length !== 32) return null;
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function encodeKeyBase64url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function normalizeStoredKey(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') return decodeKeyInput(value);
  return null;
}

function buildMeta(mode) {
  return { mode, c: Math.floor(Date.now() / 1000) };
}

async function readEntry(env, id) {
  let value = null;
  let metadata = null;

  const binResult = await env.KEY_STORE.getWithMetadata(id, { type: 'arrayBuffer' });
  if (binResult.value) {
    value = binResult.value;
    metadata = binResult.metadata;
  } else {
    const textResult = await env.KEY_STORE.getWithMetadata(id);
    value = textResult.value;
    metadata = textResult.metadata;
  }

  const keyBytes = normalizeStoredKey(value);
  if (!keyBytes || keyBytes.length !== 32) return null;
  return { keyBytes, metadata: metadata || {} };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders();

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // POST /api/store-key
    if (url.pathname === '/api/store-key' && request.method === 'POST') {
      try {
        if (request.headers.get('X-My-Custom-Client') !== CLIENT_CODE) {
          return json({ error: 'Access Denied: 非法调用来源' }, 403);
        }

        const { key, mode } = await request.json();
        if (!key || (mode !== 'once' && mode !== 'multi')) {
          return json({ error: 'Bad Request: 请求参数不合法' }, 400);
        }

        const keyBytes = decodeKeyInput(key);
        if (!keyBytes) {
          return json({ error: 'Bad Request: 密钥格式无效' }, 400);
        }

        const id = await generateUniqueId(env);
        await env.KEY_STORE.put(id, keyBytes.buffer, {
          expirationTtl: TTL_SEC,
          metadata: buildMeta(mode),
        });

        return json({ id });
      } catch {
        return json({ error: 'Internal Server Error: 密钥托管失败' }, 500);
      }
    }

    // GET /api/key-info — 仅返回模式与创建时间，不返回密钥、不触发阅后即焚
    if (url.pathname === '/api/key-info' && request.method === 'GET') {
      try {
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'Bad Request: 缺少密钥凭证' }, 400);

        const entry = await readEntry(env, id);
        if (!entry) return json({ error: 'Not Found: 密信不存在或已彻底焚毁' }, 404);

        const mode = entry.metadata.mode === 'once' ? 'once' : 'multi';
        const c = Number(entry.metadata.c) || 0;
        return json({ mode, c });
      } catch {
        return json({ error: 'Internal Server Error: 元数据读取失败' }, 500);
      }
    }

    // GET /api/get-key
    if (url.pathname === '/api/get-key' && request.method === 'GET') {
      try {
        const id = url.searchParams.get('id');
        if (!id) return json({ error: 'Bad Request: 缺少密钥凭证' }, 400);

        const entry = await readEntry(env, id);
        if (!entry) return json({ error: 'Not Found: 密信不存在或已彻底焚毁' }, 404);

        if (entry.metadata.mode === 'once') {
          await env.KEY_STORE.delete(id);
        }

        return json({ key: encodeKeyBase64url(entry.keyBytes) });
      } catch {
        return json({ error: 'Internal Server Error: 密钥读取失败' }, 500);
      }
    }

    return json({ error: 'Not Found: 接口不存在' }, 404);
  },
};
