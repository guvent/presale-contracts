import { config, viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  parseAbi,
  parseEther,
  parseEventLogs,
} from "viem";
import { HardhatNetworkAccountConfig } from "hardhat/types";
import { privateKeyToAccount } from "viem/accounts";

describe("PresaleLaunchProgram", function () {
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

  it("should create a presale launch program", async function () {
    console.log("* should create a presale launch program");
    const { presaleLaunchFactory, owner, client } = await loadFixture(
      deployPresaleLaunchFactoryFixture
    );

    console.log("Owner: ", owner.account.address);

    const presaleInfo = {
      // sale start time (timestamp)
      saleStartTime: 10000000000000000000n,
      // sale end time (timestamp)
      saleEndTime: 10000000000000000000n,
      // min buy per user (token amount)
      minBuyPerUser: 1000000000000000000n,
      // max buy per user (token amount)
      maxBuyPerUser: 1000000000000000000n,
      // token address for sale
      saleTokenAddress:
        "0x1234567890123456789012345678901234567890" as `0x${string}`,
      // token address for fund
      fundTokenAddress:
        "0x1234567890123456789012345678901234567890" as `0x${string}`,
      // max recevied bnb amount
      hardCap: 100n,
      // min recevied bnb amount
      softCap: 100n,
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

    const factoryOwner = await presaleLaunchFactory.read.owner();
    console.log("FactoryOwner: ", factoryOwner);

    const presaleLaunchProgram = await presaleLaunchFactory.write.create(
      [presaleInfo],
      { account: owner.account.address, value: parseEther("2", "wei") }
    );

    const tx = await client.getTransactionReceipt({
      hash: presaleLaunchProgram,
    });

    const logs = parseEventLogs({
      abi: parseAbi([
        "event PresaleLaunchProgramCreated(address indexed presaleLaunchProgram)",
      ]),
      logs: tx.logs,
    });

    const presaleLaunchProgramAddress =
      logs[0].args.presaleLaunchProgram.toLowerCase();

    console.log("PresaleLaunchProgramAddress: ", presaleLaunchProgramAddress);

    const presaleLaunchProgramDeployed = await viem.getContractAt(
      "PresaleLaunchProgram",
      presaleLaunchProgramAddress as `0x${string}`,
      { client: { wallet: owner } }
    );

    const deployedPresaleInfo =
      await presaleLaunchProgramDeployed.read.info();
    console.log("Deployed PresaleInfo: ", deployedPresaleInfo);
  });
});
