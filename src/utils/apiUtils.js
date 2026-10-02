import { ethers } from 'ethers';

export async function apiJson(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'The server could not complete this request.');
  return data;
}

export const validAddress = value => ethers.utils.isAddress(value) && value !== ethers.constants.AddressZero;

export function publicUrl(uri) {
  if (typeof uri !== 'string' || uri.length > 1024) return '';
  if (/^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})(\/[a-zA-Z0-9._/-]+)?$/.test(uri)) {
    return 'https://ipfs.io/ipfs/' + uri.slice(7);
  }
  try {
    const url = new URL(uri);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:') return url.href;
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (local && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return url.href;
  } catch {}
  return '';
}

export function cleanMetadata(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The metadata is not a JSON object.');
  const name = typeof data.name === 'string' ? data.name.slice(0, 120) : '';
  const description = typeof data.description === 'string' ? data.description.slice(0, 1200) : '';
  const image = publicUrl(data.image);
  const attributes = Array.isArray(data.attributes) ? data.attributes.filter(attr =>
    attr && typeof attr.trait_type === 'string' && ['string', 'number'].includes(typeof attr.value)
  ).slice(0, 12).map(attr => ({ name: attr.trait_type.slice(0, 50), value: String(attr.value).slice(0, 200) })) : [];
  return { name, description, image, attributes };
}

export async function readMetadata(uri, signal) {
  const url = publicUrl(uri);
  if (!url) throw new Error('This metadata URI cannot be previewed.');
  const res = await fetch(url, { signal, referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('The metadata could not be loaded. The on-chain result is still shown below.');
  const reader = res.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) throw new Error('The metadata is too large to preview.');
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    return cleanMetadata(JSON.parse(new TextDecoder().decode(body)));
  } finally {
    await reader.cancel();
  }
}

export const verificationUrl = (addr, wallet, chainId) => '/verify?' + new URLSearchParams({ contract: addr, wallet, chain: String(chainId) });
