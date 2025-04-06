  import { config, viem } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { getAddress, maxUint256, parseAbi, parseEther, parseEventLogs } from "viem";
import { HardhatNetworkAccountConfig } from "hardhat/types";
import { privateKeyToAccount } from "viem/accounts";
import { assert, expect } from "chai";

describe("PresaleLaunch", function () {
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

  async function deployPresaleLaunchFactoryFixture() {
    const { owner, creator, client } = await loadFixture(prepareWalletsFixture);

    const presaleLaunchFactory = await viem.deployContract(
      "PresaleLaunchFactory",
      [],
      { client: { wallet: creator } }
    );

    return { presaleLaunchFactory, owner, creator, client };
  }

  async function deployStandardTokens({
    owner,
    creator,
  }: {
    owner: any;
    creator: any;
  }) {
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

  async function deployPresaleLaunch({
    presaleInfo,
    presaleLaunchFactory,
    owner,
    creator,
    client,
  }: {
    presaleInfo: any;
    presaleLaunchFactory: any;
    owner: any;
    creator: any;
    client: any;
  }) {
    const factoryOwner = await presaleLaunchFactory.read.owner();
    console.log("FactoryOwner: ", factoryOwner);

    const PresaleLaunch = await presaleLaunchFactory.write.create(
      [presaleInfo],
      { account: owner.account.address, value: parseEther("2", "wei") }
    );

    const tx = await client.getTransactionReceipt({
      hash: PresaleLaunch,
    });

    const logs = parseEventLogs({
      abi: parseAbi([
        "event PresaleLaunchCreated(address indexed PresaleLaunch)",
      ]),
      logs: tx.logs,
    });

    const PresaleLaunchAddress = logs[0].args.PresaleLaunch.toLowerCase();

    console.log("PresaleLaunchAddress: ", PresaleLaunchAddress);

    const presaleLaunchDeployed = await viem.getContractAt(
      "PresaleLaunch",
      PresaleLaunchAddress as `0x${string}`,
      { client: { wallet: owner } }
    );

    return { presaleLaunchDeployed };
  }

  it("should create a presale launch program", async function () {
    console.log("++ should create a presale launch program");
    const { presaleLaunchFactory, owner, creator, client } = await loadFixture(
      deployPresaleLaunchFactoryFixture
    );

    const { token0, token1 } = await deployStandardTokens({
      owner,
      creator,
    });

    await token0.write.approve([presaleLaunchFactory.address, maxUint256], {
      account: owner.account.address,
    });

    const allowance0 = await token0.read.allowance([
      owner.account.address,
      presaleLaunchFactory.address,
    ]);

    console.log("....allowance0: ", allowance0, presaleLaunchFactory.address);

    await token1.write.approve([presaleLaunchFactory.address, maxUint256], {
      account: owner.account.address,
    });

    const allowance1 = await token1.read.allowance([
      owner.account.address,
      presaleLaunchFactory.address,
    ]);

    console.log("....allowance1: ", allowance1, presaleLaunchFactory.address);

    const now = (await client.getBlock()).timestamp;

    const presaleInfo = {
      // sale start time (timestamp)
      saleStartTime: now + 1000n * 10n, // 10 seconds
      // sale end time (timestamp)
      saleEndTime: now + 1000n * 60n, // 1 minute
      // min buy per user (token amount)
      minBuyPerUser: parseEther("2", "wei"),
      // max buy per user (token amount)
      maxBuyPerUser: parseEther("100", "wei"),
      // max recevied bnb amount
      hardCap: parseEther("1000", "wei"),
      // min recevied bnb amount
      softCap: parseEther("10", "wei"),
      // token address for sale
      saleTokenAddress: token0.address.toLowerCase(),
      // token address for fund
      fundTokenAddress: 
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      // total - presale on first period (buy token with bnb) %20
      presaleRate: 20,
      // total - post sale rate (ready to sale tokens) %30
      listingRate: 30,
      // total - lock on liquidity (token with bnb) %40
      liquidityRate: 40,
      // total - protocol fee %50
      protocolFeeRate: 50,
      // 0 = refund to creator
      // 1 = burn
      refundType: 1,
    };

    const { presaleLaunchDeployed } = await deployPresaleLaunch({
      presaleInfo,
      presaleLaunchFactory,
      owner,
      creator,
      client,
    });

    const {
      "0": saleStartTime,
      "1": saleEndTime,
      "2": minBuyPerUser,
      "3": maxBuyPerUser,
      "4": hardCap,
      "5": softCap,
      "6": saleTokenAddress,
      "7": fundTokenAddress,
      "8": presaleRate,
      "9": listingRate,
      "10": liquidityRate,
      "11": protocolFeeRate,
      "12": refundType,
    } = await presaleLaunchDeployed.read.info();

    const saleTokenAddressFormat = getAddress(token0.address.toLowerCase() as `0x${string}`, config.networks.hardhat.chainId);
    const presaleTokenAddressFormat = getAddress(saleTokenAddress as `0x${string}`, config.networks.hardhat.chainId);
    const fundTokenAddressFormat = getAddress(presaleInfo.fundTokenAddress as `0x${string}`, config.networks.hardhat.chainId); 
    const presaleFundTokenAddressFormat = getAddress(fundTokenAddress as `0x${string}`, config.networks.hardhat.chainId);

    assert.equal(saleStartTime, presaleInfo.saleStartTime, "invalid saleStartTime");
    assert.equal(saleEndTime, presaleInfo.saleEndTime, "invalid saleEndTime");
    assert.equal(minBuyPerUser, presaleInfo.minBuyPerUser, "invalid minBuyPerUser");
    assert.equal(maxBuyPerUser, presaleInfo.maxBuyPerUser, "invalid maxBuyPerUser");
    assert.equal(hardCap, presaleInfo.hardCap, "invalid hardCap");
    assert.equal(softCap, presaleInfo.softCap, "invalid softCap");
    assert.equal(saleTokenAddressFormat, presaleTokenAddressFormat, "invalid saleTokenAddress");
    assert.equal(fundTokenAddressFormat, presaleFundTokenAddressFormat, "invalid fundTokenAddress");
    assert.equal(presaleRate, presaleInfo.presaleRate, "invalid presaleRate");
    assert.equal(listingRate, presaleInfo.listingRate, "invalid listingRate");
    assert.equal(liquidityRate, presaleInfo.liquidityRate, "invalid liquidityRate");
    assert.equal(protocolFeeRate, presaleInfo.protocolFeeRate, "invalid protocolFeeRate");
    assert.equal(refundType, presaleInfo.refundType, "invalid refundType");

    await expect(
      presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("1", "wei"),
      })
    ).to.be.rejectedWith("Amount is less than min buy");

    await expect(
      presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("2", "wei"),
      })
    ).to.be.rejectedWith("Sale not started");

    await time.setNextBlockTimestamp(presaleInfo.saleStartTime + 1000n);

    await expect(
      presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("1", "wei"),
      })
    ).to.be.rejectedWith("Amount is less than min buy");

    await expect(
      presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("1000", "wei"),
      })
    ).to.be.rejectedWith("Amount is more than max buy");

    await presaleLaunchDeployed.write.buyNativeToken({
      account: creator.account.address,
      value: parseEther("2", "wei"),
    });

    const {
      "0": totalFundReceived,
      "1": totalSaleBought,
      "2": protocolAddress,
      "3": isFinalized,
    } = await presaleLaunchDeployed.read.slot0();

    console.log("1- PresaleSlot0: ", {
      totalFundReceived,
      totalSaleBought,
      protocolAddress,
      isFinalized,
    });

    assert.equal(totalFundReceived, parseEther("2", "wei"));
    assert.equal(totalSaleBought, parseEther("0.4", "wei"));
    assert.equal(protocolAddress, creator.account.address);
    assert.equal(isFinalized, false);

    await expect(presaleLaunchDeployed.write.finalize()).to.be.rejectedWith(
      "Soft cap not reached"
    );

    await presaleLaunchDeployed.write.buyNativeToken({
      account: creator.account.address,
      value: parseEther("10", "wei"),
    });

    await expect(presaleLaunchDeployed.write.finalize()).to.be.rejectedWith(
      "Sale not ended"
    );

    await time.setNextBlockTimestamp(presaleInfo.saleEndTime + 5000n);

    await expect(
      presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("10", "wei"),
      })
    ).to.be.rejectedWith("Sale ended");

    await presaleLaunchDeployed.write.finalize();

    const {
      "0": totalFundReceived2,
      "1": totalSaleBought2,
      "2": protocolAddress2,
      "3": isFinalized2,
    } = await presaleLaunchDeployed.read.slot0();

    console.log("3- PresaleSlot0: ", {
      totalFundReceived2,
      totalSaleBought2,
      protocolAddress2,
      isFinalized2,
    });
  });
});
