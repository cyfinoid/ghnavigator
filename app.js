/**
 * GH Navigator - Unified JavaScript
 * Cyfinoid Research
 * 
 * This script is shared across all pages:
 * - index.html (Repository Browser)
 * - ghcreds.html (Token Analyzer)
 * - about.html (About Page)
 */

/* ========================================
   Theme Management (Shared)
   ======================================== */

function initializeTheme() {
    const savedTheme = localStorage.getItem('ghnavigator-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggle(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ghnavigator-theme', newTheme);
    updateThemeToggle(newTheme);
}

function updateThemeToggle(theme) {
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
        if (theme === 'dark') {
            toggleButton.innerHTML = '☀️ Light';
        } else {
            toggleButton.innerHTML = '🌙 Dark';
        }
    }
}

/* ========================================
   Utility Functions (Shared)
   ======================================== */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'js': '🟨',
        'ts': '🔷',
        'html': '🟧',
        'css': '🎨',
        'json': '📋',
        'md': '📝',
        'txt': '📄',
        'py': '🐍',
        'java': '☕',
        'cpp': '⚙️',
        'c': '⚙️',
        'php': '🐘',
        'rb': '💎',
        'go': '🐹',
        'rs': '🦀',
        'yml': '⚙️',
        'yaml': '⚙️',
        'xml': '📄',
        'svg': '🖼️',
        'png': '🖼️',
        'jpg': '🖼️',
        'gif': '🖼️',
        'pdf': '📕'
    };
    return iconMap[ext] || '📄';
}

/* ========================================
   GH Navigator Class (Repository Browser)
   ======================================== */

class GHNavigator {
    constructor() {
        this.token = null;
        this.baseUrl = 'https://api.github.com';
        this.rateLimitRemaining = 5000;
        this.rateLimitReset = null;
        this.currentRepo = null;
        this.currentPath = '';
        this.repositories = [];
        this.organizations = [];
    }

    setToken(token) {
        this.token = token;
    }

