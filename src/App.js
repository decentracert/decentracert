import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import StudentPortal from './components/StudentPortal';
import OrganizerPortal from './components/OrganizerPortal';
import CertificateVerifier from './components/CertificateVerifier';
import MyCertificatesDashboard from './components/MyCertificatesDashboard';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import { apiJson } from './utils/apiUtils';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [networkName, setNetworkName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [chainId, setChainId] = useState(0);
  const [cfg, setCfg] = useState(null);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    apiJson('/api/config', { signal: ctrl.signal }).then(setCfg).catch(err => {
      if (err.name !== 'AbortError') setConfigError('Could not load the server network. Reload the page to try again.');
    });
    return () => ctrl.abort();
  }, []);

  const setWallet = (nextProvider, accounts, chainId) => {
    setProvider(nextProvider);
    setAccount(accounts[0] || '');
    setSigner(accounts.length ? nextProvider.getSigner(accounts[0]) : null);
    setChainId(chainId);
    setNetworkName(chainId === 11155111 ? 'sepolia' : chainId === 31337 ? 'local' : String(chainId));
    setError('');
  };

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet) return;
    let active = true;
    let version = 0;
    const syncWallet = async () => {
      const id = ++version;
      setSigner(null);
      try {
        const nextProvider = new ethers.providers.Web3Provider(wallet, 'any');
        const [accounts, network] = await Promise.all([nextProvider.listAccounts(), nextProvider.getNetwork()]);
        if (active && id === version) setWallet(nextProvider, accounts, network.chainId);
      } catch {
        if (active && id === version) {
          setAccount('');
          setProvider(null);
          setSigner(null);
        }
      }
    };
    syncWallet();
    wallet.on?.('accountsChanged', syncWallet);
    wallet.on?.('chainChanged', syncWallet);
    return () => {
      active = false;
      wallet.removeListener?.('accountsChanged', syncWallet);
      wallet.removeListener?.('chainChanged', syncWallet);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Install MetaMask to issue or claim certificates. Public verification works without a wallet.');
      return;
    }
    setIsConnecting(true);
    setError('');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const nextProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      const network = await nextProvider.getNetwork();
      setWallet(nextProvider, accounts, network.chainId);
    } catch (err) {
      setError(err.code === 4001 ? 'Wallet connection cancelled.' : 'Could not connect your wallet. Try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setSigner(null);
    setError('');
  };

  return (
    <motion.div
      className="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar
        account={account}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        isConnecting={isConnecting}
        networkName={networkName}
      />

      {(configError || (account && cfg && chainId !== cfg.chainId)) && <div className="container mt-3"><p className="alert alert-warning" role="alert">{configError || 'Switch your wallet to ' + cfg.networkName + ' to issue or claim certificates.'}</p></div>}
      <AnimatePresence>
        {error && (
          <motion.div
            className="container mt-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="alert alert-danger premium-alert" role="alert">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="container py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Routes>
          <Route path="/" element={<HomePage account={account} connectWallet={connectWallet} />} />
          <Route
            path="/student"
            element={
              <StudentPortal
                account={account}
                provider={provider}
                signer={chainId === cfg?.chainId ? signer : null}
                cfg={cfg}
                connectWallet={connectWallet}
              />
            }
          />
          <Route
            path="/organizer"
            element={
              <OrganizerPortal
                account={account}
                provider={provider}
                signer={chainId === cfg?.chainId ? signer : null}
                cfg={cfg}
                connectWallet={connectWallet}
              />
            }
          />
          <Route
            path="/verify"
            element={<CertificateVerifier />}
          />
          <Route
            path="/my-certificates"
            element={
              <MyCertificatesDashboard
                account={account}
                provider={provider}
                cfg={cfg}
                connectWallet={connectWallet}
              />
            }
          />
        </Routes>
      </motion.div>

      <motion.footer
        className="footer mt-auto py-4 premium-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="container text-center">
          <span className="text-muted body-font">DecentraCert &copy; {new Date().getFullYear()}</span>
        </div>
      </motion.footer>
    </motion.div>
  );
}

export default App;
