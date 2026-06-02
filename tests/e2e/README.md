# End-to-End Tests

These tests require a running Adobe InDesign instance with the UXP plugin loaded.

## Prerequisites

1. Adobe InDesign (2022 or later) installed and running
2. UXP Developer Tool installed
3. The `plugin/` directory loaded in UXP Developer Tool

## Setup

1. Start the MCP server:
```bash
npm run build && node dist/index.js
```

This starts the stdio transport, which the e2e test harness connects to.

2. In InDesign, open the UXP plugin panel (Window > Extensions > InDesign Nutria MCP Bridge)

3. Verify the WebSocket connection is established (status indicator in the panel)

## Running Tests

### Manual Execution Test

Run each handler's basic operations in sequence to verify the full stack:

```bash
node tests/e2e/run-manual.js
```

This script:
- Connects to the MCP server via stdio
- Sends tool calls to each handler
- Logs results and errors

### Test Coverage

The full e2e flow covers:

1. **Connection**: UXP plugin → WebSocket → BridgeServer → ScriptExecutor → InDesign
2. **Document Handler**: create, getInfo, save, close
3. **Page Handler**: add, list, apply master
4. **Text Handler**: add frame, set/get content
5. **Style Handler**: list paragraph/character styles
6. **Export Handler**: export to PDF, preflight
7. **All 12 handlers** with at least one tool each

### Using MCP Inspector

For interactive testing with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
