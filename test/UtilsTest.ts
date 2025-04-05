import { viem, config } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { privateKeyToAccount } from "viem/accounts";
import { HardhatNetworkAccountConfig } from "hardhat/types";

describe("Utils", () => {
  async function prepareWalletsFixture() {
    const client = await viem.getPublicClient();

    const accounts = config.networks.hardhat
      .accounts as HardhatNetworkAccountConfig[];

    const ownerAccount = privateKeyToAccount(
      accounts[0].privateKey as `0x${string}`
    );
    const creatorAccount = privateKeyToAccount(
      accounts[1].privateKey as `0x${string}`
    );

    const owner = await viem.getWalletClient(ownerAccount.address);
    const creator = await viem.getWalletClient(creatorAccount.address);

    console.log("Owner: ", owner.account.address);
    console.log("Creator: ", creator.account.address);

    return { owner, creator, client };
  }

  async function prepareFixture() {
    const { owner, creator, client } = await loadFixture(prepareWalletsFixture);

    const forking = config.networks.hardhat.forking;

    console.log("Forking: ", forking);

    const blockTime = await client.getBlock();

    console.log("Block Time: ", {
      timestamp: blockTime.timestamp,
      number: blockTime.number,
      nonce: blockTime.nonce,
      gasLimit: blockTime.gasLimit,
      gasUsed: blockTime.gasUsed,
      lastTransactionHash: blockTime.transactions?.[0],
    });

    return { owner, creator, client };
  }

  it("should be able to get the current block time", async () => {
    const { creator } = await loadFixture(prepareFixture);

    const uniswapV2Router = await viem.getContractAt(
      "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02",
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
      { client: { wallet: creator } }
    );

    // console.log("UniswapV2Router: ", uniswapV2Router);

    const factoryAddress = await uniswapV2Router.read.factory();

    console.log("Factory Address: ", factoryAddress);

    const uniswapV2Factory = await viem.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory",
      factoryAddress,
      { client: { wallet: creator } }
    );

    // console.log("UniswapV2Factory: ", uniswapV2Factory);

    const pair = await uniswapV2Factory.read.getPair([
      "0x55d398326f99059ff775485246999027b3197955",
      "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    ]);

    console.log("Pair: ", pair);
  });
});
