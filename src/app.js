import { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import StudentPortal from './components/studentPortal';
import OrganizerPortal from './components/organizerPortal';
import CertificateVerifier from './components/certificateVerifier';
import MyCertificatesDashboard from './components/myCertificatesDashboard';
import Navbar from './components/navbar';
import HomePage from './components/homePage';
import { apiJson } from './utils/apiUtils';
import './app.css';

function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
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
    if (isConnecting) return;
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

  return <div className="app">
    <a className="skipLink" href="#main">Skip to content</a>
    <Navbar account={account} connectWallet={connectWallet} disconnectWallet={disconnectWallet} isConnecting={isConnecting} networkName={account ? networkName : cfg?.networkName} />
    {(configError || (account && cfg && chainId !== cfg.chainId)) && <div className="container globalNotice"><p className="notice noticeWarning" role="alert">{configError || 'Switch your wallet to ' + cfg.networkName + ' to issue or claim certificates.'}</p></div>}
    {error && <div className="container globalNotice"><p className="notice noticeError" role="alert">{error}</p></div>}
    <main id="main" className="container mainContent" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<HomePage cfg={cfg} />} />
        <Route path="/student" element={<StudentPortal account={account} provider={provider} signer={chainId === cfg?.chainId ? signer : null} cfg={cfg} connectWallet={connectWallet} />} />
        <Route path="/organizer" element={<OrganizerPortal account={account} provider={provider} signer={chainId === cfg?.chainId ? signer : null} cfg={cfg} connectWallet={connectWallet} />} />
        <Route path="/verify" element={<CertificateVerifier cfg={cfg} />} />
        <Route path="/my-certificates" element={<MyCertificatesDashboard account={account} provider={provider} cfg={cfg} connectWallet={connectWallet} />} />
        <Route path="*" element={<section className="pageHeader"><span className="eyebrow">404</span><h1>Page not found</h1><p>This address does not lead to a certificate page.</p><Link className="btn btnSecondary spaceTop" to="/">Open the workspace</Link></section>} />
      </Routes>
    </main>
    <footer className="siteFooter"><div className="container footerBar"><span>DecentraCert / Event certificates on test networks.</span><a href="https://github.com/decentracert/decentracert" target="_blank" rel="noreferrer">Source on GitHub</a></div></footer>
  </div>;
}

export default App;
