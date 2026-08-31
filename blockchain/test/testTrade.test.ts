import "dotenv/config";
import { network } from "hardhat";

// ============================================================
// DEPLOYED CONTRACT ADDRESS
// ============================================================

const CONTRACT_ADDRESS = process.env.TRADE_LEDGER_CONTRACT_ADDRESS;
if (!CONTRACT_ADDRESS) {
  throw new Error(
    "TRADE_LEDGER_CONTRACT_ADDRESS is not defined in the environment variables.",
  );
}

// ============================================================
// CONVERT DATE TO BLOCKCHAIN TIMESTAMP
// ============================================================

function dateToTimestamp(date: string): bigint {
  return BigInt(Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000));
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  // Connect to the local Hardhat blockchain
  const { ethers } = await network.connect();

  console.log("Connected to local blockchain");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("");

  // ==========================================================
  // GET THE DEPLOYED CONTRACT
  // ==========================================================

  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "TRADE_LEDGER_CONTRACT_ADDRESS is not defined in the environment variables.",
    );
  }

  const ledger = await ethers.getContractAt("TradeLedger", CONTRACT_ADDRESS);

  console.log("TradeLedger contract loaded");
  console.log("");

  // ==========================================================
  // CREATE TRADE DATA
  // ==========================================================

  const trade = {
    transactionId: "TX10291",

    exporterId: "EX-9281",

    importerId: "IM-1932",

    product: "Rice",

    quantity: 10000n,

    tradeStatus: "SUCCESSFUL",

    inspectionStatus: "PASSED",

    disputeStatus: "NONE",

    settlementStatus: "RELEASED",

    expectedDelivery: dateToTimestamp("2026-08-10"),

    actualDelivery: dateToTimestamp("2026-08-09"),

    invoiceHash: "8af39abc123456789",
  };

  // ==========================================================
  // RECORD TRADE ON BLOCKCHAIN
  // ==========================================================

  console.log("Recording trade...");
  console.log("Transaction ID:", trade.transactionId);
  console.log("Exporter:", trade.exporterId);
  console.log("Importer:", trade.importerId);
  console.log("");

  const tx = await ledger.recordTrade(trade, 92n);

  console.log("Transaction submitted:");

  console.log(tx.hash);
  console.log("");

  // Wait until the blockchain confirms it
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Transaction failed or was not confirmed.");
  }

  console.log("Trade successfully recorded!");

  console.log("Block number:", receipt.blockNumber);

  console.log("");

  // ==========================================================
  // READ THE TRADE BACK FROM BLOCKCHAIN
  // ==========================================================

  console.log("Reading trade from blockchain...");

  const storedTrade = await ledger.getTrade("TX10291");

  // ==========================================================
  // DISPLAY STORED TRADE
  // ==========================================================

  console.log("");
  console.log("========================================");
  console.log("        STORED TRADE");
  console.log("========================================");

  console.log("Transaction ID:", storedTrade[0]);

  console.log("Exporter:", storedTrade[1]);

  console.log("Importer:", storedTrade[2]);

  console.log("Product:", storedTrade[3]);

  console.log("Quantity:", storedTrade[4].toString());

  console.log("Trade Status:", storedTrade[5]);

  console.log("Inspection:", storedTrade[6]);

  console.log("Dispute:", storedTrade[7]);

  console.log("Settlement:", storedTrade[8]);

  console.log(
    "Expected Delivery:",
    new Date(Number(storedTrade[9]) * 1000).toISOString(),
  );

  console.log(
    "Actual Delivery:",
    new Date(Number(storedTrade[10]) * 1000).toISOString(),
  );

  console.log("Invoice Hash:", storedTrade[11]);

  console.log("Trust Score:", storedTrade[12].toString());

  console.log(
    "Recorded At:",
    new Date(Number(storedTrade[13]) * 1000).toISOString(),
  );

  console.log("========================================");
}

// ============================================================
// RUN
// ============================================================

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
