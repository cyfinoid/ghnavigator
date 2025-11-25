# Changelog

All notable changes to GH Navigator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2025-01-25

### Added
- **Quick Check Mode** - Rapidly validate multiple tokens before full analysis
  - Processes 5 tokens in parallel for faster results
  - Real-time updates as each token is validated
  - Separate sections for Valid/Invalid/Pending tokens
  - One-click "Full Analysis" button for working tokens
- **Repository Search Filter** - Fuzzy search box in sidebar to filter repositories
  - Appears after repositories are loaded
  - Supports fuzzy matching (e.g., "gnav" matches "ghnavigator")
  - Auto-expands org sections with matching repos
  - Press Escape to clear filter
- **Cache Busting** - Version query parameter (`?v=0.2`) on CSS and JS files
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
- **GitHub Actions Workflow** - Updated deploy.yml to explicitly verify required files

### Fixed
- **Bulk Checks Button** - Added `white-space: nowrap` to prevent text wrapping to two lines
- **XSS Vulnerability** - Fixed DOM text reinterpretation in progress bar functions using `escapeHtml()`

### Security
- Added input sanitization for user-controlled content in progress displays
- Using safe DOM methods instead of `insertAdjacentHTML` with user content

### Removed
- **Top Security Banner** - Replaced with footer security notice

## [0.1] - 2025-09-23

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
| 0.2.0 | 2025-01-25 | Quick Check mode, repository filter, parallel processing, XSS fix |
| 0.1.0 | 2025-01-01 | Initial release with Repository Browser and Token Analyzer |

