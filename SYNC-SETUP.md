# GitHub Sync Setup Guide

This guide will help you set up automatic data synchronization between your local Georgetown Rotary Speakers app and GitHub, ensuring your speaker data is always backed up and synchronized across devices.

## 🚀 Quick Start

1. **Open the app** - Visit your Georgetown Rotary Speakers application
2. **Click "Setup Sync"** in the header when prompted
3. **Follow the setup wizard** - It will guide you through the process
4. **Done!** Your data will now sync automatically

## 📋 Prerequisites

- A GitHub account (free or paid)
- Internet connection for initial setup
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🔧 Detailed Setup Instructions

### Step 1: Create a GitHub Personal Access Token

1. **Go to GitHub Token Settings**
   - Visit: https://github.com/settings/tokens/new
   - Or navigate manually: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Configure the Token**
   - **Note**: `Georgetown Rotary Speakers Sync`
   - **Expiration**: Choose "No expiration" for convenience, or set a long period
   - **Scopes**: Check only `gist` (this allows creating and managing gists)

3. **Generate and Copy Token**
   - Click "Generate token"
   - **IMPORTANT**: Copy the token immediately - you won't see it again!
   - The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Run the Setup Wizard

1. **Open the App**
   - Navigate to your Georgetown Rotary Speakers application
   - If sync isn't configured, you'll see a "Setup Sync" button in the header

2. **Enter Your Token**
   - Paste your GitHub token in the first step
   - The app will validate it automatically
   - You'll see a green checkmark when valid

3. **Choose Data Source**
   - **Use current local data**: Keeps your existing speakers (recommended if you have data)
   - **Start with empty database**: Starts fresh
   - **Import from CSV**: Upload a CSV file to initialize

4. **Complete Setup**
   - Review your settings
   - Click "Complete Setup"
   - The app will create a private GitHub Gist to store your data

### Step 3: Verification

After setup, you should see:
- ✅ Sync status indicator in the header
- 🔄 "Synced" or "Up to date" status
- 🔧 A "Sync Now" button (replaces "Setup Sync")

## 🔒 Security & Privacy

### What Gets Stored Where

**GitHub Gist (Private)**:
- Speaker data (names, organizations, contact info, etc.)
- Sync metadata (timestamps, versions)
- Automatic backups

**Your Browser (localStorage)**:
- Local copy of speaker data (for offline use)
- Sync configuration (token is encrypted)
- Recent backups for emergency recovery

### Security Measures

- ✅ **Private Gists**: Your data is stored in private GitHub gists (not public)
- ✅ **Encrypted Token Storage**: Your GitHub token is securely stored
- ✅ **HTTPS Only**: All data transmission uses HTTPS encryption
- ✅ **No Server Storage**: No third-party servers store your data
- ✅ **Version History**: GitHub keeps version history of your data

## 📱 Multi-Device Usage

Once set up, the sync system works across:

- **Localhost development** (`http://localhost:8000`)
- **File-based local usage** (`file://` URLs)
- **GitHub Pages deployment** (your live site)
- **Different browsers** on the same device
- **Different devices** (laptop, desktop, tablet)

### How It Works

1. **Automatic Sync**: Every 30 seconds when online
2. **Smart Conflict Resolution**: Merges changes intelligently
3. **Offline Support**: Works offline, syncs when reconnected
4. **Change Detection**: Only syncs when data actually changes

## 🔄 Sync Process Details

### When Sync Happens

- **Automatically**: Every 30 seconds (configurable)
- **On Data Change**: Immediately when you add/edit speakers
- **Manual Trigger**: Click "Sync Now" button
- **Page Load**: When you open the app
- **Network Reconnection**: When coming back online

### Conflict Resolution

The system uses intelligent conflict resolution:

1. **No Conflict**: If only one device has changes, they're applied
2. **Merge Strategy**: Combines changes from both sources when possible
3. **Field-Level Merging**: Prefers non-empty values over empty ones
4. **User Notification**: Alerts you if manual resolution is needed

### Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| 🔄 | Syncing | Currently synchronizing data |
| ✅ | Synced | Successfully synchronized |
| ⚠️ | Conflicts | Sync completed with conflicts |
| ❌ | Failed | Sync failed (will retry) |
| 📡 | Offline | No internet connection |
| ⭕ | Not configured | Sync not set up yet |

