"""
GlobeXAI Trade OS — Escrow Router.

Persists the real TradeEscrow.sol lifecycle (see services/chain-adapter's
escrow.controller.ts) into public.escrow_accounts / public.blockchain_records.
Follows the exact write-intent-before-chain pattern already proven in
trades_api.py's anchor_trade: insert a SUBMITTING blockchain_records row
before the chain call, then patch it to CONFIRMED with the real tx hash on
success or FAILED with the real error on failure. A RELEASED/RESOLVED/
REFUNDED status is never written to escrow_accounts without a confirmed
on-chain receipt behind it — 03_BLOCKCHAIN_IMPLEMENTATION.md:78,117.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from brain.models.db.client import DatabaseUnavailable, acquire, is_configured, transaction
from brain.services import chain_client
from brain.services.chain_client import ChainClientError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Escrow"])

ESCROW_ENABLED = os.getenv("ESCROW_ENABLED", "false").lower() == "true"

TOKEN_DECIMALS = 6


class ConditionKindEnum(str, Enum):
    DOCS = "DOCS"
    SHIPMENT = "SHIPMENT"
    INSPECTION = "INSPECTION"


_CONDITION_KIND_TO_INT = {
    ConditionKindEnum.DOCS: 0,
    ConditionKindEnum.SHIPMENT: 1,
    ConditionKindEnum.INSPECTION: 2,
}

_CONDITION_KIND_TO_COLUMN = {
    ConditionKindEnum.DOCS: "docs_verified",
    ConditionKindEnum.SHIPMENT: "shipment_delivered",
    ConditionKindEnum.INSPECTION: "inspection_ok",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EscrowCreateRequest(BaseModel):
    buyer_address: str = Field(..., description="Buyer's on-chain address (Hardhat demo: account #1)")
    seller_address: str = Field(..., description="Seller's on-chain address (Hardhat demo: account #2)")
    amount_usdc: Optional[float] = Field(None, description="Amount in whole mUSDC; defaults to trades.total_amount")


class EscrowConditionRequest(BaseModel):
    kind: ConditionKindEnum
    value: bool = True


class EscrowResolveRequest(BaseModel):
    seller_amount: float
    buyer_amount: float


class EscrowTxResponse(BaseModel):
    ok: bool
    trade_id: str
    status: str
    transaction_hash: Optional[str] = None
    block_number: Optional[int] = None
    already_anchored: Optional[bool] = None


def _require_escrow_enabled() -> None:
    if not ESCROW_ENABLED:
        raise HTTPException(status_code=501, detail={"code": "ESCROW_DISABLED", "message": "Set ESCROW_ENABLED=true to enable"})


def _require_db() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail={"code": "DB_NOT_CONFIGURED", "message": "SUPABASE_DB_URL/DATABASE_URL not set"})


def _dberror() -> HTTPException:
    return HTTPException(status_code=503, detail={"code": "DB_UNAVAILABLE", "message": "Database is not configured or unreachable"})


async def _get_escrow_row(conn, trade_id: uuid.UUID):
    return await conn.fetchrow("select * from public.escrow_accounts where trade_id = $1", trade_id)


async def _insert_submitting_record(conn, trade_id: uuid.UUID, event_type: str) -> str:
    record_id = str(uuid.uuid4())
    await conn.execute(
        """
        insert into public.blockchain_records (id, trade_id, event_type, chain, metadata, created_at)
        values ($1, $2, $3, $4, $5::jsonb, now())
        """,
        uuid.UUID(record_id), trade_id, event_type, "local-hardhat", '{"status": "SUBMITTING"}',
    )
    return record_id


async def _mark_record_failed(conn, record_id: str, exc: ChainClientError) -> None:
    await conn.execute(
        """
        update public.blockchain_records
        set event_type = event_type || '_FAILED',
            metadata = metadata || jsonb_build_object('status', 'FAILED', 'error_code', $2::text, 'error_message', $3::text)
        where id = $1
        """,
        uuid.UUID(record_id), exc.code, exc.message,
    )


async def _mark_record_confirmed(conn, record_id: str, result: Dict[str, Any]) -> None:
    await conn.execute(
        """
        update public.blockchain_records
        set tx_hash = $2, block_number = $3, contract_address = $4, chain = $5,
            metadata = metadata || jsonb_build_object(
                'status', 'CONFIRMED', 'chain_id', $6::int,
                'already_anchored', $7::boolean, 'confirmations', $8::int
            )
        where id = $1
        """,
        uuid.UUID(record_id),
        result.get("transactionHash") or None,
        result.get("blockNumber") or None,
        result.get("contractAddress"),
        result.get("networkLabel", "local-hardhat"),
        result.get("chainId"),
        result.get("alreadyAnchored", False),
        result.get("confirmations", 0),
    )


async def _run_mutating_call(trade_id: uuid.UUID, event_type: str, chain_call) -> Dict[str, Any]:
    """Shared write-intent-before-chain wrapper for every mutating escrow
    route below: insert SUBMITTING, call the chain, patch to CONFIRMED or
    FAILED. Returns the chain adapter's result dict on success; raises
    HTTPException (already carrying the real error code) on failure."""
    try:
        async with transaction() as conn:
            record_id = await _insert_submitting_record(conn, trade_id, event_type)
    except DatabaseUnavailable:
        raise _dberror()

    try:
        result = await chain_call()
    except ChainClientError as exc:
        try:
            async with transaction() as conn:
                await _mark_record_failed(conn, record_id, exc)
        except DatabaseUnavailable:
            pass  # the chain call already failed; the DB write failing too is secondary
        raise HTTPException(status_code=exc.http_status, detail=exc.to_dict())

    try:
        async with transaction() as conn:
            await _mark_record_confirmed(conn, record_id, result)
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "PERSIST_FAILED",
                "message": "Chain call succeeded but the audit record write failed",
                "tx_hash": result.get("transactionHash"),
            },
        )
    return result


# ---------------------------------------------------------------------------
# Create + fund
# ---------------------------------------------------------------------------

@router.post("/trades/{trade_id}/escrow", response_model=EscrowTxResponse)
async def create_escrow(trade_id: str, req: EscrowCreateRequest) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            trade = await conn.fetchrow("select * from public.trades where id = $1", trade_uuid)
            if trade is None:
                raise HTTPException(status_code=404, detail={"code": "TRADE_NOT_FOUND"})
            existing = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()

    if existing is not None:
        return {
            "ok": True,
            "trade_id": trade_id,
            "status": existing["status"],
            "transaction_hash": existing["create_tx_hash"],
            "already_anchored": True,
        }

    amount = req.amount_usdc if req.amount_usdc is not None else float(trade["total_amount"] or 0)
    if amount <= 0:
        raise HTTPException(status_code=422, detail={"code": "INVALID_AMOUNT", "message": "amount_usdc must be > 0 (trade has no total_amount to default to)"})

    async def _call():
        return await chain_client.escrow_create(trade_id, req.buyer_address, req.seller_address, str(amount))

    result = await _run_mutating_call(trade_uuid, "ESCROW_CREATE", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                """
                insert into public.escrow_accounts
                    (id, trade_id, escrow_id, contract_address, amount_usdc, amount_usd, token,
                     create_tx_hash, status, buyer_address, seller_address, token_address,
                     chain, created_at, updated_at)
                values ($1, $2, $3, $4, $5, $5, 'mUSDC', $6, 'PENDING', $7, $8, $9, 'local-hardhat', now(), now())
                """,
                uuid.uuid4(), trade_uuid, trade_id, result.get("contractAddress"), amount,
                result.get("transactionHash") or None, req.buyer_address, req.seller_address,
                result.get("tokenAddress"),
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Escrow created on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {
        "ok": True,
        "trade_id": trade_id,
        "status": "PENDING",
        "transaction_hash": result.get("transactionHash"),
        "block_number": result.get("blockNumber"),
        "already_anchored": result.get("alreadyAnchored", False),
    }


@router.post("/escrow/{trade_id}/fund", response_model=EscrowTxResponse)
async def fund_escrow(trade_id: str) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND", "message": "Create the escrow before funding it"})

    async def _call():
        return await chain_client.escrow_fund(trade_id)

    result = await _run_mutating_call(trade_uuid, "ESCROW_FUND", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                "update public.escrow_accounts set status = 'FUNDED', funded_at = now(), updated_at = now() where trade_id = $1",
                trade_uuid,
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Funded on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": "FUNDED", "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


# ---------------------------------------------------------------------------
# Conditions
# ---------------------------------------------------------------------------

@router.post("/escrow/{trade_id}/conditions", response_model=EscrowTxResponse)
async def set_escrow_condition(trade_id: str, req: EscrowConditionRequest) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    kind_int = _CONDITION_KIND_TO_INT[req.kind]

    async def _call():
        return await chain_client.escrow_set_condition(trade_id, kind_int, req.value)

    result = await _run_mutating_call(trade_uuid, f"ESCROW_CONDITION_{req.kind.value}", _call)

    column = _CONDITION_KIND_TO_COLUMN[req.kind]
    try:
        async with transaction() as conn:
            await conn.execute(
                f"update public.escrow_accounts set {column} = $2, updated_at = now() where trade_id = $1",
                trade_uuid, req.value,
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Condition set on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": row["status"], "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


# ---------------------------------------------------------------------------
# Release
# ---------------------------------------------------------------------------

@router.post("/escrow/{trade_id}/release", response_model=EscrowTxResponse)
async def release_escrow(trade_id: str) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    async def _call():
        return await chain_client.escrow_release(trade_id)

    result = await _run_mutating_call(trade_uuid, "ESCROW_RELEASE", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                "update public.escrow_accounts set status = 'RELEASED', release_tx_hash = $2, released_at = now(), updated_at = now() where trade_id = $1",
                trade_uuid, result.get("transactionHash"),
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Released on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": "RELEASED", "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


# ---------------------------------------------------------------------------
# Dispute
# ---------------------------------------------------------------------------

@router.post("/escrow/{trade_id}/dispute", response_model=EscrowTxResponse)
async def raise_escrow_dispute(trade_id: str) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    async def _call():
        return await chain_client.escrow_dispute(trade_id)

    result = await _run_mutating_call(trade_uuid, "ESCROW_DISPUTE", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                "update public.escrow_accounts set status = 'DISPUTED', dispute_active = true, dispute_tx_hash = $2, updated_at = now() where trade_id = $1",
                trade_uuid, result.get("transactionHash"),
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Dispute raised on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": "DISPUTED", "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


@router.post("/escrow/{trade_id}/resolve", response_model=EscrowTxResponse)
async def resolve_escrow_dispute(trade_id: str, req: EscrowResolveRequest) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    async def _call():
        return await chain_client.escrow_resolve(trade_id, str(req.seller_amount), str(req.buyer_amount))

    result = await _run_mutating_call(trade_uuid, "ESCROW_RESOLVE", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                """
                update public.escrow_accounts
                set status = 'RESOLVED', resolve_tx_hash = $2, dispute_active = false, updated_at = now()
                where trade_id = $1
                """,
                trade_uuid, result.get("transactionHash"),
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Dispute resolved on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": "RESOLVED", "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


# ---------------------------------------------------------------------------
# Refund
# ---------------------------------------------------------------------------

@router.post("/escrow/{trade_id}/refund", response_model=EscrowTxResponse)
async def refund_escrow(trade_id: str) -> Dict[str, Any]:
    _require_escrow_enabled()
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    async def _call():
        return await chain_client.escrow_refund(trade_id)

    result = await _run_mutating_call(trade_uuid, "ESCROW_REFUND", _call)

    try:
        async with transaction() as conn:
            await conn.execute(
                "update public.escrow_accounts set status = 'REFUNDED', updated_at = now() where trade_id = $1",
                trade_uuid,
            )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=500,
            detail={"code": "PERSIST_FAILED", "message": "Refunded on-chain but escrow_accounts write failed", "tx_hash": result.get("transactionHash")},
        )

    return {"ok": True, "trade_id": trade_id, "status": "REFUNDED", "transaction_hash": result.get("transactionHash"), "block_number": result.get("blockNumber")}


# ---------------------------------------------------------------------------
# Read — DB row + live on-chain state, drift reported explicitly
# ---------------------------------------------------------------------------

@router.get("/escrow/{trade_id}")
async def get_escrow(trade_id: str) -> Dict[str, Any]:
    _require_db()
    trade_uuid = uuid.UUID(trade_id)

    try:
        async with acquire() as conn:
            row = await _get_escrow_row(conn, trade_uuid)
    except DatabaseUnavailable:
        raise _dberror()
    if row is None:
        raise HTTPException(status_code=404, detail={"code": "ESCROW_NOT_FOUND"})

    db_record = dict(row)
    for key in ("amount_usdc", "amount_usd"):
        if db_record.get(key) is not None:
            db_record[key] = float(db_record[key])
    for key in ("created_at", "updated_at", "funded_at", "released_at"):
        if db_record.get(key) is not None:
            db_record[key] = db_record[key].isoformat()
    db_record["id"] = str(db_record["id"])
    db_record["trade_id"] = str(db_record["trade_id"])

    chain_record: Optional[Dict[str, Any]] = None
    chain_error: Optional[Dict[str, Any]] = None
    try:
        chain_record = await chain_client.escrow_get(trade_id)
    except ChainClientError as exc:
        chain_error = exc.to_dict()

    drift: Optional[bool] = None
    drift_details: list = []
    if chain_record is not None:
        chain_amount_human = int(chain_record["amount"]) / (10 ** TOKEN_DECIMALS)
        if db_record.get("status") != chain_record.get("stateLabel"):
            drift_details.append(f"db.status={db_record.get('status')} != chain.state={chain_record.get('stateLabel')}")
        if db_record.get("amount_usdc") is not None and abs(float(db_record["amount_usdc"]) - chain_amount_human) > 1e-6:
            drift_details.append(f"db.amount_usdc={db_record.get('amount_usdc')} != chain.amount={chain_amount_human}")
        if bool(db_record.get("docs_verified")) != bool(chain_record.get("docsVerified")):
            drift_details.append("docs_verified differs")
        if bool(db_record.get("shipment_delivered")) != bool(chain_record.get("shipmentDelivered")):
            drift_details.append("shipment_delivered differs")
        if bool(db_record.get("inspection_ok")) != bool(chain_record.get("inspectionPassed")):
            drift_details.append("inspection_ok differs")
        drift = len(drift_details) > 0

    return {
        "ok": True,
        "db": db_record,
        "chain": chain_record,
        "chain_error": chain_error,
        "drift": drift,
        "drift_details": drift_details,
    }
