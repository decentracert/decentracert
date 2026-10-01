const { ethers } = require('hardhat');
const fs = require('node:fs');

async function main() {
  if (!process.env.EVENT_FILE) throw new Error('Set EVENT_FILE to a JSON file with name, symbol, metadataUri and merkleRoot.');
  const event = JSON.parse(fs.readFileSync(process.env.EVENT_FILE, 'utf8'));
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error('Set PRIVATE_KEY for the deployment wallet.');
  const factory = await ethers.getContractFactory('CertificateNFT', signer);
  const contract = await factory.deploy(event.name, event.symbol, event.metadataUri, event.merkleRoot);
  await contract.deployed();
  console.log(JSON.stringify({
    contractAddress: contract.address,
    chainId: (await signer.provider.getNetwork()).chainId,
    issuer: await signer.getAddress(),
    metadataUri: event.metadataUri,
    merkleRoot: event.merkleRoot,
    transactionHash: contract.deployTransaction.hash
  }, null, 2));
}

main().catch(err => {
  console.error(err.reason || err.message);
  process.exitCode = 1;
});