## 🛡️ Backup System

### Automatic Backups

- **Daily Full Backups**: Complete data backup every 24 hours
- **Incremental Backups**: On every significant change
- **30-Day Retention**: Keeps 30 days of backup history
- **Data Integrity Checks**: Validates data consistency

### Emergency Recovery

If something goes wrong:

1. **Automatic Recovery**: System detects corruption and offers to restore
2. **Manual Backup**: Click the emergency backup button (if available)
3. **Version History**: Access previous versions via GitHub Gist history
4. **CSV Export**: Always available as a fallback

## ⚙️ Configuration Options

### Sync Settings

These can be modified in `sync-config.js`:

```javascript
// Sync frequency (milliseconds)
autoSyncInterval: 30000, // 30 seconds

// Retry settings
retryAttempts: 3,
retryDelay: 2000, // 2 seconds

// Conflict resolution strategy
conflictResolutionStrategy: 'merge' // 'merge', 'local', 'remote'
```

### Advanced Configuration

For developers who want to customize the sync behavior:

- **Sync Frequency**: How often to check for changes
- **Retry Logic**: How many times to retry failed syncs
- **Conflict Strategy**: How to handle data conflicts
- **Backup Frequency**: How often to create backups

## 🧪 Testing Your Setup

### Verification Steps

1. **Add a Test Speaker**
   - Add a speaker with name "Test Sync"
   - Wait 30 seconds or click "Sync Now"
   - Check that status shows "Synced"

2. **Multi-Device Test**
   - Open the app on another device/browser
   - Enter the same GitHub token when prompted
   - Verify the test speaker appears

3. **Offline Test**
   - Disconnect from internet
   - Add another speaker
   - Status should show "Offline"
   - Reconnect - changes should sync automatically

4. **Conflict Test**
   - Edit the same speaker on two devices simultaneously
   - Both devices should handle the conflict gracefully

## 🚨 Troubleshooting

### Common Issues

**"Token validation failed"**
- Check that your token has `gist` permissions
- Ensure the token isn't expired
- Try generating a new token

**"Sync failed" repeatedly**
- Check your internet connection
- Verify your GitHub token is still valid
- Try the "Sync Now" button manually

**"Data corruption detected"**
- The system will offer to restore from backup
- Accept the restoration to fix the issue
- Contact support if problems persist

**"No sync status visible"**
- Ensure all sync JavaScript files are loaded
- Check browser console for errors
- Refresh the page and try again

### Getting Help

If you encounter issues:

1. **Check Browser Console**: Look for error messages (F12 → Console)
2. **Try Refresh**: Sometimes a page refresh resolves temporary issues
3. **Emergency Backup**: Use the emergency backup feature before troubleshooting
4. **Reset Setup**: Clear localStorage and run setup again if needed

### Reset Instructions

To completely reset the sync system:

1. Go to browser settings → Clear browsing data
2. Or manually: localStorage.clear() in console
3. Refresh the page
4. Run setup wizard again

## 📊 Monitoring & Maintenance

### Sync Health

The system provides several ways to monitor sync health:

- **Status Indicator**: Real-time sync status in header
- **Console Logs**: Detailed logging for developers
- **Backup Reports**: Summary of backup operations
- **Data Integrity**: Automatic validation and reporting

### Best Practices

1. **Regular Monitoring**: Check sync status occasionally
2. **Token Renewal**: Update GitHub token before expiration
3. **Backup Verification**: Occasionally verify backups are working
4. **Multi-Device Testing**: Test sync across devices periodically

## 🎯 Benefits Summary

✅ **Never Lose Data**: Automatic backups and sync
✅ **Work Anywhere**: Access from any device
✅ **Offline Capable**: Works without internet, syncs when reconnected
✅ **Conflict Resolution**: Intelligent merging of changes
✅ **Version History**: Complete change history via GitHub
✅ **Zero Maintenance**: Set up once, works automatically
✅ **Secure**: Private, encrypted, HTTPS-only
✅ **Fast**: Lightweight, efficient synchronization

Your Georgetown Rotary Speakers data is now bulletproof! 🛡️