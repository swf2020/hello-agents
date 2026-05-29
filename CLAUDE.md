# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hello-Agents is a Datawhale community open-source educational project — a systematic tutorial (book/course) for building AI-native agents from scratch. Content is in Chinese. The companion agent framework lives at <https://github.com/jjyaoao/helloagents>.

## Repository Structure

- `docs/` — Main book content: 16 chapters across 5 parts, served via mkdocs-based site
- `code/` — Runnable Python examples organized by chapter (`chapter1/` through `chapter16/`)
- `Additional-Chapter/` — Supplementary installation/setup guides
- `Extra-Chapter/` — Community-contributed chapters (interviews, Skill writing, training, etc.)
- `Co-creation-projects/` — Community-submitted projects (one subdirectory per project)
- `hello-world-video/` — Remotion 4.0 video project (React 19 + TypeScript + Tailwind v4)
- `hello-world-video/todo-api/` — Express + Zod API server with Vitest tests
- `growth-video/` — Remotion 4.0 video project (React 18, growth chart animation)
- `dashboard/` — Static HTML cyberpunk-style dashboard (`index.html`)
- `data/` — SQLite database (`app.db`) used by the MCP server
- `fix_bold_format.py` — One-off utility for fixing bold formatting in doc files

## Key Commands

### hello-world-video (Remotion + React 19)

```bash
cd hello-world-video
npm run dev      # Start Remotion Studio
npm run build    # Bundle for deployment
npm run lint     # ESLint + TypeScript type-check
```

### hello-world-video/todo-api

```bash
cd hello-world-video/todo-api
npm run dev      # Start dev server (tsx watch)
npm test         # Run Vitest tests
npm run build    # Compile TypeScript
```

### growth-video (Remotion + React 18)

```bash
cd growth-video
npm start        # Start Remotion Studio
npm run build    # Render GrowthChart → out/video.mp4
```

### Python code examples

No package manager file at root. Python scripts in `code/` chapters use `openai` and related libraries. Most scripts read API keys from a `.env` file in their chapter directory (see `.env.example` files). Run directly:

```bash
python code/chapter7/my_main.py
```

## MCP Configuration

The `.mcp.json` at repo root configures an SQLite MCP server:

- Server name: `project-db`
- DB path: `data/app.db`
- Launched via: `uvx --from mcp-server-sqlite mcp-server-sqlite --db-path ...`

## Docs Site

The docs are published via GitHub Pages at `datawhalechina.github.io/hello-agents/`. The sidebar nav is defined in `docs/_sidebar.md` (Chinese) and `docs/_sidebar_en.md` (English). The site entry point is `docs/index.html`.
