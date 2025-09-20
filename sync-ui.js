// Sync UI Components
// Handles user interface for GitHub sync functionality

class SyncUI {
    constructor(syncEngine, config) {
        this.syncEngine = syncEngine;
        this.config = config;
        this.setupModalOpen = false;

        this.init();
    }

    init() {
        this.createSyncStatusIndicator();
        this.createSetupModal();
        this.setupEventListeners();

        // Check if setup is needed
        if (!this.config.isConfigured()) {
            this.showSetupModal();
        }
    }

    createSyncStatusIndicator() {
        // Add sync status to header
        const header = document.querySelector('header .flex.items-center.justify-between');
        if (!header) return;

        const statusContainer = document.createElement('div');
        statusContainer.id = 'syncStatusContainer';
        statusContainer.className = 'flex items-center space-x-3';
        statusContainer.innerHTML = `
            <div id="syncStatus" class="flex items-center space-x-2">
                <div id="syncIcon" class="w-5 h-5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </div>
                <span id="syncStatusText" class="text-sm text-gray-600">Not configured</span>
            </div>
            <div class="flex items-center space-x-2">
                <button id="syncSetupBtn" class="text-sm text-gray-500 hover:text-rotary-azure transition">Setup Sync</button>
                <button id="manualSyncBtn" class="text-sm text-gray-500 hover:text-rotary-azure transition" style="display: none;">Sync Now</button>
            </div>
        `;

        // Insert before the existing buttons
        const existingButtons = header.children[1];
        header.insertBefore(statusContainer, existingButtons);
    }

