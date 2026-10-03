import React, { useState, useEffect, useCallback } from 'react';
import { getContractAnalytics, getRealTimeStats, exportAnalyticsToCSV } from '../utils/analyticsUtils';

const AnalyticsDashboard = ({ contractAddress, provider }) => {
  const [analytics, setAnalytics] = useState(null);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!contractAddress || !provider) return;
    
    setLoading(true);
    setError('');
    
    try {
      const [analyticsData, statsData] = await Promise.all([
        getContractAnalytics(contractAddress, provider),
        getRealTimeStats(contractAddress, provider)
      ]);
      
      if (analyticsData.success) {
        setAnalytics(analyticsData);
      } else {
        setError(analyticsData.error);
      }
      
      if (statsData.success) {
        setRealTimeStats(statsData);
      }
      
    } catch (err) {
      setError('Failed to fetch analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [contractAddress, provider]);

  useEffect(() => {
    fetchAnalytics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Export data to CSV
  const handleExportCSV = () => {
    if (!analytics) return;
    
    const csvData = exportAnalyticsToCSV(analytics);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-analytics-${analytics.stats.contractName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !analytics) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading analytics...</span>
        </div>
        <p className="mt-2">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5>❌ Analytics Error</h5>
        <p>{error}</p>
        <button className="btn btn-outline-danger" onClick={fetchAnalytics}>
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="alert alert-info">
        <h5>📊 Analytics Dashboard</h5>
        <p>Enter a contract address to view analytics.</p>
      </div>
    );
  }

  const { stats, claimants, claimsByDate, gasMetrics } = analytics;

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">📊 Analytics Dashboard</h3>
          <p style={{ color: '#ffffff' }} className="mb-0">{stats.contractName} ({stats.contractSymbol})</p>
        </div>
        <div className="btn-group">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
          <button 
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸️ Stop Auto-Refresh' : '▶️ Auto-Refresh'}
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={handleExportCSV}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Real-time Stats Bar */}
      {realTimeStats && (
        <div className="alert alert-info mb-4">
          <div className="row text-center">
            <div className="col-md-3">
              <strong>📈 Live Certificates</strong><br />
              <span className="h4">{realTimeStats.totalCertificates}</span>
            </div>
            <div className="col-md-3">
              <strong>🔥 Recent Activity</strong><br />
              <span className="h4">{realTimeStats.recentActivity}</span>
            </div>
            <div className="col-md-3">
              <strong>📦 Current Block</strong><br />
              <span className="h4">{realTimeStats.currentBlock}</span>
            </div>
            <div className="col-md-3">
              <strong>⏰ Last Updated</strong><br />
              <span className="small">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h2 className="card-title">{stats.totalCertificates}</h2>
              <p className="card-text">Total Certificates</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h2 className="card-title">{stats.totalClaimants}</h2>
              <p className="card-text">Unique Claimants</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body text-center">
              <h2 className="card-title">{parseInt(stats.averageGasPerClaim).toLocaleString()}</h2>
              <p className="card-text">Avg Gas/Claim</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h2 className="card-title">{gasMetrics.efficiency}</h2>
              <p className="card-text">Gas Efficiency</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        {/* Claims Timeline */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 style={{ color: '#ffffff' }} >📈 Claims Timeline</h5>
            </div>
            <div className="card-body">
              {claimsByDate.length > 0 ? (
                <div className="timeline-chart">
                  {claimsByDate.map((day, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                      <span style={{ color: '#ffffff' }} className="small">{new Date(day.date).toLocaleDateString()}</span>
                      <div className="progress flex-grow-1 mx-2" style={{height: '20px'}}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{width: `${(day.count / Math.max(...claimsByDate.map(d => d.count))) * 100}%`}}
                        >
                          {day.count}
                        </div>
                      </div>
                      <span className="badge bg-secondary">{day.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#ffffff' }}>No claims data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Gas Usage Analysis */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5 style={{ color: '#ffffff' }} >⛽ Gas Usage Analysis</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <strong style={{ color: '#ffffff' }} >Min Gas:</strong><br />
                  <span className="text-success">{parseInt(gasMetrics.minGas).toLocaleString()}</span>
                </div>
                <div className="col-6">
                  <strong style={{ color: '#ffffff' }} >Max Gas:</strong><br />
                  <span className="text-danger">{parseInt(gasMetrics.maxGas).toLocaleString()}</span>
                </div>
                <div className="col-6 mt-2">
                  <strong style={{ color: '#ffffff' }} >Average:</strong><br />
                  <span className="text-primary">{parseInt(gasMetrics.avgGas).toLocaleString()}</span>
                </div>
                <div className="col-6 mt-2">
                  <strong style={{ color: '#ffffff' }} >Total Cost:</strong><br />
                  <span className="text-warning">{parseFloat(gasMetrics.totalGasCost).toFixed(4)} ETH</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="progress">
                  <div className="progress-bar bg-success" style={{width: '30%'}}>Min</div>
                  <div className="progress-bar bg-primary" style={{width: '40%'}}>Avg</div>
                  <div className="progress-bar bg-danger" style={{width: '30%'}}>Max</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claimants Table */}
      <div className="card">
        <div className="card-header">
          <h5 style={{ color: '#ffffff' }} >👥 Certificate Claimants ({claimants.length})</h5>
        </div>
        <div className="card-body">
          {claimants.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Wallet Address</th>
                    <th>Token ID</th>
                    <th>Claim Date</th>
                    <th>Gas Used</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {claimants.slice(0, 10).map((claimant, index) => (
                    <tr key={index}>
                      <td>
                        <code className="small">{claimant.address.slice(0, 6)}...{claimant.address.slice(-4)}</code>
                      </td>
                      <td>#{claimant.tokenId}</td>
                      <td>{new Date(claimant.timestamp * 1000).toLocaleDateString()}</td>
                      <td>{parseInt(claimant.gasUsed).toLocaleString()}</td>
                      <td>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${claimant.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {claimants.length > 10 && (
                <p style={{ color: '#ffffff' }} className="text-center">
                  Showing first 10 claimants. Export CSV for complete data.
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#ffffff' }}>No claimants yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
