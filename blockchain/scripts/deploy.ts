import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  console.log("Deploying TradeLedger...");

  const TradeLedger = await ethers.getContractFactory("TradeLedger");

  const ledger = await TradeLedger.deploy();

  await ledger.waitForDeployment();

  const address = await ledger.getAddress();

  console.log("TradeLedger deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
