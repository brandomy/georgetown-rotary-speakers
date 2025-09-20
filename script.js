// Rotary Speakers - Main JavaScript

// Data Management
let speakers = [];
let currentView = 'kanban';
let nextId = 1;
let draggedElement = null;
let currentEditingCell = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    renderView();
});

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('rotarySpeakers');
    if (savedData) {
        speakers = JSON.parse(savedData);
        nextId = Math.max(...speakers.map(s => s.id), 0) + 1;
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('rotarySpeakers', JSON.stringify(speakers));
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
        <div class="flex justify-between items-start mb-2">
            <h3 class="font-semibold text-gray-900">${escapeHtml(speaker.name)}</h3>
            <div class="flex space-x-1">
                <button onclick="editSpeaker(${speaker.id})" class="text-blue-600 hover:text-blue-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button onclick="deleteSpeaker(${speaker.id})" class="text-red-600 hover:text-red-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
        ${speaker.jobTitle || speaker.organization ? `<p class="text-sm text-gray-600 mb-1">🏢 ${escapeHtml(speaker.jobTitle || '')}${speaker.jobTitle && speaker.organization ? ' at ' : ''}${escapeHtml(speaker.organization || '')}</p>` : ''}
        ${speaker.topic ? `<p class="text-sm text-gray-600 mb-1">📚 ${escapeHtml(speaker.topic)}</p>` : ''}
        ${speaker.email ? `<p class="text-sm text-gray-600 mb-1">✉️ ${escapeHtml(speaker.email)}</p>` : ''}
        ${speaker.phone ? `<p class="text-sm text-gray-600 mb-1">📞 ${escapeHtml(speaker.phone)}</p>` : ''}
        ${speaker.scheduledDate ? `<p class="text-sm text-gray-600 mb-1">📅 ${formatDate(speaker.scheduledDate)}</p>` : ''}
        ${speaker.notes ? `<p class="text-xs text-gray-500 mt-2">📝 ${escapeHtml(speaker.notes.substring(0, 50))}${speaker.notes.length > 50 ? '...' : ''}</p>` : ''}
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

// Modal Functions
function openModal(speakerId = null, defaultStatus = 'Ideas') {
    const modal = document.getElementById('speakerModal');
    const form = document.getElementById('speakerForm');
    const title = document.getElementById('modalTitle');
    const statusField = document.getElementById('statusField');

    form.reset();

    if (speakerId) {
        const speaker = speakers.find(s => s.id === speakerId);
        if (speaker) {
            title.textContent = 'Edit Speaker';
            document.getElementById('speakerId').value = speaker.id;
            document.getElementById('speakerName').value = speaker.name;
            document.getElementById('speakerEmail').value = speaker.email || '';
            document.getElementById('speakerOrganization').value = speaker.organization || '';
            document.getElementById('speakerJobTitle').value = speaker.jobTitle || '';
            document.getElementById('speakerPhone').value = speaker.phone || '';
            document.getElementById('speakerTopic').value = speaker.topic || '';
            document.getElementById('speakerDateContacted').value = speaker.dateContacted || '';
            document.getElementById('speakerScheduledDate').value = speaker.scheduledDate || '';
            document.getElementById('speakerNotes').value = speaker.notes || '';
            document.getElementById('speakerStatus').value = speaker.status;
            statusField.classList.remove('hidden');
        }
    } else {
        title.textContent = 'Add Speaker';
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
    const formData = {
        name: document.getElementById('speakerName').value,
        email: document.getElementById('speakerEmail').value,
        organization: document.getElementById('speakerOrganization').value,
        jobTitle: document.getElementById('speakerJobTitle').value,
        phone: document.getElementById('speakerPhone').value,
        topic: document.getElementById('speakerTopic').value,
        dateContacted: document.getElementById('speakerDateContacted').value,
        scheduledDate: document.getElementById('speakerScheduledDate').value,
        notes: document.getElementById('speakerNotes').value,
        status: document.getElementById('speakerStatus').value
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
    if (confirm('Are you sure you want to delete this speaker?')) {
        speakers = speakers.filter(s => s.id !== id);
        saveData();
        renderView();
    }
}

// CSV Import/Export
function exportToCSV() {
    const headers = ['Name', 'Email', 'Organization', 'Job Title', 'Phone', 'Topic', 'Status', 'Date Contacted', 'Scheduled Date', 'Notes'];
    const rows = speakers.map(s => [
        s.name,
        s.email || '',
        s.organization || '',
        s.jobTitle || '',
        s.phone || '',
        s.topic || '',
        s.status,
        s.dateContacted || '',
        s.scheduledDate || '',
        s.notes || ''
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
            alert('Invalid CSV file');
            return;
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        const nameIndex = headers.findIndex(h => h.includes('name'));

        if (nameIndex === -1) {
            alert('CSV must have a Name column');
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
                    status: getValue(row, headers, ['status', 'stage']) || 'Ideas',
                    dateContacted: getValue(row, headers, ['date contacted', 'contacted', 'contact date']),
                    scheduledDate: getValue(row, headers, ['scheduled date', 'scheduled', 'date scheduled']),
                    notes: getValue(row, headers, ['notes', 'comments', 'note'])
                };

                // Validate status
                const validStatuses = ['Ideas', 'Approached', 'Agreed', 'Scheduled', 'Spoken', 'Dropped'];
                if (!validStatuses.includes(speaker.status)) {
                    speaker.status = 'Ideas';
                }

                newSpeakers.push(speaker);
            }
        }

        if (newSpeakers.length > 0) {
            if (confirm(`Import ${newSpeakers.length} speakers? This will add to existing speakers.`)) {
                speakers.push(...newSpeakers);
                saveData();
                renderView();
                alert(`Successfully imported ${newSpeakers.length} speakers`);
            }
        } else {
            alert('No valid speakers found in CSV');
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