import { config, viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  parseAbi,
  parseEther,
  parseEventLogs,
} from "viem";
import { HardhatNetworkAccountConfig } from "hardhat/types";
import { privateKeyToAccount } from "viem/_types/accounts/privateKeyToAccount";

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
    const { presaleLaunchFactory, owner, client } = await loadFixture(
      deployPresaleLaunchFactoryFixture
    );

    console.log("Owner: ", owner.account.address);

    const presaleInfo = {
      saleStartTime: 10000000000000000000n,
      saleEndTime: 10000000000000000000n,
      minBuyPerUser: 1000000000000000000n,
      maxBuyPerUser: 1000000000000000000n,
      tokenOnSale:
        "0x1234567890123456789012345678901234567890" as `0x${string}`,
      hardCap: 100n,
      softCap: 100n,
      presaleRate: 100n,
      listingRate: 100n,
      liquidityPercent: 100n,
      BNBFee: 2n,
      refundType: 1n,
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
