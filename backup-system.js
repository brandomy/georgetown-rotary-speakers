// Backup System
// Handles automatic backups and data integrity checks

class BackupSystem {
    constructor(config, syncEngine) {
        this.config = config;
        this.syncEngine = syncEngine;
        this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.maxBackups = 30; // Keep 30 days of backups
        this.backupTimer = null;

        this.init();
    }

    init() {
        // Start automatic backup schedule
        this.startBackupSchedule();

        // Listen for data changes to create incremental backups
        this.syncEngine.on('localDataUpdated', () => {
            this.createIncrementalBackup();
        });

        // Perform integrity check on startup
        setTimeout(() => this.performIntegrityCheck(), 5000);
    }

    startBackupSchedule() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        // Create initial backup
        this.createFullBackup();

        // Schedule regular backups
        this.backupTimer = setInterval(() => {
            this.createFullBackup();
        }, this.backupInterval);
    }

    stopBackupSchedule() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }
    }

    // Create a full backup with all data
    async createFullBackup() {
        try {
            const timestamp = new Date().toISOString();
            const backupData = this.gatherBackupData();

            const backup = {
                id: `backup_${Date.now()}`,
                type: 'full',
                timestamp: timestamp,
                version: this.getDataVersion(),
                checksum: this.calculateChecksum(backupData),
                data: backupData,
                metadata: {
                    userAgent: navigator.userAgent,
                    origin: window.location.origin,
                    speakerCount: backupData.speakers?.length || 0
                }
            };

            // Store locally
            this.storeLocalBackup(backup);

            // Store remotely if configured
            if (this.config.isConfigured()) {
                await this.storeRemoteBackup(backup);
            }

            console.log('Full backup created:', backup.id);
            return backup;

        } catch (error) {
            console.error('Failed to create full backup:', error);
            this.notifyBackupError(error);
        }
    }

    // Create incremental backup for recent changes
    createIncrementalBackup() {
        try {
            const timestamp = new Date().toISOString();
            const recentChanges = this.getRecentChanges();

            if (recentChanges.length === 0) {
                return; // No changes to backup
            }

            const backup = {
                id: `incremental_${Date.now()}`,
                type: 'incremental',
                timestamp: timestamp,
                version: this.getDataVersion(),
                changes: recentChanges,
                metadata: {
                    changeCount: recentChanges.length,
                    origin: window.location.origin
                }
            };

            this.storeLocalBackup(backup);
            console.log('Incremental backup created:', backup.id);

        } catch (error) {
            console.error('Failed to create incremental backup:', error);
        }
    }

    gatherBackupData() {
        return {
            speakers: JSON.parse(localStorage.getItem('rotarySpeakers') || '[]'),
            lastModified: localStorage.getItem('rotarySpeakersLastModified'),
            version: localStorage.getItem('rotarySpeakersVersion'),
            config: localStorage.getItem('rotarySpeakersConfig'),
            sessionData: {
                currentView: window.currentView || 'kanban',
                lastActive: new Date().toISOString()
            }
        };
    }

    getDataVersion() {
        return parseInt(localStorage.getItem('rotarySpeakersVersion') || '1');
    }

    calculateChecksum(data) {
        // Simple checksum calculation for data integrity
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    getRecentChanges() {
        // Get changes from sync queue or recent modifications
        const changes = [];
        const lastBackup = this.getLastBackupTime();
        const currentData = this.gatherBackupData();

        if (lastBackup) {
            const timeDiff = Date.now() - new Date(lastBackup).getTime();
            if (timeDiff < 60000) { // Changes within last minute
                changes.push({
                    type: 'data_update',
                    timestamp: new Date().toISOString(),
                    data: currentData
                });
            }
        }

        return changes;
    }

    storeLocalBackup(backup) {
        const backupKey = `rotaryBackup_${backup.id}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));

        // Update backup index
        this.updateBackupIndex(backup);

        // Clean old backups
        this.cleanOldBackups();
    }

    async storeRemoteBackup(backup) {
        if (!this.config.isConfigured()) return;

        try {
            const config = this.config.getConfig();
            const backupFileName = `backup_${backup.timestamp.split('T')[0]}.json`;

            // Get current gist to add backup file
            const gistResponse = await fetch(`${config.gistApiBase}/${config.gistId}`, {
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!gistResponse.ok) {
                throw new Error('Failed to fetch gist for backup');
            }

            const gist = await gistResponse.json();

            // Add backup file to gist
            const updateData = {
                files: {
                    ...gist.files,
                    [backupFileName]: {
                        content: JSON.stringify(backup, null, 2)
                    }
                }
            };

            const updateResponse = await fetch(`${config.gistApiBase}/${config.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to store remote backup');
            }

            console.log('Remote backup stored:', backupFileName);

        } catch (error) {
            console.error('Failed to store remote backup:', error);
            // Don't throw - local backup still exists
        }
    }

    updateBackupIndex(backup) {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');

        index.push({
            id: backup.id,
            type: backup.type,
            timestamp: backup.timestamp,
            version: backup.version,
            checksum: backup.checksum
        });

        // Sort by timestamp
        index.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        localStorage.setItem('rotaryBackupIndex', JSON.stringify(index));
    }

    cleanOldBackups() {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');
        const cutoffDate = new Date(Date.now() - (this.maxBackups * 24 * 60 * 60 * 1000));

        const toDelete = index.filter(backup => new Date(backup.timestamp) < cutoffDate);

        toDelete.forEach(backup => {
            localStorage.removeItem(`rotaryBackup_${backup.id}`);
        });

        if (toDelete.length > 0) {
            const updatedIndex = index.filter(backup => new Date(backup.timestamp) >= cutoffDate);
            localStorage.setItem('rotaryBackupIndex', JSON.stringify(updatedIndex));
            console.log(`Cleaned ${toDelete.length} old backups`);
        }
    }

    getLastBackupTime() {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');
        return index.length > 0 ? index[0].timestamp : null;
    }

    // Data integrity checking
    async performIntegrityCheck() {
        try {
            console.log('Performing data integrity check...');

            const currentData = this.gatherBackupData();
            const currentChecksum = this.calculateChecksum(currentData);

            // Check for data corruption
            const corruption = this.detectDataCorruption(currentData);
            if (corruption.length > 0) {
                console.warn('Data corruption detected:', corruption);
                this.handleDataCorruption(corruption);
            }

            // Validate data structure
            const validation = this.validateDataStructure(currentData);
            if (!validation.valid) {
                console.warn('Data structure validation failed:', validation.errors);
                await this.repairDataStructure(currentData, validation.errors);
            }

            // Check sync consistency
            if (this.config.isConfigured()) {
                await this.checkSyncConsistency();
            }

            console.log('Integrity check completed');

        } catch (error) {
            console.error('Integrity check failed:', error);
        }
    }

    detectDataCorruption(data) {
        const corruption = [];

        // Check for duplicate IDs
        const speakers = data.speakers || [];
        const ids = speakers.map(s => s.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            corruption.push({ type: 'duplicate_ids', ids: duplicateIds });
        }

        // Check for missing required fields
        speakers.forEach((speaker, index) => {
            if (!speaker.name || !speaker.id) {
                corruption.push({
                    type: 'missing_required_fields',
                    speakerIndex: index,
                    speaker: speaker
                });
            }
        });

        // Check for invalid data types
        speakers.forEach((speaker, index) => {
            if (typeof speaker.id !== 'number') {
                corruption.push({
                    type: 'invalid_data_type',
                    field: 'id',
                    speakerIndex: index,
                    value: speaker.id
                });
            }
        });

        return corruption;
    }

    validateDataStructure(data) {
        const errors = [];

        // Check main structure
        if (!Array.isArray(data.speakers)) {
            errors.push('speakers field must be an array');
        }

        // Check speaker structure
        if (data.speakers) {
            data.speakers.forEach((speaker, index) => {
                const requiredFields = ['id', 'name'];
                const optionalFields = ['email', 'organization', 'jobTitle', 'phone', 'topic', 'status', 'rotarian', 'links', 'notes', 'dateContacted', 'scheduledDate'];

                requiredFields.forEach(field => {
                    if (!(field in speaker)) {
                        errors.push(`Speaker ${index}: missing required field '${field}'`);
                    }
                });

                // Check for unexpected fields
                Object.keys(speaker).forEach(field => {
                    if (!requiredFields.includes(field) && !optionalFields.includes(field)) {
                        errors.push(`Speaker ${index}: unexpected field '${field}'`);
                    }
                });
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    async repairDataStructure(data, errors) {
        console.log('Attempting to repair data structure...');

        const speakers = data.speakers || [];
        let repaired = false;

        // Fix missing IDs
        let maxId = Math.max(...speakers.filter(s => typeof s.id === 'number').map(s => s.id), 0);
        speakers.forEach(speaker => {
            if (!speaker.id) {
                speaker.id = ++maxId;
                repaired = true;
            }
        });

        // Fix missing names
        speakers.forEach((speaker, index) => {
            if (!speaker.name) {
                speaker.name = `Speaker ${speaker.id || index + 1}`;
                repaired = true;
            }
        });

        // Remove duplicate IDs
        const seenIds = new Set();
        const uniqueSpeakers = speakers.filter(speaker => {
            if (seenIds.has(speaker.id)) {
                speaker.id = ++maxId;
                repaired = true;
            }
            seenIds.add(speaker.id);
            return true;
        });

        if (repaired) {
            // Save repaired data
            localStorage.setItem('rotarySpeakers', JSON.stringify(uniqueSpeakers));
            localStorage.setItem('rotarySpeakersLastModified', new Date().toISOString());

            // Create repair backup
            await this.createFullBackup();

            console.log('Data structure repaired');
        }
    }

    async checkSyncConsistency() {
        try {
            const localData = this.gatherBackupData();
            const remoteData = await this.syncEngine.getRemoteData();

            const localChecksum = this.calculateChecksum(localData);
            const remoteChecksum = this.calculateChecksum(remoteData);

            if (localChecksum !== remoteChecksum) {
                console.warn('Sync inconsistency detected - checksums differ');
                // Trigger a sync to resolve
                setTimeout(() => this.syncEngine.syncNow(), 1000);
            }

        } catch (error) {
            console.warn('Could not check sync consistency:', error);
        }
    }

    handleDataCorruption(corruption) {
        // Create emergency backup before attempting repairs
        this.createFullBackup();

        // Attempt to restore from recent backup
        const recentBackup = this.getRecentGoodBackup();
        if (recentBackup) {
            this.offerDataRestore(recentBackup);
        }
    }

    getRecentGoodBackup() {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');

        // Find the most recent backup that's not corrupted
        for (const backup of index) {
            try {
                const backupData = JSON.parse(localStorage.getItem(`rotaryBackup_${backup.id}`));
                const corruption = this.detectDataCorruption(backupData.data);

                if (corruption.length === 0) {
                    return backupData;
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    offerDataRestore(backup) {
        const message = `Data corruption detected. Would you like to restore from backup?\n\nBackup from: ${new Date(backup.timestamp).toLocaleString()}\nSpeakers: ${backup.data.speakers?.length || 0}`;

        if (confirm(message)) {
            this.restoreFromBackup(backup);
        }
    }

    // Restore operations
    restoreFromBackup(backup) {
        try {
            const data = backup.data;

            // Restore main data
            localStorage.setItem('rotarySpeakers', JSON.stringify(data.speakers || []));
            localStorage.setItem('rotarySpeakersLastModified', data.lastModified || new Date().toISOString());
            localStorage.setItem('rotarySpeakersVersion', data.version || '1');

            // Reload the application
            if (window.loadData && typeof window.loadData === 'function') {
                window.loadData();
            }
            if (window.renderView && typeof window.renderView === 'function') {
                window.renderView();
            }

            alert('Data restored successfully from backup');
            console.log('Data restored from backup:', backup.id);

        } catch (error) {
            console.error('Failed to restore from backup:', error);
            alert('Failed to restore from backup: ' + error.message);
        }
    }

    // Emergency backup operations
    createEmergencyBackup() {
        const emergencyData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            localStorage: { ...localStorage },
            speakers: JSON.parse(localStorage.getItem('rotarySpeakers') || '[]')
        };

        // Download as file
        const blob = new Blob([JSON.stringify(emergencyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return emergencyData;
    }

    // Public API
    getBackupStatus() {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');
        return {
            totalBackups: index.length,
            lastBackup: this.getLastBackupTime(),
            oldestBackup: index.length > 0 ? index[index.length - 1].timestamp : null,
            diskUsage: this.calculateBackupDiskUsage()
        };
    }

    calculateBackupDiskUsage() {
        const index = JSON.parse(localStorage.getItem('rotaryBackupIndex') || '[]');
        let totalSize = 0;

        index.forEach(backup => {
            const data = localStorage.getItem(`rotaryBackup_${backup.id}`);
            if (data) {
                totalSize += data.length;
            }
        });

        return totalSize;
    }

    notifyBackupError(error) {
        console.error('Backup system error:', error);
        // Could integrate with notification system here
    }

    // Cleanup
    destroy() {
        this.stopBackupSchedule();
    }
}

// Global backup system instance
window.BackupSystem = BackupSystem;