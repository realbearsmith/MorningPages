class MorningPages {
    constructor() {
        this.editor = document.getElementById('editor');
        this.wordCount = document.getElementById('wordCount');
        this.saveStatus = document.getElementById('saveStatus');
        this.clearButton = document.getElementById('clearButton');
        this.downloadButton = document.getElementById('downloadButton');
        this.entriesList = document.getElementById('entriesList');
        this.progressBar = document.getElementById('wordProgress');

        this.targetWordCount = 300; // Set target word count
        this.currentEntryId = this.createNewEntryId();
        this.skipDeleteConfirm = localStorage.getItem('skipDeleteConfirm') === 'true';
        this.hasStartedTyping = false;
        this.setupEventListeners();
        this.loadEntries();
        this.loadNewEntry();
        this.startAutoSave();
    }

    setupEventListeners() {
        this.editor.addEventListener('input', () => {
            const hasContent = this.editor.value.trim().length > 0;
            if (!this.hasStartedTyping && hasContent) {
                this.hasStartedTyping = true;
                this.currentEntryId = this.createNewEntryId();
                this.loadEntries();
            } else if (this.hasStartedTyping && !hasContent) {
                // If they delete all content, remove the entry
                localStorage.removeItem(this.currentEntryId);
                this.hasStartedTyping = false;
                this.loadEntries();
            }
            this.updateWordCount();
            this.showSavingStatus();
        });

        document.getElementById('clearButton').addEventListener('click', () => {
            this.saveAndCreateNew();
        });

        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.saveAndCreateNew();
            }
        });

        this.downloadButton.addEventListener('click', () => this.downloadEntries());
    }

    createNewEntryId() {
        return `entry_${new Date().toISOString()}`;
    }

    getDateFromId(id) {
        return id.split('entry_')[1];
    }

    updateWordCount() {
        const words = this.editor.value.trim().split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        const wordCountElement = this.wordCount;

        // Set the content based on word count
        if (count >= this.targetWordCount) {
            wordCountElement.innerHTML = `${count} words<i class="fa-solid fa-check goal-check"></i>`;
            wordCountElement.classList.add('goal-reached');
        } else {
            wordCountElement.innerHTML = `${count} words`;
            wordCountElement.classList.remove('goal-reached');
        }

        // Update progress bar
        const progress = Math.min((count / this.targetWordCount) * 100, 100);
        this.progressBar.style.width = `${progress}%`;
    }

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    loadEntries() {
        this.entriesList.innerHTML = '';
        const entries = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('entry_')) {
                const content = localStorage.getItem(key);
                // Only add entries that have content
                if (content && content.trim().length > 0) {
                    entries.push(key);
                } else {
                    // Clean up empty entries
                    localStorage.removeItem(key);
                }
            }
        }

        entries.sort((a, b) => this.getDateFromId(b).localeCompare(this.getDateFromId(a)));

        entries.forEach(entryId => {
            const entry = localStorage.getItem(entryId);
            const preview = entry.substring(0, 100).replace(/\n/g, ' ');
            const isActive = entryId === this.currentEntryId;
            const date = this.getDateFromId(entryId);

            const entryElement = document.createElement('div');
            entryElement.className = `entry-item${isActive ? ' active' : ''}`;
            entryElement.innerHTML = `
                <div class="entry-content">
                    <div class="entry-date">${this.formatDate(date)}</div>
                    <div class="entry-preview">${preview}...</div>
                </div>
                <div class="entry-actions">
                    <button class="delete-entry" title="Delete entry">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                    <button class="copy-entry" title="Copy entry">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                </div>
            `;

            const deleteBtn = entryElement.querySelector('.delete-entry');
            const contentDiv = entryElement.querySelector('.entry-content');
            const copyBtn = entryElement.querySelector('.copy-entry');

            // Handle delete button click
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDelete(() => {
                    localStorage.removeItem(entryId);
                    this.loadEntries();
                    if (this.currentEntryId === entryId) {
                        this.currentEntryId = this.createNewEntryId();
                        this.editor.value = '';
                        this.updateWordCount();
                    }
                });
            });

            // Handle entry selection
            contentDiv.addEventListener('click', () => this.loadEntry(entryId));

            // Add copy functionality
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(entry).then(() => {
                    // Temporarily change icon to show success
                    const icon = copyBtn.querySelector('i');
                    icon.classList.remove('fa-copy');
                    icon.classList.add('fa-check');
                    setTimeout(() => {
                        icon.classList.remove('fa-check');
                        icon.classList.add('fa-copy');
                    }, 1500);
                });
            });

            this.entriesList.appendChild(entryElement);
        });
    }

    loadEntry(entryId) {
        if (this.currentEntryId) {
            this.saveEntry(); // Save current entry before loading new one
        }

        this.currentEntryId = entryId;
        const savedEntry = localStorage.getItem(entryId);
        this.editor.value = savedEntry || '';
        this.updateWordCount();

        // Update active state in sidebar
        document.querySelectorAll('.entry-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('.entry-date').textContent === this.formatDate(this.getDateFromId(entryId))) {
                item.classList.add('active');
            }
        });
    }

    loadNewEntry() {
        this.editor.value = '';
        this.hasStartedTyping = false;
        this.updateWordCount();
    }

    saveEntry() {
        const content = this.editor.value.trim();
        if (content.length > 0) {
            localStorage.setItem(this.currentEntryId, content);
        }
    }

    showSavingStatus() {
        this.saveStatus.textContent = 'Saving...';
        this.saveStatus.classList.add('visible');

        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveEntry();
            this.saveStatus.textContent = 'Saved';
            this.loadEntries(); // Refresh entries list to update preview
            setTimeout(() => {
                this.saveStatus.classList.remove('visible');
            }, 2000);
        }, 1000);
    }

    startAutoSave() {
        setInterval(() => {
            this.saveEntry();
            this.loadEntries();
        }, 30000);
    }

    downloadEntries() {
        let entries = '';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('entry_')) {
                const date = this.getDateFromId(key);
                entries += `Date: ${this.formatDate(date)}\n\n${localStorage.getItem(key)}\n\n-------------------\n\n`;
            }
        }

        const blob = new Blob([entries], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'morning-pages.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    confirmDelete(callback) {
        if (this.skipDeleteConfirm) {
            callback();
            return;
        }

        const confirmDialog = document.createElement('div');
        confirmDialog.className = 'confirm-dialog';
        confirmDialog.innerHTML = `
            <div class="confirm-content">
                <p>Are you sure you want to delete this entry?</p>
                <label class="skip-confirm">
                    <input type="checkbox" id="skipConfirm">
                    <span>Don't ask me again</span>
                </label>
                <div class="confirm-buttons">
                    <button class="confirm-cancel">Cancel</button>
                    <button class="confirm-delete">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmDialog);

        const handleDelete = () => {
            const skipConfirm = document.getElementById('skipConfirm').checked;
            if (skipConfirm) {
                localStorage.setItem('skipDeleteConfirm', 'true');
                this.skipDeleteConfirm = true;
            }
            confirmDialog.remove();
            callback();
        };

        const handleCancel = () => {
            confirmDialog.remove();
        };

        confirmDialog.querySelector('.confirm-delete').addEventListener('click', handleDelete);
        confirmDialog.querySelector('.confirm-cancel').addEventListener('click', handleCancel);
    }

    saveAndCreateNew() {
        if (this.hasStartedTyping) {
            this.saveEntry();
        }
        this.currentEntryId = this.createNewEntryId();
        this.editor.value = '';
        this.hasStartedTyping = false;
        this.updateWordCount();
        this.loadEntries();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MorningPages();
}); 