    async makeRequest(endpoint) {
        if (!this.token) {
            throw new Error('No GitHub token provided');
        }

        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GHNavigator/1.0'
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });
            
            // Update rate limit info
            this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining')) || 0;
            this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset')) || null;
            this.updateRateLimitDisplay();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    updateRateLimitDisplay() {
        const rateLimitInfo = document.getElementById('rate-limit-info');
        if (!rateLimitInfo) return;
        
        const resetTime = this.rateLimitReset ? 
            new Date(this.rateLimitReset * 1000).toLocaleTimeString() : '--:--';
        
        rateLimitInfo.textContent = `API: ${this.rateLimitRemaining}/5000 | Reset: ${resetTime}`;
        
        // Change color based on remaining calls
        if (this.rateLimitRemaining < 100) {
            rateLimitInfo.style.color = 'var(--color-red)';
        } else if (this.rateLimitRemaining < 500) {
            rateLimitInfo.style.color = 'var(--color-yellow)';
        } else {
            rateLimitInfo.style.color = 'var(--text-primary)';
        }
    }

    async validateToken() {
        try {
            const user = await this.makeRequest('/user');
            return { valid: true, user };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    async loadRepositories() {
        try {
            // Get user repositories (this is the critical part)
            const userRepos = await this.getAllRepositories('/user/repos');
            
            // Try to get user organizations, but don't fail if this doesn't work
            try {
                const orgs = await this.makeRequest('/user/orgs');
                this.organizations = orgs;
            } catch (orgError) {
                console.warn('Could not fetch organizations:', orgError.message);
                this.organizations = [];
                // Show a non-blocking warning
                this.showNonBlockingWarning('Unable to fetch organizations, but repositories are still available');
            }

            // Group repositories by owner
            const reposByOwner = {};
            
            userRepos.forEach(repo => {
                const owner = repo.owner.login;
                if (!reposByOwner[owner]) {
                    reposByOwner[owner] = [];
                }
                reposByOwner[owner].push(repo);
            });

            this.repositories = reposByOwner;
            return reposByOwner;
        } catch (error) {
            // Only throw if we can't get repositories at all
            throw error;
        }
    }

    showNonBlockingWarning(message) {
        // Create a temporary warning that doesn't block the UI
        const warningDiv = document.createElement('div');
        warningDiv.className = 'non-blocking-warning';
        warningDiv.innerHTML = `⚠️ ${message}`;
        warningDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--warning-bg);
            color: var(--warning-text);
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--color-yellow);
            box-shadow: var(--shadow);
            z-index: 9999;
            max-width: 300px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(warningDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            warningDiv.style.opacity = '0';
            warningDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(warningDiv)) {
                    document.body.removeChild(warningDiv);
                }
            }, 300);
        }, 5000);
    }

    async getAllRepositories(endpoint) {
        let allRepos = [];
        let page = 1;
        
        while (true) {
            const repos = await this.makeRequest(`${endpoint}?per_page=100&page=${page}`);
            if (repos.length === 0) break;
            
            allRepos = allRepos.concat(repos);
            if (repos.length < 100) break; // Last page
            page++;
        }
        
        return allRepos;
    }

    async getRepositoryContents(owner, repo, path = '') {
        try {
            const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
            return await this.makeRequest(endpoint);
        } catch (error) {
            throw error;
        }
    }

    async getFileContent(owner, repo, path) {
        try {
            const content = await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`);
            if (content.content) {
                // Decode base64 content
                return atob(content.content.replace(/\s/g, ''));
            }
            return 'Unable to decode file content';
        } catch (error) {
            throw error;
        }
    }
}

/* ========================================
   GitHub Token Analyzer Class
   ======================================== */

class GitHubTokenAnalyzer {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.rateLimitRemaining = 60; // Start with anonymous rate limit
        this.rateLimitReset = null;
    }

    // Token pattern detection
    detectGitHubTokens(text) {
        const patterns = [
            /ghp_[a-zA-Z0-9]{36}/g,          // Classic PAT
            /gho_[a-zA-Z0-9]{36}/g,          // OAuth token
            /ghu_[a-zA-Z0-9]{36}/g,          // User token
            /ghs_[a-zA-Z0-9]{36}/g,          // Server token
            /ghr_[a-zA-Z0-9]{36}/g,          // Refresh token
            /github_pat_[a-zA-Z0-9_]{82}/g   // Fine-grained PAT
        ];

        const tokens = [];
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                tokens.push(...matches);
            }
        });

        return [...new Set(tokens)]; // Remove duplicates
    }

    // Check if token is fine-grained
    isFineGrainedToken(token) {
        return token.startsWith('github_pat_');
    }

    // Make API request with error handling
    async makeRequest(endpoint, token = null) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Token-Analyzer/1.0'
        };

        if (token) {
            headers['Authorization'] = `token ${token}`;
            if (this.isFineGrainedToken(token)) {
                headers['Accept'] = 'application/vnd.github+json';
                headers['X-GitHub-Api-Version'] = '2022-11-28';
            }
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });
            
            // Update rate limit info
            this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining')) || 0;
            this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset')) || null;

            if (response.status === 401) {
                throw new Error('Invalid token or insufficient permissions');
            } else if (response.status === 403) {
                throw new Error('Rate limit exceeded or access forbidden');
            } else if (response.status === 404) {
                throw new Error('Resource not found');
            } else if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return {
                data: await response.json(),
                headers: response.headers,
                status: response.status
            };
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - check your internet connection');
            }
            throw error;
        }
    }

    // Validate token
    async validateToken(token) {
        try {
            const result = await this.makeRequest('/user', token);
            return { valid: true, data: result.data, headers: result.headers };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Get token scopes
    getTokenScopes(headers) {
        const scopesHeader = headers.get('X-OAuth-Scopes');
        if (scopesHeader && scopesHeader.trim()) {
            return scopesHeader.split(',').map(scope => scope.trim()).filter(scope => scope);
        }
        return [];
    }

    // Get user repositories
    async getUserRepositories(token, page = 1) {
        try {
            const result = await this.makeRequest(`/user/repos?per_page=100&page=${page}`, token);
            return result.data;
        } catch (error) {
            console.error('Error fetching repositories:', error);
            return [];
        }
    }

    // Get all user repositories (paginated)
    async getAllUserRepositories(token, progressCallback = null) {
        let allRepos = [];
        let page = 1;
        
        while (true) {
            if (progressCallback) {
                progressCallback(page, allRepos.length);
            }
            
            const repos = await this.getUserRepositories(token, page);
            if (repos.length === 0) break;
            
            allRepos = allRepos.concat(repos);
            if (repos.length < 100) break; // Last page
            page++;
        }
        
        if (progressCallback) {
            progressCallback(page, allRepos.length); // Final progress update
        }
        
        return allRepos;
    }

    // Get user organizations
    async getUserOrganizations(token) {
        try {
            const result = await this.makeRequest('/user/orgs', token);
            return result.data;
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return [];
        }
    }

    // Get user gists
    async getUserGists(token, progressCallback = null) {
        try {
            let allGists = [];
            let page = 1;
            const maxPages = 5; // Limit to prevent excessive calls
            
            while (page <= maxPages) {
                if (progressCallback) {
                    progressCallback(page - 1, maxPages);
                }
                
                const result = await this.makeRequest(`/gists?per_page=100&page=${page}`, token);
                if (result.data.length === 0) break;
                
                allGists = allGists.concat(result.data);
                if (result.data.length < 100) break;
                page++;
            }
            
            if (progressCallback) {
                progressCallback(page - 1, page - 1); // Final progress update
            }
            
            return allGists;
        } catch (error) {
            console.error('Error fetching gists:', error);
            return [];
        }
    }

    // Get user public keys
    async getUserPublicKeys(token) {
        try {
            const result = await this.makeRequest('/user/keys', token);
            return result.data;
        } catch (error) {
            console.error('Error fetching public keys:', error);
            return [];
        }
    }

    // Get repository variables and secrets
    async getRepositoryVariables(token, repoFullName) {
        const variables = [];
        
        try {
            // Get repository variables
            const varsResult = await this.makeRequest(`/repos/${repoFullName}/actions/variables`, token);
            if (varsResult.data && varsResult.data.variables) {
                varsResult.data.variables.forEach(variable => {
                    variables.push({
                        name: variable.name,
                        value: variable.value,
                        type: 'repository_variable',
                        created_at: variable.created_at,
                        updated_at: variable.updated_at
                    });
                });
            }
        } catch (error) {
            console.warn(`Could not fetch variables for ${repoFullName}:`, error);
        }

        try {
            // Get repository secrets (names only, values are hidden)
            const secretsResult = await this.makeRequest(`/repos/${repoFullName}/actions/secrets`, token);
            if (secretsResult.data && secretsResult.data.secrets) {
                secretsResult.data.secrets.forEach(secret => {
                    variables.push({
                        name: secret.name,
                        value: null, // Secrets don't return values via API
                        type: 'repository_secret',
                        created_at: secret.created_at,
                        updated_at: secret.updated_at
                    });
                });
            }
        } catch (error) {
            console.warn(`Could not fetch secrets for ${repoFullName}:`, error);
        }

        try {
            // Get repository environments
            const envsResult = await this.makeRequest(`/repos/${repoFullName}/environments`, token);
            if (envsResult.data && envsResult.data.environments) {
                for (const env of envsResult.data.environments) {
                    const envName = env.name;
                    
                    try {
                        // Get environment variables
                        const envVarsResult = await this.makeRequest(`/repos/${repoFullName}/environments/${envName}/variables`, token);
                        if (envVarsResult.data && envVarsResult.data.variables) {
                            envVarsResult.data.variables.forEach(variable => {
                                variables.push({
                                    name: variable.name,
                                    value: variable.value,
                                    type: 'environment_variable',
                                    environment: envName,
                                    created_at: variable.created_at,
                                    updated_at: variable.updated_at
                                });
                            });
                        }
                    } catch (error) {
                        console.warn(`Could not fetch environment variables for ${repoFullName}/${envName}:`, error);
                    }

                    try {
                        // Get environment secrets
                        const envSecretsResult = await this.makeRequest(`/repos/${repoFullName}/environments/${envName}/secrets`, token);
                        if (envSecretsResult.data && envSecretsResult.data.secrets) {
                            envSecretsResult.data.secrets.forEach(secret => {
                                variables.push({
                                    name: secret.name,
                                    value: null, // Secrets don't return values via API
                                    type: 'environment_secret',
                                    environment: envName,
                                    created_at: secret.created_at,
                                    updated_at: secret.updated_at
                                });
                            });
                        }
                    } catch (error) {
                        console.warn(`Could not fetch environment secrets for ${repoFullName}/${envName}:`, error);
                    }
                }
            }
        } catch (error) {
            console.warn(`Could not fetch environments for ${repoFullName}:`, error);
        }

        return variables;
    }

    // Get organization variables and secrets
    async getOrganizationVariables(token, orgName) {
        const variables = [];
        
        try {
            // Get organization variables
            const varsResult = await this.makeRequest(`/orgs/${orgName}/actions/variables`, token);
            if (varsResult.data && varsResult.data.variables) {
                varsResult.data.variables.forEach(variable => {
                    variables.push({
                        name: variable.name,
                        value: variable.value,
                        type: 'organization_variable',
                        visibility: variable.visibility,
                        created_at: variable.created_at,
                        updated_at: variable.updated_at
                    });
                });
            }
        } catch (error) {
            console.warn(`Could not fetch organization variables for ${orgName}:`, error);
        }

        try {
            // Get organization secrets
            const secretsResult = await this.makeRequest(`/orgs/${orgName}/actions/secrets`, token);
            if (secretsResult.data && secretsResult.data.secrets) {
                secretsResult.data.secrets.forEach(secret => {
                    variables.push({
                        name: secret.name,
                        value: null, // Secrets don't return values via API
                        type: 'organization_secret',
                        visibility: secret.visibility,
                        created_at: secret.created_at,
                        updated_at: secret.updated_at
                    });
                });
            }
        } catch (error) {
            console.warn(`Could not fetch organization secrets for ${orgName}:`, error);
        }

        return variables;
    }

    // Get repository configuration and permissions
    async getRepositoryConfig(token, repoFullName) {
        const config = {
            basic: null,
            actionsPermissions: null,
            selectedActions: null,
            workflowPermissions: null,
            hasAdminAccess: false
        };

        try {
            // Get basic repository info
            const repoResult = await this.makeRequest(`/repos/${repoFullName}`, token);
            if (repoResult.data) {
                config.basic = {
                    private: repoResult.data.private,
                    archived: repoResult.data.archived,
                    disabled: repoResult.data.disabled,
                    permissions: repoResult.data.permissions,
                    security_and_analysis: repoResult.data.security_and_analysis,
                    allow_forking: repoResult.data.allow_forking,
                    allow_merge_commit: repoResult.data.allow_merge_commit,
                    allow_squash_merge: repoResult.data.allow_squash_merge,
                    allow_rebase_merge: repoResult.data.allow_rebase_merge,
                    delete_branch_on_merge: repoResult.data.delete_branch_on_merge
                };
                config.hasAdminAccess = repoResult.data.permissions?.admin || false;
            }
        } catch (error) {
            console.warn(`Could not fetch basic config for ${repoFullName}:`, error);
        }

        // If we have admin access, get additional settings
        if (config.hasAdminAccess) {
            try {
                // Get Actions permissions
                const actionsResult = await this.makeRequest(`/repos/${repoFullName}/actions/permissions`, token);
                if (actionsResult.data) {
                    config.actionsPermissions = {
                        enabled: actionsResult.data.enabled,
                        allowed_actions: actionsResult.data.allowed_actions,
                        selected_actions_url: actionsResult.data.selected_actions_url
                    };
                }
            } catch (error) {
                console.warn(`Could not fetch actions permissions for ${repoFullName}:`, error);
            }

            try {
                // Get selected actions (if applicable)
                const selectedActionsResult = await this.makeRequest(`/repos/${repoFullName}/actions/permissions/selected-actions`, token);
                if (selectedActionsResult.data) {
                    config.selectedActions = {
                        github_owned_allowed: selectedActionsResult.data.github_owned_allowed,
                        verified_allowed: selectedActionsResult.data.verified_allowed,
                        patterns_allowed: selectedActionsResult.data.patterns_allowed || []
                    };
                }
            } catch (error) {
                console.warn(`Could not fetch selected actions for ${repoFullName}:`, error);
            }

            try {
                // Get workflow permissions
                const workflowResult = await this.makeRequest(`/repos/${repoFullName}/actions/permissions/workflow`, token);
                if (workflowResult.data) {
                    config.workflowPermissions = {
                        default_workflow_permissions: workflowResult.data.default_workflow_permissions,
                        can_approve_pull_request_reviews: workflowResult.data.can_approve_pull_request_reviews
                    };
                }
            } catch (error) {
                console.warn(`Could not fetch workflow permissions for ${repoFullName}:`, error);
            }
        }

        return config;
    }

    // Get organization configuration and permissions
    async getOrganizationConfig(token, orgName) {
        const config = {
            actionsPermissions: null,
            repositoriesPermissions: null,
            selectedActions: null,
            workflowPermissions: null
        };

        try {
            // Get organization Actions permissions
            const actionsResult = await this.makeRequest(`/orgs/${orgName}/actions/permissions`, token);
            if (actionsResult.data) {
                config.actionsPermissions = {
                    enabled_repositories: actionsResult.data.enabled_repositories,
                    allowed_actions: actionsResult.data.allowed_actions,
                    selected_actions_url: actionsResult.data.selected_actions_url
                };
            }
        } catch (error) {
            console.warn(`Could not fetch org actions permissions for ${orgName}:`, error);
        }

        try {
            // Get repositories permissions
            const reposResult = await this.makeRequest(`/orgs/${orgName}/actions/permissions/repositories`, token);
            if (reposResult.data) {
                config.repositoriesPermissions = {
                    total_count: reposResult.data.total_count,
                    repositories: reposResult.data.repositories?.slice(0, 10) || [] // Limit to first 10
                };
            }
        } catch (error) {
            console.warn(`Could not fetch org repositories permissions for ${orgName}:`, error);
        }

        try {
            // Get selected actions
            const selectedActionsResult = await this.makeRequest(`/orgs/${orgName}/actions/permissions/selected-actions`, token);
            if (selectedActionsResult.data) {
                config.selectedActions = {
                    github_owned_allowed: selectedActionsResult.data.github_owned_allowed,
                    verified_allowed: selectedActionsResult.data.verified_allowed,
                    patterns_allowed: selectedActionsResult.data.patterns_allowed || []
                };
            }
        } catch (error) {
            console.warn(`Could not fetch org selected actions for ${orgName}:`, error);
        }

        try {
            // Get workflow permissions
            const workflowResult = await this.makeRequest(`/orgs/${orgName}/actions/permissions/workflow`, token);
            if (workflowResult.data) {
                config.workflowPermissions = {
                    default_workflow_permissions: workflowResult.data.default_workflow_permissions,
                    can_approve_pull_request_reviews: workflowResult.data.can_approve_pull_request_reviews
                };
            }
        } catch (error) {
            console.warn(`Could not fetch org workflow permissions for ${orgName}:`, error);
        }

        return config;
    }

    // Full token analysis
    async analyzeToken(token) {
        const analysis = {
            token: token.substring(0, 10) + '...',
            valid: false,
            tokenType: this.isFineGrainedToken(token) ? 'Fine-grained PAT' : 'Classic PAT',
            user: null,
            scopes: [],
            repositories: [],
            organizations: [],
            gists: [],
            publicKeys: [],
            variables: {
                repositories: {},
                organizations: {},
                totalCount: 0
            },
            configuration: {
                repositories: {},
                organizations: {},
                totalCount: 0
            },
            rateLimit: {
                remaining: this.rateLimitRemaining,
                reset: this.rateLimitReset
            },
            error: null
        };

        try {
            // Validate token and get user info
            const validation = await this.validateToken(token);
            if (!validation.valid) {
                analysis.error = validation.error;
                return analysis;
            }

            analysis.valid = true;
            analysis.user = validation.data;
            analysis.scopes = this.getTokenScopes(validation.headers);

            // Get repositories (with error handling for rate limits)
            try {
                analysis.repositories = await this.getAllUserRepositories(token);
            } catch (error) {
                console.warn('Could not fetch repositories:', error.message);
            }

            // Get organizations
            try {
                analysis.organizations = await this.getUserOrganizations(token);
            } catch (error) {
                console.warn('Could not fetch organizations:', error.message);
            }

            // Get gists if token has gist access
            if (analysis.scopes.includes('gist')) {
                try {
                    analysis.gists = await this.getUserGists(token);
                } catch (error) {
                    console.warn('Could not fetch gists:', error.message);
                }
            }

            // Get public keys if token has key access
            if (analysis.scopes.includes('admin:public_key') || analysis.scopes.includes('read:public_key')) {
                try {
                    analysis.publicKeys = await this.getUserPublicKeys(token);
                } catch (error) {
                    console.warn('Could not fetch public keys:', error.message);
                }
            }

            // Get variables and secrets if token has appropriate scopes
            const hasActionsScope = analysis.scopes.some(scope => 
                scope.includes('repo') || scope.includes('admin:org') || scope.includes('write:org')
            );
            
            if (hasActionsScope) {
                // Get repository variables (limit to first 10 repos to avoid excessive API calls)
                const reposToCheck = analysis.repositories.slice(0, 10);
                for (const repo of reposToCheck) {
                    if (repo.permissions && (repo.permissions.admin || repo.permissions.push)) {
                        try {
                            const repoVars = await this.getRepositoryVariables(token, repo.full_name);
                            if (repoVars.length > 0) {
                                analysis.variables.repositories[repo.full_name] = repoVars;
                                analysis.variables.totalCount += repoVars.length;
                            }
                        } catch (error) {
                            console.warn(`Could not fetch variables for ${repo.full_name}:`, error.message);
                        }
                    }
                }

                // Get organization variables
                for (const org of analysis.organizations.slice(0, 5)) { // Limit to 5 orgs
                    try {
                        const orgVars = await this.getOrganizationVariables(token, org.login);
                        if (orgVars.length > 0) {
                            analysis.variables.organizations[org.login] = orgVars;
                            analysis.variables.totalCount += orgVars.length;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch variables for org ${org.login}:`, error.message);
                    }
                }
            }

            // Get repository and organization configurations if token has appropriate scopes
            const hasConfigScope = analysis.scopes.some(scope => 
                scope.includes('repo') || scope.includes('admin:org') || scope.includes('admin:repo_hook')
            );
            
            if (hasConfigScope) {
                // Get repository configurations (limit to first 5 repos to avoid excessive API calls)
                const reposToCheckConfig = analysis.repositories.slice(0, 5);
                for (const repo of reposToCheckConfig) {
                    try {
                        const repoConfig = await this.getRepositoryConfig(token, repo.full_name);
                        if (repoConfig.basic || repoConfig.actionsPermissions || repoConfig.workflowPermissions) {
                            analysis.configuration.repositories[repo.full_name] = repoConfig;
                            analysis.configuration.totalCount++;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch config for ${repo.full_name}:`, error.message);
                    }
                }

                // Get organization configurations
                for (const org of analysis.organizations.slice(0, 3)) { // Limit to 3 orgs
                    try {
                        const orgConfig = await this.getOrganizationConfig(token, org.login);
                        if (orgConfig.actionsPermissions || orgConfig.workflowPermissions) {
                            analysis.configuration.organizations[org.login] = orgConfig;
                            analysis.configuration.totalCount++;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch config for org ${org.login}:`, error.message);
                    }
                }
            }

            // Update final rate limit status
            analysis.rateLimit = {
                remaining: this.rateLimitRemaining,
                reset: this.rateLimitReset
            };

        } catch (error) {
            analysis.error = error.message;
        }

        return analysis;
    }
}

