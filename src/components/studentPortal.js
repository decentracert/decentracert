import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { claimCertificate, getEventDetails, hasAddressClaimed, isAddressEligible } from '../utils/contractUtils';
import { parseProof, verifyMerkleProof } from '../utils/merkleUtils';
import { checkClaimFile, maxClaimFileSize, parseClaimFile } from '../utils/claimFileUtils';
import { verificationUrl } from '../utils/apiUtils';
import { saveContract } from '../utils/storageUtils';

function StudentPortal({ account, provider, signer, connectWallet, cfg }) {
  const [contractAddress, setContractAddress] = useState('');
  const [proofText, setProofText] = useState('');
  const [claimData, setClaimData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [details, setDetails] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setDetails(null);
    setClaimed(false);
    setTxHash('');
    setError('');
    setBusy(false);
    return () => { requestId.current += 1; };
  }, [account, provider, contractAddress, proofText, claimData]);

  const importFile = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const id = ++requestId.current;
    setDetails(null);
    setError('');
    setBusy(true);
    try {
      if (file.size > maxClaimFileSize) throw new Error('Use a claim file under 8 MB.');
      const data = parseClaimFile(await file.text());
      if (id !== requestId.current) return;
      setClaimData(data);
      setContractAddress(data.contractAddress);
      setProofText('');
      setFileName(file.name);
    } catch (err) {
      if (id === requestId.current) setError(err.message + (claimData ? ' The previous file is still loaded.' : ''));
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  const checkEligibility = async e => {
    e.preventDefault();
    setError('');
    setDetails(null);
    if (!account || !provider) return setError('Connect your wallet first.');
    if (!ethers.utils.isAddress(contractAddress) || contractAddress === ethers.constants.AddressZero) {
      return setError('Enter a valid certificate contract address.');
    }
    const id = ++requestId.current;
    setBusy(true);
    try {
      const network = await provider.getNetwork();
      if (!cfg || network.chainId !== cfg.chainId) throw new Error('Connect your wallet to the server network first.');
      if (claimData && claimData.chainId !== network.chainId) throw new Error('The claim file is for a different network.');
      const [event, alreadyClaimed] = await Promise.all([
        getEventDetails(contractAddress, provider),
        hasAddressClaimed(contractAddress, account, provider)
      ]);
      const proof = claimData ? checkClaimFile(claimData, account, contractAddress, network.chainId, event) : parseProof(proofText);
      if (!verifyMerkleProof(account, proof, event.merkleRoot)) throw new Error('This proof does not match your wallet and contract.');
      if (!alreadyClaimed && !await isAddressEligible(contractAddress, account, proof, provider)) {
        throw new Error('This wallet is not eligible for the event.');
      }
      if (id === requestId.current) {
        setDetails({ ...event, proof, chainId: network.chainId });
        setClaimed(alreadyClaimed);
      }
    } catch (err) {
      if (id === requestId.current) setError(err.reason || err.message || 'Could not read this contract. Check the address and network.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  const claim = async () => {
    if (!signer) return setError('Connect your wallet to the supported network first.');
    if (!details) return;
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      if ((await signer.getAddress()).toLowerCase() !== account.toLowerCase() || (await signer.provider.getNetwork()).chainId !== details.chainId) throw new Error('The wallet changed. Check eligibility again.');
      const receipt = await claimCertificate(contractAddress, details.proof, details.metadataUri, signer);
      if (id === requestId.current) {
        setTxHash(receipt.transactionHash);
        setClaimed(true);
        saveContract(contractAddress, details.chainId, details.eventName);
      }
    } catch (err) {
      if (id === requestId.current) setError(err.code === 4001 || err.code === 'ACTION_REJECTED' ? 'Transaction cancelled in your wallet.' : err.reason || err.message || 'Could not claim the certificate.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  return (
    <section className="formPanel">
      <div className="pageHeader"><span className="eyebrow">Participants / {cfg?.networkName || 'Loading network'}</span><h1>Claim a certificate</h1><p>Import the claim file from your organizer. Your wallet selects its own proof.</p></div>
      {!account ? <div className="connectPanel"><p>Connect the wallet your organizer added to the participant list.</p><button className="btn btnPrimary" onClick={connectWallet}>Connect wallet</button></div> : (
        <div className="panel"><div className="panelBody">
          <p className="fieldHint spaceBottom">Claiming as <span className="hash">{account}</span></p>
          <form onSubmit={checkEligibility}>
            <fieldset disabled={busy}>
              <div className="spaceBottom"><label className="fieldLabel" htmlFor="claimFile">Claim file</label><input id="claimFile" className="fieldInput" type="file" accept=".json,application/json" onChange={importFile} /><p className="fieldHint">JSON, up to 8 MB. The file stays in your browser.</p></div>
              {claimData && <div className="loadedFile"><p>{fileName}: {claimData.eventName}</p><button className="btn btnSecondary" type="button" onClick={() => { setClaimData(null); setFileName(''); }}>Use a manual proof</button></div>}
              <div className="field"><label className="fieldLabel" htmlFor="claimContract">Contract address</label><input id="claimContract" className="fieldInput hash" value={contractAddress} readOnly={Boolean(claimData)} onChange={e => setContractAddress(e.target.value.trim())} placeholder="0x..." maxLength={42} spellCheck={false} required /></div>
              {!claimData && <div className="field"><label className="fieldLabel" htmlFor="claimProof">Merkle proof</label><textarea id="claimProof" className="fieldInput hash" rows={4} value={proofText} onChange={e => setProofText(e.target.value)} placeholder="[]" maxLength={2300} spellCheck={false} required /><p className="fieldHint">Or paste the JSON array for your wallet. A single participant has an empty proof, [].</p></div>}
              <button className="btn btnPrimary" type="submit">{busy ? 'Checking...' : 'Check eligibility'}</button>
            </fieldset>
          </form>
          {error && <p className="notice noticeError" role="alert">{error}</p>}
          {details && <div className="claimResult" aria-live="polite">
            <h2>{details.eventName}</h2>
            <dl className="recordDetails"><dt>Issuer wallet</dt><dd>{details.owner}</dd><dt>Metadata</dt><dd>{details.metadataUri}</dd></dl>
            <p className="fieldHint spaceBottom">Check that you know the issuer before claiming.</p>
            {claimed ? <><p className="notice noticeSuccess">{txHash ? 'Certificate claimed.' : 'This wallet has already claimed its certificate.'}</p>{txHash && <p className="hash">Transaction: {txHash}</p>}<Link to={verificationUrl(contractAddress, account, details.chainId)}>Verify certificate</Link></> : <><p>Your wallet is eligible. Claiming costs test ETH and permanently binds the certificate to this address.</p><button className="btn btnPrimary" disabled={busy || !signer} onClick={claim}>{busy ? 'Waiting for confirmation...' : 'Claim certificate'}</button></>}
          </div>}
        </div></div>
      )}
    </section>
  );
}

export default StudentPortal;
