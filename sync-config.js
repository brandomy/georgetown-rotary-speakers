// GitHub Sync Configuration
// This file contains the configuration for GitHub-based data persistence

class GitHubSyncConfig {
    constructor() {
        this.config = {
            // GitHub configuration (will be set during setup)
            owner: '',
            repo: '',
            token: '',
            gistId: '',

            // Data file settings
            dataFileName: 'rotary-speakers-data.json',
            backupFileName: 'rotary-speakers-backup.json',

            // Sync settings
            autoSyncInterval: 30000, // 30 seconds
            retryAttempts: 3,
            retryDelay: 2000, // 2 seconds
            conflictResolutionStrategy: 'merge', // 'merge', 'local', 'remote'

            // API endpoints
            apiBase: 'https://api.github.com',
            gistApiBase: 'https://api.github.com/gists'
        };

        this.loadConfig();
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('rotarySpeakersConfig');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                this.config = { ...this.config, ...parsed };
            } catch (error) {
                console.warn('Failed to load sync config:', error);
            }
        }
    }

    saveConfig() {
        localStorage.setItem('rotarySpeakersConfig', JSON.stringify(this.config));
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }

    isConfigured() {
        return !!(this.config.token && this.config.gistId);
    }

    getConfig() {
        return { ...this.config };
    }

    // Setup wizard methods
    async validateGitHubToken(token) {
        try {
            const response = await fetch(`${this.config.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async createDataGist(token, initialData = []) {
        try {
            const gistData = {
                description: 'Georgetown Rotary Speakers Database',
                public: false,
                files: {
                    [this.config.dataFileName]: {
                        content: JSON.stringify({
                            version: 1,
                            lastModified: new Date().toISOString(),
                            speakers: initialData,
                            metadata: {
                                created: new Date().toISOString(),
                                source: 'Georgetown Rotary Speakers App'
                            }
                        }, null, 2)
                    }
                }
            };

            const response = await fetch(this.config.gistApiBase, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                return result.id;
            }
            throw new Error('Failed to create gist');
        } catch (error) {
            console.error('Error creating gist:', error);
            throw error;
        }
    }
}

// Global configuration instance
window.GitHubSyncConfig = GitHubSyncConfig;