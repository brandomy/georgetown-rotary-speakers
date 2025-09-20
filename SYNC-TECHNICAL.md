# GitHub Sync System - Technical Documentation

This document provides technical details about the GitHub-based data persistence system for the Georgetown Rotary Speakers application.

## 🏗️ Architecture Overview

The sync system consists of four main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │◄──►│   Sync Engine   │◄──►│     GitHub      │
│     (UI)        │    │                 │    │     (Gist)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  localStorage   │    │ Backup System   │
│   (Local Cache) │    │   (Integrity)   │
└─────────────────┘    └─────────────────┘
```

### Components

1. **GitHubSyncConfig** (`sync-config.js`) - Configuration management
2. **GitHubSyncEngine** (`sync-engine.js`) - Core synchronization logic
3. **BackupSystem** (`backup-system.js`) - Data integrity and backups
4. **SyncUI** (`sync-ui.js`) - User interface components

## 📁 File Structure

```
georgetown-rotary-speakers/
├── sync-config.js      # Configuration management
├── sync-engine.js      # Core sync engine
├── backup-system.js    # Backup and integrity system
├── sync-ui.js          # User interface components
├── script.js           # Main application (modified)
├── index.html          # Main HTML (modified)
├── SYNC-SETUP.md       # User setup guide
└── SYNC-TECHNICAL.md   # This file
```

## 🔧 Component Details

### GitHubSyncConfig

**Purpose**: Manages configuration settings and GitHub API interactions.

**Key Methods**:
- `loadConfig()` - Loads configuration from localStorage
- `saveConfig()` - Persists configuration to localStorage
- `validateGitHubToken(token)` - Validates GitHub personal access token
- `createDataGist(token, data)` - Creates initial GitHub Gist

**Configuration Structure**:
```javascript
{
    owner: '',                    // GitHub username (auto-detected)
    repo: '',                     // Repository name (optional)
    token: '',                    // GitHub personal access token
    gistId: '',                   // GitHub Gist ID for data storage
    dataFileName: 'rotary-speakers-data.json',
    autoSyncInterval: 30000,      // 30 seconds
    retryAttempts: 3,
    retryDelay: 2000,             // 2 seconds
    conflictResolutionStrategy: 'merge'
}
```

### GitHubSyncEngine

**Purpose**: Handles bidirectional synchronization with intelligent conflict resolution.

**Key Features**:
- **Automatic Sync**: Configurable interval-based synchronization
- **Change Detection**: Only syncs when data actually changes
- **Conflict Resolution**: Intelligent merging strategies
- **Offline Support**: Queues changes when offline
- **Retry Logic**: Robust error handling with exponential backoff

**Core Methods**:
```javascript
sync()                    // Main synchronization method
getLocalData()           // Retrieves local data structure
getRemoteData()          // Fetches data from GitHub Gist
performSync(local, remote) // Executes sync with conflict resolution
mergeData(local, remote) // Merges conflicting data
pushToRemote(data)       // Uploads data to GitHub
saveLocalData(data)      // Updates local storage
```

**Event System**:
```javascript
syncEngine.on('syncStarted', callback)
syncEngine.on('syncCompleted', callback)
syncEngine.on('syncFailed', callback)
syncEngine.on('conflictsDetected', callback)
syncEngine.on('connectionChanged', callback)
```

### BackupSystem

**Purpose**: Provides data integrity checks, automatic backups, and recovery options.

**Features**:
- **Automatic Backups**: Full backups every 24 hours
- **Incremental Backups**: On data changes
- **Data Integrity**: Corruption detection and repair
- **Version Management**: 30-day retention policy
- **Emergency Recovery**: Manual backup creation

**Backup Structure**:
```javascript
{
    id: 'backup_1234567890',
    type: 'full' | 'incremental',
    timestamp: '2024-01-01T12:00:00.000Z',
    version: 1,
    checksum: 'abcd1234',
    data: { /* speaker data */ },
    metadata: { /* environment info */ }
}
```

### SyncUI

**Purpose**: Provides user interface for sync status, setup wizard, and controls.

**Components**:
- **Status Indicator**: Real-time sync status in header
- **Setup Wizard**: Multi-step configuration process
- **Progress Indicators**: Visual feedback for operations
- **Error Handling**: User-friendly error messages

## 🔄 Data Flow

### Synchronization Process

1. **Change Detection**:
   ```javascript
   saveData() → triggerDataChange() → queueChange() → sync()
   ```

2. **Sync Execution**:
   ```javascript
   sync() → getLocalData() + getRemoteData() → performSync()
   ```

3. **Conflict Resolution**:
   ```javascript
   performSync() → mergeData() → resolveConflict() → saveLocalData()
   ```

### Data Structure

**Local Storage Keys**:
- `rotarySpeakers` - Array of speaker objects
- `rotarySpeakersLastModified` - ISO timestamp
- `rotarySpeakersVersion` - Integer version number
- `rotarySpeakersConfig` - Sync configuration
- `rotaryBackupIndex` - Backup metadata array
- `rotaryBackup_{id}` - Individual backup data

**Gist Structure**:
```json
{
    "version": 1,
    "lastModified": "2024-01-01T12:00:00.000Z",
    "speakers": [...],
    "metadata": {
        "created": "2024-01-01T10:00:00.000Z",
        "source": "Georgetown Rotary Speakers App"
    }
}
```

## 🤝 Conflict Resolution

### Resolution Strategies

1. **Merge** (default):
   - Combines changes from both sources
   - Prefers non-empty values
   - Merges arrays by removing duplicates
   - Maintains data completeness

2. **Local Priority**:
   - Always prefers local changes
   - Overwrites remote data
   - Used for forced local-first scenarios

3. **Remote Priority**:
   - Always prefers remote changes
   - Overwrites local data
   - Used for forced remote-first scenarios

### Conflict Detection

**Field-Level Comparison**:
```javascript
detectConflict(localSpeaker, remoteSpeaker) {
    const differences = [];
    // Compare each field
    for (field of allFields) {
        if (JSON.stringify(local[field]) !== JSON.stringify(remote[field])) {
            differences.push({ field, local: local[field], remote: remote[field] });
        }
    }
    return differences.length > 0 ? { speakerId, differences } : null;
}
```

## 🔐 Security Implementation

### Token Management

**Storage**: GitHub tokens are stored in localStorage with the configuration. While not encrypted in transit, they're protected by:
- HTTPS-only transmission
- localStorage browser security
- Private gist creation (not public)

**Permissions**: Requires only `gist` scope for minimal access.

### Data Privacy

- **Private Gists**: All data stored in private GitHub gists
- **No Third-Party Servers**: Direct browser-to-GitHub communication
- **HTTPS Encryption**: All API calls use HTTPS
- **Local Control**: Users maintain full control of their GitHub tokens

## 🧪 Testing & Validation

### Test Scenarios

1. **Basic Sync Test**:
   ```javascript
   // Add speaker → wait → verify remote → verify other device
   ```

2. **Conflict Resolution Test**:
   ```javascript
   // Edit same speaker on two devices → sync → verify merge
   ```

3. **Offline/Online Test**:
   ```javascript
   // Offline changes → online → verify sync
   ```

4. **Data Integrity Test**:
   ```javascript
   // Corrupt data → verify detection → verify repair
   ```

### Debugging

**Console Logging**:
```javascript
// Enable detailed logging
localStorage.setItem('debugSync', 'true');
```

**Manual Sync Trigger**:
```javascript
// Force immediate sync
window.syncEngine.syncNow();
```

**Backup Creation**:
```javascript
// Create emergency backup
window.createEmergencyBackup();
```

## ⚡ Performance Considerations

### Optimization Strategies

1. **Change Detection**: Only syncs when data actually changes
2. **Incremental Updates**: Tracks and syncs only modified data
3. **Throttling**: Prevents excessive API calls
4. **Caching**: Uses localStorage for offline access
5. **Compression**: JSON stringification with minimal whitespace

### Rate Limiting

GitHub API limits:
- **Authenticated**: 5,000 requests per hour
- **Gist Operations**: Generally not rate-limited for normal usage
- **Retry Logic**: Exponential backoff prevents spam

### Storage Efficiency

**Local Storage**:
- Speakers data: ~1KB per 10 speakers
- Backups: ~5MB total for 30 days
- Configuration: <1KB

**GitHub Storage**:
- Gist size limit: 100MB (far exceeds needs)
- Version history: Unlimited (GitHub managed)

## 🚨 Error Handling

### Error Types and Responses

1. **Network Errors**:
   ```javascript
   // Retry with exponential backoff
   // Queue changes for later sync
   // Show offline status
   ```

2. **Authentication Errors**:
   ```javascript
   // Show token validation error
   // Prompt for new token
   // Maintain local functionality
   ```

3. **Data Corruption**:
   ```javascript
   // Detect corruption
   // Offer backup restoration
   // Create emergency backup
   ```

4. **Sync Conflicts**:
   ```javascript
   // Apply resolution strategy
   // Notify user if manual resolution needed
   // Log conflict details
   ```

### Recovery Procedures

**Automatic Recovery**:
- Retry failed operations
- Restore from recent backups
- Repair data structure issues

**Manual Recovery**:
- Emergency backup download
- Configuration reset
- Token regeneration

## 🔧 Configuration Options

### Advanced Settings

**Developer Customization**:
```javascript
// Modify sync-config.js
const customConfig = {
    autoSyncInterval: 60000,     // 1 minute instead of 30 seconds
    retryAttempts: 5,            // More retry attempts
    conflictResolutionStrategy: 'local', // Always prefer local
    maxBackups: 50               // Keep more backups
};
syncConfig.updateConfig(customConfig);
```

**Runtime Configuration**:
```javascript
// Change settings during runtime
syncEngine.config.updateConfig({
    autoSyncInterval: 120000  // 2 minutes
});
syncEngine.startAutoSync(); // Restart with new interval
```

## 🔄 API Integration

### GitHub Gist API Usage

**Create Gist**:
```http
POST https://api.github.com/gists
Authorization: token ghp_...
Content-Type: application/json

