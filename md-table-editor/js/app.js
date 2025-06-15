(() => {
    "use strict";

    // Enhanced Constants
    const THEMES = Object.freeze({ DARK: 'dark', LIGHT: 'light' });
    const OUTPUT_FORMATS = Object.freeze({
        MARKDOWN: 'markdown',
        GENERIC_JSON: 'generic_json',
        SERVICE_PROVIDER_JSON: 'service_provider_json',
        HTML: 'html'
    });
    const ALIGNMENTS = Object.freeze({ CENTER: 'center', RIGHT: 'right', LEFT: 'left' });
    const ALIGNMENT_MARKERS = Object.freeze({
        [ALIGNMENTS.CENTER]: ':---:',
        [ALIGNMENTS.RIGHT]: '---:',
        [ALIGNMENTS.LEFT]: ':---'
    });
    const NOTIFICATION_TYPES = Object.freeze({ 
        SUCCESS: 'success', 
        ERROR: 'error', 
        WARNING: 'warning', 
        INFO: 'info' 
    });

    // Performance-optimized element cache
    const elements = new Proxy({}, {
        get(target, prop) {
            if (!(prop in target)) {
                target[prop] = document.getElementById(prop) || 
                              document.querySelector(`[data-element="${prop}"]`) ||
                              document.querySelector(`.${prop}`);
            }
            return target[prop];
        }
    });

    // Initialize core elements
    const coreElements = {
        themeToggle: document.getElementById('themeToggle'),
        get sunPath() { return this.themeToggle?.querySelector('.sun'); },
        get moonPath() { return this.themeToggle?.querySelector('.moon'); },
        input: document.getElementById("input"),
        output: document.getElementById("output"),
        tableContainer: document.getElementById("tableContainer"),
        analysisMarkdownOutput: document.getElementById('analysisMarkdownOutput'),
        parseBtn: document.getElementById("parseBtn"),
        analyzeBtn: document.getElementById("analyzeBtn"),
        copyOutputBtn: document.getElementById("copyOutputBtn"),
        clearBtn: document.getElementById("clearBtn"),
        addColumnBtn: document.getElementById("addColumnBtn"),
        addRowBtn: document.getElementById("addRowBtn"),
        sortRowsBtn: document.getElementById("sortRowsBtn"),
        removeColumnBtn: document.getElementById("removeColumnBtn"),
        removeRowBtn: document.getElementById("removeRowBtn"),
        reorderBtn: document.getElementById("reorderBtn"),
        notification: document.getElementById("notification"),
        outputFormat: document.getElementById('outputFormat'),
        newProviderName: document.getElementById('newProviderName'),
        supportedServices: document.getElementById('supportedServices'),
        addProviderBtn: document.getElementById('addProviderBtn'),
        analysisDetails: document.getElementById('analysisDetails'),
        advancedOpsDetails: document.getElementById('advancedOpsDetails'),
        outputStats: document.getElementById('outputStats'),
        loadingIndicator: document.getElementById('loadingIndicator')
    };

    // Enhanced Table State with better performance tracking
    class TableState {
        constructor() {
            this.headers = [];
            this.rows = [];
            this.alignments = [];
            this.isReorderMode = false;
            this.outputFormat = OUTPUT_FORMATS.MARKDOWN;
            this.history = [];
            this.historyIndex = -1;
            this.isModified = false;
            this.lastSaveTime = Date.now();
            this.stats = { rows: 0, columns: 0, cells: 0 };
        }

        saveToHistory() {
            const state = {
                headers: structuredClone(this.headers),
                rows: structuredClone(this.rows),
                alignments: structuredClone(this.alignments),
                timestamp: Date.now()
            };
            
            // Remove future history if we're in the middle
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(state);
            this.historyIndex++;
            
            // Limit history size for performance
            if (this.history.length > 50) {
                this.history.shift();
                this.historyIndex--;
            }
            
            this.isModified = true;
            this.updateStats();
        }

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const state = this.history[this.historyIndex];
                this.restoreState(state);
                return true;
            }
            return false;
        }

        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const state = this.history[this.historyIndex];
                this.restoreState(state);
                return true;
            }
            return false;
        }

        restoreState(state) {
            this.headers = structuredClone(state.headers);
            this.rows = structuredClone(state.rows);
            this.alignments = structuredClone(state.alignments);
            this.updateStats();
        }

        updateStats() {
            this.stats = {
                rows: this.rows.length,
                columns: this.headers.length,
                cells: this.rows.length * this.headers.length
            };
            this.updateStatsDisplay();
        }

        updateStatsDisplay() {
            if (coreElements.outputStats) {
                const { rows, columns, cells } = this.stats;
                coreElements.outputStats.textContent = 
                    `${rows} rows × ${columns} columns = ${cells} cells`;
            }
        }

        reset() {
            this.headers = [];
            this.rows = [];
            this.alignments = [];
            this.isReorderMode = false;
            this.history = [];
            this.historyIndex = -1;
            this.isModified = false;
            this.updateStats();
        }

        isEmpty() {
            return this.headers.length === 0 && this.rows.length === 0;
        }

        isValid() {
            return this.headers.length > 0 && this.alignments.length === this.headers.length;
        }
    }

    // Enhanced utility functions
    const utils = {
        sanitizeHTML: (str) => {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        debounce: (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(null, args), delay);
            };
        },

        throttle: (func, limit) => {
            let inThrottle;
            return (...args) => {
                if (!inThrottle) {
                    func.apply(null, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        copyToClipboard: async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    return success;
                } catch (e) {
                    document.body.removeChild(textarea);
                    return false;
                }
            }
        },

        normalizeString: (str) => str.toLowerCase().trim().replace(/\s+/g, ''),

        titleCase: (str) => {
            return str.replace(/\b\w/g, c => c.toUpperCase())
                     .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
                     .replace(/\b\w/g, c => c.toUpperCase())
                     .replace(/\s+/g, '');
        },

        showLoading: (show = true) => {
            if (coreElements.loadingIndicator) {
                coreElements.loadingIndicator.style.display = show ? 'flex' : 'none';
                coreElements.loadingIndicator.setAttribute('aria-hidden', !show);
            }
        },

        formatFileSize: (bytes) => {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
    };



        
            // Enhanced notification system
            const notifications = {
                show: (message, type = NOTIFICATION_TYPES.SUCCESS, duration = 4000) => {
                    if (!coreElements.notification) {
                        console.warn('Notification element not found');
                        return;
                    }
        
                    // Clear any existing notification
                    notifications.hide();
        
                    const notification = coreElements.notification;
                    
                    // Clear previous content and classes
                    notification.innerHTML = '';
                    notification.className = 'notification';
                    
                    // Set the message
                    notification.textContent = message;
                    
                    // Add classes
                    notification.classList.add('show', type);
                    notification.setAttribute('aria-live', type === NOTIFICATION_TYPES.ERROR ? 'assertive' : 'polite');
        
                    // Auto-hide with custom duration
                    if (duration > 0) {
                        setTimeout(() => notifications.hide(), duration);
                    }
                },
        
                hide: () => {
                    if (!coreElements.notification) return;
                    
                    const notification = coreElements.notification;
                    notification.classList.remove('show', ...Object.values(NOTIFICATION_TYPES));
                    notification.innerHTML = '';
                },
        
                success: (message, duration = 4000) => notifications.show(message, NOTIFICATION_TYPES.SUCCESS, duration),
                error: (message, duration = 6000) => notifications.show(message, NOTIFICATION_TYPES.ERROR, duration),
                warning: (message, duration = 5000) => notifications.show(message, NOTIFICATION_TYPES.WARNING, duration),
                info: (message, duration = 4000) => notifications.show(message, NOTIFICATION_TYPES.INFO, duration)
            };
        

    // Enhanced theme management
    const themeManager = {
        init: () => {
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (systemPrefersDark ? THEMES.DARK : THEMES.LIGHT);
            
            themeManager.set(theme);
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)')
                  .addEventListener('change', (e) => {
                      if (!localStorage.getItem('theme')) {
                          themeManager.set(e.matches ? THEMES.DARK : THEMES.LIGHT);
                      }
                  });
        },

        toggle: () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
            themeManager.set(newTheme);
        },

        set: (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeManager.updateIcons(theme);
            
            // Update meta theme-color
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.content = theme === THEMES.DARK ? '#0d1117' : '#0969da';
            }
        },

        updateIcons: (theme) => {
            if (coreElements.sunPath && coreElements.moonPath) {
                coreElements.sunPath.style.display = theme === THEMES.DARK ? 'block' : 'none';
                coreElements.moonPath.style.display = theme === THEMES.DARK ? 'none' : 'block';
            }
        }
    };

    // Enhanced markdown parser with better error handling
    const markdownParser = {
        parse: (input) => {
            if (!input?.trim()) {
                throw new Error('Input is empty or contains only whitespace.');
            }

            const lines = input.trim().split('\n')
                              .map(line => line.trim())
                              .filter(line => line);

            if (lines.length < 1) {
                throw new Error('No valid content found in input.');
            }

            // Find the first line that looks like a table header
            const headerIndex = lines.findIndex(line => line.includes('|') && !line.match(/^\|?\s*:?-+:?/));
            
            if (headerIndex === -1) {
                throw new Error('No valid table header found. Make sure your table uses pipe (|) separators.');
            }

            const headers = markdownParser.parseRow(lines[headerIndex]);
            let alignments, dataStartIndex = headerIndex + 1;

            // Check for alignment row
            if (dataStartIndex < lines.length) {
                const potentialAlignmentRow = lines[dataStartIndex];
                if (potentialAlignmentRow && potentialAlignmentRow.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
                    const alignmentRow = markdownParser.parseRow(potentialAlignmentRow);
                    if (alignmentRow.length === headers.length) {
                        alignments = alignmentRow.map(cell => {
                            const trimmed = cell.trim();
                            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return ALIGNMENTS.CENTER;
                            if (trimmed.endsWith(':')) return ALIGNMENTS.RIGHT;
                            return ALIGNMENTS.LEFT;
                        });
                        dataStartIndex++;
                    }
                }
            }

            // Default to left alignment if no alignment row found
            if (!alignments || alignments.length !== headers.length) {
                alignments = headers.map(() => ALIGNMENTS.LEFT);
            }

            // Parse data rows
            const rows = lines.slice(dataStartIndex)
                             .filter(line => !line.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/))
                             .map(line => {
                                 const row = markdownParser.parseRow(line);
                                 // Pad or trim row to match header length
                                 while (row.length < headers.length) row.push('');
                                 if (row.length > headers.length) row.splice(headers.length);
                                 return row;
                             });

            return {
                headers: headers.map(h => utils.sanitizeHTML(h.replace(/\*\*/g, ''))),
                alignments,
                rows: rows.map(row => row.map(cell => utils.sanitizeHTML(cell.replace(/\*\*/g, ''))))
            };
        },

        parseRow: (line) => {
            const cells = line.split('|').map(cell => cell.trim());
            let start = 0, end = cells.length;
            
            // Remove empty cells at start and end (from leading/trailing |)
            if (cells[0] === '') start = 1;
            if (cells[cells.length - 1] === '') end = cells.length - 1;
            
            return cells.slice(start, end);
        }
    };

    // Enhanced JSON conversion utilities
    const jsonConverter = {
        tableToServiceProviderJSON: (headers, rows) => {
            if (!headers || headers.length === 0 || !rows) {
                throw new Error('Invalid table data for Service/Provider JSON conversion.');
            }

            const result = {};
            const providerColumns = headers.slice(1); // Skip service name column

            rows.forEach(row => {
                const serviceName = row[0]?.trim();
                if (serviceName) {
                    result[serviceName] = {};
                    providerColumns.forEach((provider, index) => {
                        const value = row[index + 1]?.toLowerCase().trim();
                        result[serviceName][provider] = value === 'yes' ? 'yes' : 'no';
                    });
                }
            });

            return result;
        },

        serviceProviderJSONToTable: (jsonData) => {
            if (Object.keys(jsonData).length === 0) {
                return { headers: [], rows: [], alignments: [] };
            }

            const services = Object.keys(jsonData);
            const providerSet = new Set();
            
            services.forEach(service => {
                if (jsonData[service]) {
                    Object.keys(jsonData[service]).forEach(provider => providerSet.add(provider));
                }
            });

            const providers = Array.from(providerSet).sort();
            const headers = ['Service Name', ...providers];
            const alignments = headers.map(() => ALIGNMENTS.LEFT);

            const rows = services.sort().map(service => {
                const row = [service];
                providers.forEach(provider => {
                    const value = jsonData[service]?.[provider];
                    row.push(value === 'yes' ? 'yes' : 'no');
                });
                return row;
            });

            return { headers, rows, alignments };
        },

        addProviderToJSON: (jsonData, providerName, supportedServices) => {
            if (!providerName || !supportedServices) {
                throw new Error('Provider name and supported services are required.');
            }

            const result = structuredClone(jsonData);
            const normalizedProvider = utils.titleCase(providerName.trim());
            const normalizedServices = supportedServices.split(',')
                                                      .map(s => utils.normalizeString(s.trim()))
                                                      .filter(Boolean);

            // Create service map for faster lookup
            const serviceMap = {};
            Object.keys(result).forEach(service => {
                const normalizedService = utils.normalizeString(service);
                serviceMap[normalizedService] = { ...result[service], [normalizedProvider]: 'no' };
            });

            // Mark supported services as 'yes'
            normalizedServices.forEach(service => {
                if (serviceMap[service]) {
                    serviceMap[service][normalizedProvider] = 'yes';
                } else {
                    // Add new service if it doesn't exist
                    const titleCaseService = utils.titleCase(service);
                    serviceMap[service] = {};
                    Object.keys(result).forEach(existingService => {
                        Object.keys(result[existingService]).forEach(provider => {
                            serviceMap[service][provider] = 'no';
                        });
                    });
                    serviceMap[service][normalizedProvider] = 'yes';
                }
            });

            // Convert back to proper format
            const finalResult = {};
            Object.keys(serviceMap).sort().forEach(normalizedService => {
                const titleCaseService = utils.titleCase(normalizedService);
                finalResult[titleCaseService] = {};
                Object.keys(serviceMap[normalizedService]).sort().forEach(provider => {
                    finalResult[titleCaseService][provider] = serviceMap[normalizedService][provider];
                });
            });

            return finalResult;
        }
    };

    // Enhanced output formatters
    const outputFormatters = {
        [OUTPUT_FORMATS.MARKDOWN]: () => {
            if (!tableState.isValid()) return '';
            
            const alignmentRow = `| ${tableState.alignments.map(align => 
                ALIGNMENT_MARKERS[align] || ALIGNMENT_MARKERS[ALIGNMENTS.LEFT]
            ).join(' | ')} |`;
            
            const headerRow = `| ${tableState.headers.join(' | ')} |`;
            const dataRows = tableState.rows.map(row => `| ${row.join(' | ')} |`).join('\\n');
            
            return [headerRow, alignmentRow, dataRows].filter(Boolean).join('\\n');
        },

        [OUTPUT_FORMATS.GENERIC_JSON]: () => {
            if (!tableState.isValid()) return JSON.stringify([], null, 2);
            
            const result = tableState.rows.map(row => {
                const obj = {};
                tableState.headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            
            return JSON.stringify(result, null, 2);
        },

        [OUTPUT_FORMATS.SERVICE_PROVIDER_JSON]: () => {
            if (!tableState.isValid()) return JSON.stringify({}, null, 2);
            
            try {
                const result = jsonConverter.tableToServiceProviderJSON(tableState.headers, tableState.rows);
                return JSON.stringify(result, null, 2);
            } catch (error) {
                notifications.error(`Error converting to Service/Provider JSON: ${error.message}`);
                return JSON.stringify({ error: error.message }, null, 2);
            }
        },

        [OUTPUT_FORMATS.HTML]: () => {
            if (!tableState.isValid()) return '';
            
            const getAlignStyle = align => align !== ALIGNMENTS.LEFT ? ` style="text-align: ${align};"` : '';
            
            const headerCells = tableState.headers.map((header, index) => 
                `<th${getAlignStyle(tableState.alignments[index])}>${utils.sanitizeHTML(header)}</th>`
            ).join('');
            
            const bodyRows = tableState.rows.map(row => 
                `<tr>${row.map((cell, index) => 
                    `<td${getAlignStyle(tableState.alignments[index])}>${utils.sanitizeHTML(cell)}</td>`
                ).join('')}</tr>`
            ).join('\n');
            
            return `<table>\n<thead>\n<tr>${headerCells}</tr>\n</thead>\n<tbody>\n${bodyRows}\n</tbody>\n</table>`;
        }
    };

    // Enhanced table renderer with performance optimizations
    const tableRenderer = {
        render: () => {
            if (tableState.isEmpty()) {
                coreElements.tableContainer.innerHTML = `
                    <div class="empty-table-message">
                        <p>📋 No table data available</p>
                        <p>Paste a Markdown table above or use the "Add Row/Column" buttons to start creating your table.</p>
                    </div>
                `;
                outputGenerator.generate();
                return;
            }

            if (!tableState.isValid()) {
                coreElements.tableContainer.innerHTML = `
                    <div class="empty-table-message error-message">
                        <p>⚠️ Invalid table structure</p>
                        <p>The table data is inconsistent. Please check that headers and alignments match.</p>
                    </div>
                `;
                outputGenerator.generate();
                return;
            }

            try {
                const table = document.createElement('table');
                table.setAttribute('role', 'table');
                table.setAttribute('aria-label', 'Editable data table');
                
                const thead = tableRenderer.createHeader();
                const tbody = tableRenderer.createBody();
                
                table.appendChild(thead);
                table.appendChild(tbody);
                
                coreElements.tableContainer.innerHTML = '';
                coreElements.tableContainer.appendChild(table);
                
                outputGenerator.generate();
                tableState.updateStats();
            } catch (error) {
                console.error('Error rendering table:', error);
                coreElements.tableContainer.innerHTML = `
                    <div class="empty-table-message error-message">
                        <p>❌ Error rendering table</p>
                        <p>Please check your data and try again. Error: ${error.message}</p>
                    </div>
                `;
            }
        },

        createHeader: () => {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            tr.setAttribute('role', 'row');

            tableState.headers.forEach((header, index) => {
                const th = document.createElement('th');
                th.setAttribute('role', 'columnheader');
                th.setAttribute('scope', 'col');
                th.textContent = header;
                th.draggable = tableState.isReorderMode;
                th.dataset.index = index;
                th.classList.toggle('dragging-allowed', tableState.isReorderMode);
                th.contentEditable = !tableState.isReorderMode;
                th.tabIndex = tableState.isReorderMode ? -1 : 0;
                
                if (tableState.isReorderMode) {
                    th.addEventListener('dragstart', dragDropHandler.handleDragStart);
                    th.addEventListener('dragover', dragDropHandler.handleDragOver);
                    th.addEventListener('drop', dragDropHandler.handleDrop);
                    th.setAttribute('aria-label', `Draggable column header: ${header}`);
                } else {
                    th.setAttribute('aria-label', `Editable column header: ${header}`);
                }

                th.addEventListener('blur', (e) => {
                    const newValue = e.target.textContent.trim();
                    if (newValue !== tableState.headers[index]) {
                        tableState.saveToHistory();
                        tableState.headers[index] = newValue;
                        outputGenerator.generate();
                        notifications.success('Header updated');
                    }
                });

                th.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                    }
                    if (e.key === 'Escape') {
                        e.target.textContent = tableState.headers[index];
                        e.target.blur();
                    }
                });

                tr.appendChild(th);
            });

            thead.appendChild(tr);
            return thead;
        },

        createBody: () => {
            const tbody = document.createElement('tbody');

            tableState.rows.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                tr.setAttribute('role', 'row');
                tr.draggable = tableState.isReorderMode;
                tr.dataset.index = rowIndex;
                tr.classList.toggle('dragging-allowed', tableState.isReorderMode);

                if (tableState.isReorderMode) {
                    tr.addEventListener('dragstart', dragDropHandler.handleDragStart);
                    tr.addEventListener('dragover', dragDropHandler.handleDragOver);
                    tr.addEventListener('drop', dragDropHandler.handleDrop);
                    tr.setAttribute('aria-label', `Draggable row ${rowIndex + 1}`);
                }

                row.forEach((cell, cellIndex) => {
                    const td = document.createElement('td');
                    td.setAttribute('role', 'gridcell');
                    td.textContent = cell;
                    td.contentEditable = !tableState.isReorderMode;
                    td.tabIndex = tableState.isReorderMode ? -1 : 0;
                    
                    if (!tableState.isReorderMode) {
                        td.setAttribute('aria-label', `Editable cell: Row ${rowIndex + 1}, Column ${cellIndex + 1}`);
                    }

                    td.addEventListener('blur', (e) => {
                        const newValue = e.target.textContent.trim();
                        if (newValue !== tableState.rows[rowIndex][cellIndex]) {
                            tableState.saveToHistory();
                            tableState.rows[rowIndex][cellIndex] = newValue;
                            outputGenerator.generate();
                        }
                    });

                    td.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur();
                        }
                        if (e.key === 'Escape') {
                            e.target.textContent = tableState.rows[rowIndex][cellIndex];
                            e.target.blur();
                        }
                        if (e.key === 'Tab') {
                            // Enhanced tab navigation
                            e.preventDefault();
                            const cells = Array.from(tbody.querySelectorAll('td[contenteditable="true"]'));
                            const currentIndex = cells.indexOf(e.target);
                            let nextIndex;
                            
                            if (e.shiftKey) {
                                nextIndex = currentIndex > 0 ? currentIndex - 1 : cells.length - 1;
                            } else {
                                nextIndex = currentIndex < cells.length - 1 ? currentIndex + 1 : 0;
                            }
                            
                            cells[nextIndex]?.focus();
                        }
                    });

                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            return tbody;
        }
    };

    // Enhanced drag and drop handler
    const dragDropHandler = {
        currentDraggedElement: null,
        placeholder: null,

        handleDragStart: (e) => {
            dragDropHandler.currentDraggedElement = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.index);
            e.dataTransfer.setData('type', e.target.tagName.toLowerCase());
            e.dataTransfer.effectAllowed = 'move';
            
            // Create visual placeholder
            dragDropHandler.placeholder = e.target.cloneNode(true);
            dragDropHandler.placeholder.classList.add('placeholder');
            dragDropHandler.placeholder.style.opacity = '0.5';
        },

        handleDragOver: (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const target = e.target.closest('tr, th');
            if (!target || target === dragDropHandler.currentDraggedElement) return;

            const dragType = e.dataTransfer.getData('type');
            
            if (dragType === 'tr' && target.tagName === 'TR') {
                const container = target.parentNode;
                const afterElement = dragDropHandler.getDragAfterElement(container, e.clientY, 'tr');
                
                if (dragDropHandler.currentDraggedElement) {
                    if (!afterElement) {
                        container.appendChild(dragDropHandler.currentDraggedElement);
                    } else {
                        container.insertBefore(dragDropHandler.currentDraggedElement, afterElement);
                    }
                }
            }
        },

        handleDrop: (e) => {
            e.preventDefault();
            
            if (!dragDropHandler.currentDraggedElement) return;
            
            dragDropHandler.currentDraggedElement.classList.remove('dragging');
            
            const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dragType = e.dataTransfer.getData('type');
            
            let target = e.target.closest('tr, th');
            if (!target) {
                dragDropHandler.currentDraggedElement = null;
                tableRenderer.render();
                return;
            }

            const dropIndex = parseInt(target.dataset.index);
            
            if (dragIndex !== dropIndex) {
                tableState.saveToHistory();
                
                if (dragType === 'th') {
                    tableOperations.reorderColumns(dragIndex, dropIndex);
                } else if (dragType === 'tr') {
                    tableOperations.reorderRows(dragIndex, dropIndex);
                }
                
                tableRenderer.render();
                tableAnalyzer.analyzeIfOpen();
                notifications.success(`${dragType === 'th' ? 'Column' : 'Row'} reordered successfully`);
            }
            
            dragDropHandler.currentDraggedElement = null;
        },

        getDragAfterElement: (container, y, selector) => {
            const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    };

    // Enhanced table operations
    const tableOperations = {
        addColumn: () => {
            if (tableState.isReorderMode) return;
            
            tableState.saveToHistory();
            const columnName = `Column ${tableState.headers.length + 1}`;
            tableState.headers.push(columnName);
            tableState.alignments.push(ALIGNMENTS.LEFT);
            tableState.rows.forEach(row => row.push(''));
            
            tableRenderer.render();
            notifications.success('Column added successfully');
        },

        addRow: () => {
            if (tableState.isReorderMode) return;
            
            tableState.saveToHistory();
            const newRow = Array(tableState.headers.length).fill('');
            tableState.rows.push(newRow);
            
            tableRenderer.render();
            notifications.success('Row added successfully');
        },

        removeColumn: () => {
            if (tableState.isReorderMode) return;
            
            if (tableState.headers.length <= 1) {
                notifications.warning('Cannot remove the last column');
                return;
            }
            
            tableState.saveToHistory();
            const columnIndex = tableState.headers.length - 1;
            tableState.headers.splice(columnIndex, 1);
            tableState.alignments.splice(columnIndex, 1);
            tableState.rows.forEach(row => row.splice(columnIndex, 1));
            
            tableRenderer.render();
            tableAnalyzer.analyzeIfOpen();
            notifications.success('Column removed successfully');
        },

        removeRow: () => {
            if (tableState.isReorderMode) return;
            
            if (tableState.rows.length === 0) {
                notifications.warning('No rows to remove');
                return;
            }
            
            tableState.saveToHistory();
            tableState.rows.pop();
            
            tableRenderer.render();
            tableAnalyzer.analyzeIfOpen();
            notifications.success('Row removed successfully');
        },

        sortRows: () => {
            if (tableState.isReorderMode) return;
            
            if (tableState.rows.length === 0) {
                notifications.warning('No rows to sort');
                return;
            }
            
            tableState.saveToHistory();
            tableState.rows.sort((a, b) => {
                const aVal = (a[0] || '').toLowerCase();
                const bVal = (b[0] || '').toLowerCase();
                return aVal.localeCompare(bVal);
            });
            
            tableRenderer.render();
            notifications.success('Rows sorted alphabetically');
        },

        reorderColumns: (fromIndex, toIndex) => {
            const moveArrayElement = (arr) => {
                const element = arr.splice(fromIndex, 1)[0];
                arr.splice(toIndex, 0, element);
            };
            
            moveArrayElement(tableState.headers);
            moveArrayElement(tableState.alignments);
            tableState.rows.forEach(row => moveArrayElement(row));
        },

        reorderRows: (fromIndex, toIndex) => {
            const element = tableState.rows.splice(fromIndex, 1)[0];
            tableState.rows.splice(toIndex, 0, element);
        },

        addProviderAndUpdateTable: () => {
            if (tableState.isReorderMode) return;
            
            const providerName = coreElements.newProviderName.value.trim();
            const supportedServices = coreElements.supportedServices.value.trim();
            
            if (!providerName) {
                notifications.error('New Provider Name is required.');
                coreElements.newProviderName.focus();
                return;
            }
            
            if (!supportedServices) {
                notifications.error('Supported Services list is required.');
                coreElements.supportedServices.focus();
                return;
            }
            
            if (tableState.headers.length === 0) {
                notifications.error('Cannot add provider to an empty table. Parse or create a table first.');
                return;
            }
            
            try {
                tableState.saveToHistory();
                const currentJSON = jsonConverter.tableToServiceProviderJSON(tableState.headers, tableState.rows);
                const updatedJSON = jsonConverter.addProviderToJSON(currentJSON, providerName, supportedServices);
                const newTableData = jsonConverter.serviceProviderJSONToTable(updatedJSON);
                
                tableState.headers = newTableData.headers;
                tableState.rows = newTableData.rows;
                tableState.alignments = newTableData.alignments;
                
                tableRenderer.render();
                tableAnalyzer.analyzeIfOpen();
                
                // Clear form
                coreElements.newProviderName.value = '';
                coreElements.supportedServices.value = '';
                
                notifications.success(`Provider "${providerName}" added successfully with ${supportedServices.split(',').length} supported services`);
            } catch (error) {
                notifications.error(`Error adding provider: ${error.message}`);
            }
        }
    };

    // Enhanced output generator
    const outputGenerator = {
        generate: () => {
            if (tableState.isEmpty()) {
                coreElements.output.value = '';
                return;
            }
            
            if (!tableState.isValid()) {
                coreElements.output.value = 'Table data is currently invalid. Cannot generate output.';
                return;
            }
            
            const formatter = outputFormatters[tableState.outputFormat];
            const output = formatter ? formatter() : outputFormatters[OUTPUT_FORMATS.MARKDOWN]();
            coreElements.output.value = output;
            
            // Update output stats
            if (coreElements.outputStats) {
                const size = new Blob([output]).size;
                const sizeText = utils.formatFileSize(size);
                coreElements.outputStats.textContent = `${tableState.stats.rows} rows × ${tableState.stats.columns} columns • ${sizeText}`;
            }
        },

        setFormat: (format) => {
            if (Object.values(OUTPUT_FORMATS).includes(format)) {
                tableState.outputFormat = format;
                outputGenerator.generate();
                notifications.info(`Output format changed to ${format.replace('_', ' ')}`);
            }
        }
    };

    
        // Enhanced table analyzer
        const tableAnalyzer = {
            analyze: () => {
                if (tableState.rows.length === 0 || tableState.headers.length === 0) {
                    coreElements.analysisMarkdownOutput.textContent = 'No data to analyze. Table is empty.';
                    return;
                }
                
                if (!tableState.isValid()) {
                    coreElements.analysisMarkdownOutput.textContent = 'Table structure is invalid. Cannot analyze.';
                    return;
                }
                
                const totalRows = tableState.rows.length;
                let markdownOutput = `| **Total** = \`${totalRows}\` |`;
    
                // Start from the second column (index 1) - skip service name column
                for (let i = 1; i < tableState.headers.length; i++) {
                    const yesCount = tableState.rows.reduce((count, row) => {
                        return count + (row[i]?.toLowerCase().trim() === 'yes' ? 1 : 0);
                    }, 0);
                    markdownOutput += ` \`${yesCount}/${totalRows}\` |`;
                }
    
                coreElements.analysisMarkdownOutput.textContent = markdownOutput;
                notifications.info('Table analysis complete!');
            },
    
            analyzeIfOpen: () => {
                if (coreElements.analysisDetails?.open) {
                    tableAnalyzer.analyze();
                }
            }
        };
    


    // Global table state
    const tableState = new TableState();

    // Enhanced application controller
    const app = {
        init: () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', app.setup);
            } else {
                app.setup();
            }
        },

        setup: () => {
            themeManager.init();
            app.bindEvents();
            app.initializeKeyboardShortcuts();
            app.initializeAccessibility();
            tableRenderer.render();
            
            // Set initial output format
            if (coreElements.outputFormat?.value) {
                outputGenerator.setFormat(coreElements.outputFormat.value);
            }
            
            // Auto-save functionality
            app.initializeAutoSave();
            
            notifications.success('Application loaded successfully', 2000);
        },

        parseTable: utils.debounce(() => {
            const input = coreElements.input.value.trim();
            
            if (!input) {
                notifications.warning('Input is empty. Nothing to parse.');
                return;
            }
            
            utils.showLoading(true);
            
            try {
                const parsed = markdownParser.parse(input);
                tableState.saveToHistory();
                tableState.headers = parsed.headers;
                tableState.alignments = parsed.alignments;
                tableState.rows = parsed.rows;
                
                tableRenderer.render();
                tableAnalyzer.analyzeIfOpen();
                notifications.success(`Table parsed successfully! ${parsed.rows.length} rows, ${parsed.headers.length} columns`);
            } catch (error) {
                console.error('Parse error:', error);
                notifications.error(`Parse error: ${error.message}`);
            } finally {
                utils.showLoading(false);
            }
        }, 300),

        copyOutputToClipboard: async () => {
            if (!coreElements.output.value) {
                notifications.warning('Nothing to copy from output.');
                return;
            }

            const success = await utils.copyToClipboard(coreElements.output.value);
            notifications[success ? 'success' : 'error'](
                success ? 'Output copied to clipboard!' : 'Failed to copy output.'
            );
        },

        clearAll: () => {
            if (!confirm('Are you sure you want to clear all input, table data, and output?')) {
                return;
            }

            tableState.saveToHistory();
            coreElements.input.value = '';
            coreElements.output.value = '';
            coreElements.analysisMarkdownOutput.textContent = 'Analysis results will appear here.';
            
            tableState.reset();
            tableRenderer.render();
            outputGenerator.generate();
            
            notifications.success('All data cleared. You can undo this action.');
        },

        toggleReorderMode: () => {
            tableState.isReorderMode = !tableState.isReorderMode;
            
            const btn = coreElements.reorderBtn;
            const icon = btn.querySelector('.icon svg');
            const text = btn.querySelector('span:not(.icon)');
            
            if (tableState.isReorderMode) {
                text.textContent = 'Edit Mode';
                btn.setAttribute('aria-label', 'Switch to edit mode');
                btn.classList.add('btn-secondary');
                notifications.info('Reorder mode enabled. Drag rows and columns to rearrange.');
            } else {
                text.textContent = 'Re-order';
                btn.setAttribute('aria-label', 'Switch to reorder mode');
                btn.classList.remove('btn-secondary');
                notifications.info('Edit mode enabled. Click cells to edit content.');
            }
            
            tableRenderer.render();
        },

        undo: () => {
            if (tableState.undo()) {
                tableRenderer.render();
                tableAnalyzer.analyzeIfOpen();
                notifications.info('Action undone.');
            } else {
                notifications.warning('Nothing to undo.');
            }
        },

        redo: () => {
            if (tableState.redo()) {
                tableRenderer.render();
                tableAnalyzer.analyzeIfOpen();
                notifications.info('Action redone.');
            } else {
                notifications.warning('Nothing to redo.');
            }
        },

        bindEvents: () => {
            // Theme toggle
            coreElements.themeToggle?.addEventListener('click', themeManager.toggle);

            // Main action buttons
            coreElements.parseBtn?.addEventListener('click', app.parseTable);
            coreElements.analyzeBtn?.addEventListener('click', tableAnalyzer.analyze);
            coreElements.copyOutputBtn?.addEventListener('click', app.copyOutputToClipboard);
            coreElements.clearBtn?.addEventListener('click', app.clearAll);

            // Table operation buttons
            coreElements.addColumnBtn?.addEventListener('click', tableOperations.addColumn);
            coreElements.addRowBtn?.addEventListener('click', tableOperations.addRow);
            coreElements.sortRowsBtn?.addEventListener('click', tableOperations.sortRows);
            coreElements.removeColumnBtn?.addEventListener('click', tableOperations.removeColumn);
            coreElements.removeRowBtn?.addEventListener('click', tableOperations.removeRow);
            coreElements.reorderBtn?.addEventListener('click', app.toggleReorderMode);
            coreElements.addProviderBtn?.addEventListener('click', tableOperations.addProviderAndUpdateTable);

            // Auto-parse on input
            if (coreElements.input) {
                coreElements.input.addEventListener('input', utils.debounce(() => {
                    if (coreElements.input.value.trim() === '') {
                        tableState.reset();
                        tableRenderer.render();
                        tableAnalyzer.analyzeIfOpen();
                        outputGenerator.generate();
                    } else {
                        app.parseTable();
                    }
                }, 500));
            }

            // Output format change
            coreElements.outputFormat?.addEventListener('change', (e) => {
                outputGenerator.setFormat(e.target.value);
            });

            // Prevent data loss
            window.addEventListener('beforeunload', (e) => {
                if (tableState.isModified && !tableState.isEmpty()) {
                    e.preventDefault();
                    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                }
            });

            // Details toggle improvements
            [coreElements.advancedOpsDetails, coreElements.analysisDetails].forEach(details => {
                if (details) {
                    details.addEventListener('toggle', (e) => {
                        const summary = e.target.querySelector('summary');
                        summary.setAttribute('aria-expanded', e.target.open);
                        
                        if (e.target.open && e.target.id === 'analysisDetails') {
                            tableAnalyzer.analyze();
                        }
                    });
                }
            });
        },

        initializeKeyboardShortcuts: () => {
            document.addEventListener('keydown', (e) => {
                // Don't interfere with form inputs
                const activeElement = document.activeElement;
                const isInInput = activeElement && (
                    activeElement.closest('textarea, input, [contenteditable="true"]') ||
                    activeElement.isContentEditable
                );

                if (isInInput) {
                    // Allow some shortcuts even in inputs
                    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'C') {
                        e.preventDefault();
                        app.copyOutputToClipboard();
                    }
                    return;
                }

                // Global shortcuts
                if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    app.undo();
                } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    app.redo();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    app.parseTable();
                } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'C') {
                    e.preventDefault();
                    app.copyOutputToClipboard();
                } else if (e.key === 'Escape') {
                    notifications.hide();
                }
            });
        },

        initializeAccessibility: () => {
            // Add ARIA live regions for dynamic content
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.id = 'status-live-region';
            document.body.appendChild(liveRegion);

            // Announce table changes
            const originalRender = tableRenderer.render;
            tableRenderer.render = function() {
                originalRender.call(this);
                if (!tableState.isEmpty()) {
                    liveRegion.textContent = `Table updated: ${tableState.stats.rows} rows, ${tableState.stats.columns} columns`;
                }
            };

            // Enhanced focus management
            app.setupFocusManagement();
        },

        setupFocusManagement: () => {
            // Trap focus in modals/dialogs
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusableElements = document.querySelectorAll(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), details:not([disabled]), summary:not(:disabled)'
                    );
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        },

        initializeAutoSave: () => {
            // Auto-save to localStorage
            const saveToStorage = utils.debounce(() => {
                if (!tableState.isEmpty()) {
                    const data = {
                        headers: tableState.headers,
                        rows: tableState.rows,
                        alignments: tableState.alignments,
                        inputValue: coreElements.input.value,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('md-table-editor-autosave', JSON.stringify(data));
                }
            }, 2000);

            // Load from storage on init
            const savedData = localStorage.getItem('md-table-editor-autosave');
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
                    
                    // Only restore if less than 24 hours old
                    if (ageHours < 24 && data.headers && data.rows) {
                        if (confirm('Restore your previous session?')) {
                            tableState.headers = data.headers;
                            tableState.rows = data.rows;
                            tableState.alignments = data.alignments || [];
                            coreElements.input.value = data.inputValue || '';
                            tableRenderer.render();
                            outputGenerator.generate();
                            notifications.success('Previous session restored');
                        } else {
                            localStorage.removeItem('md-table-editor-autosave');
                        }
                    }
                } catch (e) {
                    console.warn('Failed to restore session:', e);
                    localStorage.removeItem('md-table-editor-autosave');
                }
            }

            // Bind auto-save to state changes
            const originalSaveToHistory = tableState.saveToHistory;
            tableState.saveToHistory = function() {
                originalSaveToHistory.call(this);
                saveToStorage();
            };
        }
    };

    // Initialize the application
    app.init();

})();
