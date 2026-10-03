const express = require('express');
const multer = require('multer');
const { ethers } = require('ethers');
const { createHash, timingSafeEqual } = require('node:crypto');
const path = require('node:path');
require('dotenv').config();

const readAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function owner() view returns (address)',
  'function merkleRoot() view returns (bytes32)',
  'function hasClaimed(address) view returns (bool)',
  'function totalSupply() view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
  'function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string uri)',
  'function contractVersion() view returns (uint256)',
  'function metadataUri() view returns (string)'
];
const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/;
const ipfsPattern = /^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})(\/[a-zA-Z0-9._/-]+)?$/;

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function limited(rate, windowMs = 60000) {
  let resetAt = 0;
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (now >= resetAt) {
      clients.clear();
      resetAt = now + windowMs;
    }
    const count = clients.get(req.ip) || 0;
    if (count >= rate || (!count && clients.size >= 5000)) {
      res.set('Retry-After', String(Math.ceil((resetAt - now) / 1000)));
      return next(fail(429, 'Too many requests. Try again in a minute.'));
    }
    clients.set(req.ip, count + 1);
    next();
  };
}

function cleanText(value, max, label, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw fail(400, 'Invalid ' + label + '.');
  return value.trim();
}

function validateMetadata(body) {
  if (!body || Array.isArray(body) || Object.keys(body).some(key => !['name', 'description', 'image', 'attributes'].includes(key))) {
    throw fail(400, 'Use name, description, image and attributes for metadata.');
  }
  const name = cleanText(body.name, 120, 'certificate name');
  const description = cleanText(body.description, 1200, 'description', true);
  if (typeof body.image !== 'string' || !ipfsPattern.test(body.image)) throw fail(400, 'The image must use an IPFS URI.');
  if (body.attributes !== undefined && (!Array.isArray(body.attributes) || body.attributes.length > 12)) throw fail(400, 'Use up to 12 attributes.');
  const attributes = (body.attributes || []).map(attr => {
    if (!attr || Array.isArray(attr) || Object.keys(attr).some(key => !['trait_type', 'value'].includes(key))) throw fail(400, 'Invalid attribute.');
    const value = typeof attr.value === 'number' && Number.isFinite(attr.value) ? attr.value : cleanText(attr.value, 200, 'attribute value');
    return { trait_type: cleanText(attr.trait_type, 50, 'attribute name'), value };
  });
  return { name, description, image: body.image, attributes };
}

function imageType(file) {
  const data = file.buffer;
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && data.toString('ascii', 12, 16) === 'IHDR') return 'image/png';
  if (data.length >= 4 && data[0] === 255 && data[1] === 216 && data[data.length - 2] === 255 && data[data.length - 1] === 217) return 'image/jpeg';
  if (data.length >= 16 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return '';
}

