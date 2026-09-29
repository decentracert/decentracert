import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, GraduationCap, Building2, Search, Award, Menu, X, ChevronDown } from 'lucide-react';

const Navbar = ({ account, connectWallet, disconnectWallet, isConnecting, networkName }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const location = useLocation();

  // Truncate wallet address for display
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navItems = [
    { path: '/student', label: 'Student\nPortal', icon: GraduationCap },
    { path: '/organizer', label: 'Organizer\nPortal', icon: Building2 },
    { path: '/verify', label: 'Verify\nCertificate', icon: Search },
    { path: '/my-certificates', label: 'My\nCertificates', icon: Award },
  ];

  const isActive = (path) => location.pathname === path;

  // Close mobile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.navbar')) {
        setIsMobileMenuOpen(false);
      }
      if (isWalletDropdownOpen && !event.target.closest('.wallet-dropdown-container')) {
        setIsWalletDropdownOpen(false);
      }
    };

    const handleMouseLeave = () => {
      setIsWalletDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isMobileMenuOpen, isWalletDropdownOpen]);

  return (
    <>
      <motion.nav 
        className="navbar navbar-expand-lg premium-navbar"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link className="navbar-brand premium-brand" to="/">
              <Wallet className="brand-icon" />
              <strong className="brand-font">DecentraCert</strong>
            </Link>
          </motion.div>
          
          {/* Mobile Menu Button */}
          <motion.button 
            className="navbar-toggler premium-toggler" 
            type="button" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mainNav"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
          
          <AnimatePresence>
            {(
              <motion.div 
                id="mainNav"
                className={`collapse navbar-collapse premium-navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ul className="navbar-nav me-auto premium-nav">
                  {navItems.map((item, index) => (
                    <motion.li 
                      key={item.path}
                      className="nav-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Link 
                        className={`nav-link premium-nav-link body-font ${isActive(item.path) ? 'active' : ''}`}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon size={18} className="nav-icon" />
                        {item.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
                
                <motion.div 
                  className="d-flex align-items-center premium-wallet-section"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  {account ? (
                    <div className="wallet-dropdown-container">
                      <motion.button
                        className="wallet-address-btn"
                        onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                        onMouseEnter={() => setIsWalletDropdownOpen(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="wallet-address premium-wallet-address body-font">
                          {truncateAddress(account)}
                        </span>
                        <ChevronDown 
                          size={16} 
                          className={`wallet-dropdown-icon ${isWalletDropdownOpen ? 'rotated' : ''}`}
                        />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button 
                      className="btn btn-sm btn-connect premium-connect-btn" 
                      onClick={connectWallet}
                      disabled={isConnecting}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isConnecting ? (
                        <motion.div 
                          className="loading-spinner"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        <>
                          <Wallet size={16} className="me-2" />
                          Connect Wallet
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
      
      {/* Wallet Dropdown - Positioned outside navbar */}
      <AnimatePresence>
        {isWalletDropdownOpen && account && (
          <motion.div 
            className="wallet-dropdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseLeave={() => setIsWalletDropdownOpen(false)}
          >
            <motion.div 
              className="wallet-dropdown-popup"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onMouseLeave={() => setIsWalletDropdownOpen(false)}
            >
              <div className="wallet-dropdown-item">
                <span className="dropdown-label">Network</span>
                <motion.span 
                  className={`network-badge ${networkName === 'sepolia' ? 'network-sepolia' : 'network-unknown'}`}
                  whileHover={{ scale: 1.1 }}
                >
                  {networkName === 'sepolia' ? 'Sepolia' : networkName || 'Unknown'}
                </motion.span>
              </div>
              <div className="wallet-dropdown-divider"></div>
              <motion.button 
                className="btn btn-sm btn-disconnect premium-disconnect-btn w-100" 
                onClick={disconnectWallet}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Disconnect
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar; 