/* ========================================
   Scope Analysis Data
   ======================================== */

const SCOPE_ANALYSIS = {
    // HIGH RISK SCOPES
    'admin:org': {
        description: 'Full administrative access to organizations',
        risk: 'high',
        capabilities: [
            'Create and delete organizations',
            'Manage organization settings',
            'Add/remove organization members',
            'Manage teams and permissions',
            'Access billing information'
        ]
    },
    'delete_repo': {
        description: 'Ability to delete repositories',
        risk: 'high',
        capabilities: [
            'Delete repositories permanently',
            'Remove repository history',
            'Destroy repository data'
        ]
    },
    'delete:packages': {
        description: 'Ability to delete GitHub packages',
        risk: 'high',
        capabilities: [
            'Delete packages permanently',
            'Remove package versions',
            'Destroy package artifacts'
        ]
    },
    'repo': {
        description: 'Complete access to all repositories',
        risk: 'high',
        capabilities: [
            'Read/write access to all repositories',
            'Access to private repositories',
            'Modify repository settings',
            'Manage collaborators and permissions'
        ]
    },
    'site_admin': {
        description: 'GitHub Enterprise site administration',
        risk: 'high',
        capabilities: [
            'Manage GitHub Enterprise settings',
            'Access all repositories and organizations',
            'Manage all users',
            'System-wide administrative access'
        ]
    },
    'workflow': {
        description: 'Access to GitHub Actions workflows',
        risk: 'high',
        capabilities: [
            'Create and modify workflows',
            'Access workflow secrets',
            'Execute arbitrary code in CI/CD',
            'Access to deployment environments'
        ]
    },
    
    // MEDIUM RISK SCOPES
    'admin:public_key': {
        description: 'Manage SSH keys for users',
        risk: 'medium',
        capabilities: [
            'Add SSH keys to user accounts',
            'Remove SSH keys',
            'List all public keys'
        ]
    },
    'admin:gpg_key': {
        description: 'Full access to GPG keys',
        risk: 'medium',
        capabilities: [
            'Add GPG keys to user accounts',
            'Remove GPG keys',
            'Manage commit signing keys'
        ]
    },
    'admin:repo_hook': {
        description: 'Full access to repository webhooks',
        risk: 'medium',
        capabilities: [
            'Create repository webhooks',
            'Modify webhook configurations',
            'Delete webhooks',
            'Access webhook payloads'
        ]
    },
    'admin:org_hook': {
        description: 'Full access to organization webhooks',
        risk: 'medium',
        capabilities: [
            'Create organization webhooks',
            'Modify organization webhook settings',
            'Delete organization webhooks'
        ]
    },
    'write:org': {
        description: 'Write access to organization and teams',
        risk: 'medium',
        capabilities: [
            'Modify organization settings',
            'Manage teams and memberships',
            'Add/remove organization members'
        ]
    },
    'write:public_key': {
        description: 'Write access to public keys',
        risk: 'medium',
        capabilities: [
            'Add SSH keys',
            'Modify existing SSH keys'
        ]
    },
    'write:gpg_key': {
        description: 'Write access to GPG keys',
        risk: 'medium',
        capabilities: [
            'Add GPG keys',
            'Modify existing GPG keys'
        ]
    },
    'write:repo_hook': {
        description: 'Write access to repository hooks',
        risk: 'medium',
        capabilities: [
            'Create repository webhooks',
            'Modify webhook configurations'
        ]
    },
    'write:packages': {
        description: 'Write access to GitHub packages',
        risk: 'medium',
        capabilities: [
            'Upload packages',
            'Modify package metadata',
            'Publish package versions'
        ]
    },
    'write:discussion': {
        description: 'Write access to team discussions',
        risk: 'medium',
        capabilities: [
            'Create team discussions',
            'Modify discussion content',
            'Manage discussion settings'
        ]
    },
    'security_events': {
        description: 'Access to security events and alerts',
        risk: 'medium',
        capabilities: [
            'View security alerts',
            'Access vulnerability data',
            'Manage security policies'
        ]
    },

    // LOW RISK SCOPES (Standard permissions)
    'public_repo': {
        description: 'Access to public repositories only',
        risk: 'low',
        capabilities: [
            'Read public repositories',
            'Create issues and pull requests',
            'Comment on public repositories'
        ]
    },
    'user': {
        description: 'Access to user profile information',
        risk: 'low',
        capabilities: [
            'Read user profile data',
            'Access public user information'
        ]
    },
    'user:email': {
        description: 'Access to user email addresses',
        risk: 'low',
        capabilities: [
            'Read user email addresses',
            'Access primary email'
        ]
    },
    'gist': {
        description: 'Write access to gists',
        risk: 'low',
        capabilities: [
            'Create and edit gists',
            'Delete own gists'
        ]
    },
    'notifications': {
        description: 'Access to notifications',
        risk: 'low',
        capabilities: [
            'Read notifications',
            'Mark notifications as read'
        ]
    },
    'read:org': {
        description: 'Read access to organization and teams',
        risk: 'low',
        capabilities: [
            'View organization information',
            'Read team memberships'
        ]
    },
    'read:packages': {
        description: 'Read access to GitHub packages',
        risk: 'low',
        capabilities: [
            'Download packages',
            'View package metadata'
        ]
    },
    'read:public_key': {
        description: 'Read access to public keys',
        risk: 'low',
        capabilities: [
            'List public SSH keys',
            'View key information'
        ]
    },
    'read:gpg_key': {
        description: 'Read access to GPG keys',
        risk: 'low',
        capabilities: [
            'List GPG keys',
            'View key information'
        ]
    },
    'read:repo_hook': {
        description: 'Read access to repository hooks',
        risk: 'low',
        capabilities: [
            'List repository webhooks',
            'View webhook configurations'
        ]
    },
    'read:discussion': {
        description: 'Read access to team discussions',
        risk: 'low',
        capabilities: [
            'View team discussions',
            'Read discussion content'
        ]
    },
    'repo:status': {
        description: 'Access to commit status',
        risk: 'low',
        capabilities: [
            'Create commit statuses',
            'Update build status'
        ]
    },
    'repo_deployment': {
        description: 'Access to deployment statuses',
        risk: 'low',
        capabilities: [
            'Create deployments',
            'Update deployment status'
        ]
    },
    'user:follow': {
        description: 'Access to follow/unfollow users',
        risk: 'low',
        capabilities: [
            'Follow users',
            'Unfollow users'
        ]
    }
};

