import { expect } from "chai";
import { network } from "hardhat";

describe("TradeLedger", function () {
  let ledger: any;

  // ============================================================
  // DEPLOY CONTRACT
  // ============================================================

  async function deployLedger() {
    const { ethers } = await network.connect();

    const TradeLedger = await ethers.getContractFactory("TradeLedger");

    const contract = await TradeLedger.deploy();

    await contract.waitForDeployment();

    return contract;
  }

  // ============================================================
  // CONVERT DATE TO BLOCKCHAIN TIMESTAMP
  // ============================================================

  function dateToTimestamp(date: string): bigint {
    return BigInt(Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000));
  }

  // ============================================================
  // SAMPLE SUCCESSFUL TRADE
  // ============================================================

  function successfulTradeInput(
    transactionId: string,
    expectedDelivery: string,
    actualDelivery: string,
    inspectionStatus: string = "PASSED",
  ) {
    return {
      transactionId,

      exporterId: "EX-9281",

      importerId: "IM-1932",

      product: "Rice",

      quantity: 10000n,

      tradeStatus: "SUCCESSFUL",

      inspectionStatus,

      disputeStatus: "NONE",

      settlementStatus: "RELEASED",

      expectedDelivery: dateToTimestamp(expectedDelivery),

      actualDelivery: dateToTimestamp(actualDelivery),

      invoiceHash: "8af39abc123456789",
    };
  }

  // ============================================================
  // DEPLOY A FRESH CONTRACT BEFORE EVERY TEST
  // ============================================================

  beforeEach(async function () {
    ledger = await deployLedger();
  });

  // ============================================================
  // RECORD TRADE TESTS
  // ============================================================

  describe("recordTrade", function () {
    // ==========================================================
    // TEST 1
    // Complete trade should be stored correctly
    // ==========================================================

    it("should record a completed trade correctly", async function () {
      const input = successfulTradeInput("TX10291", "2026-08-10", "2026-08-09");

      await ledger.recordTrade(input, 92n);

      const trade = await ledger.getTrade("TX10291");

      expect(trade[0]).to.equal("TX10291");

      expect(trade[1]).to.equal("EX-9281");

      expect(trade[2]).to.equal("IM-1932");

      expect(trade[3]).to.equal("Rice");

      expect(trade[4]).to.equal(10000n);

      expect(trade[5]).to.equal("SUCCESSFUL");

      expect(trade[6]).to.equal("PASSED");

      expect(trade[7]).to.equal("NONE");

      expect(trade[8]).to.equal("RELEASED");

      expect(trade[9]).to.equal(dateToTimestamp("2026-08-10"));

      expect(trade[10]).to.equal(dateToTimestamp("2026-08-09"));

      expect(trade[11]).to.equal("8af39abc123456789");

      expect(trade[12]).to.equal(92n);

      expect(trade[13]).to.be.greaterThan(0n);
    });

    // ==========================================================
    // TEST 2
    // Trade should belong to correct exporter
    // ==========================================================

    it("should associate the trade with the correct exporter", async function () {
      const input = successfulTradeInput("TX10291", "2026-08-10", "2026-08-09");

      await ledger.recordTrade(input, 92n);

      const tradeIds = await ledger.getExporterTradeIds("EX-9281");

      expect(tradeIds.length).to.equal(1);

      expect(tradeIds[0]).to.equal("TX10291");
    });

    // ==========================================================
    // TEST 3
    // Duplicate transaction ID should fail
    // ==========================================================

    it("should reject a duplicate transaction ID", async function () {
      const input = successfulTradeInput("TX10291", "2026-08-10", "2026-08-09");

      await ledger.recordTrade(input, 92n);

      await expect(ledger.recordTrade(input, 93n)).to.be.revertedWith(
        "Trade already exists",
      );
    });

    // ==========================================================
    // TEST 4
    // Different exporters must have separate histories
    // ==========================================================

    it("should keep different exporters' trade histories separate", async function () {
      // Trade of EX-9281
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09"),

        90n,
      );

      // Trade of EX-5555
      await ledger.recordTrade(
        {
          transactionId: "TX002",

          exporterId: "EX-5555",

          importerId: "IM-7777",

          product: "Wheat",

          quantity: 5000n,

          tradeStatus: "SUCCESSFUL",

          inspectionStatus: "PASSED",

          disputeStatus: "NONE",

          settlementStatus: "RELEASED",

          expectedDelivery: dateToTimestamp("2026-08-15"),

          actualDelivery: dateToTimestamp("2026-08-14"),

          invoiceHash: "wheat-invoice-hash",
        },

        88n,
      );

      const exporter1Trades = await ledger.getExporterTradeIds("EX-9281");

      const exporter2Trades = await ledger.getExporterTradeIds("EX-5555");

      expect(exporter1Trades.length).to.equal(1);

      expect(exporter1Trades[0]).to.equal("TX001");

      expect(exporter2Trades.length).to.equal(1);

      expect(exporter2Trades[0]).to.equal("TX002");
    });
  });

  // ============================================================
  // EXPORTER REPUTATION TESTS
  // ============================================================

  describe("exporter reputation", function () {
    // ========================================================
    // TEST 5
    // On-time delivery denominator
    // ========================================================

    it("should calculate on-time delivery rate using delivered trades as the denominator", async function () {
      // Delivered ON TIME
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09"),

        80n,
      );

      // Delivered LATE
      await ledger.recordTrade(
        successfulTradeInput("TX002", "2026-08-10", "2026-08-12"),

        81n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      // 2 successful trades
      expect(reputation[0]).to.equal(2n);

      // 1 on-time / 2 delivered = 50%
      expect(reputation[4]).to.equal(5000n);
    });

    // ========================================================
    // TEST 6
    // Quality denominator
    // ========================================================

    it("should calculate quality pass rate using inspected trades as the denominator", async function () {
      // Inspected + PASSED
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09", "PASSED"),

        80n,
      );

      // Inspected + FAILED
      await ledger.recordTrade(
        successfulTradeInput("TX002", "2026-08-10", "2026-08-09", "FAILED"),

        81n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      // 1 passed / 2 inspected = 50%
      expect(reputation[5]).to.equal(5000n);
    });

    // ========================================================
    // TEST 7
    // Cancelled trade should not affect delivery denominator
    // ========================================================

    it("should not count a cancelled and undelivered trade in the on-time delivery denominator", async function () {
      // Delivered + on time
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09"),

        80n,
      );

      // Cancelled
      await ledger.recordTrade(
        {
          transactionId: "TX002",

          exporterId: "EX-9281",

          importerId: "IM-1932",

          product: "Rice",

          quantity: 10000n,

          tradeStatus: "CANCELLED",

          inspectionStatus: "NONE",

          disputeStatus: "NONE",

          settlementStatus: "CANCELLED",

          expectedDelivery: dateToTimestamp("2026-08-12"),

          actualDelivery: 0n,

          invoiceHash: "cancelled-hash",
        },

        79n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      expect(reputation[0]).to.equal(1n);

      expect(reputation[3]).to.equal(1n);

      // 1 on-time / 1 delivered = 100%
      expect(reputation[4]).to.equal(10000n);
    });

    // ========================================================
    // TEST 8
    // Dispute rate
    // ========================================================

    it("should calculate dispute rate using total trades as the denominator", async function () {
      // No dispute
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09"),

        80n,
      );

      // Disputed
      await ledger.recordTrade(
        {
          transactionId: "TX002",

          exporterId: "EX-9281",

          importerId: "IM-1932",

          product: "Rice",

          quantity: 10000n,

          tradeStatus: "SUCCESSFUL",

          inspectionStatus: "PASSED",

          disputeStatus: "RAISED",

          settlementStatus: "RELEASED",

          expectedDelivery: dateToTimestamp("2026-08-10"),

          actualDelivery: dateToTimestamp("2026-08-09"),

          invoiceHash: "8af39abc999999999",
        },

        81n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      expect(reputation[1]).to.equal(1n);

      // 1 disputed / 2 total = 50%
      expect(reputation[6]).to.equal(5000n);
    });

    // ========================================================
    // TEST 9
    // Historical trust score
    // ========================================================

    it("should preserve the trust score after each trade", async function () {
      await ledger.recordTrade(
        successfulTradeInput("TX001", "2026-08-10", "2026-08-09"),

        78n,
      );

      await ledger.recordTrade(
        successfulTradeInput("TX002", "2026-08-11", "2026-08-10"),

        81n,
      );

      const firstTrade = await ledger.getTrade("TX001");

      const secondTrade = await ledger.getTrade("TX002");

      const reputation = await ledger.getExporterReputation("EX-9281");

      // Historical score at TX001
      expect(firstTrade[12]).to.equal(78n);

      // Historical score at TX002
      expect(secondTrade[12]).to.equal(81n);

      // Current score
      expect(reputation[7]).to.equal(81n);
    });

    // ========================================================
    // TEST 10
    // Exporter with no history
    // ========================================================

    it("should return no trades for an exporter with no trade history", async function () {
      const tradeIds = await ledger.getExporterTradeIds("EX-9999");

      expect(tradeIds.length).to.equal(0);
    });

    // ========================================================
    // TEST 11
    // Same-day delivery is on-time
    // ========================================================

    it("should treat delivery on the expected date as on-time", async function () {
      await ledger.recordTrade(
        successfulTradeInput("TX-SAME-DAY", "2026-08-10", "2026-08-10"),

        90n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      expect(reputation[4]).to.equal(10000n);
    });

    // ========================================================
    // TEST 12
    // Early delivery is on-time
    // ========================================================

    it("should treat delivery before the expected date as on-time", async function () {
      await ledger.recordTrade(
        successfulTradeInput("TX-EARLY", "2026-08-10", "2026-08-08"),

        90n,
      );

      const reputation = await ledger.getExporterReputation("EX-9281");

      expect(reputation[4]).to.equal(10000n);
    });

    // ========================================================
    // TEST 13
    // Invoice hash should be preserved
    // ========================================================

    it("should preserve the invoice hash for a specific trade", async function () {
      await ledger.recordTrade(
        {
          transactionId: "TX-INVOICE",

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

          invoiceHash: "sha256-invoice-hash-123",
        },

        92n,
      );

      const trade = await ledger.getTrade("TX-INVOICE");

      expect(trade[11]).to.equal("sha256-invoice-hash-123");
    });
  });
});
