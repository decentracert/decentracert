const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ethers } = require('ethers');
const { createApp } = require('../server');

const uploadKey = 'local-test-upload-key-1234567890';
const cid = 'QmYwAPJzv5CZsnAzt8auVTL7fuuxoqGVV86N2azYzj5bWo';
const uri = 'ipfs://' + cid;
const addr = '0x0000000000000000000000000000000000000001';
const wallet = '0x0000000000000000000000000000000000000002';
const issuer = '0x0000000000000000000000000000000000000003';
const iface = new ethers.utils.Interface([
  'function name() view returns (string)', 'function symbol() view returns (string)',
  'function owner() view returns (address)', 'function merkleRoot() view returns (bytes32)',
  'function hasClaimed(address) view returns (bool)', 'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256) view returns (address)', 'function contractVersion() view returns (uint256)',
  'function metadataUri() view returns (string)',
  'function getSoulboundCertificateDetails(address) view returns (bool, uint256, string)'
]);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const state = { wrongOwner: false, claimed: true, chainId: '0x7a69', pinataFails: false, uploaded: [] };
const servers = [];
let base, upstream, buildDir;
const metadata = { name: 'Workshop', description: 'Attendance certificate', image: uri, attributes: [{ trait_type: 'Event date', value: '2026-10-02' }] };

async function listen(app) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return 'http://127.0.0.1:' + server.address().port;
}
const jsonOptions = (body, key = uploadKey) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Key': key }, body: JSON.stringify(body) });
function fileOptions(data, type = 'image/png', extra) {
  const body = new FormData();
  body.append('file', new Blob([data], { type }), 'upload.png');
  if (extra !== undefined) body.append('metadata', extra);
  return { method: 'POST', headers: { 'X-Upload-Key': uploadKey }, body };
}

before(async () => {
  buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'decentracert-api-'));
  fs.writeFileSync(path.join(buildDir, 'index.html'), '<h1>DecentraCert</h1>');
  upstream = await listen(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    res.setHeader('Content-Type', 'application/json');
    if (req.url.startsWith('/rpc')) {
      const msg = JSON.parse(body);
      let result;
      if (msg.method === 'eth_chainId') result = state.chainId;
      else if (msg.method === 'eth_getCode') result = msg.params[0].toLowerCase() === addr.toLowerCase() ? '0x6000' : '0x';
      else if (msg.method === 'eth_call') {
        const call = iface.parseTransaction({ data: msg.params[0].data });
        const values = {
          name: ['Workshop'], symbol: ['WS'], owner: [issuer], merkleRoot: [ethers.utils.id('participants')],
          hasClaimed: [state.claimed], totalSupply: [1], ownerOf: [state.wrongOwner ? issuer : wallet],
          contractVersion: [2], metadataUri: [uri], getSoulboundCertificateDetails: [state.claimed, 1, uri]
        };
        result = iface.encodeFunctionResult(call.name, values[call.name]);
      } else throw new Error('Unexpected RPC method ' + msg.method);
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
      return;
    }
    if (state.pinataFails) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'private upstream detail' }));
      return;
    }
    state.uploaded.push({ url: req.url, body, authorization: req.headers.authorization });
    res.end(JSON.stringify({ IpfsHash: cid }));
  });
  base = await listen(createApp({ rpcUrl: upstream + '/rpc?key=private-rpc-key', chainId: 31337, uploadKey, pinataJwt: 'private-pinata-key', pinataUrl: upstream + '/', buildDir, uploadLimit: 100 }));
});

after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  fs.rmSync(buildDir, { recursive: true, force: true });
});

test('returns config without RPC or upload credentials', async () => {
  const res = await fetch(base + '/api/config');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { chainId: 31337, networkName: 'Local Hardhat', uploadsEnabled: true });
  const removed = await fetch(base + '/api/network/provider', jsonOptions({ network: 'sepolia' }));
  assert.equal(removed.status, 404);
  const text = await removed.text();
  assert(!text.includes('private-rpc-key'));
  assert.match(removed.headers.get('content-type'), /application\/json/);
});

test('requires an upload key before accepting a file', async () => {
  const count = state.uploaded.length;
  const res = await fetch(base + '/api/upload-metadata', jsonOptions(metadata, 'wrong'));
  assert.equal(res.status, 401);
  assert.equal(state.uploaded.length, count);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

test('disables uploads when the server is not configured', async () => {
  const url = await listen(createApp({ buildDir, uploadKey: '', pinataJwt: '' }));
  const res = await fetch(url + '/api/upload-metadata', jsonOptions(metadata));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.includes('not configured'), true);
});

test('accepts an image and sends a new multipart body to the pinning service', async () => {
  const res = await fetch(base + '/api/upload-ipfs', fileOptions(png));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ipfsHash: cid, uri });
  const uploaded = state.uploaded.at(-1);
  assert.equal(uploaded.url, '/pinFileToIPFS');
  assert(uploaded.body.includes('filename="certificate.png"'));
  assert.equal(uploaded.authorization, 'Bearer private-pinata-key');
});

