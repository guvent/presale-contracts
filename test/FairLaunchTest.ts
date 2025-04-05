import { config, viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { parseAbi, parseEther, parseUnits, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HardhatNetworkAccountConfig } from "hardhat/types";

describe("FairLaunch", () => {
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

  async function deployFairLaunchFactoryFixture() {
    const { owner, creator, client } = await loadFixture(prepareWalletsFixture);

    console.log("Creator Wallet Address: ", creator.account.address);
    console.log("Owner Wallet Address: ", owner.account.address);

    const fairLaunchFactory = await viem.deployContract(
      "FairLaunchFactory",
      [],
      { client: { wallet: creator } }
    );

    console.log("FairLaunchFactory Address: ", await fairLaunchFactory.address);

    const blockTime = (await client.getBlock()).timestamp;

    const startTime = blockTime - BigInt(1000 * 60);
    const endTime = startTime + BigInt(1000 * 60 * 60 * 24 * 7);

    const routerAddress =
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1" as `0x${string}`;
    const factoryAddress =
      "0x6725F303b657a9451d8BA641348b6761A6CC7a17" as `0x${string}`;

    return {
      fairLaunchFactory,
      owner,
      creator,
      client,
      startTime,
      endTime,
      routerAddress,
      factoryAddress,
    };
  }

  async function deployStandardTokensFixture() {
    const { creator, owner } = await loadFixture(
      deployFairLaunchFactoryFixture
    );

    const { ownerAddress, creatorAddress } = {
      ownerAddress: owner.account.address,
      creatorAddress: creator.account.address,
    };

    const token0Info = {
      name: "Token 0",
      symbol: "TOK0",
      decimals: 18,
      totalSupply: parseEther("1000000000000000000000000"),
      serviceFeeReceiver: creatorAddress,
      serviceFee: 0n,
    };

    const token1Info = {
      name: "Token 1",
      symbol: "TOK1",
      decimals: 18,
      totalSupply: parseEther("1000000000000000000000000"),
      serviceFeeReceiver: creatorAddress,
      serviceFee: 0n,
    };

    const token0 = await viem.deployContract(
      "StandartToken",
      [
        token0Info.name,
        token0Info.symbol,
        token0Info.decimals,
        token0Info.totalSupply,
        token0Info.serviceFeeReceiver,
        token0Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );

    const token1 = await viem.deployContract(
      "StandartToken",
      [
        token1Info.name,
        token1Info.symbol,
        token1Info.decimals,
        token1Info.totalSupply,
        token1Info.serviceFeeReceiver,
        token1Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );

    const tokenOwner0 = await token0.read.owner();
    const tokenOwner1 = await token1.read.owner();

    console.log("tokenOwner0: ", tokenOwner0);
    console.log("tokenOwner1: ", tokenOwner1);

    const creatorBalance0 = await token0.read.balanceOf([creatorAddress]);
    const creatorBalance1 = await token1.read.balanceOf([creatorAddress]);

    console.log("creator address: ", creator.account.address);
    console.log("creatorBalance0: ", creatorBalance0);
    console.log("creatorBalance1: ", creatorBalance1);

    const token0Supply = await token0.read.totalSupply();
    const token1Supply = await token1.read.totalSupply();

    console.log("token0Supply: ", token0Supply);
    console.log("token1Supply: ", token1Supply);

    const transferToken0Supply = token0Supply / 2n;
    const transferToken1Supply = token1Supply / 2n;

    // approve from creator to owner
    await token0.write.approve([ownerAddress, transferToken0Supply], {
      account: creatorAddress,
    });
    await token1.write.approve([ownerAddress, transferToken1Supply], {
      account: creatorAddress,
    });

    const creatorAllowance0 = await token0.read.allowance([
      creatorAddress,
      ownerAddress,
    ]);
    const creatorAllowance1 = await token1.read.allowance([
      creatorAddress,
      ownerAddress,
    ]);

    console.log("creatorAllowance0: ", creatorAllowance0);
    console.log("creatorAllowance1: ", creatorAllowance1);

    // transfer from creator to owner
    await token0.write.transferFrom(
      [creatorAddress, ownerAddress, transferToken0Supply],
      {
        account: ownerAddress,
      }
    );
    await token1.write.transferFrom(
      [creatorAddress, ownerAddress, transferToken1Supply],
      {
        account: ownerAddress,
      }
    );

    const ownerBalance0 = await token0.read.balanceOf([ownerAddress]);
    const ownerBalance1 = await token1.read.balanceOf([ownerAddress]);

    console.log("ownerBalance0: ", ownerBalance0);
    console.log("ownerBalance1: ", ownerBalance1);

    return { token0, token1 };
  }

  async function deployBabyTokensFixture() {
    const { creator, owner, routerAddress } = await loadFixture(
      deployFairLaunchFactoryFixture
    );

    const { token0: rewardToken0, token1: rewardToken1 } = await loadFixture(
      deployStandardTokensFixture
    );

    const token0Info = {
      name: "Baby Token 0",
      symbol: "BABY0",
      totalSupply: parseEther("1000000000000000000000000"),
      addrs: [
        rewardToken0.address,
        routerAddress,
        creator.account.address,
        creator.account.address,
      ],
      feeSettings: [0, 0, 0],
      minimumTokenBalanceForDividends: 0,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0,
    };

    const token1Info = {
      name: "Baby Token 1",
      symbol: "BABY1",
      totalSupply: parseEther("1000000000000000000000000"),
      addrs: [
        rewardToken1.address,
        routerAddress,
        creator.account.address,
        creator.account.address,
      ],
      feeSettings: [0, 0, 0],
      minimumTokenBalanceForDividends: 0,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0,
    };

    const token0 = await viem.deployContract(
      "BabyToken",
      [
        token0Info.name,
        token0Info.symbol,
        token0Info.totalSupply,
        token0Info.addrs,
        token0Info.feeSettings,
        token0Info.minimumTokenBalanceForDividends,
        token0Info.serviceFeeReceiver,
        token0Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );
    const token1 = await viem.deployContract(
      "BabyToken",
      [
        token1Info.name,
        token1Info.symbol,
        token1Info.totalSupply,
        token1Info.addrs,
        token1Info.feeSettings,
        token1Info.minimumTokenBalanceForDividends,
        token1Info.serviceFeeReceiver,
        token1Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );

    return { token0, token1 };
  }

  async function deployLiquidityGenTokensFixture() {
    const { creator, routerAddress } = await loadFixture(
      deployFairLaunchFactoryFixture
    );

    const token0Info = {
      name: "Liquidity Gen Token 0",
      symbol: "LGT0",
      totalSupply: parseEther("1000000000000000000000000"),
      router: routerAddress,
      charityAddress: creator.account.address,
      taxFeeBps: 0,
      liquidityFeeBps: 0,
      charityFeeBps: 0,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0n,
    };

    const token1Info = {
      name: "Liquidity Gen Token 1",
      symbol: "LGT1",
      totalSupply: parseEther("1000000000000000000000000"),
      router: routerAddress,
      charityAddress: creator.account.address,
      taxFeeBps: 0,
      liquidityFeeBps: 0,
      charityFeeBps: 0,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0n,
    };

    const token0 = await viem.deployContract(
      "LiquidityGenToken",
      [
        token0Info.name,
        token0Info.symbol,
        token0Info.totalSupply,
        token0Info.router,
        token0Info.charityAddress,
        token0Info.taxFeeBps,
        token0Info.liquidityFeeBps,
        token0Info.charityFeeBps,
        token0Info.serviceFeeReceiver,
        token0Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );
    const token1 = await viem.deployContract(
      "LiquidityGenToken",
      [
        token1Info.name,
        token1Info.symbol,
        token1Info.totalSupply,
        token1Info.router,
        token1Info.charityAddress,
        token1Info.taxFeeBps,
        token1Info.liquidityFeeBps,
        token1Info.charityFeeBps,
        token1Info.serviceFeeReceiver,
        token1Info.serviceFee,
      ],
      {
        client: { wallet: creator },
      }
    );

    return { token0, token1 };
  }

  async function deployBuybackBabyTokensFixture() {
    const { creator, owner, routerAddress } = await loadFixture(
      deployFairLaunchFactoryFixture
    );

    const { token0: rewardToken0, token1: rewardToken1 } = await loadFixture(
      deployStandardTokensFixture
    );

    const feeSettings0 = [0n, 0n, 0n, 0n, 0n] as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ];
    const feeSettings1 = [0n, 0n, 0n, 0n, 0n] as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ];

    const token0Info = {
      name: "Buyback Baby Token 0",
      symbol: "BBT0",
      totalSupply: parseEther("1000000000000000000000000"),
      rewardToken: rewardToken0.address,
      router: routerAddress,
      feeSettings: feeSettings0,
      owner: owner.account.address,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0n,
    };

    const token1Info = {
      name: "Buyback Baby Token 1",
      symbol: "BBT1",
      totalSupply: parseEther("1000000000000000000000000"),
      rewardToken: rewardToken1.address,
      router: routerAddress,
      feeSettings: feeSettings1,
      owner: owner.account.address,
      serviceFeeReceiver: creator.account.address,
      serviceFee: 0n,
    };

    const token0 = await viem.deployContract(
      "BuybackBabyToken",
      [
        token0Info.name,
        token0Info.symbol,
        token0Info.totalSupply,
        token0Info.rewardToken,
        token0Info.router,
        token0Info.feeSettings,
        token0Info.owner,
        token0Info.serviceFeeReceiver,
        token0Info.serviceFee,
      ],
      { client: { wallet: creator }, value: 100n }
    );
    const token1 = await viem.deployContract(
      "BuybackBabyToken",
      [
        token1Info.name,
        token1Info.symbol,
        token1Info.totalSupply,
        token1Info.rewardToken,
        token1Info.router,
        token1Info.feeSettings,
        token1Info.owner,
        token1Info.serviceFeeReceiver,
        token1Info.serviceFee,
      ],
      { client: { wallet: creator }, value: 100n }
    );
    return { token0, token1 };
  }

  it("should create a fair launch", async () => {
    const { fairLaunchFactory, owner, startTime, endTime } = await loadFixture(
      deployFairLaunchFactoryFixture
    );

    const { token0, token1 } = await loadFixture(deployStandardTokensFixture);

    const balance0 = await token0.read.balanceOf([owner.account.address]);
    const balance1 = await token1.read.balanceOf([owner.account.address]);

    console.log("balance0: ", balance0);
    console.log("balance1: ", balance1);

    const tokenClaim = balance0 / 4n;
    const tokenLiquidity = balance0 / 4n;

    const fairLaunchInfo = {
      saleStartTime: BigInt(startTime),
      saleEndTime: BigInt(endTime),
      teamShare: 1,
      tokenOnSale: token0.address,
      wethAddress: token1.address,
      minDeposit: 1000n,
      maxDeposit: 1000000000000000000n,
      minBuyPerUser: 1000n,
      maxBuyPerUser: 1000000000000000000n,
    };

    const fairLaunchProgram = await fairLaunchFactory.write.create(
      [fairLaunchInfo, tokenClaim, tokenLiquidity],
      { account: owner.account.address }
    );

    console.log("FairLaunchProgram: ", fairLaunchProgram);
  });
});
