import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, validAddress, verificationUrl } from '../utils/apiUtils';
import { readContracts, saveContract, writeContracts } from '../utils/storageUtils';

function MyCertificatesDashboard({ account, connectWallet, cfg }) {
  const [contracts, setContracts] = useState(readContracts);
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setResult(null);
    setError('');
    setBusy(false);
    return () => { requestId.current += 1; };
  }, [account, cfg?.chainId]);

  const lookup = async addr => {
    setError('');
    setNote('');
    setResult(null);
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
    writeContracts(list);
    setContracts(list);
  };
  const saved = contracts.filter(item => item.chainId === cfg?.chainId);

  return (
    <section>
      <div className="portal-header"><h1>My certificates</h1><p>Look up an event contract for your wallet. Saved contract addresses stay in this browser.</p></div>
      {!account ? <button className="btn btn-primary" onClick={connectWallet}>Connect wallet</button> : <>
        <div className="card premium-portal-card"><div className="card-body text-light">
          <form onSubmit={e => { e.preventDefault(); lookup(address.trim()); }}>
            <label className="form-label" htmlFor="savedContract">Contract address</label>
            <input id="savedContract" className="form-control mb-3" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." required disabled={busy} />
            <button className="btn btn-primary" disabled={busy || !cfg}>{busy ? 'Checking...' : 'Find certificate'}</button>
          </form>
          {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
          {note && <p role="status">{note}</p>}
          {result && <div className="mt-4" aria-live="polite"><h2>{result.name}</h2><p>{result.verified ? 'Certificate found for this wallet.' : 'No verified certificate found for this wallet.'}</p><Link to={verificationUrl(result.contractAddress, result.wallet, result.chainId)}>View verification record</Link></div>}
        </div></div>
        <div className="card premium-portal-card mt-4"><div className="card-body text-light"><h2>Saved contracts</h2><p>{cfg?.networkName || 'Loading network...'}</p>
          {!saved.length ? <p>No saved contracts yet. Add one from your organizer's claim file.</p> : <ul className="saved-contracts">{saved.map(item => <li key={item.address}><strong>{item.name}</strong><p style={{ overflowWrap: 'anywhere' }}>{item.address}</p><div className="d-flex gap-2"><button className="btn btn-secondary" onClick={() => lookup(item.address)} disabled={busy}>Check wallet</button><button className="btn btn-secondary" onClick={() => forget(item.address)}>Forget</button></div></li>)}</ul>}
        </div></div>
      </>}
    </section>
  );
}

export default MyCertificatesDashboard;
