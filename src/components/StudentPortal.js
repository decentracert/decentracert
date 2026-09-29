import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { claimCertificate, getEventDetails, hasAddressClaimed, isAddressEligible } from '../utils/contractUtils';
import { parseProof, verifyMerkleProof } from '../utils/merkleUtils';

function StudentPortal({ account, provider, signer, connectWallet }) {
  const [contractAddress, setContractAddress] = useState('');
  const [proofText, setProofText] = useState('');
  const [tokenUri, setTokenUri] = useState('');
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
  }, [account, provider, contractAddress, proofText, tokenUri]);

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
      const proof = parseProof(proofText);
      const [event, alreadyClaimed] = await Promise.all([
        getEventDetails(contractAddress, provider),
        hasAddressClaimed(contractAddress, account, provider)
      ]);
      if (!verifyMerkleProof(account, proof, event.merkleRoot)) throw new Error('This proof does not match your wallet and contract.');
      if (!alreadyClaimed && !await isAddressEligible(contractAddress, account, proof, provider)) {
        throw new Error('This wallet is not eligible for the event.');
      }
      if (id === requestId.current) {
        setDetails(event);
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
    if (!/^(ipfs:\/\/|https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:|\/))/.test(tokenUri)) {
      return setError('Enter the metadata URI supplied by the organizer.');
    }
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      const receipt = await claimCertificate(contractAddress, parseProof(proofText), tokenUri, signer);
      if (id === requestId.current) {
        setTxHash(receipt.transactionHash);
        setClaimed(true);
      }
    } catch (err) {
      if (id === requestId.current) setError(err.code === 4001 || err.code === 'ACTION_REJECTED' ? 'Transaction cancelled in your wallet.' : err.reason || err.message || 'Could not claim the certificate.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  };

  return (
    <section className="student-portal">
      <div className="portal-header"><h1>Claim a certificate</h1><p>Use the contract address, proof and metadata URI from your event organizer.</p></div>
      {!account ? <button className="btn btn-primary" onClick={connectWallet}>Connect wallet</button> : (
        <div className="card premium-portal-card"><div className="card-body text-light">
          <form onSubmit={checkEligibility}>
            <fieldset disabled={busy}>
              <div className="mb-3"><label className="form-label" htmlFor="claimContract">Contract address</label><input id="claimContract" className="form-control" value={contractAddress} onChange={e => setContractAddress(e.target.value.trim())} placeholder="0x..." required /></div>
              <div className="mb-3"><label className="form-label" htmlFor="claimProof">Merkle proof</label><textarea id="claimProof" className="form-control" rows={4} value={proofText} onChange={e => setProofText(e.target.value)} placeholder="[]" required /><p className="form-text">Paste the JSON array for your wallet. A single participant has an empty proof, [].</p></div>
              <div className="mb-3"><label className="form-label" htmlFor="claimUri">Metadata URI</label><input id="claimUri" className="form-control" value={tokenUri} onChange={e => setTokenUri(e.target.value.trim())} placeholder="ipfs://..." required /></div>
              <button className="btn btn-primary" type="submit">{busy ? 'Checking...' : 'Check eligibility'}</button>
            </fieldset>
          </form>
          {error && <p className="alert alert-danger mt-3" role="alert">{error}</p>}
          {details && <div className="mt-4" aria-live="polite">
            <h2>{details.eventName}</h2>
            {claimed ? <><p className="alert alert-success">{txHash ? 'Certificate claimed.' : 'This wallet has already claimed its certificate.'}</p>{txHash && <p style={{ overflowWrap: 'anywhere' }}>Transaction: {txHash}</p>}<Link to={`/verify?contract=${contractAddress}&wallet=${account}`}>Verify certificate</Link></> : <><p>Your wallet is eligible. Claiming costs test ETH and permanently binds the certificate to this address.</p><button className="btn btn-primary" disabled={busy || !signer} onClick={claim}>{busy ? 'Waiting for confirmation...' : 'Claim certificate'}</button></>}
          </div>}
        </div></div>
      )}
    </section>
  );
}

export default StudentPortal;
