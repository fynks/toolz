// OPML Feed Manager Core JS
// Engineered with modern syntax, enhanced UX flows, and robust error safety.

// Inline professional high-grade SVGs (Lucide-inspired)
const SVG = {
    rss: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>`,
    upload: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
    search: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    plus: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    check: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    close: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    trash: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    pencil: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    link: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    copy: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    warning: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

let feeds = [];
let filteredFeeds = [];
let editingFeedId = null;

// DOM Elements cache
const DOM = {
    fileInput: () => document.getElementById('fileInput'),
    uploadArea: () => document.getElementById('uploadArea'),
    searchInput: () => document.getElementById('searchInput'),
    clearSearchBtn: () => document.getElementById('clearSearchBtn'),
    feedsSection: () => document.getElementById('feedsSection'),
    feedsGrid: () => document.getElementById('feedsGrid'),
    feedsCount: () => document.getElementById('feedsCount'),
    totalFeeds: () => document.getElementById('totalFeeds'),
    selectedFeeds: () => document.getElementById('selectedFeeds'),
    emptyState: () => document.getElementById('emptyState'),
    
    // Modals
    feedModal: () => document.getElementById('feedModal'),
    modalTitle: () => document.getElementById('modalTitle'),
    saveButtonText: () => document.getElementById('saveButtonText'),
    feedForm: () => document.getElementById('feedForm'),
    feedTitle: () => document.getElementById('feedTitle'),
    feedUrl: () => document.getElementById('feedUrl'),
    feedWebsite: () => document.getElementById('feedWebsite'),
    feedDescription: () => document.getElementById('feedDescription'),
    feedCategory: () => document.getElementById('feedCategory'),
    categoryList: () => document.getElementById('categoryList')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    updateStats();
});

function initEvents() {
    // File Upload handling
    const fileInput = DOM.fileInput();
    const uploadArea = DOM.uploadArea();

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    if (uploadArea) {
        // Browse on click
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
    }

    // Search and filters
    const searchInput = DOM.searchInput();
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const clearBtn = DOM.clearSearchBtn();
            if (clearBtn) {
                clearBtn.style.display = searchInput.value ? 'flex' : 'none';
            }
            filterFeeds();
        });
    }

    const clearSearchBtn = DOM.clearSearchBtn();
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            filterFeeds();
            searchInput.focus();
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Esc close modal
        if (e.key === 'Escape') {
            closeFeedModal();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'a':
                    // Only run if active element isn't an input/textarea
                    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        selectAll();
                    }
                    break;
                case 'd':
                    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        deselectAll();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    if (feeds.length > 0) exportOPML();
                    break;
                case 'f':
                    e.preventDefault();
                    searchInput?.focus();
                    break;
                case 'n':
                    e.preventDefault();
                    showAddFeedModal();
                    break;
            }
        }
    });

    // Modal click out to close
    window.addEventListener('click', (e) => {
        const backdrops = ['.modal-backdrop'];
        backdrops.forEach(selector => {
            const el = e.target.closest(selector);
            if (el && e.target === el) {
                closeFeedModal();
            }
        });
    });

    // Form submit listener
    const feedForm = DOM.feedForm();
    if (feedForm) {
        feedForm.addEventListener('submit', handleFeedFormSubmit);
    }
}

// Background scrolling lock helper
function toggleBodyScroll(lock) {
    if (lock) {
        document.body.classList.add('modal-open');
    } else {
        // Unlock only if no other backdrops are active
        const openBackdrops = Array.from(document.querySelectorAll('.modal-backdrop')).filter(b => b.style.display === 'flex');
        if (openBackdrops.length === 0) {
            document.body.classList.remove('modal-open');
        }
    }
}

// File handling logic
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.opml') && !fileName.endsWith('.xml')) {
        showNotification('Please select a valid OPML or XML file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            parseOPML(e.target.result);
            showNotification('OPML file loaded successfully!', 'success');
        } catch (error) {
            showNotification('Error parsing OPML file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function parseOPML(opmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(opmlContent, 'text/xml');
    
    // Check for parsing errors
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML format');
    }

    const outlines = xmlDoc.getElementsByTagName('outline');
    feeds = [];

    for (let i = 0; i < outlines.length; i++) {
        const outline = outlines[i];
        const xmlUrl = outline.getAttribute('xmlUrl');
        const htmlUrl = outline.getAttribute('htmlUrl');
        if (xmlUrl) {
            feeds.push({
                id: i + 1, // Start IDs from 1
                title: outline.getAttribute('title') || outline.getAttribute('text') || 'Untitled Feed',
                xmlUrl: xmlUrl,
                htmlUrl: htmlUrl || xmlUrl,
                description: outline.getAttribute('description') || '',
                category: outline.getAttribute('category') || outline.getAttribute('type') || '',
                selected: true
            });
        }
    }

    if (feeds.length === 0) {
        throw new Error('No valid feeds found in OPML file');
    }

    filteredFeeds = [...feeds];
    renderFeeds();
    showFeedsSection();
    updateStats();
}

function renderFeeds() {
    const feedsGrid = DOM.feedsGrid();
    if (!feedsGrid) return;
    
    feedsGrid.innerHTML = '';

    if (filteredFeeds.length === 0) {
        feedsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; margin: 2rem auto;">
                <div class="empty-state-icon">
                    ${SVG.search}
                </div>
                <div class="empty-state-title">No matching feeds found</div>
                <p class="empty-state-sub">Try modifying your query</p>
            </div>
        `;
        updateFeedsCount();
        return;
    }

    filteredFeeds.forEach(feed => {
        const feedCard = document.createElement('div');
        feedCard.className = `feed-card ${feed.selected ? 'selected' : ''}`;
        feedCard.dataset.id = feed.id;
        
        // Feed selection clicking the card body (excluding actions/buttons)
        feedCard.addEventListener('click', (e) => {
            const isInteractive = e.target.closest('button') || e.target.closest('a') || e.target.closest('.copy-badge');
            if (!isInteractive) {
                toggleFeed(feed.id);
            }
        });

        const categoryHtml = feed.category ? `<span class="badge badge-category">${escapeHtml(feed.category)}</span>` : '';
        
        feedCard.innerHTML = `
            <div class="feed-card-header">
                <div class="feed-card-title-container">
                    <h3 class="feed-card-title" title="${escapeHtml(feed.title)}">${escapeHtml(feed.title)}</h3>
                    <div class="feed-meta">
                        ${categoryHtml}
                    </div>
                </div>
                <div class="feed-card-checkbox" title="Toggle selection"></div>
            </div>
            
            <div class="feed-card-url" title="Click to copy feed URL" onclick="copyToClipboard('${escapeJs(feed.xmlUrl)}')">
                <span style="cursor: pointer;" class="copy-badge">${SVG.copy} ${escapeHtml(feed.xmlUrl)}</span>
            </div>
            
            <p class="feed-card-desc" title="${escapeHtml(feed.description)}">
                ${feed.description ? escapeHtml(feed.description) : '<span style="color: var(--text-muted); font-style: italic;">No description provided</span>'}
            </p>
            
            <div class="feed-card-actions">
                <button class="btn btn-secondary btn-small" onclick="editFeed(${feed.id})" title="Edit feed details">
                    ${SVG.pencil} Edit
                </button>
                <a href="${escapeHtml(feed.htmlUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-small" title="Visit website">
                    ${SVG.link} Link
                </a>
                <a href="${escapeHtml(feed.xmlUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-small" title="Direct RSS Feed">
                    ${SVG.rss} Feed
                </a>
            </div>
        `;
        feedsGrid.appendChild(feedCard);
    });

    updateFeedsCount();
}

