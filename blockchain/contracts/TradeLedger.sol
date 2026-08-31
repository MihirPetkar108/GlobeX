// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TradeLedger {

    // ============================================================
    // TRADE
    // Stores the record of one completed trade.
    // ============================================================

    struct Trade {
        string recordId;
        string transactionId;
        string listingId;

        string exporterId;
        string importerId;

        string product;
        uint256 quantity;
        uint256 totalAmount;
        string currency;

        string tradeStatus;
        string inspectionStatus;
        string disputeStatus;
        string settlementStatus;

        // Unix timestamps
        uint256 expectedDelivery;
        uint256 actualDelivery;

        // SHA-256 hash of the invoice
        string invoiceHash;

        // Trust score immediately after this trade
        uint256 trustScoreAfterTrade;

        // Blockchain timestamp when this record was created
        uint256 timestamp;
    }


    // ============================================================
    // EXPORTER REPUTATION
    // Aggregated reputation information for each exporter.
    // ============================================================

    struct ReputationStats {
        uint256 completedTrades;
        uint256 disputedTrades;
        uint256 failedTrades;
        uint256 cancelledTrades;

        // Number of trades where delivery actually occurred
        uint256 deliveredTrades;

        // Number of trades where inspection actually occurred
        uint256 inspectedTrades;

        // Number of delivered trades completed on/before expected date
        uint256 onTimeDeliveries;

        // Number of inspected trades that passed
        uint256 qualityPassedTrades;

        uint256 totalTrades;

        // Most recent trust score
        uint256 currentTrustScore;
    }


    // ============================================================
    // STORAGE
    // ============================================================

    // recordId => Trade
    //
    // Example:
    // "TX10291" => Trade(...)
    mapping(string => Trade) private trades;

    // List of all transaction IDs
    string[] private allTradeIds;


    // exporterId => list of transaction IDs
    //
    // Example:
    // "EX-9281" => ["TX001", "TX003", "TX005"]
    mapping(string => string[]) private exporterTradeIds;

    // tradeStatus => list of transaction IDs
    mapping(string => string[]) private tradesByStatus;

    // transactionId => lifecycle record IDs
    mapping(string => string[]) private transactionRecordIds;

    // exporterId => ReputationStats
    //
    // Example:
    // "EX-9281" => {
    //     successfulTrades: 126,
    //     disputedTrades: 3,
    //     ...
    // }
    mapping(string => ReputationStats) public exporterReputation;


    // ============================================================
    // EVENTS
    // ============================================================

    event TradeRecorded(
        string recordId,
        string transactionId,
        string exporterId,
        string importerId,
        uint256 trustScoreAfterTrade,
        uint256 timestamp
    );

// ============================================================
// TRADE INPUT
// Groups trade data together to avoid a "Stack too deep"
// compiler error.
// ============================================================

