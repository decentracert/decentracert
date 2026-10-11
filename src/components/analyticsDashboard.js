import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsCsv, getClaimPage } from '../utils/analyticsUtils';
import { downloadFile } from '../utils/fileUtils';
import { verificationUrl } from '../utils/apiUtils';

function AnalyticsDashboard({ contractAddress, provider, chainId }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async (before = null) => {
    const id = ++requestId.current;
    setBusy(true);
    setError('');
    try {
      const page = await getClaimPage(contractAddress, provider, chainId, before);
      if (id === requestId.current) setData(prev => ({
        ...page, claims: before === null ? page.claims : [...(prev?.claims || []), ...page.claims],
        toBlock: before === null ? page.toBlock : prev.toBlock
      }));
    } catch (err) {
      if (id === requestId.current) setError(err.reason || err.message || 'Could not read event claims. Try again.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [contractAddress, provider, chainId]);

  useEffect(() => {
    setData(null);
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  return <section className="claimHistory" aria-label="Event claims">
    <div className="actions actionsBetween spaceBottom">
      <h3>Event claims</h3>
      <div className="actions">
        <button className="btn btnSecondary" disabled={busy} onClick={() => load()}>Refresh claims</button>
        <button className="btn btnSecondary" disabled={busy || !data?.claims.length} onClick={() => downloadFile('eventClaims.csv', new Blob([claimsCsv(data.name, contractAddress, data.claims)], { type: 'text/csv;charset=utf-8' }))}>Export loaded claims</button>
      </div>
    </div>
    {busy && <p role="status">Reading claim history...</p>}
    {error && <p className="notice noticeError" role="alert">{error}</p>}
    {data && <>
      <p><strong>{data.total}</strong> certificates claimed. {data.claims.length} claims loaded from blocks {data.fromBlock} to {data.toBlock}.</p>
      <p className="fieldHint">Reads up to 2000 blocks at a time. The CSV includes only the loaded claims.</p>
      {data.claims.length ? <div className="tableWrap"><table className="claimTable">
        <caption className="visuallyHidden">Loaded claims for {data.name}</caption>
        <thead><tr><th scope="col">Token</th><th scope="col">Wallet</th><th scope="col">Block</th><th scope="col">Record</th></tr></thead>
        <tbody>{data.claims.map(claim => <tr key={claim.txHash + claim.tokenId}>
          <td>{claim.tokenId}</td><td className="walletCell">{claim.wallet}</td><td>{claim.block}</td>
          <td><Link to={verificationUrl(contractAddress, claim.wallet, chainId)}>Verify token {claim.tokenId}</Link></td>
        </tr>)}</tbody>
      </table></div> : <p>No claims in these blocks.</p>}
      {data.nextBlock !== null && <button className="btn btnSecondary" disabled={busy} onClick={() => load(data.nextBlock)}>Load older blocks</button>}
    </>}
  </section>;
}

export default AnalyticsDashboard;
