import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  GraduationCap, 
  Building2, 
  Globe, 
  Sparkles, 
  ArrowRight, 
  Wallet,
  Eye,
  Share2,
} from 'lucide-react';

const HomePage = ({ account, connectWallet }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const featureCards = [
    {
      icon: Shield,
      title: "Secure Verification",
      description: "Certificates are stored on the Ethereum blockchain, making them tamper-proof and permanently verifiable.",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
      icon: GraduationCap,
      title: "For Students",
      description: "Easily claim your event attendance certificates as NFTs and showcase them in your digital wallet.",
      link: "/student",
      linkText: "Student Portal",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    },
    {
      icon: Building2,
      title: "For Organizers",
      description: "Create and distribute digital certificates for your events with just a few clicks.",
      link: "/organizer",
      linkText: "Organizer Portal",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    }
  ];

  const benefits = [
    {
      icon: Eye,
      title: "Verifiable",
      description: "Anyone can verify the authenticity of a certificate on the blockchain."
    },
    {
      icon: Globe,
      title: "Portable",
      description: "Certificates are stored in your wallet and can be accessed anywhere."
    },
    {
      icon: Share2,
      title: "Non-transferable",
      description: "Certificates stay with the wallet that claimed them. Share a verification link when needed."
    }
  ];

  const steps = [
    "Organizers create an event and upload the list of eligible participants",
    "The system generates a Merkle Tree from the participant wallet addresses",
    "Organizers deploy a smart contract with the Merkle root",
    "Students can claim their certificate NFTs if they're on the event's whitelist",
    "Certificates are minted as NFTs directly to students' wallets"
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="homepage-container"
    >
      {/* Hero Section */}
      <motion.div 
        className="hero-section premium-hero"
        variants={itemVariants}
      >
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.h1 
            className="hero-title brand-font"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Sparkles className="hero-sparkle" />
            DecentraCert
          </motion.h1>
          <motion.p 
            className="hero-subtitle body-font"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            A blockchain-based solution for issuing and verifying digital certificates
            for university clubs and events.
          </motion.p>
          {!account && (
            <motion.button
              className="btn btn-light btn-lg premium-cta-btn body-font"
              onClick={connectWallet}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <Wallet className="me-2" />
              Connect Wallet to Get Started
              <ArrowRight className="ms-2" />
            </motion.button>
          )}
        </motion.div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div 
        className="row mb-5"
        variants={itemVariants}
      >
        {featureCards.map((feature, index) => (
          <motion.div 
            key={feature.title}
            className="col-md-4 mb-4"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="card feature-card premium-feature-card"
              style={{ '--card-gradient': feature.gradient }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7)"
              }}
            >
              <div className="card-body text-center">
                <motion.div 
                  className="feature-icon-container"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <feature.icon className="feature-icon" size={48} />
                </motion.div>
                <h5 className="card-title premium-card-title body-font">{feature.title}</h5>
                <p className="card-text premium-card-text body-font">{feature.description}</p>
                {feature.link && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link to={feature.link} className="btn btn-primary mt-3 premium-link-btn body-font">
                      {feature.linkText}
                      <ArrowRight className="ms-2" size={16} />
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* How It Works & Benefits */}
      <motion.div 
        className="row mb-5"
        variants={itemVariants}
      >
        <motion.div 
          className="col-lg-6 mb-4"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="section-heading premium-section-heading brand-font">How It Works</h2>
          <motion.ol 
            className="list-group list-group-numbered premium-steps-list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {steps.map((step, index) => (
              <motion.li 
                key={index}
                className="list-group-item premium-step-item body-font"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              >
                {step}
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>
        
        <motion.div 
          className="col-lg-6"
          whileHover={{ x: -5 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="section-heading premium-section-heading brand-font">Why Use Blockchain Certificates?</h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {benefits.map((benefit, index) => (
              <motion.div 
                key={benefit.title}
                className="card mb-3 premium-benefit-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)"
                }}
              >
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <benefit.icon className="benefit-icon me-3" size={24} />
                    <h5 className="card-title mb-0 premium-benefit-title body-font">{benefit.title}</h5>
                  </div>
                  <p className="card-text premium-benefit-text body-font">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Call to Action */}
      <motion.div 
        className="text-center mt-5"
        variants={itemVariants}
      >
        <motion.div 
          className="premium-cta-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h3 className="cta-title brand-font">Ready to Get Started?</h3>
          <p className="cta-subtitle body-font">Join the future of digital certificates</p>
          <motion.div 
            className="cta-buttons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="d-inline-block me-3"
            >
              <Link to="/student" className="btn btn-primary btn-lg body-font">
                <GraduationCap className="me-2" />
                Student Portal
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="d-inline-block"
            >
              <Link to="/organizer" className="btn btn-light btn-lg body-font">
                <Building2 className="me-2" />
                Organizer Portal
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default HomePage; 