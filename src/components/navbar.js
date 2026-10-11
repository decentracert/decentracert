import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

function Navbar({ account, connectWallet, disconnectWallet, isConnecting, networkName }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const close = e => {
      if (e.key === 'Escape' && open) { setOpen(false); btn.current?.focus(); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  const network = networkName === 'sepolia' ? 'Sepolia' : networkName === 'local' ? 'Local Hardhat' : networkName;

  return <header className="siteHeader">
    <div className="container headerBar">
      <Link className="brand" to="/"><img src="/favicon.svg" alt="" width="30" height="30" />DecentraCert</Link>
      <button ref={btn} className="btn btnSecondary navToggle" aria-label="Toggle navigation" aria-expanded={open} aria-controls="mainNav" onClick={() => setOpen(value => !value)}>{open ? 'Close' : 'Menu'}</button>
      <div id="mainNav" className={'navContent' + (open ? ' open' : '')}>
        <nav className="navLinks" aria-label="Main navigation">
          {[['/student', 'Claim'], ['/organizer', 'Issue'], ['/verify', 'Verify'], ['/my-certificates', 'Saved']].map(([url, label]) => <NavLink key={url} to={url} className={({ isActive }) => 'navLink' + (isActive ? ' active' : '')}>{label}</NavLink>)}
        </nav>
        <div className="walletTools">
          <span className="networkTag">{network || 'Loading network'}</span>
          {account ? <button className="accountBtn" onClick={disconnectWallet} title="Disconnect this wallet from the page"><span className="hash">{account.slice(0, 6)}...{account.slice(-4)}</span><small>Disconnect wallet</small></button> : <button className="btn btnSecondary" disabled={isConnecting} onClick={connectWallet}>{isConnecting ? 'Connecting...' : 'Connect wallet'}</button>}
        </div>
      </div>
    </div>
  </header>;
}

export default Navbar;