    createSetupModal() {
        const modalHTML = `
            <div id="syncSetupModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
                    <div class="p-6 border-b">
                        <h3 class="text-lg font-semibold uppercase tracking-wide">SETUP GITHUB SYNC</h3>
                        <p class="text-sm text-gray-600 mt-1">Configure automatic data synchronization</p>
                    </div>

                    <div class="p-6 overflow-y-auto flex-1">
                        <div id="setupSteps" class="space-y-6">
                            <!-- Step 1: Token -->
                            <div id="step1" class="setup-step">
                                <h4 class="font-medium text-gray-900 mb-2">Step 1: GitHub Personal Access Token</h4>
                                <p class="text-sm text-gray-600 mb-3">
                                    Create a GitHub Personal Access Token with 'gist' permissions:
                                    <a href="https://github.com/settings/tokens/new?description=Rotary%20Speakers%20Sync&scopes=gist"
                                       target="_blank" class="text-rotary-azure hover:underline">
                                        Create Token
                                    </a>
                                </p>
                                <input type="password" id="githubToken"
                                       placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                       class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rotary-azure">
                                <div id="tokenValidation" class="mt-2 text-sm hidden"></div>
                            </div>

                            <!-- Step 2: Data Source -->
                            <div id="step2" class="setup-step hidden">
                                <h4 class="font-medium text-gray-900 mb-2">Step 2: Data Source</h4>
                                <p class="text-sm text-gray-600 mb-3">Choose how to initialize your sync data:</p>
                                <div class="space-y-3">
                                    <label class="flex items-center space-x-3">
                                        <input type="radio" name="dataSource" value="local" checked class="text-rotary-azure">
                                        <span class="text-sm">Use current local data (${this.getLocalSpeakerCount()} speakers)</span>
                                    </label>
                                    <label class="flex items-center space-x-3">
                                        <input type="radio" name="dataSource" value="empty" class="text-rotary-azure">
                                        <span class="text-sm">Start with empty database</span>
                                    </label>
                                    <label class="flex items-center space-x-3">
                                        <input type="radio" name="dataSource" value="import" class="text-rotary-azure">
                                        <span class="text-sm">Import from CSV file</span>
                                    </label>
                                </div>
                                <input type="file" id="importCsvFile" accept=".csv" class="hidden">
                            </div>

                            <!-- Step 3: Confirmation -->
                            <div id="step3" class="setup-step hidden">
                                <h4 class="font-medium text-gray-900 mb-2">Step 3: Confirmation</h4>
                                <div id="setupSummary" class="bg-gray-50 p-3 rounded text-sm space-y-1">
                                    <!-- Summary will be populated -->
                                </div>
                            </div>
                        </div>

                        <div id="setupProgress" class="hidden">
                            <div class="flex items-center space-x-3">
                                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-rotary-azure"></div>
                                <span class="text-sm text-gray-600">Setting up sync...</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 border-t flex justify-between">
                        <button id="setupSkip" class="px-4 py-2 text-gray-500 hover:text-gray-700 transition">
                            Skip for now
                        </button>
                        <div class="space-x-3">
                            <button id="setupBack" class="px-4 py-2 border rounded-lg hover:bg-gray-50 transition hidden">
                                Back
                            </button>
                            <button id="setupNext" class="px-4 py-2 bg-rotary-azure text-white rounded-lg hover:bg-blue-700 transition">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        // Sync engine events
        this.syncEngine.on('syncStarted', () => this.updateSyncStatus('syncing', 'Syncing...'));
        this.syncEngine.on('syncCompleted', (data) => {
            if (data.conflicts > 0) {
                this.updateSyncStatus('warning', `Synced with ${data.conflicts} conflicts`);
            } else {
                this.updateSyncStatus('success', 'Synced');
                setTimeout(() => this.updateSyncStatus('idle', 'Up to date'), 3000);
            }
        });
        this.syncEngine.on('syncFailed', () => this.updateSyncStatus('error', 'Sync failed'));
        this.syncEngine.on('connectionChanged', (data) => {
            if (!data.online) {
                this.updateSyncStatus('offline', 'Offline');
            }
        });

        // UI event listeners
        document.addEventListener('click', (e) => {
            if (e.target.id === 'syncSetupBtn') {
                this.showSetupModal();
            } else if (e.target.id === 'manualSyncBtn') {
                this.syncEngine.syncNow();
            } else if (e.target.id === 'setupSkip') {
                this.hideSetupModal();
            } else if (e.target.id === 'setupNext') {
                this.handleSetupNext();
            } else if (e.target.id === 'setupBack') {
                this.handleSetupBack();
            } else if (e.target.id === 'syncSetupModal') {
                // Close on backdrop click
                this.hideSetupModal();
            }
        });

        // Token validation
        document.addEventListener('input', (e) => {
            if (e.target.id === 'githubToken') {
                this.validateToken(e.target.value);
            }
        });

        // Data source change
        document.addEventListener('change', (e) => {
            if (e.target.name === 'dataSource' && e.target.value === 'import') {
                document.getElementById('importCsvFile').click();
            }
        });
    }

    getLocalSpeakerCount() {
        const speakers = JSON.parse(localStorage.getItem('rotarySpeakers') || '[]');
        return speakers.length;
    }

    updateSyncStatus(status, text) {
        const icon = document.getElementById('syncIcon');
        const statusText = document.getElementById('syncStatusText');
        const setupBtn = document.getElementById('syncSetupBtn');
        const syncBtn = document.getElementById('manualSyncBtn');

        if (!icon || !statusText) return;

        // Update icon
        let iconHTML = '';
        let iconClass = 'w-5 h-5';

        switch (status) {
            case 'syncing':
                iconClass += ' text-rotary-azure animate-spin';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>`;
                break;
            case 'success':
                iconClass += ' text-green-500';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>`;
                break;
            case 'error':
                iconClass += ' text-red-500';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`;
                break;
            case 'warning':
                iconClass += ' text-yellow-500';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z"></path>`;
                break;
            case 'offline':
                iconClass += ' text-gray-400';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
                break;
            default: // idle
                iconClass += ' text-gray-400';
                iconHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>`;
        }

        icon.className = iconClass;
        icon.innerHTML = `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconHTML}</svg>`;
        statusText.textContent = text;

        // Update button visibility
        if (this.config.isConfigured()) {
            setupBtn.style.display = 'none';
            syncBtn.style.display = 'block';
        } else {
            setupBtn.style.display = 'block';
            syncBtn.style.display = 'none';
        }
    }

    showSetupModal() {
        document.getElementById('syncSetupModal').classList.remove('hidden');
        this.setupModalOpen = true;
        this.setupStep = 1;
        this.updateSetupStep();
    }

    hideSetupModal() {
        document.getElementById('syncSetupModal').classList.add('hidden');
        this.setupModalOpen = false;
    }

    updateSetupStep() {
        // Hide all steps
        document.querySelectorAll('.setup-step').forEach(step => step.classList.add('hidden'));

        // Show current step
        document.getElementById(`step${this.setupStep}`).classList.remove('hidden');

        // Update buttons
        const backBtn = document.getElementById('setupBack');
        const nextBtn = document.getElementById('setupNext');

        backBtn.style.display = this.setupStep > 1 ? 'block' : 'none';

        if (this.setupStep === 3) {
            nextBtn.textContent = 'Complete Setup';
        } else {
            nextBtn.textContent = 'Next';
        }
    }

    async handleSetupNext() {
        if (this.setupStep === 1) {
            const token = document.getElementById('githubToken').value;
            if (!await this.validateToken(token)) {
                return;
            }
            this.setupStep = 2;
        } else if (this.setupStep === 2) {
            this.updateSetupSummary();
            this.setupStep = 3;
        } else if (this.setupStep === 3) {
            await this.completeSetup();
            return;
        }

        this.updateSetupStep();
    }

    handleSetupBack() {
        this.setupStep = Math.max(1, this.setupStep - 1);
        this.updateSetupStep();
    }

    async validateToken(token) {
        if (!token || token.length < 10) {
            this.showTokenValidation('Please enter a valid GitHub token', 'error');
            return false;
        }

        try {
            const valid = await this.config.validateGitHubToken(token);
            if (valid) {
                this.showTokenValidation('Token is valid ✓', 'success');
                return true;
            } else {
                this.showTokenValidation('Invalid token or insufficient permissions', 'error');
                return false;
            }
        } catch (error) {
            this.showTokenValidation('Unable to validate token', 'error');
            return false;
        }
    }

    showTokenValidation(message, type) {
        const validation = document.getElementById('tokenValidation');
        validation.textContent = message;
        validation.className = `mt-2 text-sm ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        validation.classList.remove('hidden');
    }

    updateSetupSummary() {
        const token = document.getElementById('githubToken').value;
        const dataSource = document.querySelector('input[name="dataSource"]:checked').value;

        let sourceText = '';
        switch (dataSource) {
            case 'local':
                sourceText = `Use existing local data (${this.getLocalSpeakerCount()} speakers)`;
                break;
            case 'empty':
                sourceText = 'Start with empty database';
                break;
            case 'import':
                sourceText = 'Import from CSV file';
                break;
        }

        document.getElementById('setupSummary').innerHTML = `
            <div><strong>Token:</strong> ${token.substring(0, 8)}...</div>
            <div><strong>Data Source:</strong> ${sourceText}</div>
            <div><strong>Auto-sync:</strong> Every 30 seconds</div>
        `;
    }

    async completeSetup() {
        const progressDiv = document.getElementById('setupProgress');
        const stepsDiv = document.getElementById('setupSteps');

        progressDiv.classList.remove('hidden');
        stepsDiv.classList.add('hidden');

        try {
            const token = document.getElementById('githubToken').value;
            const dataSource = document.querySelector('input[name="dataSource"]:checked').value;

            let initialData = [];
            if (dataSource === 'local') {
                initialData = JSON.parse(localStorage.getItem('rotarySpeakers') || '[]');
            }

            // Create GitHub Gist
            const gistId = await this.config.createDataGist(token, initialData);

            // Update configuration
            this.config.updateConfig({
                token: token,
                gistId: gistId
            });

            // Start sync engine
            this.syncEngine.startAutoSync();

            // Update UI
            this.updateSyncStatus('success', 'Sync configured');
            this.hideSetupModal();

        } catch (error) {
            console.error('Setup failed:', error);
            alert('Setup failed: ' + error.message);

            // Reset UI
            progressDiv.classList.add('hidden');
            stepsDiv.classList.remove('hidden');
        }
    }
}

// Global sync UI instance
window.SyncUI = SyncUI;