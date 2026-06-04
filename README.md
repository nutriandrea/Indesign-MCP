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

The server exposes **22 handlers** with **100+ tools** covering the full InDesign DOM:

`Document` · `Page` · `Text` · `TextAdvanced` · `Shape` · `Image` · `Table` · `TableStyle` · `Style` · `Layer` · `Master` · `Toc` · `Index` · `Note` · `Xref` · `Grep` · `Effect` · `Transform` · `Section` · `Export` · `Book` · `Interactive` · `XML`

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

Ten skills ship with this repo. They are **auto-loaded by trigger keywords** when you talk to the AI agent:

| # | Skill | File | Purpose |
|---|-------|------|---------|
| 1 | **Aesthetic Preference** | `aesthetic-preference.md` | 8 questions before any creative work — font, palette, style, margins, constraints. Builds a persistent JSON profile. |
| 2 | **Layout Readability** | `layout-readability.md` | Validates overlays, contrast, orphans/widows, hierarchy, spacing, overflow before delivery. |
| 3 | **Export & Verify** | `export-verify.md` | Mandatory **modify → export JPG → analyze pixels → fix → repeat** cycle. |
| 4 | **Import Word** | `import-word.md` | Imports `.docx`, maps Word styles (Heading 1/Normal/List) to InDesign paragraph styles. |
| 5 | **Batch Operations** | `batch-operations.md` | Applies the same modification across N pages (bulk text, master apply, export all). |
| 6 | **Image Optimize** | `image-optimize.md` | Place, resize, DPI check, relink images. Profiles for print (300dpi CMYK) vs web (72dpi RGB). |
| 7 | **Table Format** | `table-format.md` | Creates and styles tables — columns, rows, borders, fills, text alignment, merge cells. |
| 8 | **Template Manager** | `template-manager.md` | Save/load reusable page templates as `.indd` files or `.indt` library. |
| 9 | **Export Batch** | `export-batch.md` | Exports the same document to **multiple formats at once** (PDF + JPG + PNG), each with its own profile. |
| 10 | **Style Extractor** | `style-extractor.md` | Scans a folder of `.indd` files, **extracts full style profile** (fonts, colors, paragraph/character styles, master spreads, margins), saves as JSON, then replicates it on a new book layout. |

The agent loads each skill automatically when your request matches its triggers. For example:

> _"crea una pagina"_ → loads **Aesthetic Preference**  
> _"estrai stile dalla cartella indd e impagina un libro"_ → loads **Style Extractor**  
> _"esporta in pdf e jpg"_ → loads **Export Batch**

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
                                    │ 22 handlers│
                                    │ 100+ tools │
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
| **Toc** | createStyle, generate, listStyles, update |
| **Note** | addFootnote, listFootnotes, footnoteOptions, addEndnote |
| **Index** | addEntry, generate, listTopics, createTopic |
| **Grep** | grepFind, grepReplace, findFormat, replaceFormat |
| **TextAdvanced** | adjustTracking, setLeading, changeCase, applyDropCap, insertSpecialChar, getTextBounds |
| **Xref** | addCrossReference, updateCrossReferences, listCrossReferences |
| **Effect** | applyDropShadow, applyTransparency, applyBlendMode, clearEffects |
| **Transform** | resize, rotate, flip, align, distribute |
| **TableStyle** | create, apply, list, update |
| **Section** | add, list, delete |

---

## 📁 Project structure

```
├── src/
│   ├── server/          # MCP server (STDIO transport)
│   ├── bridge/          # WebSocket bridge + ExtendScript executor
│   ├── handlers/        # 22 handler modules
│   ├── schemas/         # Zod schemas for tool parameters
│   ├── core/            # Core logic
│   ├── types/           # TypeScript definitions
│   └── utils/           # Config loader, logger, JSON polyfill
├── plugin/              # UXP panel source (index.html, index.js, manifest.json)
├── tests/               # E2E and unit tests
├── .opencode/skills/    # 10 AI agent skills
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
