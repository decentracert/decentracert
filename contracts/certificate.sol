// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract CertificateNFT is ERC721 {
    address public immutable owner;
    bytes32 public immutable merkleRoot;
    uint256 public immutable createdBlock;
    uint256 public totalSupply;
    string public metadataUri;
    mapping(address => uint256) public tokenOf;

    event SoulboundCertificateIssued(address indexed soul, uint256 indexed tokenId, string tokenUri);

    error AlreadyClaimed();
    error InvalidProof();
    error Soulbound();

    constructor(string memory name, string memory symbol, string memory uri, bytes32 root)
        ERC721(name, symbol)
    {
        require(bytes(name).length > 0 && bytes(name).length <= 120, "Invalid event name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 12, "Invalid symbol");
        require(bytes(uri).length > 0 && bytes(uri).length <= 512, "Invalid metadata URI");
        require(root != bytes32(0), "Empty Merkle root");
        owner = msg.sender;
        merkleRoot = root;
        metadataUri = uri;
        createdBlock = block.number;
    }

    function contractVersion() external pure returns (uint256) {
        return 2;
    }

    function hasClaimed(address wallet) public view returns (bool) {
        return tokenOf[wallet] != 0;
    }

    function isEligible(address wallet, bytes32[] calldata proof) public view returns (bool) {
        return wallet != address(0) && !hasClaimed(wallet)
            && MerkleProof.verifyCalldata(proof, merkleRoot, keccak256(abi.encodePacked(wallet)));
    }

    function claimCertificate(bytes32[] calldata proof) external {
        if (hasClaimed(msg.sender)) revert AlreadyClaimed();
        if (!isEligible(msg.sender, proof)) revert InvalidProof();
        uint256 tokenId = ++totalSupply;
        tokenOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);
        emit SoulboundCertificateIssued(msg.sender, tokenId, metadataUri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        return metadataUri;
    }

    function hasSoulboundCertificate(address wallet) external view returns (bool) {
        return hasClaimed(wallet);
    }

    function getSoulboundCertificateDetails(address wallet) external view returns (bool exists, uint256 tokenId, string memory uri) {
        tokenId = tokenOf[wallet];
        return (tokenId != 0, tokenId, tokenId == 0 ? "" : metadataUri);
    }

    function approve(address, uint256) public pure override {
        revert Soulbound();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert Soulbound();
    }

    function _beforeTokenTransfer(address from, address, uint256, uint256) internal pure override {
        if (from != address(0)) revert Soulbound();
    }
}