function toggleFeed(feedId) {
    const feed = feeds.find(f => f.id === feedId);
    if (feed) {
        feed.selected = !feed.selected;
        renderFeeds();
        updateStats();
    }
}

function selectAll() {
    feeds.forEach(feed => feed.selected = true);
    renderFeeds();
    updateStats();
    showNotification('All feeds selected', 'info');
}

function deselectAll() {
    feeds.forEach(feed => feed.selected = false);
    renderFeeds();
    updateStats();
    showNotification('All feeds deselected', 'info');
}

function removeSelected() {
    const selectedCount = feeds.filter(f => f.selected).length;
    if (selectedCount === 0) {
        showNotification('No feeds selected for removal', 'error');
        return;
    }

    if (confirm(`Are you sure you want to remove the ${selectedCount} selected feed(s)?`)) {
        feeds = feeds.filter(f => !f.selected);
        filterFeeds();
        updateStats();
        showNotification(`${selectedCount} feed(s) removed successfully`, 'success');
    }
}

function filterFeeds() {
    const searchTerm = DOM.searchInput() ? DOM.searchInput().value.toLowerCase().trim() : '';
    
    filteredFeeds = feeds.filter(feed => {
        if (!searchTerm) return true;
        
        return (
            feed.title.toLowerCase().includes(searchTerm) ||
            feed.xmlUrl.toLowerCase().includes(searchTerm) ||
            feed.description.toLowerCase().includes(searchTerm) ||
            (feed.category && feed.category.toLowerCase().includes(searchTerm))
        );
    });
    
    renderFeeds();
}

function showFeedsSection() {
    DOM.feedsSection().style.display = 'block';
    DOM.emptyState().style.display = 'none';
}

function updateFeedsCount() {
    const count = filteredFeeds.length;
    const total = feeds.length;
    DOM.feedsCount().textContent = 
        count === total ? `${count} feeds loaded` : `${count} of ${total} feeds shown`;
}

function updateStats() {
    const totalCount = feeds.length;
    const selectedCount = feeds.filter(f => f.selected).length;
    
    DOM.totalFeeds().textContent = totalCount;
    DOM.selectedFeeds().textContent = selectedCount;

    // Toggle Empty State view if entire collection was deleted
    if (totalCount === 0) {
        DOM.feedsSection().style.display = 'none';
        DOM.emptyState().style.display = 'flex';
    }
}

