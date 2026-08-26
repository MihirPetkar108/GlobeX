"""
GlobeXAI Trade OS — HTTP client to the chain-adapter service (services/chain-adapter).

The private key and RPC connection live only in the adapter process; this
client never touches either. Every call classifies failures into the same
error taxonomy the adapter uses (see services/chain-adapter/src/errors.ts) —
CHAIN_UNAVAILABLE covers both "adapter unreachable" and anything the adapter
itself reports, so a caller always gets a structured reason, never a raw
exception leaking through.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class ChainClientError(RuntimeError):
    def __init__(self, code: str, message: str, http_status: int = 503, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {"ok": False, "code": self.code, "message": self.message, "details": self.details}


def _base_url() -> str:
    return os.getenv("CHAIN_ADAPTER_URL", "http://127.0.0.1:3001")


async def get_chain_status() -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{_base_url()}/health")
            return resp.json()
    except httpx.RequestError as exc:
        return {
            "configured": False,
            "connected": False,
            "error": {"code": "CHAIN_UNAVAILABLE", "message": str(exc)},
        }


async def anchor_trade(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{_base_url()}/anchor/trade", json=payload)
    except httpx.RequestError as exc:
        raise ChainClientError("CHAIN_UNAVAILABLE", f"chain-adapter unreachable: {exc}", 503) from exc

    body = resp.json()
    if not body.get("ok", False):
        raise ChainClientError(
            body.get("code", "UNKNOWN"), body.get("message", "Unknown chain error"), resp.status_code, body.get("details")
        )
    return body


async def get_trade(transaction_id: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{_base_url()}/trade/{transaction_id}")
    except httpx.RequestError as exc:
        raise ChainClientError("CHAIN_UNAVAILABLE", f"chain-adapter unreachable: {exc}", 503) from exc

    body = resp.json()
    if not body.get("ok", False):
        raise ChainClientError(body.get("code", "UNKNOWN"), body.get("message", "Unknown chain error"), resp.status_code)
    return body["trade"]


async def get_exporter_reputation(exporter_id: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{_base_url()}/exporter/{exporter_id}/reputation")
    except httpx.RequestError as exc:
        raise ChainClientError("CHAIN_UNAVAILABLE", f"chain-adapter unreachable: {exc}", 503) from exc

    body = resp.json()
    if not body.get("ok", False):
        raise ChainClientError(body.get("code", "UNKNOWN"), body.get("message", "Unknown chain error"), resp.status_code)
    return body["reputation"]


# ---------------------------------------------------------------------------
# Escrow — same shape as anchor_trade/get_trade above, one function per
# services/chain-adapter/src/controllers/escrow.controller.ts route.
# ---------------------------------------------------------------------------

async def _escrow_post(path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{_base_url()}{path}", json=payload or {})
    except httpx.RequestError as exc:
        raise ChainClientError("CHAIN_UNAVAILABLE", f"chain-adapter unreachable: {exc}", 503) from exc

    body = resp.json()
    if not body.get("ok", False):
        raise ChainClientError(
            body.get("code", "UNKNOWN"), body.get("message", "Unknown chain error"), resp.status_code, body.get("details")
        )
    return body


async def escrow_create(trade_id: str, buyer: str, seller: str, amount: Any) -> Dict[str, Any]:
    return await _escrow_post("/escrow/create", {"tradeId": trade_id, "buyer": buyer, "seller": seller, "amount": amount})


async def escrow_fund(trade_id: str) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/fund")


async def escrow_set_condition(trade_id: str, kind: int, value: bool) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/condition", {"kind": kind, "value": value})


async def escrow_release(trade_id: str) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/release")


async def escrow_dispute(trade_id: str) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/dispute")


async def escrow_resolve(trade_id: str, seller_amount: Any, buyer_amount: Any) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/resolve", {"sellerAmount": seller_amount, "buyerAmount": buyer_amount})


async def escrow_refund(trade_id: str) -> Dict[str, Any]:
    return await _escrow_post(f"/escrow/{trade_id}/refund")


async def escrow_get(trade_id: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{_base_url()}/escrow/{trade_id}")
    except httpx.RequestError as exc:
        raise ChainClientError("CHAIN_UNAVAILABLE", f"chain-adapter unreachable: {exc}", 503) from exc

    body = resp.json()
    if not body.get("ok", False):
        raise ChainClientError(body.get("code", "UNKNOWN"), body.get("message", "Unknown chain error"), resp.status_code)
    return body["escrow"]