{
    "description": "Georgetown Rotary Speakers Database",
    "public": false,
    "files": {
        "rotary-speakers-data.json": {
            "content": "{ ... }"
        }
    }
}
```

**Update Gist**:
```http
PATCH https://api.github.com/gists/{gist_id}
Authorization: token ghp_...
Content-Type: application/json

{
    "files": {
        "rotary-speakers-data.json": {
            "content": "{ ... }"
        }
    }
}
```

**Fetch Gist**:
```http
GET https://api.github.com/gists/{gist_id}
Authorization: token ghp_...
```

## 📊 Monitoring & Analytics

### Sync Metrics

**Available Data**:
- Sync frequency and success rate
- Conflict resolution statistics
- Backup creation and restoration
- Error types and frequencies
- Network connectivity patterns

**Access Methods**:
```javascript
// Get sync status
const status = syncEngine.getStatus();

// Get backup information
const backupInfo = backupSystem.getBackupStatus();

// Monitor events
syncEngine.on('syncCompleted', (data) => {
    console.log('Sync completed:', data);
});
```

## 🚀 Future Enhancements

### Potential Improvements

1. **Real-time Sync**: WebSocket-based instant synchronization
2. **Multi-User**: Collaborative editing with operational transforms
3. **Encryption**: Client-side encryption before GitHub storage
4. **Compression**: Data compression for large datasets
5. **Sync Analytics**: Detailed usage and performance metrics

### Extensibility

The system is designed for easy extension:

```javascript
// Add custom sync handlers
syncEngine.on('customEvent', customHandler);

// Extend backup strategies
backupSystem.addBackupStrategy('custom', customStrategy);

// Add new conflict resolution methods
syncEngine.addResolutionStrategy('custom', customResolver);
```

## 📝 Development Guidelines

### Code Standards

- **ES6+ Features**: Use modern JavaScript
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Detailed console logging for debugging
- **Documentation**: JSDoc comments for all methods
- **Testing**: Include test scenarios for new features

### Contribution Guidelines

1. **Test Changes**: Verify sync functionality
2. **Document Updates**: Update relevant documentation
3. **Backward Compatibility**: Maintain existing API
4. **Security Review**: Consider security implications
5. **Performance Impact**: Assess performance changes

---

This technical documentation provides the foundation for understanding, maintaining, and extending the GitHub sync system. For user-facing instructions, refer to `SYNC-SETUP.md`.