/* ========================================
   Repository Browser Functions (index.html)
   ======================================== */

// Global navigator instance (created on page load if needed)
let navigator = null;
let currentUser = null;

// Connect to GitHub
async function connectToGitHub() {
    const tokenInput = document.getElementById('github-token');
    const connectBtn = document.getElementById('connect-btn');
    const token = tokenInput.value.trim();

    if (!token) {
        showNavigatorError('Please enter a GitHub token');
        return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    try {
        navigator.setToken(token);
        
        // Validate token
        const validation = await navigator.validateToken();
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        currentUser = validation.user;
        
        // Load repositories
        showNavigatorLoading('Loading repositories...');
        const repositories = await navigator.loadRepositories();
        
        // Update UI
        displayRepositories(repositories);
        updateRepoCount();
        
        connectBtn.textContent = 'Connected ✓';
        connectBtn.style.background = 'var(--button-primary)';
        
    } catch (error) {
        showNavigatorError(`Connection failed: ${error.message}`);
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
    }
}

// Display repositories in sidebar
function displayRepositories(repositories) {
    const repoList = document.getElementById('repo-list');
    const searchContainer = document.getElementById('repo-search-container');
    let html = '';

    Object.keys(repositories).forEach(owner => {
        const repos = repositories[owner];
        const isUser = currentUser && owner === currentUser.login;
        const orgIcon = isUser ? '👤' : '🏢';
        
        html += `
            <div class="org-section" data-owner="${owner.toLowerCase()}">
                <div class="org-header" onclick="toggleOrgSection('${owner}')">
                    <div class="org-name">
                        ${orgIcon} ${owner}
                        ${isUser ? ' (You)' : ''}
                    </div>
                    <div class="org-count">${repos.length}</div>
                    <div class="org-toggle" id="toggle-${owner}">▶</div>
                </div>
                <div class="repo-items" id="repos-${owner}">
        `;

        repos.forEach(repo => {
            const repoIcon = repo.private ? '🔒' : '📁';
            html += `
                <div class="repo-item" data-repo-name="${repo.name.toLowerCase()}" data-owner="${repo.owner.login.toLowerCase()}" onclick="selectRepository('${repo.owner.login}', '${repo.name}')">
                    <span class="repo-icon">${repoIcon}</span>
                    <span class="repo-name">${repo.name}</span>
                    ${repo.private ? '<span class="repo-private">Private</span>' : ''}
                </div>
            `;
        });

        html += '</div></div>';
    });

    repoList.innerHTML = html;
    
    // Show the search box now that repos are loaded
    if (searchContainer) {
        searchContainer.classList.add('visible');
    }
    
    // Auto-expand user's repos
    if (currentUser) {
        toggleOrgSection(currentUser.login);
    }
}

// Filter repositories based on search input
function filterRepositories(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const orgSections = document.querySelectorAll('.org-section');
    const repoItems = document.querySelectorAll('.repo-item');
    
    if (!term) {
        // Show all repos and reset org sections
        repoItems.forEach(item => {
            item.style.display = '';
        });
        orgSections.forEach(section => {
            section.style.display = '';
            // Update the count to show all repos
            const repoItemsInSection = section.querySelectorAll('.repo-item');
            const countEl = section.querySelector('.org-count');
            if (countEl) {
                countEl.textContent = repoItemsInSection.length;
            }
        });
        return;
    }
    
    // Filter repos based on fuzzy match
    orgSections.forEach(section => {
        const owner = section.getAttribute('data-owner') || '';
        const repoItemsInSection = section.querySelectorAll('.repo-item');
        let visibleCount = 0;
        
        repoItemsInSection.forEach(item => {
            const repoName = item.getAttribute('data-repo-name') || '';
            const repoOwner = item.getAttribute('data-owner') || '';
            const fullName = `${repoOwner}/${repoName}`;
            
            // Fuzzy match: check if all characters in search term appear in order
            const matches = fuzzyMatch(term, repoName) || 
                           fuzzyMatch(term, owner) || 
                           fuzzyMatch(term, fullName);
            
            if (matches) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Update org count and visibility
        const countEl = section.querySelector('.org-count');
        if (countEl) {
            countEl.textContent = visibleCount;
        }
        
        // Hide org section if no repos match
        if (visibleCount === 0) {
            section.style.display = 'none';
        } else {
            section.style.display = '';
            // Auto-expand sections with matches
            const repoItemsContainer = section.querySelector('.repo-items');
            const toggle = section.querySelector('.org-toggle');
            if (repoItemsContainer && !repoItemsContainer.classList.contains('expanded')) {
                repoItemsContainer.classList.add('expanded');
                if (toggle) toggle.classList.add('expanded');
            }
        }
    });
}

// Fuzzy match helper function
function fuzzyMatch(pattern, str) {
    let patternIdx = 0;
    let strIdx = 0;
    
    while (patternIdx < pattern.length && strIdx < str.length) {
        if (pattern[patternIdx].toLowerCase() === str[strIdx].toLowerCase()) {
            patternIdx++;
        }
        strIdx++;
    }
    
    return patternIdx === pattern.length;
}

// Toggle organization section
function toggleOrgSection(owner) {
    const repoItems = document.getElementById(`repos-${owner}`);
    const toggle = document.getElementById(`toggle-${owner}`);
    
    if (repoItems && toggle) {
        if (repoItems.classList.contains('expanded')) {
            repoItems.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            repoItems.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }
}

// Select repository
async function selectRepository(owner, repo) {
    // Update active state
    document.querySelectorAll('.repo-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('.repo-item').classList.add('active');
    }

    navigator.currentRepo = { owner, repo };
    navigator.currentPath = '';

    updateBreadcrumb([{ name: repo, path: '' }]);
    
    try {
        showNavigatorLoading('Loading repository contents...');
        const contents = await navigator.getRepositoryContents(owner, repo);
        displayFileList(contents);
    } catch (error) {
        showNavigatorError(`Failed to load repository: ${error.message}`);
    }
}

// Display file list
function displayFileList(contents) {
    const fileBrowser = document.getElementById('file-browser');
    
    if (!contents || contents.length === 0) {
        fileBrowser.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">Empty Repository</div>
                <div class="empty-state-text">This repository doesn't contain any files</div>
            </div>
        `;
        return;
    }

    let html = '<div class="file-list">';

    // Add back button if not in root
    if (navigator.currentPath) {
        html += `
            <div class="file-item" onclick="navigateUp()">
                <span class="file-icon">⬅️</span>
                <div class="file-info">
                    <div class="file-name">..</div>
                    <div class="file-meta">Go back</div>
                </div>
                <div class="file-size">--</div>
            </div>
        `;
    }

    // Sort contents: directories first, then files
    const sorted = contents.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
    });

    sorted.forEach(item => {
        const icon = item.type === 'dir' ? '📁' : getFileIcon(item.name);
        const size = item.type === 'dir' ? '--' : formatFileSize(item.size);
        const clickHandler = item.type === 'dir' ? 
            `navigateToFolder('${item.name}')` : 
            `viewFile('${item.name}')`;

        html += `
            <div class="file-item" onclick="${clickHandler}">
                <span class="file-icon">${icon}</span>
                <div class="file-info">
                    <div class="file-name">${item.name}</div>
                    <div class="file-meta">${item.type === 'dir' ? 'Directory' : 'File'}</div>
                </div>
                <div class="file-size">${size}</div>
            </div>
        `;
    });

    html += '</div>';
    fileBrowser.innerHTML = html;
}

// Navigate to folder
async function navigateToFolder(folderName) {
    const newPath = navigator.currentPath ? 
        `${navigator.currentPath}/${folderName}` : folderName;
    
    try {
        showNavigatorLoading('Loading folder contents...');
        const contents = await navigator.getRepositoryContents(
            navigator.currentRepo.owner, 
            navigator.currentRepo.repo, 
            newPath
        );
        
        navigator.currentPath = newPath;
        updateBreadcrumb(getBreadcrumbItems());
        displayFileList(contents);
    } catch (error) {
        showNavigatorError(`Failed to load folder: ${error.message}`);
    }
}

// Navigate up one level
async function navigateUp() {
    const pathParts = navigator.currentPath.split('/');
    pathParts.pop();
    const newPath = pathParts.join('/');
    
    try {
        showNavigatorLoading('Loading parent folder...');
        const contents = await navigator.getRepositoryContents(
            navigator.currentRepo.owner, 
            navigator.currentRepo.repo, 
            newPath
        );
        
        navigator.currentPath = newPath;
        updateBreadcrumb(getBreadcrumbItems());
        displayFileList(contents);
    } catch (error) {
        showNavigatorError(`Failed to navigate up: ${error.message}`);
    }
}

// View file content
async function viewFile(fileName) {
    const filePath = navigator.currentPath ? 
        `${navigator.currentPath}/${fileName}` : fileName;
    
    try {
        showNavigatorLoading('Loading file content...');
        const content = await navigator.getFileContent(
            navigator.currentRepo.owner, 
            navigator.currentRepo.repo, 
            filePath
        );
        
        displayFileViewer(fileName, content);
    } catch (error) {
        showNavigatorError(`Failed to load file: ${error.message}`);
    }
}

// Display file viewer
function displayFileViewer(fileName, content) {
    const fileBrowser = document.getElementById('file-browser');
    
    const html = `
        <div class="file-viewer">
            <div class="file-viewer-header">
                <div class="file-viewer-title">📄 ${fileName}</div>
                <div class="file-viewer-actions">
                    <button class="file-viewer-btn" onclick="goBackToFolder()">
                        ← Back to Files
                    </button>
                </div>
            </div>
            <div class="file-content">${escapeHtml(content)}</div>
        </div>
    `;
    
    fileBrowser.innerHTML = html;
}

// Go back to folder view
async function goBackToFolder() {
    try {
        showNavigatorLoading('Loading folder contents...');
        const contents = await navigator.getRepositoryContents(
            navigator.currentRepo.owner, 
            navigator.currentRepo.repo, 
            navigator.currentPath
        );
        displayFileList(contents);
    } catch (error) {
        showNavigatorError(`Failed to load folder: ${error.message}`);
    }
}

// Update breadcrumb navigation
function updateBreadcrumb(items) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    let html = '';
    
    items.forEach((item, index) => {
        if (index > 0) {
            html += '<span class="breadcrumb-separator">/</span>';
        }
        
        const isActive = index === items.length - 1;
        const className = isActive ? 'breadcrumb-item active' : 'breadcrumb-item';
        
        if (isActive) {
            html += `<span class="${className}">${item.name}</span>`;
        } else {
            html += `<span class="${className}" onclick="navigateToBreadcrumb('${item.path}')">${item.name}</span>`;
        }
    });
    
    breadcrumb.innerHTML = html;
}

// Get breadcrumb items
function getBreadcrumbItems() {
    const items = [{ name: navigator.currentRepo.repo, path: '' }];
    
    if (navigator.currentPath) {
        const pathParts = navigator.currentPath.split('/');
        let currentPath = '';
        
        pathParts.forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            items.push({ name: part, path: currentPath });
        });
    }
    
    return items;
}

// Navigate to breadcrumb item
async function navigateToBreadcrumb(path) {
    try {
        showNavigatorLoading('Loading...');
        const contents = await navigator.getRepositoryContents(
            navigator.currentRepo.owner, 
            navigator.currentRepo.repo, 
            path
        );
        
        navigator.currentPath = path;
        updateBreadcrumb(getBreadcrumbItems());
        displayFileList(contents);
    } catch (error) {
        showNavigatorError(`Failed to navigate: ${error.message}`);
    }
}

// Utility functions for navigator
function updateRepoCount() {
    const repoCount = document.getElementById('repo-count');
    if (!repoCount || !navigator) return;
    
    const totalRepos = Object.values(navigator.repositories)
        .reduce((sum, repos) => sum + repos.length, 0);
    repoCount.textContent = `${totalRepos} repositories found`;
}

function showNavigatorLoading(message) {
    const fileBrowser = document.getElementById('file-browser');
    if (fileBrowser) {
        fileBrowser.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                ${message}
            </div>
        `;
    }
}

function showNavigatorError(message) {
    const fileBrowser = document.getElementById('file-browser');
    if (fileBrowser) {
        fileBrowser.innerHTML = `<div class="error-message">❌ ${message}</div>`;
    }
}

/* ========================================
   Token Analyzer Functions (ghcreds.html)
   ======================================== */

// Global analyzer instance (created on page load if needed)
let analyzer = null;

// Analyze single token
async function analyzeToken() {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();
    
    if (!token) {
        showAnalyzerError('Please enter a GH token');
        return;
    }

    const resultsDiv = document.getElementById('results');
    
    // Show initial progress
    showSingleTokenProgress(0, 'Initializing token analysis...', token.substring(0, 10) + '...');

    try {
        // Step 1: Validate token
        showSingleTokenProgress(1, 'Validating token and fetching user info...', token.substring(0, 10) + '...');
        const validation = await analyzer.validateToken(token);
        if (!validation.valid) {
            hideProgress();
            showAnalyzerError(`Token validation failed: ${validation.error}`);
            return;
        }

        // Step 2: Get basic user info and scopes
        showSingleTokenProgress(2, 'Analyzing token scopes and permissions...', token.substring(0, 10) + '...');
        const user = validation.data;
        const scopes = analyzer.getTokenScopes(validation.headers);

        // Step 3: Get repositories
        showSingleTokenProgress(3, 'Fetching accessible repositories...', token.substring(0, 10) + '...');
        const repositories = await analyzer.getAllUserRepositories(token, (page, count) => {
            showSingleTokenProgress(3, `Fetching accessible repositories... (page ${page}, ${count} repos found)`, token.substring(0, 10) + '...');
        });

        // Step 4: Get organizations
        showSingleTokenProgress(4, 'Fetching user organizations...', token.substring(0, 10) + '...');
        const organizations = await analyzer.getUserOrganizations(token);

        // Step 5: Get gists (if applicable)
        let gists = [];
        if (scopes.includes('gist')) {
            showSingleTokenProgress(5, 'Fetching accessible gists...', token.substring(0, 10) + '...');
            gists = await analyzer.getUserGists(token, (current, total) => {
                if (total > 0) {
                    showSingleTokenProgress(5, `Fetching accessible gists... (${current}/${total} pages)`, token.substring(0, 10) + '...');
                }
            });
        } else {
            showSingleTokenProgress(5, 'Skipping gists (no gist scope)...', token.substring(0, 10) + '...');
        }

        // Step 6: Get public keys (if applicable)
        let publicKeys = [];
        if (scopes.includes('admin:public_key') || scopes.includes('read:public_key')) {
            showSingleTokenProgress(6, 'Fetching SSH public keys...', token.substring(0, 10) + '...');
            publicKeys = await analyzer.getUserPublicKeys(token);
        } else {
            showSingleTokenProgress(6, 'Skipping public keys (no key scope)...', token.substring(0, 10) + '...');
        }

        // Step 7: Get variables and secrets
        const variables = { repositories: {}, organizations: {}, totalCount: 0 };
        const hasActionsScope = scopes.some(scope => 
            scope.includes('repo') || scope.includes('admin:org') || scope.includes('write:org')
        );
        
        if (hasActionsScope && repositories.length > 0) {
            // Get repository variables (limit to first 10 repos)
            const reposToCheck = repositories.slice(0, 10);
            const eligibleRepos = reposToCheck.filter(repo => repo.permissions && (repo.permissions.admin || repo.permissions.push));
            
            if (eligibleRepos.length > 0) {
                showSingleTokenProgress(7, `Analyzing variables and secrets... (0/${eligibleRepos.length} repositories)`, token.substring(0, 10) + '...');
                
                for (let i = 0; i < eligibleRepos.length; i++) {
                    const repo = eligibleRepos[i];
                    showSingleTokenProgress(7, `Analyzing variables and secrets... (${i + 1}/${eligibleRepos.length} repositories)`, token.substring(0, 10) + '...');
                    
                    try {
                        const repoVars = await analyzer.getRepositoryVariables(token, repo.full_name);
                        if (repoVars.length > 0) {
                            variables.repositories[repo.full_name] = repoVars;
                            variables.totalCount += repoVars.length;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch variables for ${repo.full_name}:`, error.message);
                    }
                }
            }

            // Get organization variables
            const orgsToCheck = organizations.slice(0, 5);
            if (orgsToCheck.length > 0) {
                for (let i = 0; i < orgsToCheck.length; i++) {
                    const org = orgsToCheck[i];
                    showSingleTokenProgress(7, `Analyzing variables and secrets... (${eligibleRepos.length}/${eligibleRepos.length} repos, ${i + 1}/${orgsToCheck.length} orgs)`, token.substring(0, 10) + '...');
                    
                    try {
                        const orgVars = await analyzer.getOrganizationVariables(token, org.login);
                        if (orgVars.length > 0) {
                            variables.organizations[org.login] = orgVars;
                            variables.totalCount += orgVars.length;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch variables for org ${org.login}:`, error.message);
                    }
                }
            }
        } else {
            showSingleTokenProgress(7, 'Skipping variables (no actions scope)...', token.substring(0, 10) + '...');
        }

        // Step 8: Get configuration
        const configuration = { repositories: {}, organizations: {}, totalCount: 0 };
        const hasConfigScope = scopes.some(scope => 
            scope.includes('repo') || scope.includes('admin:org') || scope.includes('admin:repo_hook')
        );
        
        if (hasConfigScope && repositories.length > 0) {
            // Get repository configurations (limit to first 5 repos)
            const reposToCheckConfig = repositories.slice(0, 5);
            
            if (reposToCheckConfig.length > 0) {
                showSingleTokenProgress(8, `Analyzing security configuration... (0/${reposToCheckConfig.length} repositories)`, token.substring(0, 10) + '...');
                
                for (let i = 0; i < reposToCheckConfig.length; i++) {
                    const repo = reposToCheckConfig[i];
                    showSingleTokenProgress(8, `Analyzing security configuration... (${i + 1}/${reposToCheckConfig.length} repositories)`, token.substring(0, 10) + '...');
                    
                    try {
                        const repoConfig = await analyzer.getRepositoryConfig(token, repo.full_name);
                        if (repoConfig.basic || repoConfig.actionsPermissions || repoConfig.workflowPermissions) {
                            configuration.repositories[repo.full_name] = repoConfig;
                            configuration.totalCount++;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch config for ${repo.full_name}:`, error.message);
                    }
                }
            }

            // Get organization configurations
            const orgsToCheckConfig = organizations.slice(0, 3);
            if (orgsToCheckConfig.length > 0) {
                for (let i = 0; i < orgsToCheckConfig.length; i++) {
                    const org = orgsToCheckConfig[i];
                    showSingleTokenProgress(8, `Analyzing security configuration... (${reposToCheckConfig.length}/${reposToCheckConfig.length} repos, ${i + 1}/${orgsToCheckConfig.length} orgs)`, token.substring(0, 10) + '...');
                    
                    try {
                        const orgConfig = await analyzer.getOrganizationConfig(token, org.login);
                        if (orgConfig.actionsPermissions || orgConfig.workflowPermissions) {
                            configuration.organizations[org.login] = orgConfig;
                            configuration.totalCount++;
                        }
                    } catch (error) {
                        console.warn(`Could not fetch config for org ${org.login}:`, error.message);
                    }
                }
            }
        } else {
            showSingleTokenProgress(8, 'Skipping configuration (no config scope)...', token.substring(0, 10) + '...');
        }

        // Step 9: Complete analysis
        showSingleTokenProgress(9, 'Completing analysis...', token.substring(0, 10) + '...');

        // Build final analysis object
        const analysis = {
            token: token.substring(0, 10) + '...',
            valid: true,
            tokenType: analyzer.isFineGrainedToken(token) ? 'Fine-grained PAT' : 'Classic PAT',
            user: user,
            scopes: scopes,
            repositories: repositories,
            organizations: organizations,
            gists: gists,
            publicKeys: publicKeys,
            variables: variables,
            configuration: configuration,
            rateLimit: {
                remaining: analyzer.rateLimitRemaining,
                reset: analyzer.rateLimitReset
            },
            error: null
        };

        // Hide progress and show results
        hideProgress();
        displayTokenAnalysis(analysis);
    } catch (error) {
        hideProgress();
        showAnalyzerError(`Analysis failed: ${error.message}`);
    }
}

// Quick check tokens (validate only, no full analysis)
// Processes tokens in parallel batches for speed
async function quickCheckTokens() {
    const textInput = document.getElementById('text-scan');
    const text = textInput.value.trim();
    
    if (!text) {
        showAnalyzerError('Please enter text to scan for tokens');
        return;
    }

    const tokens = analyzer.detectGitHubTokens(text);
    
    if (tokens.length === 0) {
        showAnalyzerWarning('No GitHub tokens found in the provided text');
        return;
    }

    const resultsDiv = document.getElementById('results');
    const PARALLEL_LIMIT = 5; // Number of concurrent requests
    
    // Initialize the results container with separate sections for valid/invalid
    resultsDiv.innerHTML = `
        <div class="quick-check-results">
            <div class="quick-check-header">
                <div class="quick-check-title">⚡ Quick Check Results</div>
                <div class="quick-check-stats">
                    <span class="stat-valid" id="quick-check-valid">✅ 0 Valid</span>
                    <span class="stat-invalid" id="quick-check-invalid">❌ 0 Invalid</span>
                    <span class="stat-pending" id="quick-check-pending">⏳ ${tokens.length} Pending</span>
                </div>
            </div>
            
            <div class="quick-check-section valid-section" id="valid-section">
                <div class="quick-check-section-header valid">
                    <span>✅ Valid Tokens</span>
                    <span class="section-count" id="valid-section-count">0</span>
                </div>
                <ul class="quick-check-list" id="valid-list"></ul>
                <div class="quick-check-empty" id="valid-empty">No valid tokens found yet...</div>
            </div>
            
            <div class="quick-check-section invalid-section" id="invalid-section">
                <div class="quick-check-section-header invalid">
                    <span>❌ Invalid Tokens</span>
                    <span class="section-count" id="invalid-section-count">0</span>
                </div>
                <ul class="quick-check-list" id="invalid-list"></ul>
                <div class="quick-check-empty" id="invalid-empty">No invalid tokens found yet...</div>
            </div>
            
            <div class="quick-check-section pending-section" id="pending-section">
                <div class="quick-check-section-header pending">
                    <span>⏳ Checking</span>
                    <span class="section-count" id="pending-section-count">${tokens.length}</span>
                </div>
                <ul class="quick-check-list" id="pending-list"></ul>
            </div>
        </div>
    `;
    
    const validList = document.getElementById('valid-list');
    const invalidList = document.getElementById('invalid-list');
    const pendingList = document.getElementById('pending-list');
    let validCount = 0;
    let invalidCount = 0;
    let completedCount = 0;
    
    // Create all placeholder items in pending section
    tokens.forEach((token, i) => {
        const tokenPreview = token.substring(0, 10) + '...';
        const tokenType = analyzer.isFineGrainedToken(token) ? 'Fine-grained' : 'Classic';
        const itemId = `quick-check-item-${i}`;
        
        pendingList.innerHTML += `
            <li class="quick-check-item checking" id="${itemId}" data-token="${token}">
                <div class="quick-check-token-info">
                    <span class="quick-check-status">⏳</span>
                    <span class="quick-check-token">${tokenPreview}</span>
                    <span class="quick-check-type">${tokenType}</span>
                    <span class="quick-check-checking">Queued...</span>
                </div>
                <div class="quick-check-actions"></div>
            </li>
        `;
    });
    
    // Function to update section visibility and counts
    function updateSections() {
        const pendingCount = tokens.length - completedCount;
        
        // Update header stats
        document.getElementById('quick-check-valid').textContent = `✅ ${validCount} Valid`;
        document.getElementById('quick-check-invalid').textContent = `❌ ${invalidCount} Invalid`;
        const pendingElement = document.getElementById('quick-check-pending');
        if (pendingCount > 0) {
            pendingElement.textContent = `⏳ ${pendingCount} Pending`;
        } else {
            pendingElement.textContent = '✓ Complete';
            pendingElement.className = 'stat-complete';
        }
        
        // Update section counts
        document.getElementById('valid-section-count').textContent = validCount;
        document.getElementById('invalid-section-count').textContent = invalidCount;
        document.getElementById('pending-section-count').textContent = pendingCount;
        
        // Toggle empty messages
        document.getElementById('valid-empty').style.display = validCount > 0 ? 'none' : 'block';
        document.getElementById('invalid-empty').style.display = invalidCount > 0 ? 'none' : 'block';
        
        // Hide pending section when complete
        document.getElementById('pending-section').style.display = pendingCount > 0 ? 'block' : 'none';
    }
    
    // Function to check a single token and update UI
    async function checkToken(token, index) {
        const tokenPreview = token.substring(0, 10) + '...';
        const tokenType = analyzer.isFineGrainedToken(token) ? 'Fine-grained' : 'Classic';
        const itemId = `quick-check-item-${index}`;
        const itemElement = document.getElementById(itemId);
        
        // Update to "Checking" status
        if (itemElement) {
            const checkingSpan = itemElement.querySelector('.quick-check-checking');
            if (checkingSpan) checkingSpan.textContent = 'Checking...';
        }
        
        let result;
        try {
            const validation = await analyzer.validateToken(token);
            result = {
                token: token,
                tokenPreview: tokenPreview,
                valid: validation.valid,
                user: validation.valid ? validation.data : null,
                tokenType: tokenType,
                error: validation.valid ? null : validation.error
            };
        } catch (error) {
            result = {
                token: token,
                tokenPreview: tokenPreview,
                valid: false,
                user: null,
                tokenType: tokenType,
                error: error.message
            };
        }
        
        // Remove from pending list
        if (itemElement) {
            itemElement.remove();
        }
        
        // Create new item HTML
        const statusIcon = result.valid ? '✅' : '❌';
        const itemClass = result.valid ? 'valid' : 'invalid';
        const userInfo = result.valid && result.user ? `@${result.user.login}` : '';
        
        const newItemHtml = `
            <li class="quick-check-item ${itemClass}">
                <div class="quick-check-token-info">
                    <span class="quick-check-status">${statusIcon}</span>
                    <span class="quick-check-token">${result.tokenPreview}</span>
                    ${userInfo ? `<span class="quick-check-user">${userInfo}</span>` : ''}
                    <span class="quick-check-type">${result.tokenType}</span>
                    ${!result.valid ? `<span class="quick-check-error">${result.error || 'Invalid token'}</span>` : ''}
                </div>
                <div class="quick-check-actions">
                    ${result.valid ? `<button class="probe-button" onclick="probeToken('${result.token}')">🔬 Full Analysis</button>` : ''}
                </div>
            </li>
        `;
        
        // Add to appropriate section
        if (result.valid) {
            validList.insertAdjacentHTML('beforeend', newItemHtml);
            validCount++;
        } else {
            invalidList.insertAdjacentHTML('beforeend', newItemHtml);
            invalidCount++;
        }
        completedCount++;
        
        // Update section visibility and counts
        updateSections();
        
        return result;
    }
    
    // Process tokens in parallel batches
    for (let i = 0; i < tokens.length; i += PARALLEL_LIMIT) {
        const batch = tokens.slice(i, i + PARALLEL_LIMIT);
        const batchPromises = batch.map((token, batchIndex) => 
            checkToken(token, i + batchIndex)
        );
        
        // Wait for all tokens in this batch to complete
        await Promise.all(batchPromises);
        
        // Small delay between batches to be nice to the API
        if (i + PARALLEL_LIMIT < tokens.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// Probe a specific token with full analysis
async function probeToken(token) {
    // Set the token in the input field
    const tokenInput = document.getElementById('token-input');
    if (tokenInput) {
        tokenInput.value = token;
    }
    
    // Run full analysis
    await analyzeToken();
}

// Scan text for tokens
async function scanText() {
    const textInput = document.getElementById('text-scan');
    const text = textInput.value.trim();
    
    if (!text) {
        showAnalyzerError('Please enter text to scan');
        return;
    }

    const tokens = analyzer.detectGitHubTokens(text);
    
    if (tokens.length === 0) {
        showAnalyzerWarning('No GH tokens found in the provided text');
        return;
    }

    const resultsDiv = document.getElementById('results');
    
    // Show initial progress
    showProgress(0, tokens.length, 'Initializing scan...', '');
    
    // Clear any existing results after progress bar
    let resultsContainer = document.getElementById('scan-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'scan-results';
        resultsDiv.appendChild(resultsContainer);
    } else {
        resultsContainer.innerHTML = '';
    }

    for (let i = 0; i < tokens.length; i++) {
        try {
            // Update progress
            const tokenPreview = tokens[i].substring(0, 10) + '...';
            showProgress(i, tokens.length, `Analyzing token ${i + 1} of ${tokens.length}`, tokenPreview);
            
            const analysis = await analyzer.analyzeToken(tokens[i]);
            displayTokenAnalysis(analysis, i + 1, resultsContainer);
            
            // Update progress after completion
            if (i + 1 === tokens.length) {
                // Final token - show completion message briefly then hide
                showProgress(i + 1, tokens.length, 'Scan completed!', tokenPreview);
                setTimeout(() => {
                    hideProgress();
                }, 2000); // Hide after 2 seconds
            } else {
                showProgress(i + 1, tokens.length, `Completed token ${i + 1}`, tokenPreview);
            }
            
            // Add delay between requests to avoid rate limiting
            if (i < tokens.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            showAnalyzerError(`Analysis failed for token ${i + 1}: ${error.message}`);
        }
    }
}

// Display token analysis results
function displayTokenAnalysis(analysis, tokenNumber = null, targetContainer = null) {
    const resultsDiv = targetContainer || document.getElementById('results');
    
    const tokenTitle = tokenNumber ? `Token #${tokenNumber}` : 'Token Analysis';
    const statusClass = analysis.valid ? 'status-valid' : 'status-invalid';
    const statusText = analysis.valid ? '✅ Valid' : '❌ Invalid';
    
    let html = `
        <div class="result-card">
            <div class="result-header">
                <span>${tokenTitle}</span>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="result-body">
    `;

    if (analysis.error) {
        html += `<div class="error">Error: ${analysis.error}</div>`;
        // Show token preview and type for invalid tokens in one line
        html += `
            <div class="profile-section">
                <div class="profile-avatar">
                    <div class="invalid-avatar">❌</div>
                </div>
                <div class="profile-info">
                    <div class="profile-item">
                        <span class="profile-label">Token Type:</span>
                        <span class="profile-value">${analysis.tokenType}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Token Preview:</span>
                        <span class="profile-value monospace">${analysis.token}</span>
                    </div>
                </div>
            </div>
        `;
    }

    if (analysis.valid && analysis.user) {
        html += `
            <div class="profile-section">
                <div class="profile-avatar">
                    <img src="${analysis.user.avatar_url}" alt="${analysis.user.login}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22>?</text></svg>'">
                </div>
                <div class="profile-info">
                    <div class="profile-item">
                        <span class="profile-label">Username:</span>
                        <span class="profile-value">${analysis.user.login}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Name:</span>
                        <span class="profile-value">${analysis.user.name || 'Not specified'}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Account Type:</span>
                        <span class="profile-value">${analysis.user.type}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Token Type:</span>
                        <span class="profile-value">${analysis.tokenType}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Token Preview:</span>
                        <span class="profile-value monospace">${analysis.token}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Public Repos:</span>
                        <span class="profile-value">${analysis.user.public_repos}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Followers:</span>
                        <span class="profile-value">${analysis.user.followers}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">API Rate Limit:</span>
                        <span class="profile-value">${analysis.rateLimit.remaining !== null ? analysis.rateLimit.remaining : 'Unknown'} remaining | Reset: ${analysis.rateLimit.reset ? new Date(analysis.rateLimit.reset * 1000).toLocaleTimeString() : 'Unknown'}</span>
                    </div>
                </div>
            </div>
        `;

        // Token scopes with risk analysis
        if (analysis.scopes.length > 0) {
            const highRiskScopes = analysis.scopes.filter(scope => SCOPE_ANALYSIS[scope]?.risk === 'high');
            const mediumRiskScopes = analysis.scopes.filter(scope => SCOPE_ANALYSIS[scope]?.risk === 'medium');
            const lowRiskScopes = analysis.scopes.filter(scope => SCOPE_ANALYSIS[scope]?.risk === 'low');
            const unknownScopes = analysis.scopes.filter(scope => !SCOPE_ANALYSIS[scope]);
            
            html += '<h3>🔑 Token Scopes & Risk Analysis</h3>';
            
            if (highRiskScopes.length > 0 || mediumRiskScopes.length > 0) {
                html += '<div class="warning">⚠️ This token has elevated privileges that could be dangerous if compromised!</div>';
            }
            
            html += '<div class="scope-list">';
            
            // High risk scopes first
            highRiskScopes.forEach(scope => {
                const scopeInfo = SCOPE_ANALYSIS[scope];
                html += `<span class="scope-tag risk-high" onclick="showScopeModal('${scope}')" title="HIGH RISK: ${scopeInfo.description}">${scope}</span>`;
            });
            
            // Medium risk scopes
            mediumRiskScopes.forEach(scope => {
                const scopeInfo = SCOPE_ANALYSIS[scope];
                html += `<span class="scope-tag risk-medium" onclick="showScopeModal('${scope}')" title="MEDIUM RISK: ${scopeInfo.description}">${scope}</span>`;
            });
            
            // Low risk scopes
            lowRiskScopes.forEach(scope => {
                const scopeInfo = SCOPE_ANALYSIS[scope];
                html += `<span class="scope-tag risk-low" onclick="showScopeModal('${scope}')" title="LOW RISK: ${scopeInfo.description}">${scope}</span>`;
            });
            
            // Unknown scopes
            unknownScopes.forEach(scope => {
                html += `<span class="scope-tag" onclick="showScopeModal('${scope}')" title="Unknown scope: ${scope}">${scope}</span>`;
            });
            
            html += '</div>';
            
            // Risk summary
            if (highRiskScopes.length > 0 || mediumRiskScopes.length > 0 || unknownScopes.length > 0) {
                html += '<div class="risk-summary">';
                html += `<strong>Risk Summary:</strong> `;
                if (highRiskScopes.length > 0) html += `🔴 ${highRiskScopes.length} High Risk `;
                if (mediumRiskScopes.length > 0) html += `🟡 ${mediumRiskScopes.length} Medium Risk `;
                if (lowRiskScopes.length > 0) html += `🟢 ${lowRiskScopes.length} Low Risk `;
                if (unknownScopes.length > 0) html += `⚪ ${unknownScopes.length} Unknown `;
                html += '<br><em>Click any scope to see detailed capabilities and risks</em>';
                html += '</div>';
            }
            
        } else {
            html += '<div class="warning">No scopes detected - this might be a fine-grained token with repository-specific permissions</div>';
        }

        // Organizations
        if (analysis.organizations.length > 0) {
            html += `<h3>🏢 Organizations (${analysis.organizations.length})</h3>`;
            html += '<div class="repo-list">';
            analysis.organizations.forEach(org => {
                html += `
                    <div class="repo-item">
                        <span class="repo-name">${org.login}</span>
                        <span class="repo-public">Organization</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Repositories
        if (analysis.repositories.length > 0) {
            const privateRepos = analysis.repositories.filter(repo => repo.private);
            const publicRepos = analysis.repositories.filter(repo => !repo.private);
            
            html += `<h3>📁 Accessible Repositories (${analysis.repositories.length} total)</h3>`;
            html += `<p>🔒 Private: ${privateRepos.length} | 🔓 Public: ${publicRepos.length}</p>`;
            
            html += '<div class="repo-list">';
            analysis.repositories.slice(0, 20).forEach(repo => {
                const repoClass = repo.private ? 'repo-private' : 'repo-public';
                const repoLabel = repo.private ? 'Private' : 'Public';
                const repoNameElement = repo.private ? 
                    `<span class="repo-name-private">${repo.full_name}</span>` :
                    `<a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-link">${repo.full_name}</a>`;
                
                html += `
                    <div class="repo-item">
                        ${repoNameElement}
                        <span class="${repoClass}">${repoLabel}</span>
                    </div>
                `;
            });
            if (analysis.repositories.length > 20) {
                html += `<div class="repo-item more-repos-message">... and ${analysis.repositories.length - 20} more repositories</div>`;
            }
            html += '</div>';
        }
    }

    html += '</div></div>';
    
    if (tokenNumber === null || tokenNumber === 1) {
        resultsDiv.innerHTML = html;
    } else {
        resultsDiv.innerHTML += html;
    }
}

// Progress bar function for single token analysis
function showSingleTokenProgress(step, status, tokenPreview) {
    const totalSteps = 9;
    const percentage = (step / totalSteps) * 100;
    
    // Escape user-controlled content to prevent XSS
    const safeStatus = escapeHtml(status);
    const safeTokenPreview = escapeHtml(tokenPreview);
    
    // Check if progress container already exists
    let container = document.querySelector('.progress-container');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'progress-container';
        document.body.appendChild(container);
    }
    
    container.innerHTML = `
        <div class="progress-header">
            <div class="progress-title">🔍 Analyzing GH Token</div>
            <div class="progress-counter">Step ${step}/${totalSteps}</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-status">
            <span>${safeStatus}</span>
            <span class="current-token">${safeTokenPreview}</span>
            ${step < totalSteps ? '<span class="loading"></span>' : ''}
        </div>
    `;
}

// Hide progress bar
function hideProgress() {
    const existingProgress = document.querySelector('.progress-container');
    if (existingProgress) {
        existingProgress.remove();
    }
}

// Progress bar function for multi-token scanning
function showProgress(current, total, status, currentToken = '') {
    const resultsDiv = document.getElementById('results');
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    // Escape user-controlled content to prevent XSS
    const safeStatus = escapeHtml(status);
    const safeToken = currentToken ? escapeHtml(currentToken) : '';
    
    const progressContent = `
        <div class="progress-header">
            <div class="progress-title">🔍 Scanning GH Tokens</div>
            <div class="progress-counter">${current}/${total}</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-status">
            <span>${safeStatus}</span>
            ${safeToken ? `<span class="current-token">${safeToken}</span>` : ''}
            ${current < total ? '<span class="loading"></span>' : ''}
        </div>
    `;

    // Check if progress container already exists
    let container = document.querySelector('.progress-container');
    
    if (container) {
        container.innerHTML = progressContent;
    } else {
        container = document.createElement('div');
        container.className = 'progress-container';
        container.innerHTML = progressContent;
        
        // If it's the first progress update, replace all content
        if (current === 0 && resultsDiv) {
            resultsDiv.innerHTML = '';
            resultsDiv.appendChild(container);
        } else if (resultsDiv) {
            // Insert at the beginning if no progress container exists
            resultsDiv.insertBefore(container, resultsDiv.firstChild);
        }
    }
}

// Utility functions for analyzer
function showAnalyzerError(message) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `<div class="error">❌ ${message}</div>`;
    }
}

function showAnalyzerWarning(message) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `<div class="warning">⚠️ ${message}</div>`;
    }
}

function clearResults() {
    const resultsDiv = document.getElementById('results');
    const tokenInput = document.getElementById('token-input');
    const textScan = document.getElementById('text-scan');
    
    if (resultsDiv) resultsDiv.innerHTML = '';
    if (tokenInput) tokenInput.value = '';
    if (textScan) textScan.value = '';
}

// Scope modal functions
function showScopeModal(scope) {
    const modal = document.getElementById('scope-modal');
    const modalContent = document.getElementById('scope-modal-content');
    const title = document.getElementById('scope-modal-title');
    const description = document.getElementById('scope-modal-description');
    const capabilities = document.getElementById('scope-modal-capabilities');
    const warning = document.getElementById('scope-modal-warning');
    
    if (!modal || !modalContent || !title || !description || !capabilities || !warning) return;
    
    const scopeInfo = SCOPE_ANALYSIS[scope];
    
    if (scopeInfo) {
        // Set risk class for styling
        modalContent.className = `scope-modal-content risk-${scopeInfo.risk}`;
        
        // Set title with risk indicator
        const riskEmoji = scopeInfo.risk === 'high' ? '🔴' : scopeInfo.risk === 'medium' ? '🟡' : '🟢';
        const riskText = scopeInfo.risk.toUpperCase();
        title.innerHTML = `${riskEmoji} ${scope} <span class="scope-risk-label">(${riskText} RISK)</span>`;
        
        // Set description
        description.textContent = scopeInfo.description;
        
        // Set capabilities
        capabilities.innerHTML = `
            <h4>What this scope allows:</h4>
            <ul>
                ${scopeInfo.capabilities.map(cap => `<li>${cap}</li>`).join('')}
            </ul>
        `;
        
        // Show warning for dangerous scopes
        if (scopeInfo.risk === 'high' && (scope === 'delete_repo' || scope === 'delete:packages')) {
            warning.style.display = 'block';
            warning.innerHTML = `
                <div class="blocked-operation-warning">
                    <span class="warning-icon">🚫</span>
                    <div class="blocked-operation-text">
                        <strong>Destructive Operations Blocked:</strong> This scope allows permanent deletion of data. 
                        All destructive operations are blocked by this tool for safety.
                    </div>
                </div>
            `;
        } else if (scopeInfo.risk === 'high') {
            warning.style.display = 'block';
            warning.innerHTML = `
                <div class="blocked-operation-warning">
                    <span class="warning-icon">⚠️</span>
                    <div class="blocked-operation-text">
                        <strong>High Risk Scope:</strong> This permission grants significant access that could be dangerous if the token is compromised. 
                        Use with extreme caution and consider using more restrictive scopes if possible.
                    </div>
                </div>
            `;
        } else {
            warning.style.display = 'none';
        }
        
    } else {
        // Unknown scope
        modalContent.className = 'scope-modal-content';
        title.innerHTML = `⚪ ${scope} <span class="scope-risk-label">(UNKNOWN SCOPE)</span>`;
        description.textContent = 'This scope is not recognized in our database. It may be a new or deprecated scope.';
        capabilities.innerHTML = `
            <h4>Unknown Capabilities</h4>
            <p class="text-italic">
                We don't have information about this scope's capabilities. Please refer to GitHub's official documentation 
                or consider this scope potentially risky until verified.
            </p>
        `;
        warning.style.display = 'block';
        warning.innerHTML = `
            <div class="blocked-operation-warning">
                <span class="warning-icon">❓</span>
                <div class="blocked-operation-text">
                    <strong>Unknown Scope:</strong> This scope is not in our risk assessment database. 
                    Exercise caution and verify its capabilities before use.
                </div>
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

function closeScopeModal() {
    const modal = document.getElementById('scope-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/* ========================================
   Page Initialization
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme for all pages
    initializeTheme();
    
    // Check which page we're on and initialize accordingly
    const isNavigatorPage = document.getElementById('github-token') !== null && document.getElementById('file-browser') !== null;
    const isAnalyzerPage = document.getElementById('token-input') !== null && document.getElementById('text-scan') !== null;
    
    if (isNavigatorPage) {
        // Initialize Repository Browser
        navigator = new GHNavigator();
        
        // Handle Enter key in token input
        const tokenInput = document.getElementById('github-token');
        if (tokenInput) {
            tokenInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    connectToGitHub();
                }
            });
        }
        
        // Handle repository search/filter
        const repoSearch = document.getElementById('repo-search');
        if (repoSearch) {
            repoSearch.addEventListener('input', function(e) {
                filterRepositories(e.target.value);
            });
            
            // Clear search on Escape key
            repoSearch.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    repoSearch.value = '';
                    filterRepositories('');
                }
            });
        }
    }
    
    if (isAnalyzerPage) {
        // Initialize Token Analyzer
        analyzer = new GitHubTokenAnalyzer();
        
        // Handle Enter key in token input
        const tokenInput = document.getElementById('token-input');
        if (tokenInput) {
            tokenInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    analyzeToken();
                }
            });
        }
        
        // Close modal when clicking outside of it
        window.onclick = function(event) {
            const modal = document.getElementById('scope-modal');
            if (event.target === modal) {
                closeScopeModal();
            }
        };
    }
});

