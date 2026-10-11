import { Link } from 'react-router-dom';
import CertificateVerifier from './certificateVerifier';
import { verificationUrl } from '../utils/apiUtils';

function HomePage({ cfg }) {
  const links = [
    ['/organizer', 'Issue an event', 'Set the participant list and publish a certificate contract.'],
    ['/student', 'Claim your certificate', 'Import the file from your organizer and check your wallet.'],
    ['/my-certificates', 'Your saved records', 'Look up certificates from the events you have saved.']
  ];
  return <section>
    <div className="pageHeader"><span className="eyebrow">Event records / {cfg?.networkName || 'Loading network'}</span><h1>Certificate workspace</h1><p>Issue, claim and check participation certificates tied to a wallet.</p></div>
    {cfg?.demo && <aside className="demoPanel" aria-label="Local demo">
      <h2>Local demo</h2><p>One sample certificate is already claimed. The claim file includes the other eligible wallets for this run.</p>
      <div className="actions"><Link to={verificationUrl(cfg.demo.contractAddress, cfg.demo.wallet, 31337)}>Open demo record</Link><a href="/demo/claimFile.json" download>Download demo claim file</a></div>
    </aside>}
    <div className="homeGrid">
      <CertificateVerifier embedded cfg={cfg} />
      <aside className="homeAside">
        <span className="eyebrow">For your event</span><h2>From participant list to certificate.</h2>
        {links.map(([url, title, text], idx) => <Link className="actionLink" key={url} to={url}>
          <span className="step">0{idx + 1}</span><div><strong>{title}</strong><p>{text}</p></div>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 9h12M10 4l5 5-5 5" /></svg>
        </Link>)}
        <p className="trustNote">A record shows which wallet claimed from a contract. Confirm the issuer with your event organizer before trusting the certificate.</p>
      </aside>
    </div>
  </section>;
}

export default HomePage;
