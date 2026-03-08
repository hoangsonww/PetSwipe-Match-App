# PetSwipe MCP Platform

PetSwipe now ships a production-oriented MCP setup with:

- a standalone MCP server at `mcp_server/`
- an agent-side MCP client package at `agentic_ai/mcp_client/`

## File Organization

```text
mcp_server/
  app.py                 # FastMCP app factory + lifespan wiring
  runtime.py             # lazy AgenticEngine lifecycle
  serialization.py       # safe model->json conversion
  settings.py            # CLI/config settings model
  server.py              # CLI entrypoint
  tools/
    workflows.py         # workflow-facing tools
    ops.py               # health/cost/metadata tools

agentic_ai/
  mcp_client/
    config.py            # stdio/http client config model
    client.py            # async MCP session + tool calls
```

## Standalone Server

Entrypoint:

```bash
python -m mcp_server.server --transport stdio
```

HTTP mode:

```bash
python -m mcp_server.server --transport streamable-http --host 0.0.0.0 --port 8766 --path /mcp
```

Make targets:

```bash
cd agentic_ai
make mcp-stdio
make mcp-http
```

## MCP Tools Exposed

- `list_workflows`
- `execute_workflow`
- `analyze_pet`
- `profile_user`
- `match_pets`
- `recommend_pets`
- `chat`
- `health`
- `cost_summary`
- `recent_cost_entries`
- `server_metadata`

## Agent-Side MCP Client

Use this from your agents/services to call the standalone server:

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
        return await client.call_tool("list_workflows", {})

print(asyncio.run(main()))
```

You can also build from `agentic_ai/config/config.yaml` (`mcp_client` block) via:

- `AgenticEngine.create_mcp_client()`
- `AgenticEngine.check_mcp_connectivity()`

## Configuration

Server and client live in `agentic_ai/config/config.yaml`:

```yaml
mcp:
  server_name: "petswipe-agentic"
  transport: "stdio"
  host: "0.0.0.0"
  port: 8766
  path: "/mcp"

mcp_client:
  enabled: false
  transport: "stdio"
  timeout_seconds: 30
  stdio:
    command: "python"
    args: ["-m", "mcp_server.server", "--transport", "stdio"]
  streamable_http:
    url: "http://127.0.0.1:8766/mcp"
```

Override config file with:

- `--config /path/to/config.yaml`
- `AGENTIC_AI_CONFIG=/path/to/config.yaml`

Configuration is validated at load time:

- `mcp.transport` must be `stdio` or `streamable-http`
- `mcp.path` must begin with `/`
- `mcp.port` must be in `1..65535`
- `mcp_client` transport details are validated (stdio command/args, HTTP URL format)

## REST Integration Endpoints

From the Agentic AI REST API:

- `GET /v1/mcp/info` for configured standalone/client metadata
- `GET /v1/mcp/health` for MCP client connectivity probe (returns `503` when unhealthy)

## Claude Desktop Example

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
