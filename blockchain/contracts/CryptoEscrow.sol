// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CryptoEscrow
 * @notice Holds either native ETH or one configured ERC-20 payment asset.
 * GLOBEX authorizes the trade and settlement; the payer signs the deposit.
 */
contract CryptoEscrow is Ownable, ReentrancyGuard {
    enum AssetType { NATIVE, ERC20 }
    enum EscrowStatus { CREATED, FUNDED, RELEASED, REFUNDED, DISPUTED }

    struct Escrow {
        string tradeId;
        address payer;
        address payee;
        AssetType assetType;
        address token;
        uint256 amount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }

    mapping(string => Escrow) public escrows;
    string[] public tradeIds;

    event EscrowCreated(
        string indexed tradeId,
        address indexed payer,
        address indexed payee,
        AssetType assetType,
        address token,
        uint256 amount
    );
    event EscrowFunded(
        string indexed tradeId,
        AssetType assetType,
        address token,
        uint256 amount
    );
    event EscrowReleased(
        string indexed tradeId,
        address indexed payee,
        AssetType assetType,
        address token,
        uint256 amount
    );
    event EscrowRefunded(
        string indexed tradeId,
        address indexed payer,
        AssetType assetType,
        address token,
        uint256 amount
    );
    event DisputeRaised(string indexed tradeId);

    constructor() Ownable(msg.sender) {}

    function createEscrow(
        string memory tradeId,
        address payer,
        address payee,
        AssetType assetType,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(bytes(escrows[tradeId].tradeId).length == 0, "Escrow already exists");
        require(payer != address(0), "Invalid payer address");
        require(payee != address(0), "Invalid payee address");
        require(amount > 0, "Amount must be greater than 0");
        if (assetType == AssetType.NATIVE) {
            require(token == address(0), "Native ETH cannot have a token");
        } else {
            require(token != address(0), "ERC20 token is required");
        }

        escrows[tradeId] = Escrow({
            tradeId: tradeId,
            payer: payer,
            payee: payee,
            assetType: assetType,
            token: token,
            amount: amount,
            status: EscrowStatus.CREATED,
            createdAt: block.timestamp,
            settledAt: 0
        });
        tradeIds.push(tradeId);

        emit EscrowCreated(tradeId, payer, payee, assetType, token, amount);
    }

    /// @notice Deposit an ERC-20 asset after approving this contract.
    function deposit(string memory tradeId, uint256 amount) external nonReentrant {
        Escrow storage escrow = escrows[tradeId];
        require(bytes(escrow.tradeId).length != 0, "Escrow does not exist");
        require(escrow.assetType == AssetType.ERC20, "Escrow expects native ETH");
        require(escrow.status == EscrowStatus.CREATED, "Escrow not in CREATED state");
        require(msg.sender == escrow.payer, "Only payer can deposit");
        require(amount == escrow.amount, "Amount mismatch");
        require(IERC20(escrow.token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        escrow.status = EscrowStatus.FUNDED;
        emit EscrowFunded(tradeId, escrow.assetType, escrow.token, amount);
    }

    /// @notice Deposit native ETH. msg.value is the complete payment.
    function depositNative(string memory tradeId) external payable nonReentrant {
        Escrow storage escrow = escrows[tradeId];
        require(bytes(escrow.tradeId).length != 0, "Escrow does not exist");
        require(escrow.assetType == AssetType.NATIVE, "Escrow expects ERC20");
        require(escrow.status == EscrowStatus.CREATED, "Escrow not in CREATED state");
        require(msg.sender == escrow.payer, "Only payer can deposit");
        require(msg.value == escrow.amount, "ETH amount mismatch");

        escrow.status = EscrowStatus.FUNDED;
        emit EscrowFunded(tradeId, escrow.assetType, address(0), msg.value);
    }

    function release(string memory tradeId) external onlyOwner nonReentrant {
        Escrow storage escrow = _fundedEscrow(tradeId);
        _transferAsset(escrow, escrow.payee);
        escrow.status = EscrowStatus.RELEASED;
        escrow.settledAt = block.timestamp;
        emit EscrowReleased(tradeId, escrow.payee, escrow.assetType, escrow.token, escrow.amount);
    }

    function refund(string memory tradeId) external onlyOwner nonReentrant {
        Escrow storage escrow = _fundedEscrow(tradeId);
        _transferAsset(escrow, escrow.payer);
        escrow.status = EscrowStatus.REFUNDED;
        escrow.settledAt = block.timestamp;
        emit EscrowRefunded(tradeId, escrow.payer, escrow.assetType, escrow.token, escrow.amount);
    }

    function raiseDispute(string memory tradeId) external onlyOwner {
        Escrow storage escrow = escrows[tradeId];
        require(bytes(escrow.tradeId).length != 0, "Escrow does not exist");
        require(escrow.status == EscrowStatus.FUNDED, "Escrow not in FUNDED state");
        escrow.status = EscrowStatus.DISPUTED;
        emit DisputeRaised(tradeId);
    }

    function escrowExists(string memory tradeId) public view returns (bool) {
        return bytes(escrows[tradeId].tradeId).length != 0;
    }

    function getEscrow(string memory tradeId) external view returns (Escrow memory) {
        require(escrowExists(tradeId), "Escrow does not exist");
        return escrows[tradeId];
    }

    function getAllTradeIds() external view returns (string[] memory) {
        return tradeIds;
    }

    function _fundedEscrow(string memory tradeId) internal view returns (Escrow storage escrow) {
        escrow = escrows[tradeId];
        require(bytes(escrow.tradeId).length != 0, "Escrow does not exist");
        require(
            escrow.status == EscrowStatus.FUNDED || escrow.status == EscrowStatus.DISPUTED,
            "Escrow is not settleable"
        );
    }

    function _transferAsset(Escrow storage escrow, address recipient) internal {
        if (escrow.assetType == AssetType.NATIVE) {
            (bool sent, ) = payable(recipient).call{value: escrow.amount}("");
            require(sent, "ETH transfer failed");
        } else {
            require(IERC20(escrow.token).transfer(recipient, escrow.amount), "Token transfer failed");
        }
    }
}