// Rotary Speakers - Main JavaScript

// Data Management
let speakers = [];
let currentView = 'kanban';
let nextId = 1;
let draggedElement = null;
let currentEditingCell = null;

// Sync System
let syncConfig = null;
let syncEngine = null;
let backupSystem = null;
let syncUI = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    renderView();
});

// Initialize sync system
function initializeSyncSystem() {
    try {
        // Initialize sync components
        syncConfig = new GitHubSyncConfig();
        syncEngine = new GitHubSyncEngine(syncConfig);
        backupSystem = new BackupSystem(syncConfig, syncEngine);
        syncUI = new SyncUI(syncEngine, syncConfig);

        console.log('Sync system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize sync system:', error);
    }
}

// Make initialization function globally available
window.initializeSyncSystem = initializeSyncSystem;

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('rotarySpeakers');
    if (savedData) {
        speakers = JSON.parse(savedData);
        nextId = Math.max(...speakers.map(s => s.id), 0) + 1;
    }

    // Check for demo mode in URL
    if (window.location.search.includes('demo=true') && speakers.length === 0) {
        loadDemoData();
    }
}

// Load demo data for testing
function loadDemoData() {
    speakers = [
        {
            id: 1,
            name: "Sarah Johnson",
            organization: "Tech Innovations Inc",
            jobTitle: "CEO",
            email: "sarah@techinnovations.com",
            phone: "555-0101",
            topic: "AI in Healthcare",
            status: "Scheduled",
            scheduledDate: "2024-11-15",
            rotarian: false,
            links: ["https://linkedin.com/in/sarahjohnson", "https://techinnovations.com"],
            notes: "Expert in medical AI applications"
        },
        {
            id: 2,
            name: "Michael Chen",
            organization: "Green Energy Solutions",
            jobTitle: "Director",
            email: "mchen@greenenergy.com",
            phone: "555-0102",
            topic: "Sustainable Energy Future",
            status: "Agreed",
            rotarian: true,
            links: ["https://linkedin.com/in/michaelchen"],
            notes: "Rotarian from Austin club"
        },
        {
            id: 3,
            name: "Dr. Emily Parker",
            organization: "Georgetown University",
            jobTitle: "Professor of Economics",
            email: "eparker@georgetown.edu",
            phone: "555-0103",
            topic: "Local Economic Development",
            status: "Approached",
            rotarian: false,
            links: ["https://georgetown.edu/faculty/eparker"],
            notes: "Recommended by John Smith"
        },
        {
            id: 4,
            name: "James Wilson",
            organization: "Community Foundation",
            jobTitle: "Executive Director",
            email: "jwilson@communityfdn.org",
            phone: "555-0104",
            topic: "Philanthropy in Action",
            status: "Ideas",
            rotarian: false,
            links: [],
            notes: "Potential speaker for charity drive event"
        },
        {
            id: 5,
            name: "Lisa Martinez",
            organization: "Austin Medical Center",
            jobTitle: "Chief of Staff",
            email: "lmartinez@austinmed.com",
            phone: "555-0105",
            topic: "Public Health Initiatives",
            status: "Spoken",
            scheduledDate: "2024-09-10",
            rotarian: true,
            links: ["https://austinmed.com/staff/martinez"],
            notes: "Excellent presentation on vaccines"
        }
    ];
    nextId = 6;
    saveData();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('rotarySpeakers', JSON.stringify(speakers));
    localStorage.setItem('rotarySpeakersLastModified', new Date().toISOString());

    // Trigger sync if available
    if (syncEngine) {
        syncEngine.triggerDataChange();
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // View toggle
    document.getElementById('viewToggle').addEventListener('click', toggleView);

    // Modal controls
    document.getElementById('speakerModal').addEventListener('click', (e) => {
        if (e.target.id === 'speakerModal') closeModal();
    });
    document.getElementById('cancelModal').addEventListener('click', closeModal);
    document.getElementById('speakerForm').addEventListener('submit', handleFormSubmit);

    // Initialize first link input listener
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('link-input')) {
            updateAddLinkButton();
        }
    });

    // Add speaker buttons in Kanban view
    document.querySelectorAll('.add-speaker-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.target.closest('.droppable').dataset.status;
            openModal(null, status);
        });
    });

    // Add speaker button in Spreadsheet view
    document.getElementById('addSpeakerSpreadsheet').addEventListener('click', () => {
        openModal();
    });

    // Export/Import
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('importBtn').addEventListener('change', importFromCSV);

    // Spreadsheet controls
    document.getElementById('searchInput').addEventListener('input', filterSpreadsheet);
    document.getElementById('statusFilter').addEventListener('change', filterSpreadsheet);

    // Sort headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => sortSpreadsheet(th.dataset.sort));
    });

    // Drag and drop for Kanban
    initializeDragAndDrop();
}

