// GitHub Sync Engine
// Handles automatic bidirectional synchronization with GitHub

class GitHubSyncEngine {
    constructor(config) {
        this.config = config;
        this.syncInProgress = false;
        this.syncQueue = [];
        this.retryCount = 0;
        this.lastSyncTime = null;
        this.autoSyncTimer = null;
        this.eventHandlers = {};

        // Bind methods
        this.sync = this.sync.bind(this);
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);

        this.init();
    }

    init() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);

        // Listen for beforeunload to sync any pending changes
        window.addEventListener('beforeunload', () => {
            if (this.syncQueue.length > 0) {
                this.syncNow();
            }
        });

        // Start auto-sync if configured
        if (this.config.isConfigured()) {
            this.startAutoSync();
        }
    }

    // Event system
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(data));
        }
    }

    // Auto-sync management
    startAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
        }

        const config = this.config.getConfig();
        this.autoSyncTimer = setInterval(this.sync, config.autoSyncInterval);

        // Initial sync
        setTimeout(this.sync, 1000);
    }

    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
    }

    // Network event handlers
    handleOnline() {
        this.emit('connectionChanged', { online: true });
        if (this.config.isConfigured()) {
            setTimeout(this.sync, 1000);
        }
    }

    handleOffline() {
        this.emit('connectionChanged', { online: false });
    }

    // Main sync method
    async sync() {
        if (!this.config.isConfigured() || this.syncInProgress || !navigator.onLine) {
            return;
        }

        this.syncInProgress = true;
        this.emit('syncStarted');

        try {
            const localData = this.getLocalData();
            const remoteData = await this.getRemoteData();

            const syncResult = await this.performSync(localData, remoteData);

            if (syncResult.conflicts.length > 0) {
                this.emit('conflictsDetected', syncResult.conflicts);
            }

            if (syncResult.updated) {
                this.emit('syncCompleted', {
                    success: true,
                    conflicts: syncResult.conflicts.length
                });
            }

            this.lastSyncTime = new Date();
            this.retryCount = 0;

        } catch (error) {
            console.error('Sync failed:', error);
            this.handleSyncError(error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncNow() {
        await this.sync();
    }

    // Data management
    getLocalData() {
        const localSpeakers = JSON.parse(localStorage.getItem('rotarySpeakers') || '[]');
        const lastModified = localStorage.getItem('rotarySpeakersLastModified') || new Date().toISOString();

        return {
            version: parseInt(localStorage.getItem('rotarySpeakersVersion') || '1'),
            lastModified,
            speakers: localSpeakers,
            metadata: {
                source: 'local',
                environment: window.location.origin
            }
        };
    }

    async getRemoteData() {
        const config = this.config.getConfig();

        try {
            const response = await fetch(`${config.gistApiBase}/${config.gistId}`, {
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const gist = await response.json();
            const fileContent = gist.files[config.dataFileName]?.content;

            if (!fileContent) {
                throw new Error('Data file not found in gist');
            }

            return JSON.parse(fileContent);
        } catch (error) {
            console.error('Failed to fetch remote data:', error);
            throw error;
        }
    }

    async performSync(localData, remoteData) {
        const conflicts = [];
        let updated = false;

        // Compare timestamps
        const localTime = new Date(localData.lastModified);
        const remoteTime = new Date(remoteData.lastModified);

        if (localTime > remoteTime) {
            // Local is newer, push to remote
            await this.pushToRemote(localData);
            updated = true;
        } else if (remoteTime > localTime) {
            // Remote is newer, pull from remote
            const mergeResult = this.mergeData(localData, remoteData);
            this.saveLocalData(mergeResult.data);
            conflicts.push(...mergeResult.conflicts);
            updated = true;
        }
        // If timestamps are equal, no sync needed

        return { updated, conflicts };
    }

    mergeData(localData, remoteData) {
        const conflicts = [];
        const mergedSpeakers = new Map();

        // Add all remote speakers first
        remoteData.speakers.forEach(speaker => {
            mergedSpeakers.set(speaker.id, { ...speaker, source: 'remote' });
        });

        // Merge local speakers
        localData.speakers.forEach(localSpeaker => {
            const remoteSpeaker = mergedSpeakers.get(localSpeaker.id);

            if (!remoteSpeaker) {
                // New local speaker
                mergedSpeakers.set(localSpeaker.id, { ...localSpeaker, source: 'local' });
            } else {
                // Potential conflict - compare data
                const conflict = this.detectConflict(localSpeaker, remoteSpeaker);
                if (conflict) {
                    conflicts.push(conflict);
                    // Apply conflict resolution strategy
                    const resolved = this.resolveConflict(localSpeaker, remoteSpeaker);
                    mergedSpeakers.set(localSpeaker.id, resolved);
                }
            }
        });

        const mergedData = {
            ...remoteData,
            speakers: Array.from(mergedSpeakers.values()),
            lastModified: new Date().toISOString(),
            version: Math.max(localData.version, remoteData.version) + 1
        };

        return { data: mergedData, conflicts };
    }

    detectConflict(localSpeaker, remoteSpeaker) {
        const localFields = Object.keys(localSpeaker);
        const remoteFields = Object.keys(remoteSpeaker);
        const allFields = new Set([...localFields, ...remoteFields]);

        const differences = [];

        for (const field of allFields) {
            const localValue = localSpeaker[field];
            const remoteValue = remoteSpeaker[field];

            if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
                differences.push({
                    field,
                    local: localValue,
                    remote: remoteValue
                });
            }
        }

        if (differences.length > 0) {
            return {
                speakerId: localSpeaker.id,
                speakerName: localSpeaker.name || remoteSpeaker.name,
                differences
            };
        }

        return null;
    }

    resolveConflict(localSpeaker, remoteSpeaker) {
        const config = this.config.getConfig();

        switch (config.conflictResolutionStrategy) {
            case 'local':
                return { ...localSpeaker, source: 'local-preferred' };

            case 'remote':
                return { ...remoteSpeaker, source: 'remote-preferred' };

            case 'merge':
            default:
                // Intelligent merge - prefer non-empty values
                const merged = {};
                const allKeys = new Set([...Object.keys(localSpeaker), ...Object.keys(remoteSpeaker)]);

                for (const key of allKeys) {
                    const localValue = localSpeaker[key];
                    const remoteValue = remoteSpeaker[key];

                    if (localValue && !remoteValue) {
                        merged[key] = localValue;
                    } else if (remoteValue && !localValue) {
                        merged[key] = remoteValue;
                    } else if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
                        // Merge arrays, remove duplicates
                        merged[key] = [...new Set([...localValue, ...remoteValue])];
                    } else {
                        // For conflicts, prefer the most recent or local
                        merged[key] = localValue || remoteValue;
                    }
                }

                merged.source = 'merged';
                return merged;
        }
    }

    async pushToRemote(data) {
        const config = this.config.getConfig();

        try {
            const updateData = {
                files: {
                    [config.dataFileName]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            };

            const response = await fetch(`${config.gistApiBase}/${config.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`Failed to update gist: ${response.status}`);
            }

            this.emit('dataUploaded', data);
        } catch (error) {
            console.error('Failed to push to remote:', error);
            throw error;
        }
    }

    saveLocalData(data) {
        localStorage.setItem('rotarySpeakers', JSON.stringify(data.speakers));
        localStorage.setItem('rotarySpeakersLastModified', data.lastModified);
        localStorage.setItem('rotarySpeakersVersion', data.version.toString());

        // Trigger app data reload
        if (window.loadData && typeof window.loadData === 'function') {
            window.loadData();
        }

        // Trigger view re-render
        if (window.renderView && typeof window.renderView === 'function') {
            window.renderView();
        }

        this.emit('localDataUpdated', data);
    }

    // Queue management for offline changes
    queueChange(changeType, data) {
        this.syncQueue.push({
            id: Date.now(),
            type: changeType,
            data: data,
            timestamp: new Date().toISOString()
        });

        // Trigger sync if online
        if (navigator.onLine && this.config.isConfigured()) {
            setTimeout(this.sync, 100);
        }
    }

    // Error handling
    handleSyncError(error) {
        this.retryCount++;
        const config = this.config.getConfig();

        if (this.retryCount < config.retryAttempts) {
            setTimeout(this.sync, config.retryDelay * this.retryCount);
        } else {
            this.emit('syncFailed', { error, retryCount: this.retryCount });
            this.retryCount = 0;
        }
    }

    // Public API
    triggerDataChange() {
        const now = new Date().toISOString();
        localStorage.setItem('rotarySpeakersLastModified', now);
        this.queueChange('update', { timestamp: now });
    }

    getStatus() {
        return {
            configured: this.config.isConfigured(),
            syncing: this.syncInProgress,
            online: navigator.onLine,
            lastSync: this.lastSyncTime,
            queueLength: this.syncQueue.length
        };
    }

    // Cleanup
    destroy() {
        this.stopAutoSync();
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
    }
}

// Global sync engine instance
window.GitHubSyncEngine = GitHubSyncEngine;