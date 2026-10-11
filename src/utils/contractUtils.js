import { ethers } from 'ethers';
import certificate from '../artifacts/contracts/certificate.sol/CertificateNFT.json';

export const getCertificateContract = (addr, provider) => {
  if (!ethers.utils.isAddress(addr) || addr === ethers.constants.AddressZero || !provider) {
    throw new Error('A valid contract address and wallet connection are required.');
  }
  return new ethers.Contract(addr, certificate.abi, provider);
};

export const getEventDetails = async (addr, provider) => {
  const contract = getCertificateContract(addr, provider);
  if (await provider.getCode(addr) === '0x') throw new Error('No contract found at this address on the connected network.');
  let version;
  try {
    version = await contract.contractVersion();
  } catch {
    throw new Error('This older contract does not bind metadata to the issuer. Ask the organizer for a new deployment.');
  }
  if (!version.eq(2)) throw new Error('This contract version is not supported.');
  const [eventName, merkleRoot, owner, metadataUri] = await Promise.all([
    contract.name(), contract.merkleRoot(), contract.owner(), contract.metadataUri()
  ]);
  return { eventName, merkleRoot, owner, metadataUri };
};

export const hasAddressClaimed = (addr, wallet, provider) => getCertificateContract(addr, provider).hasClaimed(wallet);

export const isAddressEligible = (addr, wallet, proof, provider) => getCertificateContract(addr, provider).isEligible(wallet, proof);

export const waitForReceipt = async tx => {
  try {
    return await tx.wait();
  } catch (err) {
    if (err.code === 'TRANSACTION_REPLACED' && !err.cancelled && err.receipt?.status === 1) return err.receipt;
    throw err;
  }
};

export const claimCertificate = async (addr, proof, tokenUri, signer) => {
  const contract = getCertificateContract(addr, signer);
  if (await contract.metadataUri() !== tokenUri) throw new Error('The metadata URI does not match the issuer record.');
  return waitForReceipt(await contract.claimCertificate(proof));
};

export const deployCertificateContract = async (event, root, signer) => {
  const factory = new ethers.ContractFactory(certificate.abi, certificate.bytecode, signer);
  const contract = await factory.deploy(event.name || event.eventName, event.symbol, event.metadataUri, root);
  await waitForReceipt(contract.deployTransaction);
  return contract;
};
