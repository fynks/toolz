        let feeds = [];
        let filteredFeeds = [];

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
                        category: outline.getAttribute('category') || '',
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
                feedCard.innerHTML = `
                    <div class="feed-header">
                        <div class="feed-title">${escapeHtml(feed.title)}</div>
                        <div class="checkbox ${feed.selected ? 'checked' : ''}" onclick="toggleFeed(${feed.id})"></div>
                    </div>
                    <div class="feed-url">${escapeHtml(feed.xmlUrl)}</div>
                    ${feed.description ? `<div class="feed-description">${escapeHtml(feed.description)}</div>` : ''}
                    <div class="feed-actions">
                        <a href="${escapeHtml(feed.htmlUrl)}" target="_blank" class="feed-link">🔗 Visit Site</a>
                        <a href="${escapeHtml(feed.xmlUrl)}" target="_blank" class="feed-link">📡 RSS Feed</a>
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
                feed.description.toLowerCase().includes(searchTerm)
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