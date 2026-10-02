import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiJson, publicUrl, readMetadata, validAddress, verificationUrl } from '../utils/apiUtils';

function CertificateVerifier() {
  const [params, setParams] = useSearchParams();
  const [contractAddress, setContractAddress] = useState(params.get('contract') || '');
  const [walletAddress, setWalletAddress] = useState(params.get('wallet') || '');
  const [result, setResult] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [metaError, setMetaError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const query = params.toString();

  useEffect(() => {
    const values = new URLSearchParams(query);
    const addr = values.get('contract') || '';
    const wallet = values.get('wallet') || '';
    setContractAddress(addr);
    setWalletAddress(wallet);
    setResult(null);
    setError('');
    setCopied(false);
    if (!addr && !wallet) return;
    if (!validAddress(addr) || !validAddress(wallet)) {
      setError('Enter valid contract and wallet addresses.');
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let active = true;
    setBusy(true);
    apiJson(`/api/certificates/${addr}/${wallet}`, { signal: ctrl.signal }).then(data => {
      if (values.has('chain') && Number(values.get('chain')) !== data.chainId) throw new Error('This link is for a different network than this server.');
      if (active) setResult(data);
    }).catch(err => {
      if (active) setError(err.name === 'AbortError' ? 'Verification timed out. Try again.' : err.message);
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [query, refresh]);

  useEffect(() => {
    setMetadata(null);
    setMetaError('');
    if (!result?.verified || !result.metadataUri) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let active = true;
    readMetadata(result.metadataUri, ctrl.signal).then(data => {
      if (active) setMetadata(data);
    }).catch(() => {
      if (active) setMetaError('Metadata preview is unavailable. You can still check the ownership record.');
    });
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [result]);

  const submit = e => {
    e.preventDefault();
    setError('');
    if (!validAddress(contractAddress) || !validAddress(walletAddress)) return setError('Enter valid contract and wallet addresses.');
    setParams({ contract: contractAddress, wallet: walletAddress });
    setRefresh(value => value + 1);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + verificationUrl(result.contractAddress, result.wallet, result.chainId));
      setCopied(true);
    } catch {
      setError('Clipboard access was denied. Copy the address from your browser instead.');
    }
  };

  return (
    <section className="certificate-verifier">
      <div className="portal-header"><h1>Verify a certificate</h1><p>Check a wallet against an event contract. No wallet connection needed.</p></div>
      <div className="card premium-portal-card"><div className="card-body text-light">
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <div className="mb-3"><label htmlFor="verifyContract" className="form-label">Contract address</label><input id="verifyContract" className="form-control" value={contractAddress} onChange={e => { setContractAddress(e.target.value.trim()); setResult(null); }} placeholder="0x..." required /></div>
            <div className="mb-3"><label htmlFor="verifyWallet" className="form-label">Wallet address</label><input id="verifyWallet" className="form-control" value={walletAddress} onChange={e => { setWalletAddress(e.target.value.trim()); setResult(null); }} placeholder="0x..." required /></div>
            <button className="btn btn-primary" type="submit">{busy ? 'Checking the chain...' : 'Verify certificate'}</button>
          </fieldset>
        </form>
        {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
      </div></div>
      {result && <div className="card premium-portal-card mt-4"><div className="card-body text-light">
        <p className={`alert ${result.verified ? 'alert-success' : 'alert-warning'}`} role="status">{result.verified ? 'Ownership confirmed' : result.hasClaimed ? 'Ownership mismatch. This record could not be verified.' : 'No certificate found for this wallet.'}</p>
        <h2>{result.name}</h2>
        <dl className="record-details">
          <dt>Network</dt><dd>{result.chainId === 31337 ? 'Local Hardhat' : 'Sepolia'} ({result.chainId})</dd>
          <dt>Issuer wallet</dt><dd>{result.issuer}</dd>
          <dt>Recipient wallet</dt><dd>{result.wallet}</dd>
          <dt>Contract</dt><dd>{result.contractAddress}</dd>
          {result.tokenId && <><dt>Token ID</dt><dd>{result.tokenId}</dd></>}
        </dl>
        <p>Confirm the contract and issuer address with the event organizer before relying on this record.</p>
        {result.legacy && <p className="alert alert-warning">This is an older contract. Claimants could choose their own metadata, so the preview is not an issuer-bound record.</p>}
        {metadata && <div className="certificate-preview">
          {metadata.image && <img src={metadata.image} alt={metadata.name || 'Event certificate'} style={{ maxWidth: '100%' }} onError={e => { e.currentTarget.hidden = true; setMetaError('The image preview could not be loaded.'); }} />}
          <h3>{metadata.name}</h3><p>{metadata.description}</p>
          {metadata.attributes.length > 0 && <dl>{metadata.attributes.map((attr, idx) => <div key={idx}><dt>{attr.name}</dt><dd>{attr.value}</dd></div>)}</dl>}
        </div>}
        {metaError && <p role="status">{metaError}</p>}
        {result.metadataUri && publicUrl(result.metadataUri) && <p><a href={publicUrl(result.metadataUri)} target="_blank" rel="noreferrer">View metadata</a></p>}
        <button className="btn btn-secondary" onClick={copyLink}>{copied ? 'Link copied' : 'Copy verification link'}</button>
      </div></div>}
    </section>
  );
}

export default CertificateVerifier;
