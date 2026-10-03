require('@nomiclabs/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');
require('dotenv').config();
const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require('hardhat/builtin-tasks/task-names');

// keep builds on the compiler installed by npm
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, env, runSuper) => {
  if (solcVersion !== '0.8.20') return runSuper();
  return { compilerPath: require.resolve('solc/soljson.js'), isSolcJs: true, version: solcVersion, longVersion: require('solc').version() };
});

module.exports = {
  solidity: { version: '0.8.20', settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } },
  networks: {
    localhost: { url: process.env.LOCAL_RPC_URL || 'http://127.0.0.1:8545' },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_API_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: { sources: './contracts', tests: './test/contracts', cache: './cache', artifacts: './src/artifacts' }
};
