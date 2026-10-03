import { ethers } from 'ethers';

/**
 * Analytics utilities for certificate contract data
 * Provides real-time analytics for organizers
 */

// Contract ABI for analytics queries
const ANALYTICS_ABI = [
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function hasSoulboundCertificate(address) view returns (bool)",
  "function getSoulboundCertificateDetails(address) view returns (bool exists, uint256 tokenId, string memory uri)",
  "event SoulboundCertificateIssued(address indexed soul, uint256 indexed tokenId, string tokenUri)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

/**
 * Get comprehensive analytics for a certificate contract
 */
export const getContractAnalytics = async (contractAddress, provider) => {
  try {
    console.log('📊 Fetching analytics for contract:', contractAddress);
    
    const contract = new ethers.Contract(contractAddress, ANALYTICS_ABI, provider);
    
    // Basic contract info
    const [totalSupply, contractName, contractSymbol] = await Promise.all([
      contract.totalSupply(),
      contract.name(),
      contract.symbol()
    ]);

    // Get all certificate issuance events
    const certificateEvents = await contract.queryFilter("SoulboundCertificateIssued", 0, "latest");

    // Process events for analytics
    const claimants = [];
    const timeline = [];
    let totalGasUsed = ethers.BigNumber.from(0);

    for (const event of certificateEvents) {
      const block = await provider.getBlock(event.blockNumber);
      const transaction = await provider.getTransaction(event.transactionHash);
      const receipt = await provider.getTransactionReceipt(event.transactionHash);

      const claimData = {
        address: event.args.soul,
        tokenId: event.args.tokenId.toString(),
        tokenURI: event.args.tokenUri,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: block.timestamp,
        gasUsed: receipt.gasUsed,
        gasPrice: transaction.gasPrice,
        gasCost: receipt.gasUsed.mul(transaction.gasPrice)
      };

      claimants.push(claimData);
      timeline.push({
        date: new Date(block.timestamp * 1000),
        count: claimants.length,
        gasUsed: receipt.gasUsed.toString(),
        address: event.args.soul
      });

      totalGasUsed = totalGasUsed.add(receipt.gasUsed);
    }

    // Calculate statistics
    const stats = {
      totalCertificates: totalSupply.toString(),
      totalClaimants: claimants.length,
      totalGasUsed: totalGasUsed.toString(),
      averageGasPerClaim: claimants.length > 0 ? totalGasUsed.div(claimants.length).toString() : '0',
      contractName,
      contractSymbol,
      contractAddress,
      lastUpdated: new Date().toISOString()
    };

    // Group claimants by date for charts
    const claimsByDate = groupClaimsByDate(claimants);
    
    // Calculate gas efficiency metrics
    const gasMetrics = calculateGasMetrics(claimants);

    return {
      stats,
      claimants,
      timeline,
      claimsByDate,
      gasMetrics,
      success: true
    };

  } catch (error) {
    console.error('Error fetching contract analytics:', error);
    return {
      error: error.message,
      success: false
    };
  }
};

/**
 * Group claimants by date for timeline charts
 */
const groupClaimsByDate = (claimants) => {
  const grouped = {};
  
  claimants.forEach(claim => {
    const date = new Date(claim.timestamp * 1000).toDateString();
    if (!grouped[date]) {
      grouped[date] = {
        date,
        count: 0,
        addresses: [],
        totalGas: ethers.BigNumber.from(0)
      };
    }
    grouped[date].count++;
    grouped[date].addresses.push(claim.address);
    grouped[date].totalGas = grouped[date].totalGas.add(claim.gasUsed);
  });

  return Object.values(grouped).map(day => ({
    ...day,
    totalGas: day.totalGas.toString()
  }));
};

/**
 * Calculate gas efficiency metrics
 */
const calculateGasMetrics = (claimants) => {
  if (claimants.length === 0) {
    return {
      minGas: '0',
      maxGas: '0',
      avgGas: '0',
      totalGasCost: '0',
      efficiency: 'N/A'
    };
  }

  const gasAmounts = claimants.map(c => ethers.BigNumber.from(c.gasUsed));
  const gasCosts = claimants.map(c => c.gasCost);
  
  const minGas = gasAmounts.reduce((min, current) => current.lt(min) ? current : min);
  const maxGas = gasAmounts.reduce((max, current) => current.gt(max) ? current : max);
  const totalGas = gasAmounts.reduce((sum, current) => sum.add(current), ethers.BigNumber.from(0));
  const avgGas = totalGas.div(claimants.length);
  
  const totalGasCost = gasCosts.reduce((sum, current) => sum.add(current), ethers.BigNumber.from(0));

  return {
    minGas: minGas.toString(),
    maxGas: maxGas.toString(),
    avgGas: avgGas.toString(),
    totalGasCost: ethers.utils.formatEther(totalGasCost),
    efficiency: calculateEfficiencyScore(gasAmounts)
  };
};

/**
 * Calculate efficiency score based on gas usage consistency
 */
const calculateEfficiencyScore = (gasAmounts) => {
  if (gasAmounts.length < 2) return 'Perfect';
  
  const avg = gasAmounts.reduce((sum, current) => sum.add(current), ethers.BigNumber.from(0)).div(gasAmounts.length);
  const variance = gasAmounts.reduce((sum, current) => {
    const diff = current.sub(avg);
    return sum.add(diff.mul(diff));
  }, ethers.BigNumber.from(0)).div(gasAmounts.length);
  
  const stdDev = Math.sqrt(parseFloat(ethers.utils.formatUnits(variance, 0)));
  const avgFloat = parseFloat(ethers.utils.formatUnits(avg, 0));
  
  const coefficientOfVariation = stdDev / avgFloat;
  
  if (coefficientOfVariation < 0.05) return 'Excellent';
  if (coefficientOfVariation < 0.1) return 'Good';
  if (coefficientOfVariation < 0.2) return 'Fair';
  return 'Poor';
};

/**
 * Get real-time contract statistics
 */
export const getRealTimeStats = async (contractAddress, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, ANALYTICS_ABI, provider);
    
    const totalSupply = await contract.totalSupply();
    const latestBlock = await provider.getBlockNumber();
    
    // Get recent activity (last 100 blocks)
    const recentEvents = await contract.queryFilter(
      "SoulboundCertificateIssued", 
      Math.max(0, latestBlock - 100), 
      "latest"
    );

    return {
      totalCertificates: totalSupply.toString(),
      recentActivity: recentEvents.length,
      lastActivity: recentEvents.length > 0 ? recentEvents[recentEvents.length - 1].blockNumber : 0,
      currentBlock: latestBlock,
      success: true
    };
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    return {
      error: error.message,
      success: false
    };
  }
};