// View Management
function toggleView() {
    currentView = currentView === 'kanban' ? 'spreadsheet' : 'kanban';
    document.getElementById('kanbanView').classList.toggle('hidden');
    document.getElementById('spreadsheetView').classList.toggle('hidden');
    document.getElementById('viewToggleText').textContent =
        currentView === 'kanban' ? 'Switch to Spreadsheet' : 'Switch to Kanban';
    renderView();
}

function renderView() {
    if (currentView === 'kanban') {
        renderKanban();
    } else {
        renderSpreadsheet();
    }
}

// Kanban View Functions
function renderKanban() {
    const columns = document.querySelectorAll('.droppable');

    columns.forEach(column => {
        const status = column.dataset.status;
        const cards = column.querySelectorAll('.speaker-card');
        cards.forEach(card => card.remove());

        const statusSpeakers = speakers.filter(s => s.status === status);

        // Update count
        const countElement = column.closest('.kanban-column').querySelector('.speaker-count');
        countElement.textContent = `${statusSpeakers.length} speaker${statusSpeakers.length !== 1 ? 's' : ''}`;

        // Add cards
        statusSpeakers.forEach(speaker => {
            const card = createSpeakerCard(speaker);
            column.insertBefore(card, column.querySelector('.add-speaker-btn'));
        });
    });
}

