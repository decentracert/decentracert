import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAllMerkleProofs } from '../utils/merkleUtils';
import { deployCertificateContract } from '../utils/contractUtils';
import AnalyticsDashboard from './AnalyticsDashboard';
import AICertificateGenerator from './AICertificateGenerator';
import { ethers } from 'ethers';
import FormData from 'form-data';
import { Building2 } from 'lucide-react';

const OrganizerPortal = ({ account, provider, signer, connectWallet }) => {

  // Verify if a contract was deployed successfully
  const verifyContractDeployment = async (contractAddress) => {
    try {
      if (!provider || !contractAddress) return false;

      const code = await provider.getCode(contractAddress);
      return code !== '0x'; // Contract exists if it has code
    } catch (error) {
      console.error('Error verifying contract:', error);
      return false;
    }
  };

  // Check current gas prices
  const checkGasPrices = async () => {
    try {
      if (provider) {
        const gasPrice = await provider.getGasPrice();
        const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
        setCurrentGasPrice(gasPriceGwei);
        console.log('Current gas price:', gasPriceGwei, 'Gwei');
        return gasPriceGwei;
      }
    } catch (error) {
      console.error('Error checking gas prices:', error);
      // Try alternative method
      try {
        const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken');
        const data = await response.json();
        if (data.result && data.result.SafeGasPrice) {
          const gasPriceGwei = parseFloat(data.result.SafeGasPrice);
          setCurrentGasPrice(gasPriceGwei);
          return gasPriceGwei;
        }
      } catch (fallbackError) {
        console.error('Fallback gas price check failed:', fallbackError);
      }
    }
    return null;
  };

  // Manual contract check function
  const handleManualContractCheck = async (addressToCheck) => {
    if (!addressToCheck || !ethers.utils.isAddress(addressToCheck)) {
      setError('Please enter a valid contract address');
      return;
    }

    setCheckingContract(true);
    setError('');

    try {
      const exists = await verifyContractDeployment(addressToCheck);

      if (exists) {
        setDeployedContract(addressToCheck);
        setSuccessMsg(`✅ Contract verified successfully at ${addressToCheck}!

The contract is deployed and working. You can proceed with certificate distribution.`);
        setStep(5);
      } else {
        setError(`❌ No contract found at ${addressToCheck}. Please check the address or try deploying again.`);
      }
    } catch (error) {
      setError(`Error checking contract: ${error.message}`);
    } finally {
      setCheckingContract(false);
    }
  };
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventSymbol, setEventSymbol] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [addresses, setAddresses] = useState('');
  const [certificateImage, setCertificateImage] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [checkingContract, setCheckingContract] = useState(false);
  const [currentGasPrice, setCurrentGasPrice] = useState(null);
  const [merkleRoot, setMerkleRoot] = useState('');
  const [deployedContract, setDeployedContract] = useState('');
  const [networkName, setNetworkName] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1);
  const [merkleProofs, setMerkleProofs] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageHash, setUploadedImageHash] = useState('');
  const [metadataHash, setMetadataHash] = useState('');

  // Notification management
  const showNotification = (message, type = 'success', duration = 8000) => {
    if (type === 'success') {
      setSuccessMsg(message);
      setError('');
    } else {
      setError(message);
      setSuccessMsg('');
    }

    // Auto-scroll to notification
    setTimeout(() => {
      const notificationElement = document.querySelector('.alert');
      if (notificationElement) {
        notificationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Auto-hide notification
    setTimeout(() => {
      if (type === 'success') {
        setSuccessMsg('');
      } else {
        setError('');
      }
    }, duration);
  };

  // New features state
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'analytics', 'ai-generator'
  const [analyticsContractAddress, setAnalyticsContractAddress] = useState('');

  // Check gas prices when step 5 is loaded
  useEffect(() => {
    if (step === 5 && provider) {
      checkGasPrices();
    }
  }, [step, provider]);

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCertificateImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to IPFS via backend API
  const uploadImageToPinata = async () => {
    if (!certificateImage) {
      throw new Error('Please select a certificate image');
    }

    const formData = new FormData();
    formData.append('file', certificateImage);
    
    const metadata = {
      name: `${eventName}-certificate-image`,
    };
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch('/api/upload-ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload to IPFS');
    }

    const result = await response.json();
    return result.ipfsHash;
  };

  // Upload metadata to IPFS via backend API
  const uploadMetadataToPinata = async (imageHash) => {
    const metadata = {
      name: eventName,
      description: eventDescription,
      image: `https://gateway.pinata.cloud/ipfs/${imageHash}`, // Use gateway URL for MetaMask compatibility
      external_url: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      attributes: [
        {
          trait_type: "Event",
          value: eventName
        },
        {
          trait_type: "Date",
          value: eventDate
        },
        {
          trait_type: "Issuer",
          value: account
        },
        {
          trait_type: "Certificate Type",
          value: "Soulbound"
        }
      ]
    };

    const response = await fetch('/api/upload-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
    }

    const result = await response.json();
    return result.ipfsHash;
  };

  // Handle form submission for event details and addresses
  const handleCreateMerkleRoot = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Parse addresses
      const addressList = addresses.split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr !== '');
      
      if (addressList.length === 0) {
        throw new Error('Please enter at least one address.');
      }

      // Generate Merkle tree and proofs
      const { merkleRoot: root, proofs } = generateAllMerkleProofs(addressList);

      setMerkleRoot(root);
      setMerkleProofs(proofs);

      // Auto-download the Merkle proofs JSON file
      setTimeout(() => {
        const jsonData = JSON.stringify({ merkleRoot: root, proofs }, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `merkle-proofs-${eventName || 'event'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 500); // Small delay to ensure state is updated

      showNotification('Merkle root and proofs generated and downloaded successfully!');

      // If AI certificate is already generated (has uploadedImageHash), skip to step 5 (deploy)
      if (uploadedImageHash && metadataHash) {
        setStep(5);
        showNotification('🚀 Ready to deploy contract! All steps completed.');
      } else {
        setStep(4); // Go to image upload step
      }
    } catch (error) {
      console.error('Error generating Merkle root:', error);
      showNotification('Failed to generate Merkle root: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle uploading image and metadata to IPFS
  const handleUploadToIPFS = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Upload image to IPFS
      const imageHash = await uploadImageToPinata();
      setUploadedImageHash(imageHash);
      
      // Upload metadata to IPFS
      const metadataHash = await uploadMetadataToPinata(imageHash);
      setMetadataHash(metadataHash);

      // Auto-download the token URI JSON file
      setTimeout(() => {
        const tokenURI = `ipfs://${metadataHash}`;
        const tokenData = {
          tokenURI: tokenURI,
          imageHash: imageHash,
          metadataHash: metadataHash,
          eventDetails: {
            name: eventName,
            symbol: eventSymbol,
            description: eventDescription,
            date: eventDate
          },
          uploadedAt: new Date().toISOString()
        };

        const jsonData = JSON.stringify(tokenData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `token-uri-${eventName || 'event'}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 500);

      setSuccessMsg('Certificate image and metadata uploaded to IPFS successfully!');

      // Auto-proceed to deploy step
      setStep(5);
      showNotification('🚀 Ready to deploy contract!');
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      showNotification('Failed to upload to IPFS: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle contract deployment
  const handleDeployContract = async (e) => {
    e.preventDefault();

    if (!account || !signer) {
      setError('Please connect your wallet first.');
      return;
    }

    if (!merkleRoot || !uploadedImageHash || !metadataHash) {
      setError('Please complete all previous steps first.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Check gas prices
      const gasPrice = await checkGasPrices();
      
      // Get network information
      const network = await signer.provider.getNetwork();
      setNetworkName(network.name || 'Unknown');
      
      const deployedContract = await deployCertificateContract({
        name: eventName,
        symbol: eventSymbol,
        metadataUri: `ipfs://${metadataHash}`
      }, merkleRoot, signer);

      const contractAddress = deployedContract.address;
      setDeployedContract(contractAddress);
      setContractAddress(contractAddress);

      // Auto-download comprehensive data file
      setTimeout(() => {
        const comprehensiveData = {
          contractAddress: contractAddress,
          eventDetails: {
            name: eventName,
            symbol: eventSymbol,
            description: eventDescription,
            date: eventDate
          },
          merkleRoot: merkleRoot,
          merkleProofs: merkleProofs,
          tokenURI: `ipfs://${metadataHash}`,
          imageHash: uploadedImageHash,
          metadataHash: metadataHash,
          deploymentMode: 'wallet',
          gasPrice: gasPrice,
          deployedAt: new Date().toISOString(),
          issuer: account,
          network: networkName
        };

        const jsonData = JSON.stringify(comprehensiveData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
        link.download = `certificate-data-${eventName || 'event'}-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 500);

      showNotification(`✅ Contract deployed successfully!

Contract Address: ${contractAddress}
Network: ${networkName || 'Unknown'}

A comprehensive data file has been downloaded with all the information needed for certificate distribution.`);
    } catch (error) {
      console.error('Error deploying contract:', error);
      showNotification('Failed to deploy contract: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload custom metadata to IPFS
  const uploadCustomMetadataToPinata = async (metadata, eventName) => {
      const response = await fetch('/api/upload-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload metadata to IPFS');
      }

      const result = await response.json();
      return result.ipfsHash;
  };

  // Upload AI image to IPFS via backend API
  const uploadAIImageToPinata = async (dataUrl, eventName) => {
    try {
      console.log('🤖 Starting AI image upload to IPFS...');
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Create file from blob
      const file = new File([blob], `${eventName}-ai-certificate.png`, { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('file', file);

      const metadata = {
        name: `${eventName}-ai-certificate`,
      };
      formData.append('metadata', JSON.stringify(metadata));

      console.log('📤 Sending AI image to server...');
      const uploadResponse = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Server response error:', errorText);
        
        let errorMessage = 'Failed to upload AI certificate to IPFS';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `Server error: ${uploadResponse.status} ${uploadResponse.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await uploadResponse.json();
      console.log('✅ AI image uploaded successfully:', result.ipfsHash);
      return result.ipfsHash;
    } catch (error) {
      console.error('❌ Error uploading AI image to IPFS:', error);
      throw new Error(`Failed to upload AI certificate: ${error.message}`);
    }
  };

  // Handle AI certificate generation
  const handleAICertificateGenerated = async (certificateData) => {
    try {
      setLoading(true);
      setError('');

      console.log('🎉 AI Certificate data received:', certificateData);

      // The AI certificate generator has already uploaded everything to IPFS
      // We just need to extract the data and update our form
      if (certificateData.ipfs && certificateData.ipfs.ipfsHash) {
        setUploadedImageHash(certificateData.ipfs.ipfsHash);
        setMetadataHash(certificateData.ipfs.ipfsHash);
      }

      // Extract event data from the correct location in the certificate data structure
      const eventData = certificateData.metadata?.certificate_data?.event || certificateData.design?.metadata?.certificate_data?.event || {};
      
      // Update form fields with AI-generated data
      setEventName(eventData.name || certificateData.design?.metadata?.eventName || 'AI Event');
      setEventSymbol(certificateData.eventSymbol || 'AI' + Date.now().toString().slice(-4));
      setEventDescription(eventData.description || certificateData.design?.metadata?.description || 'AI Generated Certificate');
      setEventDate(eventData.date || certificateData.design?.metadata?.eventDate || new Date().toISOString().split('T')[0]);
      setImagePreview(certificateData.design?.imageUrl || certificateData.imageDataUrl);

      console.log('📝 Extracted event data:', {
        name: eventData.name,
        description: eventData.description,
        date: eventData.date
      });

      showNotification('🎉 AI Certificate generated and uploaded successfully! Now add participant addresses to continue.');
      setActiveTab('create');
      setStep(2); // Go to participant addresses step
    } catch (error) {
      console.error('Error handling AI certificate:', error);
      showNotification('Failed to process AI certificate: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderMerkleProofsJSON = () => {
    if (!merkleProofs) return null;

    return (
      <div className="alert alert-info">
        <strong>Generated Proofs:</strong>
        <pre className="mt-2" style={{ fontSize: '0.8rem', maxHeight: '200px', overflow: 'auto' }}>
          {JSON.stringify(merkleProofs, null, 2)}
        </pre>
      </div>
    );
  };

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

  return (
    <motion.div 
      className="organizer-portal"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
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
            <Building2 size={48} className="header-icon" />
          </motion.div>
          <h1 className="portal-title brand-font">Organizer Portal</h1>
          <p className="portal-subtitle body-font">
            Create and manage soulbound certificates for your events with advanced analytics and AI tools
          </p>
          
          {/* Progress Bar Section */}
          {account && activeTab === 'create' && (
            <motion.div 
              className="progress-section mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="progress premium-progress">
                <div
                  className="progress-bar premium-progress-bar"
                  role="progressbar"
                  style={{width: `${step * 20}%`}}
                  aria-valuenow={step * 20}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  Step {step} of 5
                </div>
              </div>

              <div className="d-flex justify-content-between mt-3 flex-wrap">
                <small className={uploadedImageHash ? 'text-success fw-bold' : ''}>
                  {uploadedImageHash ? '✅ Event Details (AI)' : 'Event Details'}
                </small>
                <small className={step >= 2 ? 'text-primary fw-bold' : ''}>Participants</small>
                <small className={step >= 3 ? 'text-primary fw-bold' : ''}>Generate Proofs</small>
                <small className={uploadedImageHash ? 'text-success fw-bold' : step >= 4 ? 'text-primary fw-bold' : ''}>
                  {uploadedImageHash ? '✅ AI Assets' : 'Upload Assets'}
                </small>
                <small className={step >= 5 ? 'text-primary fw-bold' : ''}>Deploy Contract</small>
              </div>

              {uploadedImageHash && activeTab === 'ai-generator' && (
                <div className="mt-2">
                  <small className="text-success">
                    🤖 AI Certificate Generated - Image upload step skipped
                  </small>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Tab Navigation */}
        {account && (
        <motion.div 
          className="mb-2"
          variants={itemVariants}
        >
          <div className="btn-group w-100 mb-2 premium-tab-group" role="group">
            <motion.button
              className={`btn premium-tab-btn ${activeTab === 'create' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('create')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📝 Create Certificates
            </motion.button>
            <motion.button
              className={`btn premium-tab-btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('analytics')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📊 Analytics Dashboard
            </motion.button>
            <motion.button
              className={`btn premium-tab-btn ${activeTab === 'ai-generator' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('ai-generator')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🤖 AI Certificate Generator
            </motion.button>
          </div>
        </motion.div>
        )}

      {/* Wallet Connection Alert */}
      {!account && (
        <motion.div 
          className="alert alert-info mt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-2">Please connect your wallet to create and manage certificates.</p>
          <motion.button
            className="btn btn-primary"
            onClick={connectWallet}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Connect Wallet
          </motion.button>
        </motion.div>
      )}

      {/* Analytics Dashboard Tab */}
      {account && activeTab === 'analytics' && (
        <motion.div 
          className="row mt-2"
          variants={itemVariants}
        >
          <div className="col-lg-10 mx-auto">
            <div className="card mb-3">
            <div className="card-header">
                <h5 style={{ color: '#ffffff' }} className="mb-0">📊 Certificate Analytics</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Contract Address for Analytics</label>
                <input
                  type="text"
                  className="form-control"
                  value={analyticsContractAddress}
                  onChange={(e) => setAnalyticsContractAddress(e.target.value)}
                  placeholder="Enter contract address to view analytics..."
                />
              </div>
              {analyticsContractAddress && (
                <small style={{ color: '#ffffff' }}>
                  Analyzing contract: <code style={{ color: '#ffffff' }}>{analyticsContractAddress}</code>
                </small>
              )}
            </div>
          </div>

          {analyticsContractAddress && (
            <AnalyticsDashboard
              contractAddress={analyticsContractAddress}
              provider={provider}
            />
          )}
        </div>
        </motion.div>
      )}

      {/* AI Certificate Generator Tab */}
      {account && activeTab === 'ai-generator' && (
        <motion.div 
          className="row mt-2"
          variants={itemVariants}
        >
          <div className="col-lg-10 mx-auto">
          <AICertificateGenerator onCertificateGenerated={handleAICertificateGenerated} />
        </div>
        </motion.div>
      )}

      {/* Create Certificates Tab */}
      {account && activeTab === 'create' && (
        <motion.div 
          className="row mt-2"
          variants={itemVariants}
        >
          <div className="col-lg-10 mx-auto">
            
            {/* Step 1: Event Details */}
            <div className={`card ${step !== 1 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 1: Event Details</h4>
                {uploadedImageHash && (
                  <small className="d-block mt-1">
                    🤖 AI Certificate Generated - Details Pre-filled
                  </small>
                )}
              </div>
              <div className="card-body">
                {/* AI Generated Certificate Preview */}
                {uploadedImageHash && imagePreview && (
                  <div className="alert alert-success mb-4">
                    <div className="row">
                      <div className="col-md-4">
                        {imagePreview.startsWith('data:image') ? (
                          <div className="text-center p-3 border rounded bg-light">
                            <div className="mb-2">
                              <i className="fas fa-image text-primary" style={{fontSize: '2rem'}}></i>
                            </div>
                            <small style={{ color: '#ffffff' }}>AI Generated Certificate</small>
                            <br />
                            <small className="text-success">✅ Design Ready</small>
                          </div>
                        ) : (
                          <img
                            src={imagePreview}
                            alt="AI Generated Certificate"
                            className="img-fluid rounded border"
                            style={{maxHeight: '150px', objectFit: 'cover'}}
                          />
                        )}
                      </div>
                      <div className="col-md-8">
                        <h6>🎉 AI Certificate Generated Successfully!</h6>
                        <p className="mb-2">
                          ✅ Certificate design created and uploaded to IPFS<br/>
                          ✅ Event details auto-filled below<br/>
                          ✅ Ready for participant addresses
                        </p>
                        <small style={{ color: '#ffffff' }}>
                          You can modify the details below if needed, then add participant addresses to continue.
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateMerkleRoot}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                    <label htmlFor="eventName" className="form-label">Event Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="eventName"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="e.g., Blockchain Workshop 2023"
                      required
                    />
                  </div>
                  
                    <div className="col-md-6 mb-3">
                    <label htmlFor="eventSymbol" className="form-label">Certificate Symbol</label>
                    <input
                      type="text"
                      className="form-control"
                      id="eventSymbol"
                      value={eventSymbol}
                      onChange={(e) => setEventSymbol(e.target.value)}
                      placeholder="e.g., BCW23"
                      required
                    />
                    <div className="form-text">Short symbol for your certificate (like a stock ticker).</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="eventDescription" className="form-label">Event Description</label>
                    <textarea
                      className="form-control"
                      id="eventDescription"
                      value={eventDescription}
                      onChange={(e) => setEventDescription(e.target.value)}
                      placeholder="Describe the event and what this certificate represents"
                      rows={3}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="eventDate" className="form-label">Event Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="eventDate"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="text-center">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setStep(2)}
                    disabled={!eventName || !eventSymbol || !eventDescription || !eventDate}
                  >
                    Next: Add Participants
                  </button>
                  </div>
                </form>
              </div>
            </div>
            
            {/* Step 2: Participant Addresses */}
            <div className={`card ${step !== 2 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 2: Participant Addresses</h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateMerkleRoot}>
                  <div className="mb-3">
                    <label htmlFor="addresses" className="form-label">Participant Wallet Addresses</label>
                    <textarea
                      className="form-control"
                      id="addresses"
                      value={addresses}
                      onChange={(e) => setAddresses(e.target.value)}
                      placeholder="Enter one Ethereum address per line"
                      rows={5}
                      required
                    ></textarea>
                    <div className="form-text">Enter one Ethereum wallet address per line. These addresses will be eligible to claim the certificate.</div>
                  </div>
                  
                  <div className="d-flex justify-content-between">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || !addresses.trim()}
                    >
                      {loading ? 'Processing...' : 'Generate Merkle Proofs'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            {/* Step 3: Merkle Proofs */}
            <div className={`card ${step !== 3 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 3: Merkle Root & Proofs</h4>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Merkle Root</label>
                  <input
                    type="text"
                    className="form-control"
                    value={merkleRoot}
                    readOnly
                  />
                  <div className="form-text">This Merkle root will be stored in the smart contract.</div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Merkle Proofs</label>
                  <div className="alert alert-success mb-2">
                    <small>✅ <strong>Auto-Downloaded:</strong> merkle-proofs-{eventName || 'event'}-[timestamp].json</small>
                    <br />
                    <small>💡 <strong>Note:</strong> A comprehensive file with all data will be downloaded after contract deployment.</small>
                  </div>
                  {renderMerkleProofsJSON()}
                  <div className="form-text">The Merkle proofs file was automatically downloaded. Distribute these proofs to your participants so they can claim their certificates.</div>
                </div>
                
                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => uploadedImageHash && metadataHash ? setStep(5) : setStep(4)}
                  >
                    {uploadedImageHash && metadataHash ? 'Next: Deploy Contract' : 'Next: Upload Certificate Image'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Step 4: Upload Certificate Image */}
            <div className={`card ${step !== 4 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 4: Upload Certificate Image</h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleUploadToIPFS}>
                  <div className="mb-3">
                    <label htmlFor="certificateImage" className="form-label">Certificate Image</label>
                    <input
                      type="file"
                      className="form-control"
                      id="certificateImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      required
                    />
                    <div className="form-text">Upload an image of the certificate template.</div>
                  </div>
                  
                  {imagePreview && (
                    <div className="mb-3">
                      <label className="form-label">Certificate Preview</label>
                      <div className="border p-2 text-center">
                        <img 
                          src={imagePreview} 
                          alt="Certificate Preview" 
                          className="img-fluid rounded border" 
                          style={{ maxHeight: '300px', maxWidth: '100%' }} 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div style={{ display: 'none' }} className="p-4 bg-light rounded">
                          <div className="mb-2">
                            <i className="fas fa-image text-primary" style={{fontSize: '3rem'}}></i>
                          </div>
                          <div style={{ color: '#ffffff' }}>
                            <strong>Image Preview Not Available</strong>
                            <br />
                            <small style={{ color: '#ffffff' }}>Please check the uploaded file</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setStep(3)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading || !certificateImage}
                    >
                      {loading ? 'Uploading...' : 'Upload to IPFS'}
                    </button>
                  </div>
                </form>
                
                {uploadedImageHash && (
                  <div className="mt-3">
                    <div className="alert alert-success">
                      <p className="mb-1"><strong>Image IPFS Hash:</strong> {uploadedImageHash}</p>
                      <p className="mb-1"><strong>Metadata IPFS Hash:</strong> {metadataHash}</p>
                      <p className="mb-1"><strong>Token URI:</strong> ipfs://{metadataHash}</p>
                      <p className="mb-1"><small>✅ <strong>Auto-Downloaded:</strong> token-uri-{eventName || 'event'}-[timestamp].json</small></p>
                      <p className="mb-1"><small>💡 <strong>Note:</strong> A comprehensive file with all data will be downloaded after contract deployment.</small></p>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        type="button"
                        className="btn btn-outline-info"
                        onClick={() => {
                          const tokenURI = `ipfs://${metadataHash}`;
                          const tokenData = {
                            tokenURI: tokenURI,
                            imageHash: uploadedImageHash,
                            metadataHash: metadataHash,
                            eventDetails: {
                              name: eventName,
                              symbol: eventSymbol,
                              description: eventDescription,
                              date: eventDate
                            },
                            uploadedAt: new Date().toISOString()
                          };

                          const jsonData = JSON.stringify(tokenData, null, 2);
                          const blob = new Blob([jsonData], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);

                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `token-uri-${eventName || 'event'}-${Date.now()}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          setTimeout(() => URL.revokeObjectURL(url), 100);
                        }}
                      >
                        📥 Download Token URI Again
                      </button>

                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => setStep(5)}
                      >
                        Next: Deploy Contract
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 5: Deploy Contract */}
            <div className={`card ${step !== 5 ? 'd-none' : ''}`}>
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Step 5: Deploy Smart Contract</h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleDeployContract}>
                  <p>Review the network fee in your wallet before confirming.</p>

                  {currentGasPrice && (
                <div className="mb-3">
                      <label className="form-label">Current Gas Price</label>
                      <input
                        type="text"
                        className="form-control"
                        value={`${currentGasPrice.toFixed(2)} Gwei`}
                        readOnly
                      />
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <label className="form-label">Contract Details</label>
                    <div className="alert alert-info">
                      <p className="mb-1"><strong>Event Name:</strong> {eventName}</p>
                      <p className="mb-1"><strong>Symbol:</strong> {eventSymbol}</p>
                      <p className="mb-1"><strong>Merkle Root:</strong> {merkleRoot}</p>
                      <p className="mb-1"><strong>Token URI:</strong> ipfs://{metadataHash}</p>
                      <p className="mb-0"><strong>Participants:</strong> {addresses.split('\n').filter(addr => addr.trim() !== '').length} addresses</p>
                    </div>
                </div>
                
                  <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setStep(4)}
                  >
                    Back
                  </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Deploying...' : 'Deploy Contract'}
                  </button>
                </div>
                </form>
              </div>
            </div>
            
            {/* Success Step */}
            {deployedContract && (
              <div className="card">
              <div className="card-header bg-success text-white">
                  <h4 className="mb-0">✅ Deployment Successful!</h4>
              </div>
              <div className="card-body">
                  <div className="alert alert-success">
                    <h5>🎉 Certificate Contract Deployed!</h5>
                    <p className="mb-2"><strong>Contract Address:</strong> {deployedContract}</p>
                    <p className="mb-2"><strong>Network:</strong> {networkName || 'Unknown'}</p>
                    <p className="mb-0">A comprehensive data file has been downloaded with all the information needed for certificate distribution.</p>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <h6 style={{ color: '#ffffff' }}>📋 Next Steps:</h6>
                      <ul style={{ color: '#ffffff' }}>
                        <li>Share the contract address with participants</li>
                        <li>Distribute the Merkle proofs file</li>
                        <li>Participants can claim their certificates</li>
                        <li>Monitor analytics in the dashboard</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6 style={{ color: '#ffffff' }}>🔗 Useful Links:</h6>
                      <ul style={{ color: '#ffffff' }}>
                        <li><a href={`https://sepolia.etherscan.io/address/${deployedContract}`} target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff' }}>View on Etherscan</a></li>
                        <li><a href="/verify" style={{ color: '#ffffff' }}>Verify Certificates</a></li>
                        <li><a href="/my-certificates" style={{ color: '#ffffff' }}>View My Certificates</a></li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      className="btn btn-primary me-2"
                      onClick={() => {
                        setStep(1);
                        setActiveTab('analytics');
                        setAnalyticsContractAddress(deployedContract);
                      }}
                    >
                      View Analytics
                    </button>
                    <button
                      type="button"
                      className="btn btn-info me-2"
                      onClick={() => {
                        // Download comprehensive details again
                        const comprehensiveData = {
                          contractAddress: deployedContract,
                          network: networkName || 'Sepolia',
                          deployedAt: new Date().toISOString(),
                          eventDetails: {
                            name: eventName,
                            symbol: eventSymbol,
                            description: eventDescription,
                            date: eventDate
                          },
                          tokenURI: `ipfs://${metadataHash}`,
                          imageHash: uploadedImageHash,
                          metadataHash: metadataHash,
                          merkleRoot: merkleRoot,
                          merkleProofs: merkleProofs,
                          participants: addresses.split('\n').filter(addr => addr.trim() !== ''),
                          deploymentMode: 'wallet',
                          gasPrice: currentGasPrice
                        };

                        const jsonData = JSON.stringify(comprehensiveData, null, 2);
                        const blob = new Blob([jsonData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);

                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `certificate-deployment-${eventName || 'event'}-${Date.now()}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        setTimeout(() => URL.revokeObjectURL(url), 100);
                      }}
                    >
                      📥 Download Details Again
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setStep(1);
                        setEventName('');
                        setEventSymbol('');
                        setEventDescription('');
                        setEventDate('');
                        setAddresses('');
                        setCertificateImage(null);
                        setContractAddress('');
                        setMerkleRoot('');
                        setDeployedContract('');
                        setMerkleProofs(null);
                        setImagePreview(null);
                        setUploadedImageHash('');
                        setMetadataHash('');
                      }}
                    >
                      Create New Certificate
                    </button>
                  </div>
                  </div>
              </div>
            )}
            </div>
        </motion.div>
      )}
            
      {/* Error and Success Messages */}
            {error && (
        <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}

            {successMsg && (
        <div className="alert alert-success mt-3" role="alert">
                {successMsg}
              </div>
            )}
    </motion.div>
  );
};

export default OrganizerPortal; 
