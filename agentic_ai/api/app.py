"""FastAPI application for Agentic AI."""

import json
import time
import uuid
from typing import Any, Dict

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from ..mcp_server.protocol import MCPProtocol
from ..mcp_server.handlers import RequestHandler
from ..service.engine import AgenticEngine
from ..utils.config import load_config
from ..utils.logger import setup_logging
from ..utils.security import APIKeyAuth, RateLimiter
from .schemas import (
    ChatRequest,
    ChatResponse,
    CostEntriesResponse,
    CostSummaryResponse,
    MatchRequest,
    MatchResponse,
    PetAnalysisRequest,
    PetAnalysisResponse,
    ProfileRequest,
    ProfileResponse,
    RecommendationRequest,
    RecommendationResponse,
)


config = load_config()
setup_logging(config.get("logging", {}).get("level", "INFO"), config.get("logging"))

app = FastAPI(title="PetSwipe Agentic AI", version="1.0.0")
engine = AgenticEngine(config)
protocol = MCPProtocol()
handler = RequestHandler(config, engine=engine)

security_cfg = config.get("security", {})
api_key_auth = APIKeyAuth(security_cfg)
rate_cfg = security_cfg.get("rate_limiting", {})
rate_limiter = (
    RateLimiter(rate_cfg.get("requests_per_minute", 120))
    if rate_cfg.get("enabled", True)
    else None
)

cors_cfg = security_cfg.get("cors", {})
if cors_cfg.get("enabled", True):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_cfg.get("allowed_origins", ["*"]),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def auth_and_rate_limit(request: Request, call_next):
    if request.url.path in {"/health", "/metrics"}:
        return await call_next(request)

    supplied_key = request.headers.get(api_key_auth.header)
    if not api_key_auth.validate(supplied_key):
        return JSONResponse(status_code=401, content={"message": "Unauthorized"})

    if rate_limiter:
        client_ip = request.client.host if request.client else "unknown"
        allowed = await rate_limiter.allow(client_ip)
        if not allowed:
            return JSONResponse(status_code=429, content={"message": "Rate limit exceeded"})

    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    request.state.request_id = request_id
    start = time.monotonic()
    response = await call_next(request)
    duration = time.monotonic() - start
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Response-Time"] = f"{duration:.4f}s"
    return response


@app.on_event("shutdown")
async def shutdown_event():
    await engine.close()


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "workflows": list(engine.workflows.keys()),
    }


@app.get("/metrics")
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/v1/analysis/pet", response_model=PetAnalysisResponse)
async def analyze_pet(payload: PetAnalysisRequest):
    return await engine.analyze_pet(payload.pet.model_dump())


@app.post("/v1/profile", response_model=ProfileResponse)
async def profile_user(payload: ProfileRequest):
    return await engine.profile_user(
        payload.user.model_dump(),
        [s.model_dump() for s in payload.swipe_history],
    )


@app.post("/v1/match", response_model=MatchResponse)
async def match_pets(payload: MatchRequest):
    return await engine.match_pets(
        payload.user.model_dump(),
        [s.model_dump() for s in payload.swipe_history],
        [p.model_dump() for p in payload.pet_candidates],
    )


@app.post("/v1/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest):
    return await engine.recommend(
        payload.user.model_dump(),
        [s.model_dump() for s in payload.swipe_history],
        [p.model_dump() for p in payload.pet_candidates],
    )


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    return await engine.chat(payload.message, payload.context)


@app.get("/v1/costs/summary", response_model=CostSummaryResponse)
async def cost_summary(since_minutes: int | None = None):
    return engine.cost_tracker.summary(since_minutes=since_minutes)


@app.get("/v1/costs/recent", response_model=CostEntriesResponse)
async def cost_recent(limit: int = 100):
    return {"entries": engine.cost_tracker.recent(limit=limit)}


@app.websocket(config.get("server", {}).get("mcp_path", "/mcp"))
async def mcp_socket(websocket: WebSocket):
    supplied_key = websocket.headers.get(api_key_auth.header)
    if not api_key_auth.validate(supplied_key):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            if rate_limiter:
                client_ip = websocket.client.host if websocket.client else "unknown"
                allowed = await rate_limiter.allow(client_ip)
                if not allowed:
                    await websocket.send_json(
                        protocol.create_error_response(
                            "unknown",
                            "RATE_LIMITED",
                            "Rate limit exceeded",
                        )
                    )
                    continue
            try:
                request = json.loads(message)
            except json.JSONDecodeError:
                await websocket.send_json(
                    protocol.create_error_response("unknown", "PARSE_ERROR", "Invalid JSON")
                )
                continue

            if not protocol.validate_request(request):
                await websocket.send_json(
                    protocol.create_error_response(
                        request.get("id", "unknown"),
                        "INVALID_REQUEST",
                        "Invalid request format",
                    )
                )
                continue

            response = await handler.handle_request(request)
            await websocket.send_json(response)
    except WebSocketDisconnect:
        return
