<<<<<<< HEAD
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bac478cbb6ee746231640e6a7d00000"; // Default Hardhat account 0

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
=======
require('@nomicfoundation/hardhat-toolbox');

module.exports = {
  solidity: '0.8.20',
>>>>>>> e32a701866154d91a67798f0bd3598aabfa9d574
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
<<<<<<< HEAD
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      blockConfirmations: 6, // Wait 6 blocks for transaction confirmation
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY, // Uncomment if you have an API key
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY, // Optional: for contract verification
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000, // 40 seconds
=======
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    artifacts: './artifacts',
>>>>>>> e32a701866154d91a67798f0bd3598aabfa9d574
  },
};