/**
 * Export analytics data to CSV format
 */
export const exportAnalyticsToCSV = (analyticsData) => {
  const { claimants, stats } = analyticsData;
  
  const headers = [
    'Wallet Address',
    'Token ID', 
    'Claim Date',
    'Transaction Hash',
    'Gas Used',
    'Gas Cost (ETH)',
    'Block Number'
  ];

  const rows = claimants.map(claim => [
    claim.address,
    claim.tokenId,
    new Date(claim.timestamp * 1000).toLocaleString(),
    claim.transactionHash,
    claim.gasUsed.toString(),
    ethers.utils.formatEther(claim.gasCost),
    claim.blockNumber
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Add summary at the top
  const summary = [
    `Certificate Analytics Report - ${stats.contractName}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Total Certificates: ${stats.totalCertificates}`,
    `Total Claimants: ${stats.totalClaimants}`,
    `Contract Address: ${stats.contractAddress}`,
    '',
    ''
  ].join('\n');

  return summary + csvContent;
};

/**
 * Check if address has claimed certificate (for quick lookups)
 */
export const checkAddressClaimed = async (contractAddress, address, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, ANALYTICS_ABI, provider);
    const hasCertificate = await contract.hasSoulboundCertificate(address);
    
    if (hasCertificate) {
      const [, tokenId, uri] = await contract.getSoulboundCertificateDetails(address);
      return {
        hasCertificate: true,
        tokenId: tokenId.toString(),
        uri,
        success: true
      };
    }
    
    return {
      hasCertificate: false,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  }
};
