# Changelog

All notable changes to GH Navigator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Repository Search Filter** - Fuzzy search box in sidebar to filter repositories as you type
  - Appears after repositories are loaded
  - Supports fuzzy matching (e.g., "gnav" matches "ghnavigator")
  - Auto-expands org sections with matching repos
  - Press Escape to clear filter
- **CHANGELOG.md** - This file to track project changes
- **AGENTS.md** - AI agent instructions for contributing to the project

### Changed
- **Unlimited Repository Fetching** - Removed 1000 repository limit; now fetches all accessible repositories
- **Security Notice Location** - Moved from top banner to footer for less intrusive display
- **Code Architecture Refactoring**
  - Extracted all JavaScript to unified `app.js` file
  - Extracted all CSS to unified `style.css` file
  - Removed all inline styles from HTML files (moved to CSS classes)
  - Removed all inline JavaScript from HTML files (except third-party analytics)

### Fixed
- **Bulk Checks Button** - Added `white-space: nowrap` to prevent text wrapping to two lines

### Removed
- **Top Security Banner** - Replaced with footer security notice

## [1.0.0] - 2025-01-01

### Added
- **Repository Browser** (`index.html`)
  - GitHub token authentication
  - Repository listing grouped by organization
  - File and folder navigation with breadcrumbs
  - File content viewer
  - API rate limit monitoring
  - Dark/light theme toggle

- **Token Analyzer** (`ghcreds.html`)
  - Single token analysis
  - Bulk token scanning from text
  - Token scope detection and risk assessment
  - Repository and organization enumeration
  - GitHub Actions variables and secrets discovery
  - Scope modal with detailed capabilities
  - Print-friendly output

- **About Page** (`about.html`)
  - Project documentation
  - Feature overview
  - Technology stack details
  - Getting started guide

- **Core Features**
  - Client-side only architecture (no server required)
  - Security-first design (tokens never stored)
  - Responsive design for all screen sizes
  - Dark and light theme support
  - Cyfinoid brand styling

### Security
- All processing happens in browser
- No credentials stored in localStorage or cookies
- No external API calls except GitHub API
- Tokens held only in memory during session

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| Unreleased | - | Repository filter, unlimited repos, code refactoring |
| 1.0.0 | 2025-01-01 | Initial release with Repository Browser and Token Analyzer |

