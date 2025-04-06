import "@nomicfoundation/hardhat-toolbox-viem";

import type { HardhatUserConfig } from "hardhat/config";
import { generatePrivateKey } from "viem/accounts";

import dotenv from "dotenv";

dotenv.config();

const prepareWallets = () => {
  return [
    { privateKey: generatePrivateKey(), balance: "1000000000000000000000000" },
    { privateKey: generatePrivateKey(), balance: "1000000000000000000000000" },
  ];
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            // viaIR: true,
          },
        },
      },
    ],
  },
  paths: {
    root: "./",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 97,
      accounts: prepareWallets(),
      gasPrice: 10000000000,
      hardfork: "berlin",
      forking: {
        url: process.env.HARDHAT_FORK_URL!,
        enabled: true,
      },
      chains: {
        97: {
          // from block with selected evm versions for historical....
          hardforkHistory: {
            london: 49000000,
            berlin: 49000000,
            istanbul: 49000000,
          },
        },
      },
    },
  },
};

export default config;
