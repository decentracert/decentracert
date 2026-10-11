import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, validAddress, verificationUrl } from '../utils/apiUtils';
import { readContracts, saveContract, writeContracts } from '../utils/storageUtils';
import AnalyticsDashboard from './analyticsDashboard';

function MyCertificatesDashboard({ account, provider, connectWallet, cfg }) {
  const [contracts, setContracts] = useState(readContracts);
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [showClaims, setShowClaims] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setResult(null);
    setError('');
    setBusy(false);
    setShowClaims(false);
    return () => { requestId.current += 1; };
  }, [account, cfg?.chainId]);

  const lookup = async addr => {
    setError('');
    setNote('');
    setResult(null);
    setShowClaims(false);
    if (!validAddress(addr)) return setError('Enter a valid certificate contract address.');
    const id = ++requestId.current;
    setBusy(true);
    try {
      const data = await apiJson(`/api/certificates/${addr}/${account}`);
      if (id !== requestId.current) return;
      setResult(data);
      if (!saveContract(data.contractAddress, data.chainId, data.name)) setNote('Browser storage is unavailable. Keep a copy of the contract address.');
      setContracts(readContracts());
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };
  const forget = addr => {
    const list = contracts.filter(item => item.chainId !== cfg.chainId || item.address !== addr);
    if (!writeContracts(list)) setNote('The browser could not save this change.');
    setContracts(list);
  };
  const saved = contracts.filter(item => item.chainId === cfg?.chainId);

  return (
    <section className="formPanel">
      <div className="pageHeader"><span className="eyebrow">Saved records / {cfg?.networkName || 'Loading network'}</span><h1>My certificates</h1><p>Look up an event contract for your wallet. Saved contract addresses stay in this browser.</p></div>
      {!account ? <div className="connectPanel"><p>Connect your wallet to check certificates from the events you have saved.</p><button className="btn btnPrimary" onClick={connectWallet}>Connect wallet</button></div> : <>
        <div className="panel"><div className="panelBody">
          <form onSubmit={e => { e.preventDefault(); lookup(address.trim()); }}>
            <label className="fieldLabel" htmlFor="savedContract">Contract address</label>
            <input id="savedContract" className="fieldInput hash spaceBottom" value={address} onChange={e => { setAddress(e.target.value); setResult(null); setError(''); }} placeholder="0x..." maxLength={42} spellCheck={false} required disabled={busy} />
            <button className="btn btnPrimary" disabled={busy || !cfg}>{busy ? 'Checking...' : 'Find certificate'}</button>
          </form>
          {error && <p className="notice noticeError" role="alert">{error}</p>}
          {note && <p className="notice" role="status">{note}</p>}
          {result && <div className="claimResult" aria-live="polite"><h2>{result.name}</h2><p>{result.verified ? 'Certificate found for this wallet.' : 'No verified certificate found for this wallet.'}</p><div className="actions"><Link to={verificationUrl(result.contractAddress, result.wallet, result.chainId)}>View verification record</Link>{result.issuer.toLowerCase() === account.toLowerCase() && !result.legacy && <button className="btn btnSecondary" aria-expanded={showClaims} onClick={() => setShowClaims(value => !value)}>{showClaims ? 'Hide event claims' : 'View event claims'}</button>}</div>{showClaims && <AnalyticsDashboard contractAddress={result.contractAddress} provider={provider} chainId={result.chainId} />}</div>}
        </div></div>
        <div className="panel spaceTop"><div className="panelBody"><h2>Saved contracts</h2><p>{cfg?.networkName || 'Loading network...'}</p>
          {!saved.length ? <p>No saved contracts yet. Add one from your organizer's claim file.</p> : <ul className="savedContracts">{saved.map(item => <li key={item.address}><strong>{item.name}</strong><p className="hash">{item.address}</p><div className="actions"><button className="btn btnSecondary" onClick={() => lookup(item.address)} disabled={busy}>Check wallet</button><button className="btn btnSecondary" onClick={() => forget(item.address)}>Forget</button></div></li>)}</ul>}
        </div></div>
      </>}
    </section>
  );
}

export default MyCertificatesDashboard;
