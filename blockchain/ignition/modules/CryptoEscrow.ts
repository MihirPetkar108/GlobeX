import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// CryptoEscrow handles native ETH and a configured ERC-20 (USDC) address.
// The USDC address is supplied by the backend at escrow creation time, so no
// proprietary GLOBEX token is deployed here.
export default buildModule("CryptoEscrowModule", (m) => {
  const escrow = m.contract("CryptoEscrow");
  return { escrow };
});
