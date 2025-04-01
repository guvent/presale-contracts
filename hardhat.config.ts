import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

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
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            // viaIR: true,
          },
        },

      },
    ],
    overrides: {
      "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol": {
        version: "0.6.6",
      },
      "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol": {
        version: "0.6.6",
      },
      "@uniswap/v2-periphery/contracts/libraries/SafeMath.sol": {
        version: "0.6.6",
      },
    },
  },
  paths: {
    root: "./",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