test('rejects forged MIME types and malformed image metadata', async () => {
  for (const options of [fileOptions(Buffer.from('<script>bad</script>')), fileOptions(png, 'image/jpeg'), fileOptions(png, 'image/png', '{bad')]) {
    const res = await fetch(base + '/api/upload-ipfs', options);
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type'), /application\/json/);
  }
});

test('returns JSON for missing and oversized files', async () => {
  const missing = await fetch(base + '/api/upload-ipfs', { method: 'POST', headers: { 'X-Upload-Key': uploadKey } });
  assert.equal(missing.status, 400);
  const oversized = await fetch(base + '/api/upload-ipfs', fileOptions(Buffer.alloc(5 * 1024 * 1024 + 1)));
  assert.equal(oversized.status, 413);
  assert.match(oversized.headers.get('content-type'), /application\/json/);
  assert(!JSON.stringify(await oversized.json()).includes('stack'));
});

test('pins validated metadata with a content-addressed image', async () => {
  const res = await fetch(base + '/api/upload-metadata', jsonOptions(metadata));
  assert.equal(res.status, 200);
  const uploaded = JSON.parse(state.uploaded.at(-1).body);
  assert.deepEqual(uploaded.pinataContent, metadata);
});

test('rejects unsafe metadata, invalid JSON and large bodies', async () => {
  for (const body of [[], { ...metadata, image: 'javascript:alert(1)' }, { ...metadata, image: 'https://example.com/image.png' }, { ...metadata, name: {} }, { ...metadata, attributes: [{ trait_type: 'Date', value: {} }] }, { ...metadata, extra: true }]) {
    const res = await fetch(base + '/api/upload-metadata', jsonOptions(body));
    assert.equal(res.status, 400);
  }
  const invalid = await fetch(base + '/api/upload-metadata', { ...jsonOptions({}), body: '{bad' });
  assert.equal(invalid.status, 400);
  const large = await fetch(base + '/api/upload-metadata', jsonOptions({ name: 'x'.repeat(40000) }));
  assert.equal(large.status, 413);
});

test('does not expose upstream response details when pinning fails', async () => {
  state.pinataFails = true;
  try {
    const res = await fetch(base + '/api/upload-metadata', jsonOptions(metadata));
    assert.equal(res.status, 502);
    assert(!(await res.text()).includes('private'));
  } finally { state.pinataFails = false; }
});

test('checks ownerOf as well as the claimed flag', async () => {
  const res = await fetch(base + '/api/certificates/' + addr + '/' + wallet);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.verified, true);
  assert.equal(data.issuer, issuer);
  assert.equal(data.metadataUri, uri);
  assert.equal(data.legacy, false);
  state.wrongOwner = true;
  try {
    const mismatch = await fetch(base + '/api/certificates/' + addr + '/' + wallet);
    assert.equal((await mismatch.json()).verified, false);
  } finally { state.wrongOwner = false; }
});

test('reports unclaimed wallets without inventing a token', async () => {
  state.claimed = false;
  try {
    const res = await fetch(base + '/api/certificates/' + addr + '/' + wallet);
    const data = await res.json();
    assert.equal(data.verified, false);
    assert.equal(data.tokenId, '');
  } finally { state.claimed = true; }
});

test('rejects invalid addresses and missing contracts', async () => {
  assert.equal((await fetch(base + '/api/certificates/invalid/' + wallet)).status, 400);
  assert.equal((await fetch(base + '/api/certificates/' + addr + '/' + ethers.constants.AddressZero)).status, 400);
  assert.equal((await fetch(base + '/api/certificates/' + issuer + '/' + wallet)).status, 404);
});

test('rejects a misconfigured RPC network', async () => {
  state.chainId = '0x1';
  try {
    const res = await fetch(base + '/api/certificates/' + addr + '/' + wallet);
    assert.equal(res.status, 503);
    assert(!JSON.stringify(await res.json()).includes('private-rpc-key'));
  } finally { state.chainId = '0x7a69'; }
});

test('limits requests and ignores spoofed forwarding headers by default', async () => {
  const url = await listen(createApp({ buildDir, readLimit: 2 }));
  assert.equal((await fetch(url + '/api/health')).status, 200);
  assert.equal((await fetch(url + '/api/health', { headers: { 'X-Forwarded-For': '1.2.3.4' } })).status, 200);
  const res = await fetch(url + '/api/health', { headers: { 'X-Forwarded-For': '2.3.4.5' } });
  assert.equal(res.status, 429);
  assert(Number(res.headers.get('retry-after')) > 0);
});

test('keeps missing API routes and assets out of the SPA fallback', async () => {
  assert.equal((await fetch(base + '/api/missing')).status, 404);
  assert.equal((await fetch(base + '/missing.js')).status, 404);
  assert.equal((await fetch(base + '/student')).status, 200);
});
