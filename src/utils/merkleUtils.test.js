import { ethers } from 'ethers';
import { generateAllMerkleProofs, normalizeAddresses, parseProof, verifyMerkleProof } from './merkleUtils';

const addresses = [1, 2, 3, 4].map(idx => ethers.utils.getAddress(ethers.utils.hexZeroPad(ethers.utils.hexlify(idx), 20)));

test.each([1, 2, 3, 4])('checks proofs for %i participants', count => {
  const list = addresses.slice(0, count);
  const { merkleRoot, proofs } = generateAllMerkleProofs(list);
  for (const addr of list) expect(verifyMerkleProof(addr, proofs[addr.toLowerCase()], merkleRoot)).toBe(true);
  expect(verifyMerkleProof(ethers.constants.AddressZero, proofs[list[0].toLowerCase()], merkleRoot)).toBe(false);
  if (count === 1) expect(proofs[list[0].toLowerCase()]).toEqual([]);
});

test('rejects malformed, duplicate and zero addresses', () => {
  for (const list of [[], ['wrong'], [ethers.constants.AddressZero], [addresses[0], addresses[0]]]) {
    expect(() => normalizeAddresses(list)).toThrow();
  }
});

test('rejects non-array and oversized proofs before calling the wallet', () => {
  for (const value of ['null', '{}', 'no', '[123]', '["0x12"]', Array(33).fill(ethers.constants.HashZero)]) {
    expect(() => parseProof(value)).toThrow();
  }
  expect(parseProof('[]')).toEqual([]);
});
