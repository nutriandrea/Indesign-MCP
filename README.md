# indesign-nutria-mcp

**Control Adobe InDesign from any AI agent via the Model Context Protocol.**

Create documents, place text, draw shapes, apply styles, export PDFs — all through natural language. No CEP panels, no ExtendScript console, no manual steps.

![Architecture](https://img.shields.io/badge/InDesign-2022%2B-blue) ![MCP](https://img.shields.io/badge/MCP-1.0-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ What it does

indesign-nutria-mcp is an MCP server that bridges AI agents (Claude, OpenCode, etc.) to Adobe InDesign. It speaks two protocols:

| Transport | Connects | Used by |
|-----------|----------|---------|
| **STDIO** | MCP client ↔ Server | AI agents (OpenCode, Claude Desktop) |
| **WebSocket** (port 8120) | Server ↔ InDesign | UXP plugin running inside InDesign |

The server exposes **12 handlers** with 60+ tools covering the full InDesign DOM:

`Document` · `Page` · `Text` · `Shape` · `Image` · `Table` · `Style` · `Layer` · `Master` · `Export` · `Book` · `Interactive` · `XML`

And when you need something custom — **`executeScript`** runs raw ExtendScript directly.

---

## 🚀 Quick start

### Prerequisites

- Node.js ≥ 18
- Adobe InDesign 2022 or later
- [UXP Developer Tool](https://developer.adobe.com/uxp/) (once, to load the plugin)

### Install

```bash
git clone https://github.com/your-org/indesign-nutria-mcp
cd indesign-nutria-mcp
npm install
npm run build
```

### 1. Start the server

```bash
node dist/index.js opencode-indesign.json
```

### 2. Open InDesign + load the plugin

1. Launch **Adobe InDesign**
2. Open **UXP Developer Tool**
3. Load the `plugin/` directory
4. Click the **•••** menu → **MCP Bridge**
5. Click **Connect** (default: `ws://localhost:8120`)

### 3. Connect your AI

Configure your MCP client with:

```json
{
  "mcpServers": {
    "indesign": {
      "command": "node",
      "args": ["dist/index.js", "opencode-indesign.json"]
    }
  }
}
```

Now you can say things like:

> _"Create an A4 document with 5 pages. Add a red circle on page 3 and the text 'Hello' in Arial Bold 24pt."_

---

## 🧠 AI Skills (`.opencode/skills/`)

Three skills ship with this repo to make the agent consistent and reliable:

| Skill | File | Purpose |
|-------|------|---------|
| **Aesthetic Preference** | `aesthetic-preference.md` | 8 questions the agent must ask before any creative work — font, color palette, style, margins, hierarchy, constraints. Builds a persistent JSON profile in `.sisyphus/context/`. |
| **Layout Readability** | `layout-readability.md` | Automatic validation: checks overlays, text contrast, orphans/widows, visual hierarchy, spacing, overflow. Flags issues before delivery. |
| **Export & Verify** | `export-verify.md` | Mandatory cycle: **modify → export JPG → analyze pixels (Python PIL) → fix → repeat**. Catches invisible text, wrong colors, misaligned elements. |

The agent loads these automatically based on triggers. For example, saying _"crea una pagina"_ triggers the aesthetic preference skill.

---

## 🏗️ Architecture

```
┌────────────────┐     STDIO      ┌──────────────────┐    WebSocket     ┌──────────────┐
│   AI Agent     │ ◄──────────►   │  MCP Server      │ ◄─────────────► │  InDesign    │
│  (OpenCode,    │                │  (node)           │    port 8120    │  + UXP plugin│
│   Claude, ...) │                │                   │                 │              │
└────────────────┘                └──────────────────┘                 └──────────────┘
                                          │
                                    ┌─────┴─────┐
                                    │ Handlers   │
                                    │ 12 modules │
                                    │ 60+ tools  │
                                    └───────────┘
```

### Handlers at a glance

| Handler | Tools |
|---------|-------|
| **Document** | create, open, save, close, getInfo, listOpen |
| **Page** | add, delete, duplicate, move, getInfo, listAll, applyMaster |
| **Text** | addFrame, setContent, getContent, getStories, findReplace, applyParagraphStyle |
| **Shape** | create (rect/ellipse/polygon/line), list |
| **Image** | place, list, relink, embed, unembed |
| **Table** | create, setCell, addRow/Column, deleteRow/Column, getInfo |
| **Style** | list/create paragraph, character, object styles; duplicate, delete |
| **Layer** | create, list, setProperties |
| **Master** | create, duplicate, apply, delete, list, getPages |
| **Export** | export (PDF/EPUB/HTML/JPG/PNG/package), preflight, getSwatches, getFonts |
| **Interactive** | list/add/delete hyperlinks, list buttons, list anchors |
| **Book** | list, open, getDocuments, synchronize |
| **XML** | listTags, addTag, deleteTag, tagPageItem, export, import |
| **Script** | executeScript (raw ExtendScript), getSwatches, getFonts, getTables, getMasterSpreads |

---

## 📁 Project structure

```
├── src/
│   ├── server/          # MCP server (STDIO transport)
│   ├── bridge/          # WebSocket bridge + ExtendScript executor
│   ├── handlers/        # 12 handler modules
│   ├── schemas/         # Zod schemas for tool parameters
│   ├── core/            # Core logic
│   ├── types/           # TypeScript definitions
│   └── utils/           # Config loader, logger, JSON polyfill
├── plugin/              # UXP panel source (index.html, index.js, manifest.json)
├── tests/               # E2E and unit tests
├── .opencode/skills/    # AI agent skills (aesthetic, layout, verify)
├── .sisyphus/context/   # Persistent aesthetic profile storage
├── dist/                # Compiled JavaScript
├── opencode.json        # OpenCode MCP configuration
└── bridge-proxy.mjs     # Alternative WebSocket→JXA bridge (fallback)
```

---

## ⚙️ Configuration

Create a JSON config file (or use `opencode-indesign.json`):

```json
{
  "bridge": {
    "port": 8120,
    "host": "127.0.0.1",
    "timeout": 30000
  },
  "logging": {
    "level": "warn"
  }
}
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# End-to-end (requires InDesign + plugin loaded)
node tests/e2e/run-manual.js

# Interactive inspection
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 📋 Requirements

- **Adobe InDesign** 2022 or later (2024/2025/2026 recommended)
- **macOS** (Windows support via CEP planned)
- **Node.js** 18+

---

## 🤝 Contributing

PRs welcome. The handler pattern is straightforward:

1. Create `src/handlers/YourHandler.ts`
2. Implement tools with Zod parameter schemas
3. Register in `IndesignMcpServer.ts`
4. Add e2e tests in `tests/e2e/`

---

## 📄 License

MIT
