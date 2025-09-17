# Changelog
All notable changes to **sebit-mcp-public** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to **Sebit Public License v1.0 (SPL-1.0)**.

---

## [1.0.6] - 2025-09-16
### Added
- 📓 **Journal Model**: Automatic journal book (Excel) with monthly sheets + summary.
- 🛡️ **Audit Logging**: Append-only log with hash chaining & rotation.
- 🧾 **LICENSE (SPL-1.0)** and **NOTICE** file.
- 🌍 **README.md (EN)** and **README.ko.md (KR)** dual documentation.

### Changed
- ⚙️ Build output path cleaned (no more `dist/dist` duplication).
- 📂 Journal output path → `Desktop/journal_book/{Company}/{Year}`.

### Fixed
- 🐛 Fixed async handler bug (runJOURNAL not awaited → MCP freeze).
- 🐛 Corrected Windows path issues (Desktop folder resolution).
- 🐛 Prevented duplicate journal entries (skip with warning).

## [1.0.7] - 2025-09-17
### Added
- **TCT-BEAM Graphs**: Fixed/variable costs are now visualized as trigonometric vectors.  
  Auto-generates SVG/PNG charts (outputDir configurable).
- **Automated Report Generation**: PDF reports created per MCP session.  
  Includes execution logs, risk classification (Low/Medium/High), roadmap (24h / 1w / 1m), and IFRS references.

### Changed
- Updated README (EN/KR) with **TCT-BEAM Graph** and **Automated Report** description.
- Improved documentation for input values (`SEBIT_FRAMEWORK_INPUT_VALUABLES.docx`).

### Fixed
- Minor stability improvements for MCP session handling.