struct TradeInput {
    string transactionId;
    string listingId;
    string exporterId;
    string importerId;
    string product;
    uint256 quantity;
    uint256 totalAmount;
    string currency;
    string tradeStatus;
    string inspectionStatus;
    string disputeStatus;
    string settlementStatus;
    uint256 expectedDelivery;
    uint256 actualDelivery;
    string invoiceHash;
}

    // ============================================================
    // RECORD TRADE
    // ============================================================

 function recordTrade(
     string memory recordId,
    TradeInput memory input,
    uint256 trustScoreAfterTrade
) public {

    // --------------------------------------------------------
    // Prevent invalid or duplicate transaction IDs
    // --------------------------------------------------------

    require(
        bytes(recordId).length > 0,
        "Record ID cannot be empty"
    );

    require(
        bytes(input.transactionId).length > 0,
        "Transaction ID cannot be empty"
    );

    require(
        bytes(input.exporterId).length > 0,
        "Exporter ID cannot be empty"
    );

    require(
        bytes(input.importerId).length > 0,
        "Importer ID cannot be empty"
    );

    require(
        bytes(trades[recordId].recordId).length == 0,
        "Record already exists"
    );


    // --------------------------------------------------------
    // Create the trade
    // --------------------------------------------------------

    Trade memory newTrade = Trade({
        recordId: recordId,
        transactionId: input.transactionId,
        listingId: input.listingId,

        exporterId: input.exporterId,
        importerId: input.importerId,

        product: input.product,
        quantity: input.quantity,
        totalAmount: input.totalAmount,
        currency: input.currency,

        tradeStatus: input.tradeStatus,
        inspectionStatus: input.inspectionStatus,
        disputeStatus: input.disputeStatus,
        settlementStatus: input.settlementStatus,

        expectedDelivery: input.expectedDelivery,
        actualDelivery: input.actualDelivery,

        invoiceHash: input.invoiceHash,

        trustScoreAfterTrade: trustScoreAfterTrade,

        timestamp: block.timestamp
    });


    // --------------------------------------------------------
    // Store trade
    // --------------------------------------------------------

    trades[recordId] = newTrade;
    allTradeIds.push(recordId);
    transactionRecordIds[input.transactionId].push(recordId);

    // --------------------------------------------------------
    // Associate trade with exporter
    // --------------------------------------------------------

    exporterTradeIds[input.exporterId].push(recordId);

    // Associate trade with its current status
    tradesByStatus[input.tradeStatus].push(recordId);

    // --------------------------------------------------------
    // Update exporter reputation
    // --------------------------------------------------------

    ReputationStats storage stats =
        exporterReputation[input.exporterId];

    stats.totalTrades += 1;

    stats.currentTrustScore = trustScoreAfterTrade;


    // --------------------------------------------------------
    // Count trade status
    // --------------------------------------------------------

    if (
        keccak256(bytes(input.tradeStatus))
            == keccak256(bytes("COMPLETED"))
    ) {

        stats.completedTrades += 1;

    } else if (
        keccak256(bytes(input.tradeStatus))
            == keccak256(bytes("FAILED"))
    ) {

        stats.failedTrades += 1;

    } else if (
        keccak256(bytes(input.tradeStatus))
            == keccak256(bytes("CANCELLED"))
    ) {

        stats.cancelledTrades += 1;
    }


    // --------------------------------------------------------
    // Count disputes
    // --------------------------------------------------------

    if (
        keccak256(bytes(input.disputeStatus))
            != keccak256(bytes("NONE"))
    ) {

        stats.disputedTrades += 1;
    }


    // --------------------------------------------------------
    // Count delivered trades
    // --------------------------------------------------------

    if (input.actualDelivery > 0) {

        stats.deliveredTrades += 1;

        // Actual delivery <= expected delivery
        // means the trade was delivered on time.

        if (
            input.expectedDelivery > 0 &&
            input.actualDelivery <= input.expectedDelivery
        ) {

            stats.onTimeDeliveries += 1;
        }
    }


    // --------------------------------------------------------
    // Count inspected trades
    // --------------------------------------------------------

    // Both PASSED and FAILED mean an inspection happened.
    // NONE means no inspection happened.

    if (
        keccak256(bytes(input.inspectionStatus))
            == keccak256(bytes("PASSED"))
        ||
        keccak256(bytes(input.inspectionStatus))
            == keccak256(bytes("FAILED"))
    ) {

        stats.inspectedTrades += 1;

        // Only PASSED counts toward quality pass rate.

        if (
            keccak256(bytes(input.inspectionStatus))
                == keccak256(bytes("PASSED"))
        ) {

            stats.qualityPassedTrades += 1;
        }
    }


    // --------------------------------------------------------
    // Emit event
    // --------------------------------------------------------

    emit TradeRecorded(
        recordId,
        input.transactionId,
        input.exporterId,
        input.importerId,
        trustScoreAfterTrade,
        block.timestamp
    );
}


    // ============================================================
    // GET ONE TRADE
    // ============================================================

    function getTrade(
        string memory recordId
    )
        public
        view
        returns (Trade memory)
    {
        require(
            bytes(trades[recordId].recordId).length > 0,
            "Trade does not exist"
        );

        return trades[recordId];
    }

    function getTradesByTransactionId(string memory transactionId)
        public
        view
        returns (Trade[] memory)
    {
        string[] memory recordIds = transactionRecordIds[transactionId];
        Trade[] memory result = new Trade[](recordIds.length);
        for (uint256 i = 0; i < recordIds.length; i++) {
            result[i] = trades[recordIds[i]];
        }
        return result;
    }


    // ============================================================
    // GET EXPORTER'S TRADE IDS
    // ============================================================

    function getExporterTradeIds(
        string memory exporterId
    )
        public
        view
        returns (string[] memory)
    {
        return exporterTradeIds[exporterId];
    }

    // ============================================================
    // GET TRADES BY STATUS
    // ============================================================

    function getTradesByStatus(
        string memory status
    )
        public
        view
        returns (Trade[] memory)
    {
        string[] memory transactionIds = tradesByStatus[status];

        Trade[] memory result = new Trade[](transactionIds.length);

        for (uint256 i = 0; i < transactionIds.length; i++) {
            result[i] = trades[transactionIds[i]];
        }

        return result;
    }

    // ============================================================
    // GET EXPORTER REPUTATION
    // ============================================================

    function getExporterReputation(
        string memory exporterId
    )
        public
        view
        returns (
            uint256 completedTrades,
            uint256 disputedTrades,
            uint256 failedTrades,
            uint256 cancelledTrades,
            uint256 onTimeDeliveryRate,
            uint256 qualityPassRate,
            uint256 disputeRate,
            uint256 currentTrustScore,
            uint256 totalTrades
        )
    {

        ReputationStats memory stats =
            exporterReputation[exporterId];


        // --------------------------------------------------------
        // Rates are returned as basis points.
        //
        // 9480 = 94.80%
        // 9720 = 97.20%
        // 230  = 2.30%
        // --------------------------------------------------------

        uint256 onTimeRate = 0;
        uint256 qualityRate = 0;
        uint256 disputeRateValue = 0;


        // --------------------------------------------------------
        // ON-TIME DELIVERY RATE
        // --------------------------------------------------------
        //
        // Correct denominator:
        //
        // on-time deliveries
        // -------------------
        // delivered trades
        //
        // Example:
        //
        // 90 delivered
        // 85 on time
        //
        // 85 / 90 = 94.44%
        // --------------------------------------------------------

        if (stats.deliveredTrades > 0) {

            onTimeRate =
                (stats.onTimeDeliveries * 10000)
                / stats.deliveredTrades;
        }

        // --------------------------------------------------------
        // QUALITY PASS RATE
        // --------------------------------------------------------
        //
        // Correct denominator:
        //
        // passed inspections
        // ------------------
        // total inspections
        //
        // Example:
        //
        // 80 inspected
        // 78 passed
        //
        // 78 / 80 = 97.50%
        // --------------------------------------------------------

        if (stats.inspectedTrades > 0) {

            qualityRate =
                (stats.qualityPassedTrades * 10000)
                / stats.inspectedTrades;
        }


        // --------------------------------------------------------
        // DISPUTE RATE
        // --------------------------------------------------------
        //
        // Disputed trades / total trades
        //
        // Example:
        //
        // 3 disputes
        // 130 total trades
        //
        // 3 / 130 = 2.30%
        // --------------------------------------------------------

        if (stats.totalTrades > 0) {

            disputeRateValue =
                (stats.disputedTrades * 10000)
                / stats.totalTrades;
        }


        return (
            stats.completedTrades,
            stats.disputedTrades,
            stats.failedTrades,
            stats.cancelledTrades,
            onTimeRate,
            qualityRate,
            disputeRateValue,
            stats.currentTrustScore,
            stats.totalTrades
        );
    }

// ============================================================
// GET ALL TRADE IDS
// ============================================================

function getAllTradeIds()
    public
    view
    returns (string[] memory)
{
    return allTradeIds;
}
}