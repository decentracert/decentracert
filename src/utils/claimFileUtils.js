import { ethers } from 'ethers';
import { publicUrl, validAddress } from './apiUtils';
import { normalizeAddresses, parseProof, verifyMerkleProof } from './merkleUtils';

export const maxClaimFileSize = 8 * 1024 * 1024;

export function parseClaimFile(text) {
  if (typeof text !== 'string' || text.length > maxClaimFileSize) throw new Error('Use a claim file under 8 MB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!data || data.version !== 1) throw new Error('This claim file version is not supported.');
  if (![31337, 11155111].includes(data.chainId)) throw new Error('The claim file uses an unsupported network.');
  if (!validAddress(data.contractAddress) || !validAddress(data.issuer)) throw new Error('The claim file has an invalid contract or issuer address.');
  if (typeof data.eventName !== 'string' || !data.eventName.trim() || data.eventName.length > 120) throw new Error('The claim file has an invalid event name.');
  if (typeof data.merkleRoot !== 'string' || !/^0x[0-9a-f]{64}$/i.test(data.merkleRoot) || !publicUrl(data.metadataUri)) throw new Error('The claim file has an invalid root or metadata URI.');
  if (!data.proofs || typeof data.proofs !== 'object' || Array.isArray(data.proofs)) throw new Error('The claim file needs a wallet-to-proof list.');
  const keys = Object.keys(data.proofs);
  const addresses = normalizeAddresses(keys);
  const proofs = Object.fromEntries(addresses.map((addr, idx) => [addr.toLowerCase(), parseProof(data.proofs[keys[idx]])]));
  return {
    version: 1, chainId: data.chainId, contractAddress: ethers.utils.getAddress(data.contractAddress),
    issuer: ethers.utils.getAddress(data.issuer), eventName: data.eventName,
    merkleRoot: data.merkleRoot.toLowerCase(), metadataUri: data.metadataUri, proofs
  };
}

export function checkClaimFile(data, wallet, addr, chainId, event) {
  if (data.chainId !== chainId) throw new Error('The claim file is for a different network.');
  if (data.contractAddress.toLowerCase() !== addr.toLowerCase()) throw new Error('The contract does not match the claim file.');
  if (data.issuer.toLowerCase() !== event.owner.toLowerCase()) throw new Error('The issuer does not match the contract.');
  if (data.merkleRoot !== event.merkleRoot.toLowerCase()) throw new Error('The participant root does not match the contract.');
  if (data.metadataUri !== event.metadataUri || data.eventName !== event.eventName) throw new Error('The event details do not match the contract.');
  const proof = data.proofs[wallet.toLowerCase()];
  if (!proof) throw new Error('This wallet is not in the claim file.');
  if (!verifyMerkleProof(wallet, proof, event.merkleRoot)) throw new Error('This proof does not match your wallet and contract.');
  return proof;
}
