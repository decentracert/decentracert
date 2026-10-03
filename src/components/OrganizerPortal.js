import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateAllMerkleProofs } from '../utils/merkleUtils';
import { deployCertificateContract } from '../utils/contractUtils';
import { apiJson } from '../utils/apiUtils';
import { drawCertificate } from '../utils/certificateImage';
import { downloadFile, downloadJson } from '../utils/fileUtils';
import { saveContract } from '../utils/storageUtils';
import AnalyticsDashboard from './AnalyticsDashboard';

function OrganizerPortal({ account, provider, signer, connectWallet, cfg }) {
  const [event, setEvent] = useState({ name: '', symbol: '', description: '', date: '', organizer: '' });
  const [addresses, setAddresses] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [framed, setFramed] = useState(true);
  const [mode, setMode] = useState('upload');
  const [metadataUri, setMetadataUri] = useState('');
  const [uploadKey, setUploadKey] = useState('');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showClaims, setShowClaims] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updateEvent = e => setEvent(value => ({ ...value, [e.target.name]: e.target.value }));
  const selectFile = e => {
    const next = e.target.files[0];
    setError('');
    if (!next) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type) || next.size > 5 * 1024 * 1024) {
      setFile(null);
      return setError('Choose a PNG, JPEG or WebP image under 5 MB.');
    }
    setFile(next);
  };
  const makeTemplate = async () => {
    setError('');
    try { setFile(await drawCertificate(event, framed)); }
    catch (err) { setError(err.message); }
  };

  const publish = async e => {
    e.preventDefault();
    setError('');
    if (!signer || !cfg) return setError('Connect your wallet to the server network before publishing.');
    setBusy(true);
    try {
      const list = addresses.trim().split(/[\s,;]+/).filter(Boolean);
      const tree = generateAllMerkleProofs(list);
      const issuer = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      if (network.chainId !== cfg.chainId) throw new Error('Switch your wallet to ' + cfg.networkName + '.');
      let uri = metadataUri.trim();
      if (mode === 'upload') {
        if (!cfg.uploadsEnabled) throw new Error('Uploads are not configured. Use an existing IPFS metadata URI.');
        if (!uploadKey.trim()) throw new Error('Enter the organizer upload key.');
        if (!file) throw new Error('Choose an image or make a certificate template.');
        setStatus('Uploading the certificate image...');
        const form = new FormData();
        form.append('file', file);
        const image = await apiJson('/api/upload-ipfs', { method: 'POST', headers: { 'X-Upload-Key': uploadKey }, body: form });
        const metadata = {
          name: event.name.trim(),
          description: event.description.trim(),
          image: image.uri,
          attributes: [
            { trait_type: 'Event date', value: event.date },
            { trait_type: 'Organizer', value: event.organizer.trim() },
            { trait_type: 'Issuer wallet', value: issuer }
          ]
        };
        setStatus('Uploading event metadata...');
        const data = await apiJson('/api/upload-metadata', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Key': uploadKey }, body: JSON.stringify(metadata)
        });
        uri = data.uri;
      }
      if (!/^ipfs:\/\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})(\/[a-zA-Z0-9._/-]+)?$/.test(uri)) throw new Error('Enter an IPFS URI for the metadata JSON.');
      if ((await signer.provider.getNetwork()).chainId !== network.chainId || (await signer.getAddress()).toLowerCase() !== issuer.toLowerCase()) throw new Error('The wallet changed. Check your account and network, then try again.');
      setStatus('Confirm the deployment in your wallet. Waiting for a receipt...');
      const contract = await deployCertificateContract({ name: event.name.trim(), symbol: event.symbol.trim(), metadataUri: uri }, tree.merkleRoot, signer);
      if (active.current) {
        saveContract(contract.address, network.chainId, event.name.trim());
        setCreated({
          version: 1, chainId: network.chainId, contractAddress: contract.address, issuer,
          eventName: event.name.trim(), merkleRoot: tree.merkleRoot, metadataUri: uri, proofs: tree.proofs
        });
        setUploadKey('');
        setStatus('Event published. Save the claim file and share it with your participants.');
      }
    } catch (err) {
      if (active.current) {
        setStatus('');
        setError(err.code === 4001 || err.code === 'ACTION_REJECTED' ? 'Deployment cancelled in your wallet.' : err.reason || err.message || 'Could not publish the event.');
      }
    } finally {
      if (active.current) setBusy(false);
    }
  };

  return (
    <section className="organizer-portal">
      <div className="portal-header"><h1>Issue event certificates</h1><p>One event contract, one participant list. The metadata and eligible wallets are fixed when you publish.</p></div>
      {!account ? <button className="btn btn-primary" onClick={connectWallet}>Connect wallet</button> : <div className="card premium-portal-card"><div className="card-body text-light">
        <form onSubmit={publish}>
          <fieldset disabled={busy || Boolean(created)}>
            <div className="row">
              <div className="mb-3 col-md-8"><label className="form-label" htmlFor="eventName">Event name</label><input id="eventName" name="name" className="form-control" value={event.name} onChange={updateEvent} maxLength={120} required /></div>
              <div className="mb-3 col-md-4"><label className="form-label" htmlFor="eventSymbol">Symbol</label><input id="eventSymbol" name="symbol" className="form-control" value={event.symbol} onChange={updateEvent} maxLength={12} placeholder="WORKSHOP" required /></div>
            </div>
            <div className="mb-3"><label className="form-label" htmlFor="eventDescription">Description</label><textarea id="eventDescription" name="description" className="form-control" value={event.description} onChange={updateEvent} rows={3} maxLength={1200} required /></div>
            <div className="row">
              <div className="mb-3 col-md-6"><label className="form-label" htmlFor="eventDate">Event date</label><input id="eventDate" name="date" className="form-control" type="date" value={event.date} onChange={updateEvent} required /></div>
              <div className="mb-3 col-md-6"><label className="form-label" htmlFor="eventOrganizer">Organizer name</label><input id="eventOrganizer" name="organizer" className="form-control" value={event.organizer} onChange={updateEvent} maxLength={120} required /></div>
            </div>
            <div className="mb-4"><label className="form-label" htmlFor="eventAddresses">Participant wallets</label><textarea id="eventAddresses" className="form-control" rows={5} value={addresses} onChange={e => setAddresses(e.target.value)} maxLength={220000} placeholder="One wallet address per line" required /><p className="form-text">Up to 5000 unique addresses. Each wallet can claim once.</p></div>
            <div className="mb-3"><label className="form-label" htmlFor="metadataSource">Metadata source</label><select id="metadataSource" className="form-select" value={mode} onChange={e => setMode(e.target.value)}><option value="upload">Upload image and metadata</option><option value="existing">Use existing IPFS metadata</option></select></div>
            {mode === 'existing' ? <div className="mb-4"><label className="form-label" htmlFor="existingMetadata">Metadata URI</label><input id="existingMetadata" className="form-control" value={metadataUri} onChange={e => setMetadataUri(e.target.value)} placeholder="ipfs://..." required /><p className="form-text">Use a JSON file with name, description, image and attributes.</p></div> : <>
              {!cfg?.uploadsEnabled && <p className="alert alert-info">Uploads need a server upload key and Pinata credentials. You can make a template below or use an existing metadata URI.</p>}
              <div className="mb-3"><label className="form-label" htmlFor="certificateImage">Certificate image</label><input id="certificateImage" className="form-control" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} /><p className="form-text">PNG, JPEG or WebP, up to 5 MB.</p></div>
              <div className="mb-3"><label className="form-label" htmlFor="certificateStyle">Template style</label><select id="certificateStyle" className="form-select" value={framed ? 'frame' : 'plain'} onChange={e => setFramed(e.target.value === 'frame')}><option value="frame">Frame</option><option value="plain">Plain</option></select></div>
              <div className="d-flex gap-2 mb-3"><button className="btn btn-secondary" type="button" onClick={makeTemplate}>Make template</button>{file && <button className="btn btn-secondary" type="button" onClick={() => downloadFile('certificate.png', file)}>Download image</button>}</div>
              {preview && <img src={preview} alt="Certificate preview" className="img-fluid mb-4" style={{ maxHeight: 360 }} />}
              <div className="mb-4"><label className="form-label" htmlFor="uploadKey">Organizer upload key</label><input id="uploadKey" className="form-control" type="password" value={uploadKey} onChange={e => setUploadKey(e.target.value)} autoComplete="off" maxLength={256} /><p className="form-text">Provided by the server owner. Kept in this page only.</p></div>
            </>}
            <p>The participant list is included in the claim file. Share it only with people who should have it.</p>
            <button className="btn btn-primary" type="submit" disabled={!signer || !cfg}>{busy ? 'Publishing...' : 'Publish event'}</button>
          </fieldset>
        </form>
        {status && <p className="alert alert-info mt-3" role="status">{status}</p>}
        {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
      </div></div>}
      {created && <div className="card premium-portal-card mt-4"><div className="card-body text-light">
        <h2>Event published</h2><p style={{ overflowWrap: 'anywhere' }}>{created.contractAddress}</p>
        <p>Save this claim file before starting another event. Use its contract address, metadata URI and wallet proof on the claim page.</p>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => downloadJson('claimFile.json', created)}>Download claim file</button>
          <Link className="btn btn-secondary" to="/student">Open claim page</Link>
          <button className="btn btn-secondary" onClick={() => setShowClaims(value => !value)}>View claims</button>
          <button className="btn btn-secondary" onClick={() => { setCreated(null); setStatus(''); setShowClaims(false); }}>Start another event</button>
        </div>
        {showClaims && <AnalyticsDashboard contractAddress={created.contractAddress} provider={provider} />}
      </div></div>}
    </section>
  );
}

export default OrganizerPortal;