function createSpeakerCard(speaker) {
    const card = document.createElement('div');
    card.className = 'speaker-card new-card';
    card.draggable = true;
    card.dataset.id = speaker.id;

    const statusColors = {
        'Ideas': 'border-purple-300',
        'Approached': 'border-blue-300',
        'Agreed': 'border-green-300',
        'Scheduled': 'border-yellow-300',
        'Spoken': 'border-gray-300',
        'Dropped': 'border-red-300'
    };

    card.classList.add(statusColors[speaker.status] || 'border-gray-300');

    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <h3>${escapeHtml(speaker.name)}</h3>
            <div class="flex space-x-1">
                <button onclick="editSpeaker(${speaker.id})" class="text-gray-400 hover:text-rotary-azure transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button onclick="deleteSpeaker(${speaker.id})" class="text-gray-400 hover:text-red-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="space-y-1">
            ${speaker.organization ? `<p>🏢 ${escapeHtml(speaker.organization)}</p>` : ''}
            ${speaker.jobTitle ? `<p>💼 ${escapeHtml(speaker.jobTitle)}</p>` : ''}
            ${speaker.phone ? `<p>📞 ${escapeHtml(speaker.phone)}</p>` : ''}
            ${speaker.email ? `<p>✉️ ${escapeHtml(speaker.email)}</p>` : ''}
            ${speaker.topic ? `<p>📚 ${escapeHtml(speaker.topic)}</p>` : ''}
            ${speaker.rotarian ? `<p class="text-rotary-azure font-medium">⚙️ Rotarian</p>` : ''}
            ${speaker.links && speaker.links.length > 0 ? speaker.links.map(link =>
                `<p>🔗 <a href="${escapeHtml(link)}" target="_blank" class="hover:underline">${escapeHtml(link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a></p>`
            ).join('') : ''}
            ${speaker.scheduledDate ? `<p>📅 ${formatDate(speaker.scheduledDate)}</p>` : ''}
        </div>
        ${speaker.notes ? `<p class="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">📝 ${escapeHtml(speaker.notes.substring(0, 50))}${speaker.notes.length > 50 ? '...' : ''}</p>` : ''}
    `;

    // Add drag event listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

// Drag and Drop
function initializeDragAndDrop() {
    const droppables = document.querySelectorAll('.droppable');

    droppables.forEach(droppable => {
        droppable.addEventListener('dragover', handleDragOver);
        droppable.addEventListener('drop', handleDrop);
        droppable.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.droppable').forEach(droppable => {
        droppable.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    e.currentTarget.classList.remove('drag-over');

    if (draggedElement && draggedElement !== e.target) {
        const speakerId = parseInt(draggedElement.dataset.id);
        const newStatus = e.currentTarget.dataset.status;

        const speaker = speakers.find(s => s.id === speakerId);
        if (speaker) {
            speaker.status = newStatus;
            saveData();
            renderKanban();
        }
    }

    return false;
}

// Spreadsheet View Functions
function renderSpreadsheet() {
    const tbody = document.getElementById('spreadsheetBody');
    tbody.innerHTML = '';

    const filteredSpeakers = getFilteredSpeakers();

    filteredSpeakers.forEach(speaker => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="name" data-id="${speaker.id}">${escapeHtml(speaker.name)}</td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="email" data-id="${speaker.id}">${escapeHtml(speaker.email || '')}</td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="organization" data-id="${speaker.id}">${escapeHtml(speaker.organization || '')}</td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="jobTitle" data-id="${speaker.id}">${escapeHtml(speaker.jobTitle || '')}</td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="phone" data-id="${speaker.id}">${escapeHtml(speaker.phone || '')}</td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="topic" data-id="${speaker.id}">${escapeHtml(speaker.topic || '')}</td>
            <td class="px-4 py-3">
                <input type="checkbox" class="rotarian-checkbox rounded border-gray-300 text-blue-600" data-id="${speaker.id}" ${speaker.rotarian ? 'checked' : ''}>
            </td>
            <td class="px-4 py-3">
                <select class="status-select px-2 py-1 border rounded" data-id="${speaker.id}">
                    <option value="Ideas" ${speaker.status === 'Ideas' ? 'selected' : ''}>Ideas</option>
                    <option value="Approached" ${speaker.status === 'Approached' ? 'selected' : ''}>Approached</option>
                    <option value="Agreed" ${speaker.status === 'Agreed' ? 'selected' : ''}>Agreed</option>
                    <option value="Scheduled" ${speaker.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="Spoken" ${speaker.status === 'Spoken' ? 'selected' : ''}>Spoken</option>
                    <option value="Dropped" ${speaker.status === 'Dropped' ? 'selected' : ''}>Dropped</option>
                </select>
            </td>
            <td class="px-4 py-3">
                <input type="date" class="date-input px-2 py-1 border rounded" data-field="dateContacted" data-id="${speaker.id}" value="${speaker.dateContacted || ''}">
            </td>
            <td class="px-4 py-3">
                <input type="date" class="date-input px-2 py-1 border rounded" data-field="scheduledDate" data-id="${speaker.id}" value="${speaker.scheduledDate || ''}">
            </td>
            <td class="px-4 py-3 editable-cell" contenteditable="true" data-field="notes" data-id="${speaker.id}">${escapeHtml(speaker.notes || '')}</td>
            <td class="px-4 py-3">
                ${speaker.links && speaker.links.length > 0 ? speaker.links.map(link =>
                    `<a href="${escapeHtml(link)}" target="_blank" class="text-rotary-azure hover:underline block text-sm">🔗 ${escapeHtml(link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`
                ).join('') : '<span class="text-gray-400 text-sm">-</span>'}
            </td>
            <td class="px-4 py-3">
                <div class="flex space-x-2">
                    <button onclick="editSpeaker(${speaker.id})" class="text-blue-600 hover:text-blue-800">Edit</button>
                    <button onclick="deleteSpeaker(${speaker.id})" class="text-red-600 hover:text-red-800">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners for inline editing
    document.querySelectorAll('.editable-cell').forEach(cell => {
        cell.addEventListener('blur', handleCellEdit);
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cell.blur();
            }
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', handleStatusChange);
    });

    document.querySelectorAll('.date-input').forEach(input => {
        input.addEventListener('change', handleDateChange);
    });

    document.querySelectorAll('.rotarian-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleRotarianChange);
    });
}

function handleCellEdit(e) {
    const cell = e.target;
    const speakerId = parseInt(cell.dataset.id);
    const field = cell.dataset.field;
    const value = cell.textContent.trim();

    const speaker = speakers.find(s => s.id === speakerId);
    if (speaker) {
        speaker[field] = value;
        saveData();
    }
}

function handleStatusChange(e) {
    const speakerId = parseInt(e.target.dataset.id);
    const speaker = speakers.find(s => s.id === speakerId);
    if (speaker) {
        speaker.status = e.target.value;
        saveData();
    }
}

function handleDateChange(e) {
    const speakerId = parseInt(e.target.dataset.id);
    const field = e.target.dataset.field;
    const speaker = speakers.find(s => s.id === speakerId);
    if (speaker) {
        speaker[field] = e.target.value;
        saveData();
    }
}

function handleRotarianChange(e) {
    const speakerId = parseInt(e.target.dataset.id);
    const speaker = speakers.find(s => s.id === speakerId);
    if (speaker) {
        speaker.rotarian = e.target.checked;
        saveData();
    }
}

function getFilteredSpeakers() {
    let filtered = [...speakers];

    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(searchTerm) ||
            (s.email && s.email.toLowerCase().includes(searchTerm)) ||
            (s.organization && s.organization.toLowerCase().includes(searchTerm)) ||
            (s.jobTitle && s.jobTitle.toLowerCase().includes(searchTerm)) ||
            (s.topic && s.topic.toLowerCase().includes(searchTerm)) ||
            (s.notes && s.notes.toLowerCase().includes(searchTerm))
        );
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter) {
        filtered = filtered.filter(s => s.status === statusFilter);
    }

    return filtered;
}

function filterSpreadsheet() {
    renderSpreadsheet();
}

let sortColumn = null;
let sortDirection = 'asc';

function sortSpreadsheet(column) {
    // Update sort direction
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    // Update UI indicators
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    document.querySelector(`th[data-sort="${column}"]`).classList.add(`sorted-${sortDirection}`);

    // Sort speakers
    speakers.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderSpreadsheet();
}

// Dynamic link management
let currentLinks = [];

function addLinkInput() {
    const container = document.getElementById('linksContainer');
    const linkIndex = container.querySelectorAll('.link-input-group').length;

    const linkGroup = document.createElement('div');
    linkGroup.className = 'link-input-group flex items-center space-x-2 mt-2';
    linkGroup.innerHTML = `
        <input type="url" class="link-input flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rotary-azure" placeholder="https://...">
        <button type="button" onclick="removeLinkInput(this)" class="text-red-600 hover:text-red-800 px-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;

    container.appendChild(linkGroup);
    linkGroup.querySelector('.link-input').focus();
}

function removeLinkInput(button) {
    button.closest('.link-input-group').remove();
    updateAddLinkButton();
}

function updateAddLinkButton() {
    const container = document.getElementById('linksContainer');
    const inputs = container.querySelectorAll('.link-input');
    const addButton = document.getElementById('addLinkBtn');

    // Show add button if there are less than 5 links and the last input has a value
    if (inputs.length < 5) {
        const lastInput = inputs[inputs.length - 1];
        if (!lastInput || lastInput.value.trim()) {
            addButton.style.display = 'inline-flex';
        } else {
            addButton.style.display = 'none';
        }
    } else {
        addButton.style.display = 'none';
    }
}

// Modal Functions
function openModal(speakerId = null, defaultStatus = 'Ideas') {
    const modal = document.getElementById('speakerModal');
    const form = document.getElementById('speakerForm');
    const title = document.getElementById('modalTitle');
    const statusField = document.getElementById('statusField');

    form.reset();

    // Reset links container
    const linksContainer = document.getElementById('linksContainer');
    linksContainer.innerHTML = `
        <div class="link-input-group flex items-center space-x-2">
            <input type="url" class="link-input flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rotary-azure" placeholder="https://...">
        </div>
    `;

    // Update add link button visibility
    updateAddLinkButton();

    if (speakerId) {
        const speaker = speakers.find(s => s.id === speakerId);
        if (speaker) {
            title.textContent = 'EDIT SPEAKER';
            document.getElementById('speakerId').value = speaker.id;
            document.getElementById('speakerName').value = speaker.name;
            document.getElementById('speakerEmail').value = speaker.email || '';
            document.getElementById('speakerOrganization').value = speaker.organization || '';
            document.getElementById('speakerJobTitle').value = speaker.jobTitle || '';
            document.getElementById('speakerPhone').value = speaker.phone || '';
            document.getElementById('speakerTopic').value = speaker.topic || '';
            document.getElementById('speakerRotarian').checked = speaker.rotarian || false;
            document.getElementById('speakerDateContacted').value = speaker.dateContacted || '';
            document.getElementById('speakerScheduledDate').value = speaker.scheduledDate || '';
            document.getElementById('speakerNotes').value = speaker.notes || '';
            document.getElementById('speakerStatus').value = speaker.status;
            statusField.classList.remove('hidden');

            // Load existing links
            if (speaker.links && speaker.links.length > 0) {
                const linksContainer = document.getElementById('linksContainer');
                linksContainer.innerHTML = '';
                speaker.links.forEach((link, index) => {
                    const linkGroup = document.createElement('div');
                    linkGroup.className = 'link-input-group flex items-center space-x-2' + (index > 0 ? ' mt-2' : '');
                    linkGroup.innerHTML = `
                        <input type="url" class="link-input flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rotary-azure" value="${escapeHtml(link)}" placeholder="https://...">
                        ${index > 0 ? `<button type="button" onclick="removeLinkInput(this)" class="text-red-600 hover:text-red-800 px-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>` : ''}
                    `;
                    linksContainer.appendChild(linkGroup);
                });
            }

            updateAddLinkButton();
        }
    } else {
        title.textContent = 'ADD SPEAKER';
        document.getElementById('speakerId').value = '';
        document.getElementById('speakerStatus').value = defaultStatus;
        if (currentView === 'spreadsheet') {
            statusField.classList.remove('hidden');
        } else {
            statusField.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('speakerModal').classList.add('hidden');
}

function handleFormSubmit(e) {
    e.preventDefault();

    const speakerId = document.getElementById('speakerId').value;

    // Collect links
    const linkInputs = document.querySelectorAll('.link-input');
    const links = [];
    linkInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            links.push(value);
        }
    });

    const formData = {
        name: document.getElementById('speakerName').value,
        email: document.getElementById('speakerEmail').value,
        organization: document.getElementById('speakerOrganization').value,
        jobTitle: document.getElementById('speakerJobTitle').value,
        phone: document.getElementById('speakerPhone').value,
        topic: document.getElementById('speakerTopic').value,
        rotarian: document.getElementById('speakerRotarian').checked,
        dateContacted: document.getElementById('speakerDateContacted').value,
        scheduledDate: document.getElementById('speakerScheduledDate').value,
        notes: document.getElementById('speakerNotes').value,
        status: document.getElementById('speakerStatus').value,
        links: links
    };

    if (speakerId) {
        // Edit existing speaker
        const speaker = speakers.find(s => s.id === parseInt(speakerId));
        if (speaker) {
            Object.assign(speaker, formData);
        }
    } else {
        // Add new speaker
        speakers.push({
            id: nextId++,
            ...formData
        });
    }

    saveData();
    renderView();
    closeModal();
}

// CRUD Operations
function editSpeaker(id) {
    openModal(id);
}

function deleteSpeaker(id) {
    if (confirm('Are you sure we should remove this speaker from our list?')) {
        speakers = speakers.filter(s => s.id !== id);
        saveData();
        renderView();
    }
}

// CSV Import/Export
function exportToCSV() {
    const headers = ['Name', 'Email', 'Organization', 'Job Title', 'Phone', 'Topic', 'Rotarian', 'Status', 'Date Contacted', 'Scheduled Date', 'Notes', 'Links'];
    const rows = speakers.map(s => [
        s.name,
        s.email || '',
        s.organization || '',
        s.jobTitle || '',
        s.phone || '',
        s.topic || '',
        s.rotarian ? 'Yes' : 'No',
        s.status,
        s.dateContacted || '',
        s.scheduledDate || '',
        s.notes || '',
        (s.links || []).join('; ')
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or newline
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotary-speakers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function importFromCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = parseCSV(text);

        if (rows.length < 2) {
            alert('We couldn\'t process this CSV file - please check the format');
            return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const nameIndex = headers.findIndex(h => h.includes('name'));

        if (nameIndex === -1) {
            alert('We need a "Name" column in the CSV file');
            return;
        }

        const newSpeakers = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row[nameIndex] && row[nameIndex].trim()) {
                const speaker = {
                    id: nextId++,
                    name: row[nameIndex].trim(),
                    email: getValue(row, headers, ['email', 'e-mail']),
                    organization: getValue(row, headers, ['organization', 'company', 'org']),
                    jobTitle: getValue(row, headers, ['job title', 'title', 'position', 'role']),
                    phone: getValue(row, headers, ['phone', 'telephone', 'tel']),
                    topic: getValue(row, headers, ['topic', 'expertise', 'subject']),
                    rotarian: ['yes', 'y', 'true', '1'].includes(getValue(row, headers, ['rotarian', 'rotary member']).toLowerCase()),
                    status: getValue(row, headers, ['status', 'stage']) || 'Ideas',
                    dateContacted: getValue(row, headers, ['date contacted', 'contacted', 'contact date']),
                    scheduledDate: getValue(row, headers, ['scheduled date', 'scheduled', 'date scheduled']),
                    notes: getValue(row, headers, ['notes', 'comments', 'note']),
                    links: []
                };

                // Parse links if present
                const linksValue = getValue(row, headers, ['links', 'urls', 'websites']);
                if (linksValue) {
                    speaker.links = linksValue.split(/[;,]/).map(l => l.trim()).filter(l => l);
                }

                // Validate status
                const validStatuses = ['Ideas', 'Approached', 'Agreed', 'Scheduled', 'Spoken', 'Dropped'];
                if (!validStatuses.includes(speaker.status)) {
                    speaker.status = 'Ideas';
                }

                newSpeakers.push(speaker);
            }
        }

        if (newSpeakers.length > 0) {
            if (confirm(`We found ${newSpeakers.length} speakers to import. Should we add them to our existing list?`)) {
                speakers.push(...newSpeakers);
                saveData();
                renderView();
                alert(`We\'ve successfully imported ${newSpeakers.length} speakers`);
            }
        } else {
            alert('We couldn\'t find any valid speakers in the CSV file');
        }

        // Clear sync queue if sync is enabled
        if (syncEngine) {
            syncEngine.triggerDataChange();
        }
        }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset file input
}

function parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const row = [];
        let cell = '';
        let inQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            const nextChar = lines[i][j + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    cell += '"';
                    j++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(cell);
                cell = '';
            } else {
                cell += char;
            }
        }

        row.push(cell);
        if (row.some(c => c.trim())) {
            rows.push(row);
        }
    }

    return rows;
}

function getValue(row, headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name));
        if (index !== -1 && row[index]) {
            return row[index].trim();
        }
    }
    return '';
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Enhanced data loading with sync support
function loadDataFromSync(syncData) {
    if (syncData && Array.isArray(syncData.speakers)) {
        speakers = syncData.speakers;
        nextId = Math.max(...speakers.map(s => s.id), 0) + 1;

        // Update local storage
        localStorage.setItem('rotarySpeakers', JSON.stringify(speakers));
        if (syncData.lastModified) {
            localStorage.setItem('rotarySpeakersLastModified', syncData.lastModified);
        }
        if (syncData.version) {
            localStorage.setItem('rotarySpeakersVersion', syncData.version.toString());
        }

        // Re-render views
        renderView();
    }
}

// Emergency backup function
function createEmergencyBackup() {
    if (backupSystem) {
        return backupSystem.createEmergencyBackup();
    } else {
        // Fallback manual backup
        const emergencyData = {
            timestamp: new Date().toISOString(),
            speakers: speakers,
            metadata: {
                userAgent: navigator.userAgent,
                origin: window.location.origin
            }
        };

        const blob = new Blob([JSON.stringify(emergencyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return emergencyData;
    }
}

// Global functions for sync system
window.loadData = loadData;
window.renderView = renderView;
window.loadDataFromSync = loadDataFromSync;
window.createEmergencyBackup = createEmergencyBackup;