// Feed export handling
function exportOPML() {
    const selectedFeeds = feeds.filter(f => f.selected);
    if (selectedFeeds.length === 0) {
        showNotification('No feeds selected for export', 'error');
        return;
    }

    const exportBtn = document.getElementById('exportText');
    const originalHtml = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;margin-right:5px;"></span> Generating...';

    setTimeout(() => {
        const opml = generateOPML(selectedFeeds);
        downloadOPML(opml);
        exportBtn.innerHTML = originalHtml;
        showNotification(`${selectedFeeds.length} feeds exported successfully!`, 'success');
    }, 800);
}

function generateOPML(feedsToExport) {
    const now = new Date().toUTCString();
    let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
    <head>
        <title>My RSS Feeds</title>
        <dateCreated>${now}</dateCreated>
        <dateModified>${now}</dateModified>
        <ownerName>OPML Feed Manager</ownerName>
    </head>
    <body>
`;

    feedsToExport.forEach(feed => {
        opml += `        <outline text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" type="rss" xmlUrl="${escapeXml(feed.xmlUrl)}" htmlUrl="${escapeXml(feed.htmlUrl)}"`;
        if (feed.description) {
            opml += ` description="${escapeXml(feed.description)}"`;
        }
        if (feed.category) {
            opml += ` category="${escapeXml(feed.category)}"`;
        }
        opml += '/>\n';
    });

    opml += `    </body>
</opml>`;

    return opml;
}

function downloadOPML(opmlContent) {
    const blob = new Blob([opmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feeds_${new Date().toISOString().split('T')[0]}.opml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Notification Banner System
function showNotification(message, type = 'info') {
    const host = document.getElementById('notificationsHost');
    if (!host) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: SVG.check,
        error: SVG.warning,
        info: SVG.info
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || SVG.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    host.appendChild(toast);

    // Fade out and remove element
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// Add/Edit Modals handling
function showAddFeedModal() {
    editingFeedId = null;
    DOM.modalTitle().innerHTML = `${SVG.plus} Add New RSS Feed`;
    DOM.saveButtonText().textContent = 'Add Feed';
    DOM.feedForm().reset();
    updateCategoryList();
    
    // Show and lock scrolling
    DOM.feedModal().style.display = 'flex';
    toggleBodyScroll(true);
}

function editFeed(feedId) {
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return;

    editingFeedId = feedId;
    DOM.modalTitle().innerHTML = `${SVG.pencil} Edit RSS Feed`;
    DOM.saveButtonText().textContent = 'Save Changes';
    
    DOM.feedTitle().value = feed.title;
    DOM.feedUrl().value = feed.xmlUrl;
    DOM.feedWebsite().value = feed.htmlUrl || '';
    DOM.feedDescription().value = feed.description || '';
    DOM.feedCategory().value = feed.category || '';
    
    updateCategoryList();
    
    // Show and lock scrolling
    DOM.feedModal().style.display = 'flex';
    toggleBodyScroll(true);
}

function closeFeedModal() {
    DOM.feedModal().style.display = 'none';
    editingFeedId = null;
    toggleBodyScroll(false);
}

function updateCategoryList() {
    const categories = [...new Set(feeds.map(f => f.category).filter(Boolean))];
    const datalist = DOM.categoryList();
    if (datalist) {
        datalist.innerHTML = categories.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
    }
}

// Add/Edit Submit Logic
function handleFeedFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const feedData = {
        title: formData.get('title').trim(),
        xmlUrl: formData.get('xmlUrl').trim(),
        htmlUrl: formData.get('htmlUrl').trim() || formData.get('xmlUrl').trim(),
        description: formData.get('description').trim(),
        category: formData.get('category').trim()
    };

    if (!feedData.title || !feedData.xmlUrl) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (editingFeedId !== null) {
        const feed = feeds.find(f => f.id === editingFeedId);
        if (feed) {
            Object.assign(feed, feedData);
            showNotification('Feed updated successfully!', 'success');
        }
    } else {
        const newId = Math.max(...feeds.map(f => f.id), 0) + 1;
        feeds.push({
            id: newId,
            selected: true,
            ...feedData
        });
        showNotification('Feed added successfully!', 'success');
    }

    filterFeeds();
    updateStats();
    closeFeedModal();
}

function autoFillWebsite() {
    const feedUrl = DOM.feedUrl().value.trim();
    if (!feedUrl) {
        showNotification('Please enter a feed URL first', 'error');
        return;
    }

    try {
        const url = new URL(feedUrl);
        const baseUrl = `${url.protocol}//${url.host}`;
        DOM.feedWebsite().value = baseUrl;
        showNotification('Website URL auto-filled', 'info');
    } catch (error) {
        showNotification('Could not extract website URL', 'error');
    }
}

// Helpers
function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showNotification('Feed URL copied to clipboard!', 'success');
        } catch (e) {
            showNotification('Failed to copy feed URL', 'error');
        }
        document.body.removeChild(textarea);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Feed URL copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy feed URL', 'error');
    });
}

// Global safe html escaper
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeXml(text) {
    if (!text) return '';
    return String(text).replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function escapeJs(text) {
    if (!text) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
