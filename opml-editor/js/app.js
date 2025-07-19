        let feeds = [];
        let filteredFeeds = [];
        let editingFeedId = null;
        let feedValidationCache = new Map();

        // File handling
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.querySelector('.upload-area');

        fileInput.addEventListener('change', handleFileUpload);

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

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                handleFile(file);
            }
        }

        function handleFile(file) {
            if (!file.name.toLowerCase().endsWith('.opml') && !file.name.toLowerCase().endsWith('.xml')) {
                showNotification('Please select an OPML or XML file', 'error');
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
                        id: i,
                        title: outline.getAttribute('title') || outline.getAttribute('text') || 'Untitled Feed',
                        xmlUrl: xmlUrl,
                        htmlUrl: htmlUrl || xmlUrl,
                        description: outline.getAttribute('description') || '',
                        category: outline.getAttribute('category') || outline.getAttribute('type') || '',
                        selected: true,
                        validationStatus: 'unknown'
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
            const feedsGrid = document.getElementById('feedsGrid');
            feedsGrid.innerHTML = '';

            if (filteredFeeds.length === 0) {
                feedsGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <div class="empty-text">No feeds match your search</div>
                        <div class="empty-subtext">Try adjusting your search terms</div>
                    </div>
                `;
                return;
            }

            filteredFeeds.forEach(feed => {
                const feedCard = document.createElement('div');
                feedCard.className = `feed-card ${feed.selected ? 'selected' : ''} fade-in`;
                
                const validationStatus = getValidationStatusHtml(feed);
                const categoryHtml = feed.category ? `<div class="feed-category">${escapeHtml(feed.category)}</div>` : '';
                
                feedCard.innerHTML = `
                    <div class="feed-header">
                        <div class="feed-title">
                            ${escapeHtml(feed.title)}
                            ${validationStatus}
                        </div>
                        <div class="checkbox ${feed.selected ? 'checked' : ''}" onclick="toggleFeed(${feed.id})"></div>
                    </div>
                    <div class="feed-url">${escapeHtml(feed.xmlUrl)}</div>
                    ${feed.description ? `<div class="feed-description">${escapeHtml(feed.description)}</div>` : ''}
                    ${categoryHtml}
                    <div class="feed-actions">
                        <button class="btn feed-edit-btn" onclick="editFeed(${feed.id})">✏️ Edit</button>
                        <button class="btn feed-preview-btn" onclick="previewFeed(${feed.id})">👀 Preview</button>
                        <a href="${escapeHtml(feed.htmlUrl)}" target="_blank" class="btn secondary">🔗 Visit</a>
                        <a href="${escapeHtml(feed.xmlUrl)}" target="_blank" class="btn secondary">📡 RSS</a>
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

            if (confirm(`Are you sure you want to remove ${selectedCount} selected feed(s)?`)) {
                feeds = feeds.filter(f => !f.selected);
                filterFeeds();
                updateStats();
                showNotification(`${selectedCount} feed(s) removed`, 'success');
            }
        }

        function filterFeeds() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            filteredFeeds = feeds.filter(feed => 
                feed.title.toLowerCase().includes(searchTerm) ||
                feed.xmlUrl.toLowerCase().includes(searchTerm) ||
                feed.description.toLowerCase().includes(searchTerm) ||
                (feed.category && feed.category.toLowerCase().includes(searchTerm))
            );
            renderFeeds();
        }

        function showFeedsSection() {
            document.getElementById('feedsSection').style.display = 'block';
            document.getElementById('emptyState').style.display = 'none';
        }

        function updateFeedsCount() {
            const count = filteredFeeds.length;
            const total = feeds.length;
            document.getElementById('feedsCount').textContent = 
                count === total ? `${count} feeds loaded` : `${count} of ${total} feeds shown`;
        }

        function updateStats() {
            const totalCount = feeds.length;
            const selectedCount = feeds.filter(f => f.selected).length;
            
            document.getElementById('totalFeeds').textContent = totalCount;
            document.getElementById('selectedFeeds').textContent = selectedCount;
        }

        function exportOPML() {
            const selectedFeeds = feeds.filter(f => f.selected);
            
            if (selectedFeeds.length === 0) {
                showNotification('No feeds selected for export', 'error');
                return;
            }

            const exportBtn = document.getElementById('exportText');
            exportBtn.innerHTML = '<span class="loading"></span>Generating...';

            setTimeout(() => {
                const opml = generateOPML(selectedFeeds);
                downloadOPML(opml);
                exportBtn.innerHTML = '📥 Download OPML';
                showNotification(`${selectedFeeds.length} feeds exported successfully!`, 'success');
            }, 1000);
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

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function escapeXml(text) {
            return text.replace(/[<>&'"]/g, function(c) {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
            });
        }

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', filterFeeds);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        selectAll();
                        break;
                    case 'd':
                        e.preventDefault();
                        deselectAll();
                        break;
                    case 's':
                        e.preventDefault();
                        if (feeds.length > 0) exportOPML();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('searchInput').focus();
                        break;
                }
            }
        });

        // Initialize
        updateStats();

        // New Feed Management Functions
        function showAddFeedModal() {
            editingFeedId = null;
            document.getElementById('modalTitle').textContent = 'Add New RSS Feed';
            document.getElementById('saveButtonText').textContent = 'Add Feed';
            document.getElementById('feedForm').reset();
            updateCategoryList();
            document.getElementById('feedModal').style.display = 'flex';
        }

        function editFeed(feedId) {
            const feed = feeds.find(f => f.id === feedId);
            if (!feed) return;

            editingFeedId = feedId;
            document.getElementById('modalTitle').textContent = 'Edit RSS Feed';
            document.getElementById('saveButtonText').textContent = 'Save Changes';
            
            document.getElementById('feedTitle').value = feed.title;
            document.getElementById('feedUrl').value = feed.xmlUrl;
            document.getElementById('feedWebsite').value = feed.htmlUrl || '';
            document.getElementById('feedDescription').value = feed.description || '';
            document.getElementById('feedCategory').value = feed.category || '';
            
            updateCategoryList();
            document.getElementById('feedModal').style.display = 'flex';
        }

        function closeFeedModal() {
            document.getElementById('feedModal').style.display = 'none';
            editingFeedId = null;
        }

        function updateCategoryList() {
            const categories = [...new Set(feeds.map(f => f.category).filter(Boolean))];
            const datalist = document.getElementById('categoryList');
            datalist.innerHTML = categories.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
        }

        // Form submission handler
        document.getElementById('feedForm').addEventListener('submit', function(e) {
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
                showNotification('Please fill in required fields', 'error');
                return;
            }

            if (editingFeedId !== null) {
                // Update existing feed
                const feed = feeds.find(f => f.id === editingFeedId);
                if (feed) {
                    Object.assign(feed, feedData);
                    showNotification('Feed updated successfully!', 'success');
                }
            } else {
                // Add new feed
                const newId = Math.max(...feeds.map(f => f.id), 0) + 1;
                feeds.push({
                    id: newId,
                    selected: true,
                    validationStatus: 'unknown',
                    ...feedData
                });
                showNotification('Feed added successfully!', 'success');
            }

            filterFeeds();
            updateStats();
            closeFeedModal();
        });

        function validateFeedUrl() {
            const url = document.getElementById('feedUrl').value.trim();
            if (!url) {
                showNotification('Please enter a feed URL first', 'error');
                return;
            }

            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '⏳ Checking...';
            button.disabled = true;

            validateSingleFeed(url)
                .then(result => {
                    if (result.valid) {
                        showNotification('Feed URL is valid!', 'success');
                        if (result.title && !document.getElementById('feedTitle').value) {
                            document.getElementById('feedTitle').value = result.title;
                        }
                        if (result.htmlUrl && !document.getElementById('feedWebsite').value) {
                            document.getElementById('feedWebsite').value = result.htmlUrl;
                        }
                    } else {
                        showNotification(`Feed validation failed: ${result.error}`, 'error');
                    }
                })
                .catch(error => {
                    showNotification(`Validation error: ${error.message}`, 'error');
                })
                .finally(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                });
        }

        function autoFillWebsite() {
            const feedUrl = document.getElementById('feedUrl').value.trim();
            if (!feedUrl) {
                showNotification('Please enter a feed URL first', 'error');
                return;
            }

            try {
                const url = new URL(feedUrl);
                const baseUrl = `${url.protocol}//${url.host}`;
                document.getElementById('feedWebsite').value = baseUrl;
                showNotification('Website URL auto-filled', 'info');
            } catch (error) {
                showNotification('Could not extract website URL', 'error');
            }
        }

        // Feed validation
        async function validateSingleFeed(feedUrl) {
            try {
                // Check if URL is accessible and appears to be a feed
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`);
                const data = await response.json();
                
                if (!data.contents) {
                    throw new Error('Unable to fetch feed content');
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/xml');
                
                // Check for RSS/Atom elements
                const isRSS = doc.querySelector('rss, feed, channel');
                if (!isRSS) {
                    throw new Error('Not a valid RSS/Atom feed');
                }

                // Extract feed information
                const title = doc.querySelector('title, channel > title')?.textContent?.trim();
                const link = doc.querySelector('link, channel > link')?.textContent?.trim();
                
                return {
                    valid: true,
                    title: title,
                    htmlUrl: link
                };
            } catch (error) {
                return {
                    valid: false,
                    error: error.message
                };
            }
        }

        function validateAllFeeds() {
            if (feeds.length === 0) {
                showNotification('No feeds to validate', 'info');
                return;
            }

            document.getElementById('validationResults').innerHTML = '<div class="loading-spinner">Validating feeds...</div>';
            document.getElementById('validationModal').style.display = 'flex';

            const validationPromises = feeds.map(feed => 
                validateSingleFeed(feed.xmlUrl)
                    .then(result => ({
                        feed: feed,
                        result: result
                    }))
            );

            Promise.all(validationPromises).then(results => {
                displayValidationResults(results);
                
                // Update feed validation status
                results.forEach(({feed, result}) => {
                    feed.validationStatus = result.valid ? 'valid' : 'invalid';
                    feed.validationError = result.error;
                    feedValidationCache.set(feed.xmlUrl, result);
                });
                
                renderFeeds();
            });
        }

        function displayValidationResults(results) {
            const validFeeds = results.filter(r => r.result.valid);
            const invalidFeeds = results.filter(r => !r.result.valid);

            let html = `
                <div style="margin-bottom: 20px;">
                    <h4>Validation Summary</h4>
                    <p>✅ ${validFeeds.length} valid feeds | ❌ ${invalidFeeds.length} invalid feeds</p>
                </div>
            `;

            results.forEach(({feed, result}) => {
                html += `
                    <div class="validation-item">
                        <div class="validation-icon">${result.valid ? '✅' : '❌'}</div>
                        <div class="validation-details">
                            <h4>${escapeHtml(feed.title)}</h4>
                            <p>${escapeHtml(feed.xmlUrl)}</p>
                            ${result.error ? `<p style="color: #d32f2f; font-weight: 500;">${escapeHtml(result.error)}</p>` : ''}
                        </div>
                    </div>
                `;
            });

            document.getElementById('validationResults').innerHTML = html;
        }

        function closeValidationModal() {
            document.getElementById('validationModal').style.display = 'none';
        }

        function getValidationStatusHtml(feed) {
            if (!feed.validationStatus || feed.validationStatus === 'unknown') return '';
            
            const statusMap = {
                valid: { text: 'Valid', class: 'status-valid' },
                invalid: { text: 'Invalid', class: 'status-invalid' },
                checking: { text: 'Checking', class: 'status-checking' }
            };
            
            const status = statusMap[feed.validationStatus];
            return status ? `<span class="feed-validation-status ${status.class}">${status.text}</span>` : '';
        }

        // Feed preview functionality
        async function previewFeed(feedId) {
            const feed = feeds.find(f => f.id === feedId);
            if (!feed) return;

            document.getElementById('previewTitle').textContent = `Preview: ${feed.title}`;
            document.getElementById('previewContent').innerHTML = '<div class="loading-spinner">Loading feed preview...</div>';
            document.getElementById('previewModal').style.display = 'flex';

            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feed.xmlUrl)}`);
                const data = await response.json();
                
                if (!data.contents) {
                    throw new Error('Unable to fetch feed content');
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/xml');
                
                displayFeedPreview(feed, doc);
            } catch (error) {
                document.getElementById('previewContent').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #d32f2f;">
                        <p>❌ Failed to load feed preview</p>
                        <p style="font-size: 14px; color: #666;">${escapeHtml(error.message)}</p>
                    </div>
                `;
            }
        }

        function displayFeedPreview(feed, doc) {
            const title = doc.querySelector('title, channel > title')?.textContent?.trim() || feed.title;
            const description = doc.querySelector('description, channel > description')?.textContent?.trim() || '';
            const items = doc.querySelectorAll('item, entry');

            let html = `
                <div class="preview-feed-info">
                    <h3>${escapeHtml(title)}</h3>
                    ${description ? `<p>${escapeHtml(description.substring(0, 200))}...</p>` : ''}
                    <p><strong>Feed URL:</strong> <a href="${escapeHtml(feed.xmlUrl)}" target="_blank">${escapeHtml(feed.xmlUrl)}</a></p>
                    ${feed.htmlUrl ? `<p><strong>Website:</strong> <a href="${escapeHtml(feed.htmlUrl)}" target="_blank">${escapeHtml(feed.htmlUrl)}</a></p>` : ''}
                </div>
            `;

            if (items.length > 0) {
                html += '<div class="preview-articles">';
                html += `<h4>Recent Articles (${Math.min(items.length, 5)} of ${items.length})</h4>`;
                
                Array.from(items).slice(0, 5).forEach(item => {
                    const itemTitle = item.querySelector('title')?.textContent?.trim() || 'Untitled';
                    const itemDescription = item.querySelector('description, summary')?.textContent?.trim() || '';
                    const itemDate = item.querySelector('pubDate, published, updated')?.textContent?.trim() || '';
                    
                    html += `
                        <div class="preview-article">
                            <h4>${escapeHtml(itemTitle)}</h4>
                            ${itemDescription ? `<p>${escapeHtml(itemDescription.substring(0, 150))}...</p>` : ''}
                            ${itemDate ? `<div class="article-meta">Published: ${escapeHtml(new Date(itemDate).toLocaleDateString())}</div>` : ''}
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                html += '<p>No recent articles found in this feed.</p>';
            }

            document.getElementById('previewContent').innerHTML = html;
        }

        function closePreviewModal() {
            document.getElementById('previewModal').style.display = 'none';
        }

        // Close modals when clicking outside
        window.addEventListener('click', function(event) {
            const modals = ['feedModal', 'previewModal', 'validationModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Close modals with Escape key
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="flex"]');
                if (openModal) {
                    openModal.style.display = 'none';
                    return;
                }
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'a':
                        e.preventDefault();
                        selectAll();
                        break;
                    case 'd':
                        e.preventDefault();
                        deselectAll();
                        break;
                    case 's':
                        e.preventDefault();
                        if (feeds.length > 0) exportOPML();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('searchInput').focus();
                        break;
                    case 'n':
                        e.preventDefault();
                        showAddFeedModal();
                        break;
                }
            }
        });