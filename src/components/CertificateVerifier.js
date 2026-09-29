import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Search, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const CertificateVerifier = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.05, 
      y: -2,
      boxShadow: "0 8px 25px rgba(139, 92, 246, 0.4)"
    },
    tap: { scale: 0.95 }
  };

  const [contractAddress, setContractAddress] = useState(() => new URLSearchParams(window.location.search).get('contract') || '');
  const [walletAddress, setWalletAddress] = useState(() => new URLSearchParams(window.location.search).get('wallet') || '');
  const [tokenId, setTokenId] = useState('1');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Contract ABI for verification functions
  const contractABI = [
    "function hasSoulboundCertificate(address) view returns (bool)",
    "function ownerOf(uint256) view returns (address)",
    "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
    "function tokenURI(uint256) view returns (string)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
  ];

  const verifyOwnership = async () => {
    if (!contractAddress || !walletAddress) {
      setError('Please enter both contract address and wallet address');
      return;
    }

    if (!ethers.utils.isAddress(contractAddress) || !ethers.utils.isAddress(walletAddress)) {
      setError('Please enter valid Ethereum addresses');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      // Connect to Sepolia network via backend API
      const response = await fetch('/api/network/provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: 'sepolia'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get network provider');
      }

      const providerData = await response.json();
      const provider = new ethers.providers.JsonRpcProvider(providerData.rpcUrl);

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      // Get contract information
      const [contractName, contractSymbol, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(), 
        contract.totalSupply()
      ]);

      // Verify ownership
      const hasCertificate = await contract.hasSoulboundCertificate(walletAddress);
      const balance = await contract.balanceOf(walletAddress);

      let ownershipDetails = null;
      let metadata = null;

      if (hasCertificate) {
        // Get certificate details
        const [exists, certTokenId, uri] = await contract.getSoulboundCertificateDetails(walletAddress);
        
        // Verify token ownership
        const tokenOwner = await contract.ownerOf(certTokenId);
        
        ownershipDetails = {
          exists,
          tokenId: certTokenId.toString(),
          uri,
          owner: tokenOwner,
          isCorrectOwner: tokenOwner.toLowerCase() === walletAddress.toLowerCase()
        };

        // Fetch metadata from IPFS
        if (uri.startsWith('ipfs://')) {
          try {
            const ipfsHash = uri.replace('ipfs://', '');
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
            metadata = await response.json();
          } catch (metadataError) {
            console.error('Error fetching metadata:', metadataError);
          }
        }
      }

      setVerificationResult({
        contractInfo: {
          name: contractName,
          symbol: contractSymbol,
          totalSupply: totalSupply.toString(),
          address: contractAddress
        },
        walletInfo: {
          address: walletAddress,
          hasCertificate: hasCertificate && ownershipDetails?.exists && ownershipDetails?.isCorrectOwner,
          balance: balance.toString()
        },
        ownershipDetails,
        metadata,
        verifiedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Verification error:', error);
      setError(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyVerificationLink = () => {
    const verificationUrl = `${window.location.origin}/verify?contract=${contractAddress}&wallet=${walletAddress}`;
    navigator.clipboard.writeText(verificationUrl);
    alert('Verification link copied to clipboard!');
  };

  return (
    <motion.div
      className="certificate-verifier"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div 
        className="portal-header premium-portal-header"
        variants={itemVariants}
      >
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="header-icon-container"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <Search size={48} className="header-icon" />
          </motion.div>
          <h1 className="portal-title brand-font">Certificate Verification</h1>
          <p className="portal-subtitle body-font">
            Public verification tool to check certificate authenticity and ownership on the blockchain
          </p>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        className="row mt-2"
        variants={itemVariants}
      >
        <motion.div 
          className="col-lg-8 mx-auto"
          variants={cardVariants}
        >
          <motion.div 
            className="card premium-portal-card"
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <div className="card-header premium-card-header">
              <h3 className="card-title premium-card-title body-font">
                <Shield className="me-2" />
                Public Certificate Verification
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-info premium-alert">
                <h6>🌐 Public Verification Tool</h6>
                <p className="mb-0">
                  Anyone can use this tool to verify certificate ownership. No wallet connection required - 
                  just enter the contract address and wallet address to verify.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); verifyOwnership(); }}>
                <div className="mb-3">
                  <label htmlFor="contractAddress" className="form-label premium-form-label body-font">Certificate Contract Address</label>
                  <input
                    type="text"
                    className="form-control premium-form-control"
                    id="contractAddress"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                  <div className="form-text">Enter the soulbound certificate contract address</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="walletAddress" className="form-label premium-form-label body-font">Wallet Address to Verify</label>
                  <input
                    type="text"
                    className="form-control premium-form-control"
                    id="walletAddress"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                  <div className="form-text">Enter the wallet address you want to verify certificate ownership for</div>
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-primary premium-btn"
                  disabled={loading}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="me-2 loading-spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="me-2" />
                      Verify Certificate Ownership
                    </>
                  )}
                </motion.button>
              </form>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="alert alert-danger premium-alert mt-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AlertCircle className="me-2" />
                    <h6>❌ Verification Error</h6>
                    <p className="mb-0">{error}</p>
                  </motion.div>
                )}

                {verificationResult && (
                  <motion.div
                    className="mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className={`alert ${verificationResult.walletInfo.hasCertificate ? 'alert-success' : 'alert-warning'} premium-alert`}>
                      <h5>
                        {verificationResult.walletInfo.hasCertificate ? '✅ Certificate Verified!' : '❌ No Certificate Found'}
                      </h5>
                      <p className="mb-0">
                        {verificationResult.walletInfo.hasCertificate 
                          ? 'The certificate exists and belongs to the specified wallet address.'
                          : 'No certificate was found for the specified wallet address in this contract.'
                        }
                      </p>
                    </div>
                    
                    {verificationResult.walletInfo.hasCertificate && verificationResult.metadata && (
                      <div className="mt-3">
                        <h6 style={{ color: '#ffffff', fontWeight: 'bold' }}>Certificate Details:</h6>
                        <div className="row">
                          <div className="col-md-6">
                            <p style={{ color: '#ffffff' }}><strong>Name:</strong> {verificationResult.metadata.name || 'Not specified'}</p>
                            <p style={{ color: '#ffffff' }}><strong>Description:</strong> {verificationResult.metadata.description || 'Not specified'}</p>
                            {verificationResult.metadata.attributes && verificationResult.metadata.attributes.length > 0 && (
                              <div>
                                <strong style={{ color: '#ffffff' }}>Attributes:</strong>
                                <ul className="mb-0" style={{ color: '#ffffff' }}>
                                  {verificationResult.metadata.attributes.map((attr, index) => (
                                    <li key={index} style={{ color: '#ffffff' }}>{attr.trait_type}: {attr.value}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="col-md-6">
                            {verificationResult.metadata.image && (
                              <div>
                                <p style={{ color: '#ffffff' }}><strong>Certificate Preview:</strong></p>
                                <img 
                                  src={verificationResult.metadata.image} 
                                  alt="Certificate Preview" 
                                  className="img-fluid rounded border"
                                  style={{ maxHeight: '200px', maxWidth: '100%' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div style={{ display: 'none' }} className="text-muted">
                                  <small style={{ color: '#ffffff' }}>Image preview not available. <a href={verificationResult.metadata.image} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>View original</a></small>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default CertificateVerifier;