function createApp(options = {}) {
  const cfg = {
    rpcUrl: process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_API_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: Number(process.env.CHAIN_ID || 11155111),
    uploadKey: process.env.UPLOAD_KEY || '',
    pinataJwt: process.env.PINATA_JWT || '',
    pinataUrl: 'https://api.pinata.cloud/pinning/',
    buildDir: path.join(__dirname, 'build'),
    trustProxy: process.env.RENDER === 'true' ? 1 : false,
    readLimit: 120,
    uploadLimit: 10,
    ...options
  };
  if (![11155111, 31337].includes(cfg.chainId)) throw new Error('CHAIN_ID must be 11155111 or 31337.');
  const app = express();
  const provider = new ethers.providers.StaticJsonRpcProvider({ url: cfg.rpcUrl, timeout: 12000 }, cfg.chainId);
  const uploadsEnabled = cfg.uploadKey.length >= 24 && Boolean(cfg.pinataJwt);
  const keyHash = createHash('sha256').update(cfg.uploadKey).digest();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 1024, parts: 2 },
    fileFilter(req, file, done) {
      done(['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype) ? null : fail(400, 'Use a PNG, JPEG or WebP image.'), true);
    }
  });
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

  app.disable('x-powered-by');
  app.set('trust proxy', cfg.trustProxy);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use('/api', limited(cfg.readLimit), (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '32kb' }));

  const authorize = (req, res, next) => {
    if (!uploadsEnabled) return next(fail(503, 'Uploads are not configured on this server. You can use an existing IPFS metadata URI.'));
    const supplied = req.get('X-Upload-Key') || '';
    if (supplied.length > 256 || !timingSafeEqual(createHash('sha256').update(supplied).digest(), keyHash)) {
      return next(fail(401, 'The organizer upload key is missing or incorrect.'));
    }
    next();
  };
  app.use(['/api/upload-ipfs', '/api/upload-metadata'], limited(cfg.uploadLimit), authorize);

  async function pin(endpoint, body, json = false) {
    try {
      const res = await fetch(cfg.pinataUrl + endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + cfg.pinataJwt, ...(json ? { 'Content-Type': 'application/json' } : {}) },
        body: json ? JSON.stringify(body) : body,
        signal: AbortSignal.timeout(20000),
        redirect: 'error'
      });
      if (!res.ok) throw new Error('upload rejected');
      const data = await res.json();
      if (!cidPattern.test(data.IpfsHash)) throw new Error('invalid upload response');
      return { ipfsHash: data.IpfsHash, uri: 'ipfs://' + data.IpfsHash };
    } catch {
      throw fail(502, 'The upload service is unavailable. Try again, or check the server Pinata credentials.');
    }
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/config', (req, res) => res.json({
    chainId: cfg.chainId,
    networkName: cfg.chainId === 31337 ? 'Local Hardhat' : 'Sepolia',
    uploadsEnabled
  }));

  app.post('/api/upload-ipfs', upload.single('file'), wrap(async (req, res) => {
    if (!req.file) throw fail(400, 'Select an image to upload.');
    if (!imageType(req.file) || imageType(req.file) !== req.file.mimetype) throw fail(400, 'The file contents do not match the image type.');
    let name = 'certificate-image';
    if (req.body.metadata) {
      let data;
      try { data = JSON.parse(req.body.metadata); } catch { throw fail(400, 'Invalid image metadata JSON.'); }
      if (!data || Array.isArray(data)) throw fail(400, 'Invalid image metadata.');
      name = cleanText(data.name, 120, 'image name');
    }
    const form = new FormData();
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[req.file.mimetype];
    form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), 'certificate.' + ext);
    form.append('pinataMetadata', JSON.stringify({ name }));
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
    res.json(await pin('pinFileToIPFS', form));
  }));

  app.post('/api/upload-metadata', wrap(async (req, res) => {
    const metadata = validateMetadata(req.body);
    res.json(await pin('pinJSONToIPFS', { pinataContent: metadata, pinataMetadata: { name: metadata.name }, pinataOptions: { cidVersion: 1 } }, true));
  }));

  app.get('/api/certificates/:addr/:wallet', wrap(async (req, res) => {
    const { addr, wallet } = req.params;
    if (![addr, wallet].every(value => ethers.utils.isAddress(value) && value !== ethers.constants.AddressZero)) throw fail(400, 'Enter valid contract and wallet addresses.');
    if (Number(await provider.send('eth_chainId', [])) !== cfg.chainId) throw fail(503, 'The server RPC is connected to the wrong network.');
    if (await provider.getCode(addr) === '0x') throw fail(404, 'No contract found at this address on the selected network.');
    const contract = new ethers.Contract(addr, readAbi, provider);
    const read = (method, ...args) => contract[method](...args, { gasLimit: 200000 });
    const [name, symbol, issuer, merkleRoot, hasClaimed, supply] = await Promise.all([
      read('name'), read('symbol'), read('owner'), read('merkleRoot'), read('hasClaimed', wallet), read('totalSupply')
    ]);
    let version = 0;
    try { version = (await read('contractVersion')).toNumber(); } catch {}
    const legacy = version !== 2;
    let metadataUri = legacy ? '' : await read('metadataUri');
    let tokenId = '', tokenOwner = '', verified = false;
    if (hasClaimed) {
      const details = await read('getSoulboundCertificateDetails', wallet);
      if (details.exists && !details.tokenId.isZero()) {
        tokenId = details.tokenId.toString();
        tokenOwner = await read('ownerOf', tokenId);
        verified = tokenOwner.toLowerCase() === wallet.toLowerCase() && (legacy || details.uri === metadataUri);
        metadataUri = details.uri;
      }
    }
    res.json({
      contractAddress: ethers.utils.getAddress(addr), wallet: ethers.utils.getAddress(wallet),
      chainId: cfg.chainId, name: name.slice(0, 120), symbol: symbol.slice(0, 12), issuer,
      merkleRoot, totalSupply: supply.toString(), legacy, hasClaimed, verified,
      tokenId, tokenOwner, metadataUri: metadataUri.slice(0, 512), checkedAt: new Date().toISOString()
    });
  }));

  app.use('/api', (req, res, next) => next(fail(404, 'API route not found.')));
  app.use(express.static(cfg.buildDir));
  app.get('*', (req, res, next) => {
    if (path.extname(req.path) || !req.accepts('html')) return next();
    res.sendFile(path.join(cfg.buildDir, 'index.html'), err => { if (err) next(fail(404, 'Build the client with npm run build first.')); });
  });
  app.use((req, res, next) => next(fail(404, 'Page not found.')));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE' ? 413
      : err instanceof multer.MulterError || err.type === 'entity.parse.failed' ? 400
      : err.code === 'CALL_EXCEPTION' ? 422 : err.status || 503;
    const message = err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE' ? 'The upload is too large. Images can be at most 5 MB.'
      : err instanceof multer.MulterError ? 'Invalid multipart upload. Send one image file.'
      : err.type === 'entity.parse.failed' ? 'Invalid JSON body.'
      : err.code === 'CALL_EXCEPTION' ? 'This is not a supported certificate contract.'
      : err.status ? err.message : 'Could not read the blockchain. Try again shortly.';
    res.status(status).json({ error: message });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  createApp().listen(port, process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'), () => console.log('DecentraCert listening on port ' + port));
}

module.exports = { createApp };
