const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

for (const contractName of ['CertificateNFT', 'MetaMaskVisibleSoulbound']) {
  describe(contractName, function () {
    let contract, issuer, student, other, outsider, tree;
    const uri = 'ipfs://bafybeicertificatemetadata';

    beforeEach(async function () {
      [issuer, student, other, outsider] = await ethers.getSigners();
      tree = new MerkleTree([student, other].map(usr => ethers.utils.solidityKeccak256(['address'], [usr.address])), keccak256, { sortPairs: true });
      const factory = await ethers.getContractFactory(contractName);
      contract = await factory.deploy('Campus workshop', 'CAMPUS', 'Campus workshop', 'Attendance certificate', '2026-09-29', uri, tree.getHexRoot());
      await contract.deployed();
    });

    const proofFor = (tree, usr) => tree.getHexProof(ethers.utils.solidityKeccak256(['address'], [usr.address]));

    it('records the issuer and eligible root', async function () {
      expect(await contract.owner()).to.equal(issuer.address);
      expect(await contract.name()).to.equal('Campus workshop');
      expect(await contract.merkleRoot()).to.equal(tree.getHexRoot());
    });

    for (const method of ['claimCertificate', 'claimSoulboundCertificate']) {
      it(`mints through ${method} to the caller`, async function () {
        await expect(contract.connect(student)[method](proofFor(tree, student), uri))
          .to.emit(contract, 'Transfer').withArgs(ethers.constants.AddressZero, student.address, 1);
        expect(await contract.ownerOf(1)).to.equal(student.address);
        expect(await contract.tokenURI(1)).to.equal(uri);
        expect(await contract.balanceOf(student.address)).to.equal(1);
        expect(await contract.totalSupply()).to.equal(1);
        expect(await contract.getSoulboundCertificateDetails(student.address)).to.deep.equal([true, ethers.BigNumber.from(1), uri]);
      });
    }

    it('rejects another wallet using an eligible proof', async function () {
      expect(await contract.isEligible(outsider.address, proofFor(tree, student))).to.equal(false);
      await expect(contract.connect(outsider).claimCertificate(proofFor(tree, student), uri)).to.be.reverted;
      expect(await contract.totalSupply()).to.equal(0);
    });

    it('rejects a duplicate claim and clears eligibility', async function () {
      await contract.connect(student).claimCertificate(proofFor(tree, student), uri);
      await expect(contract.connect(student).claimCertificate(proofFor(tree, student), uri)).to.be.reverted;
      expect(await contract.isEligible(student.address, proofFor(tree, student))).to.equal(false);
      expect(await contract.totalSupply()).to.equal(1);
    });

    it('rejects approvals and all transfer entry points', async function () {
      await contract.connect(student).claimCertificate(proofFor(tree, student), uri);
      await expect(contract.connect(student).approve(other.address, 1)).to.be.reverted;
      await expect(contract.connect(student).setApprovalForAll(other.address, true)).to.be.reverted;
      await expect(contract.connect(student).transferFrom(student.address, other.address, 1)).to.be.reverted;
      await expect(contract.connect(student)['safeTransferFrom(address,address,uint256)'](student.address, other.address, 1)).to.be.reverted;
      await expect(contract.connect(student)['safeTransferFrom(address,address,uint256,bytes)'](student.address, other.address, 1, '0x')).to.be.reverted;
      expect(await contract.ownerOf(1)).to.equal(student.address);
    });

    it('rejects missing tokens and reports wallets without a claim', async function () {
      await expect(contract.ownerOf(0)).to.be.reverted;
      await expect(contract.tokenURI(2)).to.be.reverted;
      await expect(contract.balanceOf(ethers.constants.AddressZero)).to.be.reverted;
      expect((await contract.getSoulboundCertificateDetails(outsider.address)).exists).to.equal(false);
    });

    for (const count of [1, 3, 4]) {
      it(`accepts all proofs for ${count} participants`, async function () {
        const signers = (await ethers.getSigners()).slice(1, count + 1);
        const nextTree = new MerkleTree(signers.map(usr => ethers.utils.solidityKeccak256(['address'], [usr.address])), keccak256, { sortPairs: true });
        const factory = await ethers.getContractFactory(contractName);
        const nextContract = await factory.deploy('Workshop', 'WS', 'Workshop', '', '', uri, nextTree.getHexRoot());
        await nextContract.deployed();
        for (const usr of signers) {
          const proof = proofFor(nextTree, usr);
          if (count === 1) expect(proof).to.deep.equal([]);
          await nextContract.connect(usr).claimCertificate(proof, uri);
        }
        expect(await nextContract.totalSupply()).to.equal(count);
      });
    }
  });
}
