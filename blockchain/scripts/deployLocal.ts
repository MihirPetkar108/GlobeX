import { network } from "hardhat";

/** Deploy the ETH/USDC-compatible escrow. No proprietary token is deployed. */
async function main() {
  const { ethers } = await network.connect();
  console.log("Deploying CryptoEscrow...");

  const escrow = await ethers.deployContract("CryptoEscrow");
  await escrow.waitForDeployment();

  console.log("CryptoEscrow deployed to:", await escrow.getAddress());
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Configure this address as CRYPTO_ESCROW_CONTRACT_ADDRESS.");
  console.log("Configure the official Sepolia USDC address as CRYPTO_USDC_CONTRACT_ADDRESS.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});