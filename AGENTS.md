# AGENTS.md - AI Agent Instructions for GH Navigator

## Project Overview

**GH Navigator** is a client-side security tool by Cyfinoid Research for browsing GitHub repositories and analyzing GitHub Personal Access Tokens (PATs). It runs entirely in the browser with no server-side components.

### Key Principles
- **Client-side only** — No backend, no server, no data persistence
- **Security-first** — Tokens are never stored or transmitted outside the browser
- **Single responsibility** — Each HTML page has a focused purpose
- **Shared resources** — CSS and JS are unified across all pages

---

## File Structure

```
ghnavigator/
├── index.html          # Repository Browser UI
├── ghcreds.html        # Token Analyzer UI
├── about.html          # Project documentation page
├── style.css           # Unified stylesheet (all pages)
├── app.js              # Unified JavaScript (all pages)
├── README.md           # User-facing documentation
├── CHANGELOG.md        # Version history and changes
├── AGENTS.md           # This file - AI agent instructions
├── brandguideline.md   # Cyfinoid brand colors & typography
├── ProjectIdea.md      # Original project concept
└── data/gimmepatz/     # Reference: gimmePATz CLI tool
```

---

## Architecture

### HTML Pages

| Page | Purpose | Key Elements |
|------|---------|--------------|
| `index.html` | Repository browser | `#github-token`, `#file-browser`, `#repo-list`, `#repo-search` |
| `ghcreds.html` | Token analyzer | `#token-input`, `#text-scan`, `#results`, `#scope-modal` |
| `about.html` | Documentation | Static content, no special IDs |

### JavaScript Classes (in `app.js`)

1. **`GHNavigator`** — Repository browser functionality
   - Token validation and API requests
   - Repository listing by organization (fetches all repos, no limit)
   - Fuzzy search/filter for repositories
   - File/folder navigation
   - Rate limit monitoring

2. **`GitHubTokenAnalyzer`** — Token analysis functionality
   - Token pattern detection (ghp_, gho_, github_pat_, etc.)
   - Scope extraction and risk assessment
   - Repository/organization enumeration
   - Variables/secrets discovery

### Page Detection

The app auto-detects which page is loaded:
```javascript
const isNavigatorPage = document.getElementById('github-token') !== null && document.getElementById('file-browser') !== null;
const isAnalyzerPage = document.getElementById('token-input') !== null && document.getElementById('text-scan') !== null;
```

---

## Coding Conventions

### CSS

- **CSS Custom Properties** for theming (see `:root` and `[data-theme="dark"]`)
- **Cyfinoid brand colors:**
  - Primary green: `#50c878`
  - Accent green: `#7fd1b9`
  - Yellow: `#fdcb52`
  - Red: `#d63c53`
  - Blue: `#466fe0`
- **Font:** Sen (Google Fonts)
- **Naming:** Use descriptive class names (`.result-card`, `.scope-tag`, `.file-viewer`)

### JavaScript

- **Vanilla JS only** — No frameworks or libraries
- **ES6+ features** — Classes, async/await, template literals
- **Global instances:**
  - `navigator` — GHNavigator instance (index.html)
  - `analyzer` — GitHubTokenAnalyzer instance (ghcreds.html)
- **Function naming:** camelCase, descriptive (`connectToGitHub`, `displayTokenAnalysis`)
- **Error handling:** Try/catch with user-friendly error messages

### HTML

- **Semantic structure** — Use appropriate tags (`header`, `main`, `footer`, `nav`)
- **Accessibility** — Include `alt` attributes, proper labels
- **No inline styles** — All CSS must be in `style.css`, use CSS classes instead
  - Exception: Dynamic values (e.g., progress bar `width: ${percentage}%`) that cannot be predetermined
- **No inline JavaScript** — All JS must be in `app.js`, use `onclick` attributes to call global functions
  - Exception: Third-party scripts (e.g., Plausible analytics) that require inline initialization

---

## Theme System

