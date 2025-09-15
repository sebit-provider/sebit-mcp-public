# Changelog
All notable changes to **sebit-mcp-public** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to **Sebit Public License v1.0 (SPL-1.0)**.

---

## [1.0.5] - 2025-09-16
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