import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { generateAllMerkleProofs } from '../utils/merkleUtils';
import { deployCertificateContract } from '../utils/contractUtils';
import { apiJson } from '../utils/apiUtils';
import { drawCertificate } from '../utils/certificateImage';
import { downloadFile, downloadJson } from '../utils/fileUtils';
import { saveContract } from '../utils/storageUtils';
import AnalyticsDashboard from './analyticsDashboard';

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
  const walletRef = useRef(signer);
  walletRef.current = signer;

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
    e.target.value = '';
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
      const name = event.name.trim();
      const symbol = event.symbol.trim();
      if (!name || ethers.utils.toUtf8Bytes(name).length > 120 || !symbol || ethers.utils.toUtf8Bytes(symbol).length > 12) throw new Error('Use an event name under 120 bytes and a symbol under 12 bytes.');
      const list = addresses.trim().split(/[\s,;]+/).filter(Boolean);
      const tree = generateAllMerkleProofs(list);
      const issuer = await signer.getAddress();
      const network = await signer.provider.getNetwork();
      if (network.chainId !== cfg.chainId) throw new Error('Switch your wallet to ' + cfg.networkName + '.');
      let uri = metadataUri.trim();
      if (mode === 'upload') {
        if (!event.description.trim() || !event.organizer.trim() || !event.date) throw new Error('Fill in the description, date and organizer.');
        if (!cfg.uploadsEnabled) throw new Error('Uploads are not configured. Use an existing IPFS metadata URI.');
        if (!uploadKey.trim()) throw new Error('Enter the organizer upload key.');
        if (!file) throw new Error('Choose an image or make a certificate template.');
        setStatus('Uploading the certificate image...');
        const form = new FormData();
        form.append('file', file);
        const image = await apiJson('/api/upload-ipfs', { method: 'POST', headers: { 'X-Upload-Key': uploadKey }, body: form });
        const metadata = {
          name,
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
      if (!active.current || walletRef.current !== signer || (await signer.provider.getNetwork()).chainId !== network.chainId) throw new Error('The wallet changed. Check your account and network, then try again.');
      setStatus('Confirm the deployment in your wallet. Waiting for a receipt...');
      const contract = await deployCertificateContract({ name, symbol, metadataUri: uri }, tree.merkleRoot, signer);
      if (active.current) {
        saveContract(contract.address, network.chainId, name);
        setCreated({
          version: 1, chainId: network.chainId, contractAddress: contract.address, issuer,
          eventName: name, merkleRoot: tree.merkleRoot, metadataUri: uri, proofs: tree.proofs
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

  const startAnother = () => {
    setCreated(null);
    setStatus('');
    setShowClaims(false);
    setEvent({ name: '', symbol: '', description: '', date: '', organizer: '' });
    setAddresses('');
    setFile(null);
    setMetadataUri('');
    setMode('upload');
  };

  return <section className="formPanel">
    <div className="pageHeader"><span className="eyebrow">Organizers / {cfg?.networkName || 'Loading network'}</span><h1>Issue event certificates</h1><p>One event contract, one participant list. The metadata and eligible wallets are fixed when you publish.</p></div>
    {!account ? <div className="connectPanel"><p>Connect the wallet that will be recorded as the event issuer. You will need test ETH for deployment.</p><button className="btn btnPrimary" onClick={connectWallet}>Connect wallet</button></div> : <div className="panel"><div className="panelBody">
      <p className="fieldHint spaceBottom">Issuer wallet <span className="hash">{created?.issuer || account}</span></p>
      <form onSubmit={publish}>
        <fieldset disabled={busy || Boolean(created)}>
          <div className="fieldRow eventRow">
            <div className="field"><label className="fieldLabel" htmlFor="eventName">Event name</label><input id="eventName" name="name" className="fieldInput" value={event.name} onChange={updateEvent} maxLength={120} required /></div>
            <div className="field"><label className="fieldLabel" htmlFor="eventSymbol">Symbol</label><input id="eventSymbol" name="symbol" className="fieldInput" value={event.symbol} onChange={updateEvent} maxLength={12} placeholder="WORKSHOP" required /></div>
          </div>
          <div className="field"><label className="fieldLabel" htmlFor="eventAddresses">Participant wallets</label><textarea id="eventAddresses" className="fieldInput hash" rows={5} value={addresses} onChange={e => setAddresses(e.target.value)} maxLength={220000} placeholder="One wallet address per line" spellCheck={false} required /><p className="fieldHint">Up to 5000 unique addresses. Each wallet can claim once.</p></div>
          <h2 className="sectionTitle">Certificate details</h2>
          <div className="field"><label className="fieldLabel" htmlFor="metadataSource">Metadata source</label><select id="metadataSource" className="fieldInput" value={mode} onChange={e => setMode(e.target.value)}><option value="upload">Upload image and metadata</option><option value="existing">Use existing IPFS metadata</option></select></div>
          {mode === 'existing' ? <div className="field"><label className="fieldLabel" htmlFor="existingMetadata">Metadata URI</label><input id="existingMetadata" className="fieldInput hash" value={metadataUri} onChange={e => setMetadataUri(e.target.value)} placeholder="ipfs://..." maxLength={512} spellCheck={false} required /><p className="fieldHint">The existing JSON supplies the description, image and attributes. Its URI will be fixed in the contract.</p></div> : <>
            {!cfg?.uploadsEnabled && <p className="notice">Uploads need a server upload key and Pinata credentials. You can make a template below or use an existing metadata URI.</p>}
            <div className="field"><label className="fieldLabel" htmlFor="eventDescription">Description</label><textarea id="eventDescription" name="description" className="fieldInput" value={event.description} onChange={updateEvent} rows={3} maxLength={1200} required /></div>
            <div className="fieldRow">
              <div className="field"><label className="fieldLabel" htmlFor="eventDate">Event date</label><input id="eventDate" name="date" className="fieldInput" type="date" value={event.date} onChange={updateEvent} required /></div>
              <div className="field"><label className="fieldLabel" htmlFor="eventOrganizer">Organizer name</label><input id="eventOrganizer" name="organizer" className="fieldInput" value={event.organizer} onChange={updateEvent} maxLength={120} required /></div>
            </div>
            <div className="field"><label className="fieldLabel" htmlFor="certificateImage">Certificate image</label><input id="certificateImage" className="fieldInput" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} /><p className="fieldHint">PNG, JPEG or WebP, up to 5 MB. Or make a template with the event details.</p></div>
            <div className="field"><label className="fieldLabel" htmlFor="certificateStyle">Template style</label><select id="certificateStyle" className="fieldInput" value={framed ? 'frame' : 'plain'} onChange={e => setFramed(e.target.value === 'frame')}><option value="frame">Frame</option><option value="plain">Plain</option></select></div>
            <div className="actions spaceBottom"><button className="btn btnSecondary" type="button" onClick={makeTemplate}>Make template</button>{file && <button className="btn btnSecondary" type="button" onClick={() => downloadFile(file.name, file)}>Download image</button>}</div>
            {file && preview && <><img src={preview} alt="Certificate preview" className="templatePreview" /><p className="fieldHint spaceBottom">{file.name}</p></>}
            <div className="field"><label className="fieldLabel" htmlFor="uploadKey">Organizer upload key</label><input id="uploadKey" className="fieldInput" type="password" value={uploadKey} onChange={e => setUploadKey(e.target.value)} autoComplete="off" maxLength={256} /><p className="fieldHint">Provided by the server owner. Kept in this page only.</p></div>
          </>}
          <p className="fieldHint spaceBottom">The claim file includes the participant wallets. Share it only with people who should have it.</p>
          <button className="btn btnPrimary" type="submit" disabled={!signer || !cfg}>{busy ? 'Publishing...' : 'Publish event'}</button>
        </fieldset>
      </form>
      {status && <p className="notice" role="status">{status}</p>}
      {error && <p className="notice noticeError" role="alert">{error}</p>}
    </div></div>}
    {created && <div className="panel"><div className="panelBody">
      <h2>Event published</h2><p className="hash">{created.contractAddress}</p>
      <p className="muted">Save this claim file before starting another event. Participants can import it on the claim page.</p>
      <div className="actions">
        <button className="btn btnPrimary" onClick={() => downloadJson('claimFile.json', created)}>Download claim file</button>
        <Link className="btn btnSecondary" to="/student">Open claim page</Link>
        <button className="btn btnSecondary" aria-expanded={showClaims} onClick={() => setShowClaims(value => !value)}>{showClaims ? 'Hide claims' : 'View claims'}</button>
        <button className="btn btnSecondary" onClick={startAnother}>Start another event</button>
      </div>
      {showClaims && <AnalyticsDashboard contractAddress={created.contractAddress} provider={provider} chainId={created.chainId} />}
    </div></div>}
  </section>;
}

export default OrganizerPortal;
