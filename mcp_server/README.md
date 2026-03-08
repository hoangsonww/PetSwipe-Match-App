# PetSwipe Standalone MCP Server

This package is the standalone Model Context Protocol (MCP) server for PetSwipe.

It exposes agentic workflow tools over MCP so:

- MCP hosts (Claude Desktop, ChatGPT MCP, IDE clients) can call PetSwipe tools directly.
- internal PetSwipe agents can consume the same tools through `agentic_ai/mcp_client`.

This replaces the old duplicated in-package server approach (`agentic_ai/mcp_server`) with one canonical runtime at `mcp_server/`.

## Architecture

- `mcp_server` is transport/runtime + tool registration.
- `agentic_ai.service.engine.AgenticEngine` is business logic/workflow execution.
- `agentic_ai.mcp_client` is the reusable async MCP client for agent-side tool usage.

## Package Layout

```text
mcp_server/
  app.py            FastMCP app factory + lifecycle wiring
  server.py         CLI entrypoint (`python -m mcp_server.server`)
  settings.py       Config loading + CLI override model
  runtime.py        Lazy engine lifecycle and shutdown
  serialization.py  Safe model/dict/list conversion to JSON-compatible payloads
  tools/
    workflows.py    User/workflow-facing MCP tools
    ops.py          Health/cost/metadata MCP tools
```

## Requirements

- Python 3.11+
- dependencies installed from `agentic_ai/requirements.txt` (includes `mcp[cli]`)

Install from repo root:

```bash
pip install -r agentic_ai/requirements.txt
```

## Run the Server

From repo root:

### STDIO transport (for desktop MCP hosts)

```bash
python -m mcp_server.server --transport stdio
```

### Streamable HTTP transport

```bash
python -m mcp_server.server \
  --transport streamable-http \
  --host 0.0.0.0 \
  --port 8766 \
  --path /mcp
```

### Make targets

```bash
cd agentic_ai
make mcp-stdio
make mcp-http
```

## Configuration

The server reads config from `agentic_ai/config/config.yaml` (`mcp` block) via `agentic_ai.utils.config.load_config`.

Config precedence:

1. CLI flags (`--transport`, `--host`, `--port`, `--path`, `--config`)
2. values in config file
3. hard defaults in `mcp_server/settings.py`

Environment override for config file:

```bash
AGENTIC_AI_CONFIG=/abs/path/to/config.yaml python -m mcp_server.server --transport stdio
```

Validation highlights:

- `mcp.transport` must be `stdio` or `streamable-http`
- `mcp.path` must start with `/` and cannot be `/`
- `mcp.port` must be between `1` and `65535`
- `mcp.log_level` must be one of `DEBUG|INFO|WARNING|ERROR|CRITICAL`

## Exposed MCP Tools

### Workflow tools

| Tool | Purpose | Required arguments |
| --- | --- | --- |
| `list_workflows` | List workflow names available from `AgenticEngine`. | none |
| `execute_workflow` | Execute workflow by name. | `workflow`, `input_data` |
| `analyze_pet` | AI enrichment for one pet payload. | `pet` |
| `profile_user` | Build user profile from user + swipe history. | `user` |
| `match_pets` | Compatibility matching. | `user` |
| `recommend_pets` | Personalized recommendations. | `user` |
| `chat` | Conversation flow over user message/context. | `message` |

Optional arguments:

- `profile_user`: `swipe_history`
- `match_pets`: `swipe_history`, `pet_candidates`
- `recommend_pets`: `swipe_history`, `pet_candidates`
- `chat`: `context`

### Ops tools

| Tool | Purpose | Required arguments |
| --- | --- | --- |
| `health` | Runtime status + workflow list + transport metadata. | none |
| `cost_summary` | Aggregate token/cost summary. | none |
| `recent_cost_entries` | Recent cost ledger entries. | none |
| `server_metadata` | Static server transport/endpoint metadata. | none |

Optional arguments:

- `cost_summary`: `since_minutes`
- `recent_cost_entries`: `limit` (default `100`)

## Using the Server from Agentic Engine

`AgenticEngine` can create an MCP client from config:

```python
client = engine.create_mcp_client()
```

This uses `mcp_client` settings in `agentic_ai/config/config.yaml`.

Direct usage example:

```python
import asyncio
from agentic_ai.mcp_client import MCPClientConfig, MCPToolClient

async def main():
    cfg = MCPClientConfig(
        transport="streamable-http",
        url="http://127.0.0.1:8766/mcp",
    )
    async with MCPToolClient(cfg) as client:
        await client.ping()
        result = await client.call_tool("list_workflows", {})
        print(result)

asyncio.run(main())
```

## Claude Desktop Example (STDIO)

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "petswipe-agentic": {
      "command": "python",
      "args": [
        "-m",
        "mcp_server.server",
        "--transport",
        "stdio",
        "--config",
        "/ABSOLUTE/PATH/TO/PawSwipe-Fullstack-App/agentic_ai/config/config.yaml"
      ]
    }
  }
}
```

## Production Notes

- For STDIO transport, do not write arbitrary output to stdout. MCP frames are sent over stdout. This server logs to stderr.
- Bind HTTP transport to internal/private network interfaces unless intentionally public.
- Keep one canonical server entrypoint (`mcp_server.server`) and consume it from agents via client config instead of embedding duplicate server implementations.
- Workflow graphs are initialized lazily. Control-plane operations such as `list_workflows`, `health`, and `server_metadata` do not require full LLM workflow construction.

## Minimal Validation

From repo root:

```bash
pytest agentic_ai/tests/test_mcp_client_config.py agentic_ai/tests/test_mcp_server_serialization.py -q
```
