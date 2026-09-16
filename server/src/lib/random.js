// Crypto-random token/ID generation (WebCrypto, runtime-agnostic).

export function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out;
}

export function slug(kind = 'id') {
  const t = Date.now().toString(36);
  const r = randomHex(4);
  return `${kind}_${t}${r}`;
}
