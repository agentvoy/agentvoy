# Changelog

All notable changes to AgentVoy are documented here.

## [0.5.0] - 2026-05-14

### Added
- **`agentvoy dev`** — live development server with real-time DevTools dashboard at `/dev`
- **`agentvoy deploy`** — one-command deployment: Docker builds and runs container, Fly.io deploys via flyctl with automatic secret management
- **Real-time agent tracing** — WebSocket-powered trace streaming with events: agent_start, llm_call, tool_call, guard_check, pipeline_stage, agent_complete
- **DevTools dashboard** (`devtools.html`) — dark-themed single-page UI with event timeline, detail inspector, pipeline visualization, connection status
- **Execution tracer** (`src/trace/tracer.py`) — singleton tracer with WebSocket subscriber support, auto-generated in all app-mode projects
- **Server DevTools endpoints** — `GET /dev`, `WS /ws/trace`, `GET /dev/events` added to generated server.py
- **Streamlit glassmorphism theme** — dark glass UI with backdrop blur, gradient accents, and `.streamlit/config.toml` auto-configuration
- **Dynamic model switching** — Streamlit UI auto-detects API keys from `.env` and shows available models (GPT-4o, Claude Sonnet, Gemini Flash, etc.)
- **LlamaIndex adapter** — full scaffold support with ReAct agent pattern
- **AutoGen adapter** — full scaffold support with AssistantAgent + UserProxyAgent pattern
- All 7 framework adapters instrumented with trace events out of the box
- `--dry-run` flag for `agentvoy deploy` to generate files without deploying

### Fixed
- CrewAI and Google ADK multi-agent apps no longer generate broken pipeline.py (these frameworks handle orchestration internally)
- FastAPI server.py uses sync `def run()` instead of `async def` to avoid nested event loop errors with agent frameworks

### Changed
- All 7 framework adapters accept `model` parameter for runtime model switching
- Pipeline generator includes trace instrumentation and model pass-through

## [0.4.0] - 2026-05-13

### Added
- Two-path `agentvoy create` flow: **Agent** (local dev) or **App** (deployable with API + UI + cloud)
- App mode scaffolds `src/agents/`, `src/tools/`, `src/config/`, FastAPI `server.py`, Streamlit `streamlit_app.py`
- Multi-agent pipeline support: sequential orchestration with named agents (researcher → writer → reviewer)
- `agentvoy deploy` command: add deployment config to any existing agent project
- **5 deployment targets**: Docker, Fly.io, Railway, GCP Cloud Run, AWS Lambda
- `agent.guard.yml` → cloud config mapping: timeout → HEALTHCHECK, cost_limit → memory, allow_shell → non-root user
- New CLI flags: `--build-mode`, `--agent-mode`, `--deploy-target` for fully non-interactive scripting
- `@agentvoy/core` deployer infrastructure: registry, api-wrapper, streamlit generator, pipeline generator, guard-mapper

### Changed
- Project folders now named `{name}-agent/` or `{name}-app/` based on chosen build mode
- All 7 framework adapters support app mode with `src/` directory structure
- `agentvoy list` now shows deployment targets alongside frameworks and models

## [0.3.1] - 2025-05-12

### Added
- `agentvoy-guard` runtime enforcement package on PyPI
- Guard integration wired into all 5 framework adapters (run.py templates)
- GitHub Actions CI: build + smoke test all frameworks on Node 20/22
- GitHub Actions auto-publish workflow on git tag push
- npm README for `agentvoy` CLI package
- CI badge, PyPI badge in root README

### Fixed
- CLI version now read dynamically from package.json

## [0.3.0] - 2025-05-10

### Added
- LangGraph adapter (StateGraph + ToolNode pattern, provider-aware LLM selection)
- Anthropic SDK adapter
- `create-agentvoy` package (`npm create agentvoy`)
- Issue templates: bug report, feature request, new adapter request
- PR template with checklist
- CONTRIBUTING.md with step-by-step adapter guide

### Changed
- All adapters include `agentvoy-guard>=0.1.0` in requirements.txt

## [0.2.0] - 2025-05-05

### Added
- Google ADK adapter
- CrewAI adapter
- OpenAI Agents SDK adapter
- `agent.guard.yml` universal guardrails config standard
- `agentvoy init` and `agentvoy validate` commands
- Interactive prompts for framework and provider selection

## [0.1.0] - 2025-05-01

### Added
- Initial release
- `agentvoy create` command
- Framework adapter pattern and registry
- `@agentvoy/core` package
