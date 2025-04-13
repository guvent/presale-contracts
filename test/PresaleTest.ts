import { config, viem } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import {
  getAddress,
  maxUint256,
  parseAbi,
  parseEther,
  parseEventLogs,
  parseUnits,
} from "viem";
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

  async function approveToken(
    token: any,
    owner: any,
    address: any
  ) {
    await token.write.approve([address, maxUint256], {
      account: owner.account.address,
    });

    const allowance = await token.read.allowance([
      owner.account.address,
      address,
    ]);

    return { allowance, tokenAddress: token.address.toLowerCase() };
  }

  it("should create a presale launch program", async function () {
    console.log("++ should create a presale launch program");
    const PRECISION_RATE_SCALE = 18;

    const { presaleLaunchFactory, owner, creator, client } = await loadFixture(
      deployPresaleLaunchFactoryFixture
    );

    const { token0, token1 } = await deployStandardTokens({
      owner,
      creator,
    });

    const { allowance: ownerAllowance0, tokenAddress: ownerTokenAddress0 } = await approveToken(
      token0,
      owner,
      presaleLaunchFactory.address
    );
    const { allowance: ownerAllowance1, tokenAddress: ownerTokenAddress1 } = await approveToken(
      token1,
      owner,
      presaleLaunchFactory.address
    );

    console.log("ownerAllowance0: ", ownerAllowance0, ownerTokenAddress0);
    console.log("ownerAllowance1: ", ownerAllowance1, ownerTokenAddress1);

    const now = (await client.getBlock()).timestamp;

    const presaleInfo = {
      // sale start time (timestamp)
      saleStartTime: now + 1000n * 10n, // 10 seconds
      // sale end time (timestamp)
      saleEndTime: now + 1000n * 60n, // 1 minute
      // min buy per user (token amount)
      minBuyPerUser: parseUnits("2", PRECISION_RATE_SCALE),
      // max buy per user (token amount)
      maxBuyPerUser: parseUnits("100", PRECISION_RATE_SCALE),
      // max recevied bnb amount
      hardCap: parseUnits("1000", PRECISION_RATE_SCALE),
      // min recevied bnb amount
      softCap: parseUnits("10", PRECISION_RATE_SCALE),
      // token address for sale
      saleTokenAddress: token0.address.toLowerCase(),
      // token address for fund
      // fundTokenAddress:
      //   "0x0000000000000000000000000000000000000000" as `0x${string}`,
      fundTokenAddress: token1.address.toLowerCase(),
      // total - presale on first period (buy token with bnb) %20
      presaleRate: parseUnits("21.428", PRECISION_RATE_SCALE),
      // total - post sale rate (ready to sale tokens) %30
      listingRate: parseUnits("30.123", PRECISION_RATE_SCALE),
      // total - lock on liquidity (token with bnb) %40
      liquidityRate: parseUnits("40.93", PRECISION_RATE_SCALE),
      // total - protocol fee %50
      protocolFeeRate: parseUnits("0.1", PRECISION_RATE_SCALE),
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

    const presaleLaunchAddress = await presaleLaunchDeployed.address;

    console.log("presaleInfo: ", presaleInfo);
    console.log("presaleLaunchDeployed: ", presaleLaunchAddress);

    const { allowance: creatorAllowance0, tokenAddress: creatorTokenAddress0 } = await approveToken(
      token0,
      creator,
      presaleLaunchAddress
    );
    const { allowance: creatorAllowance1, tokenAddress: creatorTokenAddress1 } = await approveToken(
      token1,
      creator,
      presaleLaunchAddress
    );
    console.log("creatorAllowance0: ", creatorAllowance0, creatorTokenAddress0);
    console.log("creatorAllowance1: ", creatorAllowance1, creatorTokenAddress1);

    const saleTokenAddressFormat = getAddress(
      token0.address.toLowerCase() as `0x${string}`,
      config.networks.hardhat.chainId
    );
    const presaleTokenAddressFormat = getAddress(
      saleTokenAddress as `0x${string}`,
      config.networks.hardhat.chainId
    );
    const fundTokenAddressFormat = getAddress(
      presaleInfo.fundTokenAddress as `0x${string}`,
      config.networks.hardhat.chainId
    );
    const presaleFundTokenAddressFormat = getAddress(
      fundTokenAddress as `0x${string}`,
      config.networks.hardhat.chainId
    );

    assert.equal(
      saleStartTime,
      presaleInfo.saleStartTime,
      "invalid saleStartTime"
    );
    assert.equal(saleEndTime, presaleInfo.saleEndTime, "invalid saleEndTime");
    assert.equal(
      minBuyPerUser,
      presaleInfo.minBuyPerUser,
      "invalid minBuyPerUser"
    );
    assert.equal(
      maxBuyPerUser,
      presaleInfo.maxBuyPerUser,
      "invalid maxBuyPerUser"
    );
    assert.equal(hardCap, presaleInfo.hardCap, "invalid hardCap");
    assert.equal(softCap, presaleInfo.softCap, "invalid softCap");
    assert.equal(
      saleTokenAddressFormat,
      presaleTokenAddressFormat,
      "invalid saleTokenAddress"
    );
    assert.equal(
      fundTokenAddressFormat,
      presaleFundTokenAddressFormat,
      "invalid fundTokenAddress"
    );
    assert.equal(presaleRate, presaleInfo.presaleRate, "invalid presaleRate");
    assert.equal(listingRate, presaleInfo.listingRate, "invalid listingRate");
    assert.equal(
      liquidityRate,
      presaleInfo.liquidityRate,
      "invalid liquidityRate"
    );
    assert.equal(
      protocolFeeRate,
      presaleInfo.protocolFeeRate,
      "invalid protocolFeeRate"
    );
    assert.equal(refundType, presaleInfo.refundType, "invalid refundType");

    const {
      "0": totalFundReceived0,
      "1": totalSaleBought0,
      "2": protocolAddress0,
      "3": isFinalized0,
    } = await presaleLaunchDeployed.read.slot0();

    console.log("0- PresaleSlot0: ", {
      totalFundReceived0,
      totalSaleBought0,
      protocolAddress0,
      isFinalized0,
    });
    
    const feeBalance00 = await token0.read.balanceOf([presaleLaunchAddress]);
    const feeBalance01 = await token1.read.balanceOf([presaleLaunchAddress]);

    console.log("feeBalance00: ", feeBalance00);
    console.log("feeBalance01: ", feeBalance01);

    const isNativeSale =
      presaleInfo.fundTokenAddress ===
      "0x0000000000000000000000000000000000000000";

    if (isNativeSale) {
      await expect(
        presaleLaunchDeployed.write.buyNativeToken({
          account: creator.account.address,
          value: parseEther("1", "wei"),
        })
      ).to.be.rejectedWith("Amount is less than min buy");
    } else {
      await expect(
        presaleLaunchDeployed.write.buyERC20Token([parseEther("1", "wei")], {
          account: creator.account.address,
        })
      ).to.be.rejectedWith("Amount is less than min buy");
    }

    if (isNativeSale) {
      await expect(
        presaleLaunchDeployed.write.buyNativeToken({
          account: creator.account.address,
          value: parseEther("2", "wei"),
        })
      ).to.be.rejectedWith("Sale not started");
    } else {
      await expect(
        presaleLaunchDeployed.write.buyERC20Token([parseEther("2", "wei")], {
          account: creator.account.address,
        })
      ).to.be.rejectedWith("Sale not started");
    }

    await time.setNextBlockTimestamp(presaleInfo.saleStartTime + 1000n);

    if (isNativeSale) {
      await expect(
        presaleLaunchDeployed.write.buyNativeToken({
          account: creator.account.address,
          value: parseEther("1", "wei"),
        })
      ).to.be.rejectedWith("Amount is less than min buy");
    } else {
      await expect(
        presaleLaunchDeployed.write.buyERC20Token([parseEther("1", "wei")], {
          account: creator.account.address,
        })
      ).to.be.rejectedWith("Amount is less than min buy");
    }

    if (isNativeSale) {
      await expect(
        presaleLaunchDeployed.write.buyNativeToken({
          account: creator.account.address,
          value: parseEther("1000", "wei"),
        })
      ).to.be.rejectedWith("Amount is more than max buy");
    } else {
      await expect(
        presaleLaunchDeployed.write.buyERC20Token([parseEther("1000", "wei")], {
          account: creator.account.address,
        })
      ).to.be.rejectedWith("Amount is more than max buy");
    }

    if (isNativeSale) {
      await presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("2", "wei"),
      });
    } else {
      await presaleLaunchDeployed.write.buyERC20Token(
        [parseEther("2", "wei")],
        {
          account: creator.account.address,
        }
      );
    }

    const {
      "0": totalFundReceived1,
      "1": totalSaleBought1,
      "2": protocolAddress1,
      "3": isFinalized1,
    } = await presaleLaunchDeployed.read.slot0();

    console.log("1- PresaleSlot0: ", {
      totalFundReceived1,
      totalSaleBought1,
      protocolAddress1,
      isFinalized1,
    });

    assert.equal(
      totalFundReceived1,
      parseEther("2", "wei"),
      "invalid totalFundReceived"
    );
    assert.equal(
      totalSaleBought1,
      parseEther("0.42856", "wei"),
      "invalid totalSaleBought"
    );
    assert.equal(
      protocolAddress1,
      creator.account.address,
      "invalid protocolAddress"
    );
    assert.equal(isFinalized1, false, "invalid isFinalized");

    await expect(presaleLaunchDeployed.write.finalize()).to.be.rejectedWith(
      "Sale not ended"
    );

    if (isNativeSale) {
      await presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("2", "wei"),
      });
    } else {
      await presaleLaunchDeployed.write.buyERC20Token(
        [parseEther("2", "wei")],
        {
          account: creator.account.address,
        }
      );
    }

    const {
      "0": totalFundReceived2,
      "1": totalSaleBought2,
      "2": protocolAddress2,
      "3": isFinalized2,
    } = await presaleLaunchDeployed.read.slot0();

    console.log("2- PresaleSlot0: ", {
      totalFundReceived2,
      totalSaleBought2,
      protocolAddress2,
      isFinalized2,
    });

    await expect(presaleLaunchDeployed.write.finalize()).to.be.rejectedWith(
      "Sale not ended"
    );

    if (isNativeSale) {
      await presaleLaunchDeployed.write.buyNativeToken({
        account: creator.account.address,
        value: parseEther("6", "wei"),
      });
    } else {
      await presaleLaunchDeployed.write.buyERC20Token(
        [parseEther("6", "wei")],
        {
          account: creator.account.address,
        }
      );
    }

    await expect(presaleLaunchDeployed.write.finalize()).to.be.rejectedWith(
      /(Soft cap not reached|Sale not ended)/
    );

    await time.setNextBlockTimestamp(presaleInfo.saleEndTime + 5000n);

    if (isNativeSale) {
      await expect(
        presaleLaunchDeployed.write.buyNativeToken({
          account: creator.account.address,
          value: parseEther("10", "wei"),
        })
      ).to.be.rejectedWith("Sale ended");
    } else {
      await expect(
        presaleLaunchDeployed.write.buyERC20Token([parseEther("10", "wei")], {
          account: creator.account.address,
        })
      ).to.be.rejectedWith("Sale ended");
    }

    console.log("finalize....");

    await presaleLaunchDeployed.write.finalize();

    const {
      "0": totalFundReceived3,
      "1": totalSaleBought3,
      "2": protocolAddress3,
      "3": isFinalized3,
    } = await presaleLaunchDeployed.read.slot0();

    const feeBalance1 = await token0.read.balanceOf([presaleLaunchAddress]);
    const feeBalance2 = await token1.read.balanceOf([presaleLaunchAddress]);

    console.log("Finalized: ", {
      slot0: {
        totalFundReceived3,
        totalSaleBought3,
        protocolAddress3,
        isFinalized3,
      },
      feeBalance1,
      feeBalance2,
    });
  });
});
