import { viem } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  decodeAbiParameters,
  formatUnits,
  parseAbi,
  parseEther,
  parseEventLogs,
  parseGwei,
  parseUnits,
} from "viem";
import { getTransaction } from "viem/_types/actions/public/getTransaction";

describe("PresaleLaunchProgram", function () {
  async function deployOneYearLockFixture() {
    const [owner, creator] = await viem.getWalletClients();
    const client = await viem.getPublicClient();

    const presaleLaunchFactory = await viem.deployContract(
      "PresaleLaunchFactory",
      [],
      { client: { wallet: creator } }
    );

    return { presaleLaunchFactory, owner, creator, client };
  }

  it("should create a presale launch program", async function () {
    const { presaleLaunchFactory, owner, client } = await loadFixture(
      deployOneYearLockFixture
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
      await presaleLaunchProgramDeployed.read.presaleInfo();
    console.log("Deployed PresaleInfo: ", deployedPresaleInfo);
  });
});
