const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

describe('CertificateNFT', function () {
  let contract, issuer, student, other, outsider, tree, factory;
  const uri = 'ipfs://bafybeicertificatemetadata';
  const proofFor = (tree, usr) => tree.getHexProof(ethers.utils.solidityKeccak256(['address'], [usr.address]));

  beforeEach(async function () {
    [issuer, student, other, outsider] = await ethers.getSigners();
    tree = new MerkleTree([student, other].map(usr => ethers.utils.solidityKeccak256(['address'], [usr.address])), keccak256, { sortPairs: true });
    factory = await ethers.getContractFactory('CertificateNFT');
    contract = await factory.deploy('Campus workshop', 'CAMPUS', uri, tree.getHexRoot());
    await contract.deployed();
  });

  it('records the issuer, metadata and eligible root at deployment', async function () {
    expect(await contract.owner()).to.equal(issuer.address);
    expect(await contract.name()).to.equal('Campus workshop');
    expect(await contract.metadataUri()).to.equal(uri);
    expect(await contract.merkleRoot()).to.equal(tree.getHexRoot());
    expect(await contract.contractVersion()).to.equal(2);
    expect(await contract.createdBlock()).to.equal((await contract.deployTransaction.wait()).blockNumber);
  });

  it('rejects incomplete deployments', async function () {
    await expect(factory.deploy('', 'WS', uri, tree.getHexRoot())).to.be.revertedWith('Invalid event name');
    await expect(factory.deploy('Workshop', '', uri, tree.getHexRoot())).to.be.revertedWith('Invalid symbol');
    await expect(factory.deploy('Workshop', 'WS', '', tree.getHexRoot())).to.be.revertedWith('Invalid metadata URI');
    await expect(factory.deploy('Workshop', 'WS', uri, ethers.constants.HashZero)).to.be.revertedWith('Empty Merkle root');
  });

  it('mints the issuer metadata to the eligible caller', async function () {
    await expect(contract.connect(student).claimCertificate(proofFor(tree, student)))
      .to.emit(contract, 'Transfer').withArgs(ethers.constants.AddressZero, student.address, 1);
    expect(await contract.ownerOf(1)).to.equal(student.address);
    expect(await contract.tokenURI(1)).to.equal(uri);
    expect(await contract.balanceOf(student.address)).to.equal(1);
    expect(await contract.totalSupply()).to.equal(1);
    expect(await contract.getSoulboundCertificateDetails(student.address)).to.deep.equal([true, ethers.BigNumber.from(1), uri]);
  });

  it('rejects the old claim selector with claimant-controlled metadata', async function () {
    const legacy = new ethers.utils.Interface(['function claimCertificate(bytes32[],string)']);
    const data = legacy.encodeFunctionData('claimCertificate', [proofFor(tree, student), 'ipfs://substituted-certificate']);
    await expect(student.sendTransaction({ to: contract.address, data })).to.be.reverted;
    await contract.connect(student).claimCertificate(proofFor(tree, student));
    await contract.connect(other).claimCertificate(proofFor(tree, other));
    expect(await contract.tokenURI(1)).to.equal(uri);
    expect(await contract.tokenURI(2)).to.equal(uri);
  });

  it('rejects another wallet using an eligible proof', async function () {
    expect(await contract.isEligible(outsider.address, proofFor(tree, student))).to.equal(false);
    await expect(contract.connect(outsider).claimCertificate(proofFor(tree, student))).to.be.revertedWithCustomError(contract, 'InvalidProof');
    expect(await contract.totalSupply()).to.equal(0);
  });

  it('rejects corrupted proofs', async function () {
    await expect(contract.connect(student).claimCertificate([ethers.constants.HashZero])).to.be.revertedWithCustomError(contract, 'InvalidProof');
  });

  it('rejects a duplicate claim and clears eligibility', async function () {
    await contract.connect(student).claimCertificate(proofFor(tree, student));
    await expect(contract.connect(student).claimCertificate(proofFor(tree, student))).to.be.revertedWithCustomError(contract, 'AlreadyClaimed');
    expect(await contract.isEligible(student.address, proofFor(tree, student))).to.equal(false);
    expect(await contract.totalSupply()).to.equal(1);
  });

  it('rejects approvals and all transfer entry points', async function () {
    await contract.connect(student).claimCertificate(proofFor(tree, student));
    await expect(contract.connect(student).approve(other.address, 1)).to.be.revertedWithCustomError(contract, 'Soulbound');
    await expect(contract.connect(student).setApprovalForAll(other.address, true)).to.be.revertedWithCustomError(contract, 'Soulbound');
    await expect(contract.connect(student).transferFrom(student.address, other.address, 1)).to.be.revertedWithCustomError(contract, 'Soulbound');
    await expect(contract.connect(student)['safeTransferFrom(address,address,uint256)'](student.address, other.address, 1)).to.be.revertedWithCustomError(contract, 'Soulbound');
    await expect(contract.connect(student)['safeTransferFrom(address,address,uint256,bytes)'](student.address, other.address, 1, '0x')).to.be.revertedWithCustomError(contract, 'Soulbound');
    expect(await contract.ownerOf(1)).to.equal(student.address);
  });

  it('rejects missing tokens and reports wallets without a claim', async function () {
    await expect(contract.ownerOf(0)).to.be.reverted;
    await expect(contract.tokenURI(2)).to.be.reverted;
    await expect(contract.balanceOf(ethers.constants.AddressZero)).to.be.reverted;
    expect((await contract.getSoulboundCertificateDetails(outsider.address)).exists).to.equal(false);
    expect(await contract.supportsInterface('0x80ac58cd')).to.equal(true);
    expect(await contract.supportsInterface('0xffffffff')).to.equal(false);
  });

  for (const count of [1, 3, 4]) {
    it(`accepts all proofs for ${count} participants`, async function () {
      const signers = (await ethers.getSigners()).slice(1, count + 1);
      const nextTree = new MerkleTree(signers.map(usr => ethers.utils.solidityKeccak256(['address'], [usr.address])), keccak256, { sortPairs: true });
      const nextContract = await factory.deploy('Workshop', 'WS', uri, nextTree.getHexRoot());
      await nextContract.deployed();
      for (const usr of signers) {
        const proof = proofFor(nextTree, usr);
        if (count === 1) expect(proof).to.deep.equal([]);
        await nextContract.connect(usr).claimCertificate(proof);
      }
      expect(await nextContract.totalSupply()).to.equal(count);
    });
  }
});
