import { ethers } from 'ethers';
import { checkClaimFile, maxClaimFileSize, parseClaimFile } from './claimFileUtils';
import { generateAllMerkleProofs } from './merkleUtils';

const wallets = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'];
const addr = '0x3333333333333333333333333333333333333333';
const issuer = ethers.utils.getAddress('0x' + 'ab'.repeat(20));
const uri = 'ipfs://QmYwAPJzv5CZsnAzt8auVTL7fuuxoqGVV86N2azYzj5bWo';
const fileFor = list => ({ version: 1, chainId: 31337, contractAddress: addr, issuer, eventName: 'Workshop', metadataUri: uri, ...generateAllMerkleProofs(list) });
const eventFor = data => ({ owner: data.issuer, merkleRoot: data.merkleRoot, metadataUri: data.metadataUri, eventName: data.eventName });
const parse = data => parseClaimFile(JSON.stringify(data));

test('selects the current wallet proof and accepts a single participant', () => {
  const single = parse(fileFor([wallets[0]]));
  expect(checkClaimFile(single, wallets[0], addr, 31337, eventFor(single))).toEqual([]);
  const data = parse(fileFor(wallets));
  for (const wallet of wallets) expect(checkClaimFile(data, wallet, addr, 31337, eventFor(data))).toEqual(data.proofs[wallet]);
  expect(() => checkClaimFile(data, issuer, addr, 31337, eventFor(data))).toThrow('not in the claim file');
});

test('rejects altered network, contract, issuer, root and metadata', () => {
  const data = parse(fileFor(wallets));
  const event = eventFor(data);
  expect(() => checkClaimFile(data, wallets[0], addr, 11155111, event)).toThrow('network');
  expect(() => checkClaimFile(data, wallets[0], issuer, 31337, event)).toThrow('contract');
  for (const changed of [{ owner: wallets[0] }, { merkleRoot: ethers.constants.HashZero }, { metadataUri: uri + '/other' }, { eventName: 'Other event' }]) {
    expect(() => checkClaimFile(data, wallets[0], addr, 31337, { ...event, ...changed })).toThrow();
  }
  data.proofs[wallets[0]] = data.proofs[wallets[1]];
  expect(() => checkClaimFile(data, wallets[0], addr, 31337, event)).toThrow('proof');
});

test('rejects oversized, malformed and unsupported files', () => {
  expect(() => parseClaimFile('x'.repeat(maxClaimFileSize + 1))).toThrow('8 MB');
  expect(() => parseClaimFile('{bad')).toThrow('JSON');
  for (const changed of [{ version: 2 }, { chainId: 1 }, { issuer: ethers.constants.AddressZero }, { proofs: [] }, { proofs: { bad: [] } }, { proofs: { [wallets[0]]: ['bad'] } }, { metadataUri: 'javascript:alert(1)' }]) {
    expect(() => parse({ ...fileFor(wallets), ...changed })).toThrow();
  }
});

test('normalizes wallet keys and rejects case-variant duplicates', () => {
  const data = fileFor([issuer]);
  data.proofs = { [issuer]: [] };
  expect(parse(data).proofs[issuer.toLowerCase()]).toEqual([]);
  data.proofs[issuer.toLowerCase()] = [];
  expect(() => parse(data)).toThrow('duplicate');
});
