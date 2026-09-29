// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title MetaMaskVisibleSoulbound
 * @dev ERC721-compliant contract that appears in MetaMask but prevents transfers
 * @notice This contract makes soulbound certificates visible in MetaMask NFT section
 * @notice All transfer functions are overridden to prevent any movement of tokens
 */
contract MetaMaskVisibleSoulbound {
    // ERC721 Metadata
    string public name;
    string public symbol;
    
    // Contract state
    bytes32 public immutable merkleRoot;
    address public immutable owner;
    uint256 private _nextTokenId = 1;
    
    // Mappings
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public addressToTokenId;
    
    // Events (ERC721 standard)
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    // Custom events
    event SoulboundCertificateIssued(address indexed soul, uint256 indexed tokenId, string tokenURI);
    event SoulboundTransferAttempted(address indexed from, address indexed to, uint256 indexed tokenId);
    
    // Custom errors
    error SoulboundTransferNotAllowed();
    error CertificateAlreadyClaimed();
    error InvalidMerkleProof();
    error TokenDoesNotExist();
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory, // _eventName - not stored
        string memory, // _eventDescription - not stored
        string memory, // _eventDate - not stored
        string memory, // _eventImageURI - not stored
        bytes32 _merkleRoot
    ) {
        name = _name;
        symbol = _symbol;
        merkleRoot = _merkleRoot;
        owner = msg.sender;
    }
    
    // ============ ERC721 VIEW FUNCTIONS ============
    
    function balanceOf(address _owner) external view returns (uint256) {
        require(_owner != address(0), "Invalid address");
        return _balances[_owner];
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }
    
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
    
    // ============ ERC721 APPROVAL FUNCTIONS (DISABLED) ============
    
    function approve(address, uint256 tokenId) external {
        emit SoulboundTransferAttempted(address(0), address(0), tokenId);
        revert SoulboundTransferNotAllowed();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0); // No approvals allowed
    }

    function setApprovalForAll(address, bool) external pure {
        revert SoulboundTransferNotAllowed();
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false; // No approvals allowed
    }

    // ============ ERC721 TRANSFER FUNCTIONS (DISABLED) ============

    function transferFrom(address from, address to, uint256 tokenId) external {
        emit SoulboundTransferAttempted(from, to, tokenId);
        revert SoulboundTransferNotAllowed();
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        emit SoulboundTransferAttempted(from, to, tokenId);
        revert SoulboundTransferNotAllowed();
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        emit SoulboundTransferAttempted(from, to, tokenId);
        revert SoulboundTransferNotAllowed();
    }
    
    // ============ CERTIFICATE FUNCTIONS ============
    
    function claimCertificate(bytes32[] calldata _merkleProof, string calldata _tokenURI) public {
        address soul = msg.sender;
        
        if (hasClaimed[soul]) revert CertificateAlreadyClaimed();
        
        // Verify eligibility
        bytes32 leaf = keccak256(abi.encodePacked(soul));
        if (!_verifyProof(_merkleProof, leaf)) revert InvalidMerkleProof();
        
        // Mark as claimed
        hasClaimed[soul] = true;
        
        // Mint the token
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = soul;
        _balances[soul] = 1; // Each address can only have one
        _tokenURIs[tokenId] = _tokenURI;
        addressToTokenId[soul] = tokenId;
        
        // Emit Transfer event (this makes it appear in MetaMask!)
        emit Transfer(address(0), soul, tokenId);
        
        // Emit custom event
        emit SoulboundCertificateIssued(soul, tokenId, _tokenURI);
    }
    
    // Legacy function name
    function claimSoulboundCertificate(bytes32[] calldata _merkleProof, string calldata _tokenURI) external {
        claimCertificate(_merkleProof, _tokenURI);
    }
    
    function isEligible(address _address, bytes32[] calldata _merkleProof) external view returns (bool) {
        if (hasClaimed[_address]) return false;
        
        bytes32 leaf = keccak256(abi.encodePacked(_address));
        return _verifyProof(_merkleProof, leaf);
    }
    
    function hasSoulboundCertificate(address _address) external view returns (bool) {
        return hasClaimed[_address];
    }
    
    function getSoulboundCertificateDetails(address _soul) external view returns (
        bool exists,
        uint256 tokenId,
        string memory uri
    ) {
        if (!hasClaimed[_soul]) {
            return (false, 0, "");
        }
        
        tokenId = addressToTokenId[_soul];
        uri = _tokenURIs[tokenId];
        return (true, tokenId, uri);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _verifyProof(bytes32[] calldata proof, bytes32 leaf) private view returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            computedHash = computedHash <= proofElement
                ? keccak256(abi.encodePacked(computedHash, proofElement))
                : keccak256(abi.encodePacked(proofElement, computedHash));
        }
        
        return computedHash == merkleRoot;
    }
    
    // ============ ERC165 SUPPORT ============
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || // ERC165
               interfaceId == 0x80ac58cd || // ERC721
               interfaceId == 0x5b5e139f;   // ERC721Metadata
    }
}
