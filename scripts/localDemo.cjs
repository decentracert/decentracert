const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const { createApp } = require('../server');

const port = Number(process.env.DEMO_PORT || 3001);
const rpcPort = Number(process.env.DEMO_RPC_PORT || 8545);
const base = 'http://localhost:' + port;
const rpcUrl = 'http://127.0.0.1:' + rpcPort;
const demoDir = path.join(__dirname, '..', '.demo');
let chain, server, stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  server?.closeAllConnections();
  server?.close();
  chain?.kill('SIGTERM');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function checkPort(value) {
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error('Demo ports must be between 1024 and 65535.');
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', err => reject(err.code === 'EADDRINUSE' ? new Error('Port ' + value + ' is in use. Set DEMO_PORT and DEMO_RPC_PORT to free ports.') : err));
    probe.listen(value, '127.0.0.1', () => probe.close(resolve));
  });
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Use Node 22 for this project.');
  if (port === rpcPort) throw new Error('Use different ports for the app and the local chain.');
  const extraWallet = process.env.DEMO_WALLET || '';
  if (extraWallet && (!ethers.utils.isAddress(extraWallet) || extraWallet === ethers.constants.AddressZero)) throw new Error('DEMO_WALLET must be a valid wallet address.');
  await Promise.all([checkPort(port), checkPort(rpcPort)]);
  if (stopping) return;
  chain = spawn(process.execPath, [require.resolve('hardhat/internal/cli/cli'), 'node', '--hostname', '127.0.0.1', '--port', String(rpcPort)], {
    cwd: path.join(__dirname, '..'), stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, PRIVATE_KEY: '' }
  });
  chain.on('error', err => { console.error(err.message); stop(1); });
  chain.on('exit', () => {
    if (!stopping) { console.error('The local chain stopped. Check that the RPC port is free.'); stop(1); }
  });
  let ready = false;
  for (let idx = 0; idx < 60 && !stopping; idx += 1) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
        signal: AbortSignal.timeout(500)
      });
      if ((await res.json()).result === '0x7a69') { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (stopping) return;
  if (!ready) throw new Error('The local chain did not start.');
  const provider = new ethers.providers.JsonRpcProvider({ url: rpcUrl, headers: { Connection: 'close' } });
  const accounts = await provider.listAccounts();
  const wallets = [...new Set([...accounts.slice(1, 4), ...(extraWallet ? [ethers.utils.getAddress(extraWallet)] : [])])];
  if (extraWallet) await provider.send('hardhat_setBalance', [extraWallet, ethers.utils.hexValue(ethers.utils.parseEther('10'))]);
  const leaves = wallets.map(wallet => ethers.utils.solidityKeccak256(['address'], [wallet]));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const artifact = require('../src/artifacts/contracts/certificate.sol/CertificateNFT.json');
  const metadataUri = base + '/demo/metadata.json';
  const contract = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, provider.getSigner(0)).deploy('Campus security lab', 'LAB', metadataUri, tree.getHexRoot());
  await contract.deployed();
  const proofs = Object.fromEntries(wallets.map((wallet, idx) => [wallet.toLowerCase(), tree.getHexProof(leaves[idx])]));
  await (await contract.connect(provider.getSigner(1)).claimCertificate(proofs[accounts[1].toLowerCase()])).wait();
  const claimFile = {
    version: 1, chainId: 31337, contractAddress: contract.address, issuer: accounts[0],
    eventName: 'Campus security lab', merkleRoot: tree.getHexRoot(), metadataUri, proofs
  };
  const metadata = {
    name: 'Campus security lab', description: 'A local example of an event participation certificate.',
    image: base + '/demo/certificate.svg',
    attributes: [{ trait_type: 'Organizer', value: 'Campus security club' }, { trait_type: 'Network', value: 'Local demo' }]
  };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#eaf0e7"/><rect x="36" y="36" width="1128" height="688" fill="none" stroke="#315c48" stroke-width="2"/><g fill="#315c48" font-family="sans-serif"><text x="90" y="150" font-size="20" letter-spacing="3">CERTIFICATE OF PARTICIPATION</text><path d="M90 195h100" stroke="#315c48" stroke-width="3"/><text x="90" y="310" font-size="60">Campus security lab</text><text x="90" y="380" font-size="24">A local example of an event certificate.</text><text x="90" y="570" font-size="26">Campus security club</text><text x="90" y="660" font-size="18">Recipient ownership is recorded in the event contract.</text></g></svg>';
  await fs.mkdir(demoDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(demoDir, 'claimFile.json'), JSON.stringify(claimFile, null, 2) + '\n'),
    fs.writeFile(path.join(demoDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n'),
    fs.writeFile(path.join(demoDir, 'certificate.svg'), svg + '\n')
  ]);
  if (stopping) return;
  const app = createApp({ rpcUrl, chainId: 31337, uploadKey: '', pinataJwt: '', trustProxy: false, demoDir, demo: { contractAddress: contract.address, wallet: accounts[1] } });
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const record = await (await fetch(base + '/api/certificates/' + contract.address + '/' + accounts[1])).json();
  if (!record.verified || record.legacy || record.metadataUri !== metadataUri) throw new Error('The demo certificate did not verify.');
  const link = base + '/verify?' + new URLSearchParams({ contract: contract.address, wallet: accounts[1], chain: '31337' });
  console.log('Demo ready: ' + base);
  console.log('Local RPC: ' + rpcUrl + ' (chain 31337, ETH)');
  console.log('Verified certificate: ' + link);
  console.log('Claim file: ' + base + '/demo/claimFile.json');
  console.log('One certificate claimed, ' + (wallets.length - 1) + ' wallets still eligible.');
  console.log('Set DEMO_WALLET to your wallet address to fund it with local test ETH on the next run.');
  if (process.argv.includes('--check')) {
    for (const file of ['metadata.json', 'claimFile.json', 'certificate.svg']) {
      if (!(await fetch(base + '/demo/' + file)).ok) throw new Error('Missing demo file: ' + file);
    }
    console.log('Local deployment, claim, public verification and demo files passed.');
    stop();
  }
}

main().catch(err => {
  if (!stopping) { console.error(err.message); stop(1); }
});
