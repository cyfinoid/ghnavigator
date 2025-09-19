# GH Navigator

A client-side GitHub token analyzer and repository browser. No server required, runs entirely in your browser.

## Features

### 🔍 Repository Browser (`index.html`)
- Browse GitHub repositories by organization
- File system navigation with syntax highlighting
- API rate limit monitoring
- Theme support (light/dark mode)

### 🔐 Token Analyzer (`ghcreds.html`)
- Single and bulk GitHub token analysis
- Scope risk assessment with color coding
- Repository access enumeration
- GitHub Actions variables/secrets discovery
- Configuration security analysis
- Print-friendly reports

## Quick Start

1. **Clone or download** this repository
2. **Open** `index.html` or `ghcreds.html` in your browser
3. **Enter** your GitHub token to start analyzing

## Security

- **Client-side only**: No data sent to external servers
- **In-memory storage**: Tokens stored only during session
- **HTTPS recommended**: Use secure connections for token input

## Components

- **Repository Browser**: Navigate and explore GitHub repositories
- **Token Analyzer**: Comprehensive GitHub token security assessment

## Print Reports

Token Analyzer generates professional PDF reports via browser print functionality with proper headers, footers, and formatting.

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## Credits

Bulk token validation inspired by [gimmePATz](https://github.com/cyfinoid/gimmepatz).

---

**Cyfinoid Research** | [Website](https://cyfinoid.com) | [GitHub](https://github.com/cyfinoid) | [Trainings](https://cyfinoid.com/trainings)