Theme is stored in localStorage as `ghnavigator-theme`:

```javascript
// Toggle between light and dark
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ghnavigator-theme', newTheme);
}
```

All color values use CSS variables that change based on `[data-theme="dark"]`.

---

## Adding New Features

### To add a new page:

1. Create `newpage.html` with the standard structure:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <!-- Your content -->
       <script src="app.js"></script>
   </body>
   </html>
   ```

2. Add page-specific initialization in `app.js` DOMContentLoaded handler
3. Add navigation links to other pages

### To add new CSS:

1. Add styles to `style.css` in the appropriate section
2. Follow existing naming conventions
3. Include both light and dark theme variants if using colors

### To add new JavaScript:

1. Add to `app.js` in the appropriate section
2. If page-specific, guard with page detection
3. Expose functions globally if they need to be called from HTML `onclick`

---

## GitHub API Usage

### Authentication
```javascript
headers['Authorization'] = `token ${token}`;
```

### Rate Limiting
- Display remaining calls in `#rate-limit-info`
- Classic PATs: 5000 requests/hour
- Fine-grained PATs: Use `X-GitHub-Api-Version: 2022-11-28` header

### Key Endpoints Used
- `/user` — Validate token, get user info
- `/user/repos` — List accessible repositories
- `/user/orgs` — List organizations
- `/repos/{owner}/{repo}/contents/{path}` — Browse files
- `/repos/{owner}/{repo}/actions/variables` — Get variables
- `/repos/{owner}/{repo}/actions/secrets` — Get secrets (names only)

---

## Scope Risk Assessment

The `SCOPE_ANALYSIS` object in `app.js` contains risk ratings for GitHub token scopes:

| Risk Level | Color | Examples |
|------------|-------|----------|
| High | Red (`#d63c53`) | `repo`, `admin:org`, `delete_repo`, `workflow` |
| Medium | Yellow (`#fdcb52`) | `admin:public_key`, `write:org`, `security_events` |
| Low | Green (`#50c878`) | `read:org`, `user`, `notifications`, `gist` |

When adding new scopes, include: `description`, `risk` level, and `capabilities` array.

---

## Testing

### Manual Testing

1. **Repository Browser (`index.html`)**
   - Enter a valid GitHub token
   - Verify repositories load grouped by organization
   - Test fuzzy search filter (appears after repos load)
   - Navigate folders and view files
   - Check rate limit display updates

2. **Token Analyzer (`ghcreds.html`)**
   - Test single token analysis
   - Test bulk scan with multiple tokens in text
   - Verify scope risk colors
   - Click scopes to see modal details

3. **Theme Toggle**
   - Toggle between light/dark on each page
   - Verify theme persists across page navigation

4. **Print (ghcreds.html)**
   - Use browser print (Cmd/Ctrl+P)
   - Verify clean output without input sections

### Browser Compatibility

Test in:
- Chrome/Chromium
- Firefox
- Safari
- Edge

---

## Common Issues

### CORS Errors
GitHub API allows direct browser requests. If you see CORS errors:
- Check token format is correct
- Ensure using `https://api.github.com`

### Rate Limiting
If rate limit exceeded:
- Wait for reset (shown in header)
- Use a token with higher limits

### Token Not Working
- Classic PATs start with `ghp_`
- Fine-grained PATs start with `github_pat_`
- OAuth tokens start with `gho_`

---

## Do's and Don'ts

### ✅ Do
- Keep all processing client-side
- Use CSS variables for colors
- Support both light and dark themes
- Handle API errors gracefully
- Show loading states for async operations

### ❌ Don't
- Add server-side code or external API calls (except GitHub)
- Store tokens in localStorage or cookies
- Add npm dependencies or build steps
- Modify files in `data/gimmepatz/` (reference only)
- Remove the security notice from the footer

---

## References

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [gimmePATz](https://github.com/6mile/gimmepatz) — Inspiration for token analyzer
- [Cyfinoid Research](https://cyfinoid.com)

