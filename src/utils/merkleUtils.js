import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

export const normalizeAddresses = addresses => {
  if (!Array.isArray(addresses) || !addresses.length || addresses.length > 5000) {
    throw new Error('Use between 1 and 5000 participant addresses.');
  }
  const list = addresses.map(addr => {
    if (typeof addr !== 'string' || !ethers.utils.isAddress(addr.trim())) {
      throw new Error('Each participant needs a valid wallet address.');
    }
    const value = ethers.utils.getAddress(addr.trim());
    if (value === ethers.constants.AddressZero) throw new Error('The zero address cannot claim a certificate.');
    return value;
  });
  if (new Set(list).size !== list.length) throw new Error('Remove duplicate participant addresses.');
  return list;
};

export const parseProof = value => {
  let proof;
  try {
    proof = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new Error('Enter a JSON array of proof hashes. Use [] for a single participant.');
  }
  if (!Array.isArray(proof) || proof.length > 32 || proof.some(hash => typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash))) {
    throw new Error('A proof must be an array of bytes32 hashes.');
  }
  return proof;
};

const leafFor = addr => ethers.utils.solidityKeccak256(['address'], [addr]);

export const generateMerkleTree = addresses => new MerkleTree(
  normalizeAddresses(addresses).map(leafFor), keccak256, { sortPairs: true }
);

export const generateMerkleRoot = addresses => generateMerkleTree(addresses).getHexRoot();

export const generateMerkleProof = (addresses, addr) => generateMerkleTree(addresses).getHexProof(leafFor(addr));

export const verifyMerkleProof = (addr, proof, root) => {
  if (!ethers.utils.isAddress(addr) || !/^0x[0-9a-f]{64}$/i.test(root)) return false;
  return MerkleTree.verify(parseProof(proof), leafFor(addr), root, keccak256, { sortPairs: true });
};

export const generateAllMerkleProofs = addresses => {
  const list = normalizeAddresses(addresses);
  const tree = generateMerkleTree(list);
  const proofs = Object.fromEntries(list.map(addr => [addr.toLowerCase(), tree.getHexProof(leafFor(addr))]));
  return { merkleRoot: tree.getHexRoot(), proofs, addresses: list };
};

export const isAddressInMerkleTree = (addr, proofs, root) => {
  const proof = proofs[addr.toLowerCase()];
  return Boolean(proof && verifyMerkleProof(addr, proof, root));
};
