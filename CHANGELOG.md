# Changelog

All notable changes to AgentVoy are documented here.

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
