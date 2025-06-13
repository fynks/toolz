(() => {
    "use strict";

    // Constants
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
    const NOTIFICATION_TYPES = Object.freeze({ SUCCESS: 'success', ERROR: 'error', WARNING: 'warning', INFO: 'info' });

    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        get sunPath() { return this.themeToggle?.querySelector('.sun'); },
        get moonPath() { return this.themeToggle?.querySelector('.moon'); },
        inputTextArea: document.getElementById("input"),
        outputTextArea: document.getElementById("output"),
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
        notificationDiv: document.getElementById("notification"),
        outputFormatSelect: document.getElementById('outputFormat'),
        // New elements for advanced ops
        newProviderNameInput: document.getElementById('newProviderName'),
        supportedServicesInput: document.getElementById('supportedServices'),
        addProviderBtn: document.getElementById('addProviderBtn'),
        analysisDetails: document.getElementById('analysisDetails'),
        advancedOpsDetails: document.getElementById('advancedOpsDetails'),
    };

    class TableState {
        constructor() {
            this.headers = [];
            this.rows = [];
            this.alignments = [];
            this.isReorderMode = false;
            this.outputFormat = OUTPUT_FORMATS.MARKDOWN;
            this.history = [];
            this.historyIndex = -1;
        }

        saveToHistory() {
            const state = {
                headers: JSON.parse(JSON.stringify(this.headers)), // Deep copy
                rows: JSON.parse(JSON.stringify(this.rows)),       // Deep copy
                alignments: JSON.parse(JSON.stringify(this.alignments)) // Deep copy
            };
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(state);
            this.historyIndex++;
            if (this.history.length > 50) {
                this.history.shift();
                this.historyIndex--;
            }
        }

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const state = this.history[this.historyIndex];
                this.headers = JSON.parse(JSON.stringify(state.headers));
                this.rows = JSON.parse(JSON.stringify(state.rows));
                this.alignments = JSON.parse(JSON.stringify(state.alignments));
                return true;
            }
            return false;
        }

        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const state = this.history[this.historyIndex];
                this.headers = JSON.parse(JSON.stringify(state.headers));
                this.rows = JSON.parse(JSON.stringify(state.rows));
                this.alignments = JSON.parse(JSON.stringify(state.alignments));
                return true;
            }
            return false;
        }

        reset() {
            this.headers = [];
            this.rows = [];
            this.alignments = [];
            this.isReorderMode = false;
            // this.outputFormat = OUTPUT_FORMATS.MARKDOWN; // Don't reset output format preference
            this.history = [];
            this.historyIndex = -1;
        }

        isEmpty() { return this.headers.length === 0 && this.rows.length === 0; }
        isValid() { return this.headers.length > 0 && this.alignments.length === this.headers.length; }
    }

    const tableState = new TableState();

    const utils = {
        sanitizeInput: (str) => {
            if (typeof str !== 'string') return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },
        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(null, args), delay); // Fix: use null instead of this
            };
        },
        copyToClipboard: async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn("Clipboard API failed, trying execCommand:", err);
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.left = '-9999px'; // Fix: better positioning
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    return success;
                } catch (e) {
                    document.body.removeChild(textarea);
                    console.error("execCommand failed:", e);
                    return false;
                }
            }
        },
        normalizeServiceName: (name) => name.toLowerCase().trim().replace(/\s+/g, ''),
        capitalizeFirstLetterOfWords: (string) => {
            return string.replace(/\b\w/g, char => char.toUpperCase())
                .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
                .replace(/\b\w/g, char => char.toUpperCase())
                .replace(/\s+/g, '');
        }
    };


    const notification = {
        show: (message, type = NOTIFICATION_TYPES.SUCCESS, duration = 3000) => {
            if (!elements.notificationDiv) return;
            elements.notificationDiv.textContent = message;
            elements.notificationDiv.className = 'notification show'; // Reset classes
            elements.notificationDiv.classList.add(type);

            elements.notificationDiv.style.opacity = '1';
            elements.notificationDiv.style.bottom = '30px';

            setTimeout(() => {
                elements.notificationDiv.style.opacity = '0';
                elements.notificationDiv.style.bottom = '20px';
                setTimeout(() => {
                    if (elements.notificationDiv.style.opacity === '0') { // ensure it's still hidden
                        elements.notificationDiv.classList.remove('show', type);
                    }
                }, 300); // Wait for transition
            }, duration);
        }
    };

    const themeManager = {
        toggle: () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
            themeManager.set(newTheme);
        },
        set: (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeManager.updateIcons(theme);
        },
        updateIcons: (theme) => {
            if (!elements.sunPath || !elements.moonPath) return;
            elements.sunPath.style.display = theme === THEMES.DARK ? 'block' : 'none';
            elements.moonPath.style.display = theme === THEMES.DARK ? 'none' : 'block';
        },
        init: () => {
            const savedTheme = localStorage.getItem('theme') ||
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT);
            themeManager.set(savedTheme);
        }
    };

    const tableParser = {
        parse: (inputText) => {
            if (!inputText?.trim()) throw new Error('Input is empty.');

            const lines = inputText.trim().split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length < 1) throw new Error('Table must have at least a header row.');

            const headerLineIndex = lines.findIndex(line => line.includes('|'));
            if (headerLineIndex === -1) throw new Error('No valid header row found.');

            const headers = tableParser.parseRow(lines[headerLineIndex]);

            let alignments;
            let dataStartIndex = headerLineIndex + 1;

            if (dataStartIndex < lines.length) {
                const potentialSeparatorLine = lines[dataStartIndex];
                if (potentialSeparatorLine && potentialSeparatorLine.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/)) {
                    const separatorCells = tableParser.parseRow(potentialSeparatorLine);
                    if (separatorCells.length === headers.length) {
                        alignments = separatorCells.map(cell => {
                            const trimmed = cell.trim();
                            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return ALIGNMENTS.CENTER;
                            if (trimmed.endsWith(':')) return ALIGNMENTS.RIGHT;
                            return ALIGNMENTS.LEFT;
                        });
                        dataStartIndex++;
                    }
                }
            }

            if (!alignments || alignments.length !== headers.length) {
                alignments = headers.map(() => ALIGNMENTS.LEFT);
            }

            const dataRowLines = lines.slice(dataStartIndex).filter(line => {
                return !line.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/);
            });

            const rows = dataRowLines.map((line) => {
                const row = tableParser.parseRow(line);
                while (row.length < headers.length) row.push('');
                if (row.length > headers.length) row.splice(headers.length);
                return row;
            });

            return {
                headers: headers.map(h => utils.sanitizeInput(h.replace(/\*\*/g, ''))),
                alignments,
                rows: rows.map(row => row.map(cell => utils.sanitizeInput(cell.replace(/\*\*/g, ''))))
            };
        },
        parseRow: (line) => {
            const cells = line.split('|').map(cell => cell.trim());
            // Fix: More robust cell filtering
            let startIndex = 0;
            let endIndex = cells.length;

            // Remove empty cells at the beginning (from leading |)
            if (cells[0] === '') startIndex = 1;
            // Remove empty cells at the end (from trailing |)
            if (cells[cells.length - 1] === '') endIndex = cells.length - 1;

            return cells.slice(startIndex, endIndex);
        }
    };

    // Service/Provider specific conversion functions (adapted from Tool 2)
    const serviceProviderConverter = {
        tableToServiceProviderJson: (headers, rows) => {
            if (!headers || headers.length === 0 || !rows) {
                throw new Error("Invalid table data for Service/Provider JSON conversion.");
            }
            const jsonData = {};
            const serviceNameHeader = headers[0]; // Assume first col is service name
            const providerHeaders = headers.slice(1);

            rows.forEach(row => {
                const serviceName = row[0]?.trim();
                if (serviceName) {
                    jsonData[serviceName] = {};
                    providerHeaders.forEach((providerHeader, idx) => {
                        jsonData[serviceName][providerHeader] = (row[idx + 1]?.toLowerCase() === 'yes') ? 'yes' : 'no';
                    });
                }
            });
            return jsonData;
        },

        serviceProviderJsonToTable: (jsonData) => {
            if (Object.keys(jsonData).length === 0) {
                return { headers: [], rows: [], alignments: [] };
            }

            const serviceNames = Object.keys(jsonData);
            // Get all unique provider names from all services to form headers
            const allProviders = new Set();
            serviceNames.forEach(service => {
                if (jsonData[service]) {
                    Object.keys(jsonData[service]).forEach(provider => allProviders.add(provider));
                }
            });

            const sortedProviders = Array.from(allProviders).sort();

            const headers = ["Service Name", ...sortedProviders];
            const alignments = headers.map(() => ALIGNMENTS.LEFT); // Default alignment

            const rows = serviceNames.sort().map(serviceName => {
                const row = [serviceName];
                sortedProviders.forEach(provider => {
                    row.push(jsonData[serviceName]?.[provider]?.toLowerCase() === 'yes' ? 'Yes' : 'No');
                });
                return row;
            });
            return { headers, rows, alignments };
        },

        updateServiceProviderJson: (currentJson, newProviderName, supportedServicesCsv) => {
            if (!newProviderName || !supportedServicesCsv) {
                throw new Error("New provider name and supported services are required.");
            }

            let baseJSON = JSON.parse(JSON.stringify(currentJson)); // Deep copy
            const normalizedNewProviderName = utils.capitalizeFirstLetterOfWords(newProviderName.trim());

            const supportedServicesList = supportedServicesCsv.split(',')
                .map(s => utils.normalizeServiceName(s.trim()))
                .filter(Boolean);

            const updatedJSON = {};

            // Normalize existing service keys and add new provider with 'no'
            Object.keys(baseJSON).forEach(serviceKey => {
                const normalizedServiceKey = utils.normalizeServiceName(serviceKey);
                updatedJSON[normalizedServiceKey] = { ...baseJSON[serviceKey] };
                updatedJSON[normalizedServiceKey][normalizedNewProviderName] = 'no';
            });

            // Update 'yes' for supported services for the new provider
            supportedServicesList.forEach(supportedServiceNorm => {
                if (updatedJSON[supportedServiceNorm]) {
                    updatedJSON[supportedServiceNorm][normalizedNewProviderName] = 'yes';
                } else { // New service found in the list
                    updatedJSON[supportedServiceNorm] = {};
                    // Infer existing providers from the first service in baseJSON to fill 'no' for them
                    const firstServiceInBase = Object.keys(baseJSON)[0];
                    if (firstServiceInBase && baseJSON[firstServiceInBase]) {
                        Object.keys(baseJSON[firstServiceInBase]).forEach(existingProvider => {
                            updatedJSON[supportedServiceNorm][existingProvider] = 'no';
                        });
                    }
                    updatedJSON[supportedServiceNorm][normalizedNewProviderName] = 'yes';
                }
            });

            // Final JSON with capitalized service names
            const finalJSON = {};
            Object.keys(updatedJSON).sort().forEach(normalizedServiceKey => {
                const capitalizedServiceName = utils.capitalizeFirstLetterOfWords(normalizedServiceKey); // Capitalize for display
                finalJSON[capitalizedServiceName] = {};
                // Ensure provider columns are sorted for consistency
                const providers = Object.keys(updatedJSON[normalizedServiceKey]).sort();
                providers.forEach(provider => {
                    finalJSON[capitalizedServiceName][provider] = updatedJSON[normalizedServiceKey][provider];
                });
            });
            return finalJSON;
        }
    };


    const outputGenerators = {
        [OUTPUT_FORMATS.MARKDOWN]: () => {
            if (!tableState.isValid()) return '';
            const separator = `| ${tableState.alignments.map(align => ALIGNMENT_MARKERS[align] || ALIGNMENT_MARKERS[ALIGNMENTS.LEFT]).join(' | ')} |`;
            const header = `| ${tableState.headers.join(' | ')} |`;
            const rows = tableState.rows.map(row => `| ${row.join(' | ')} |`).join('\n');
            return [header, separator, rows].filter(Boolean).join('\n');
        },
        [OUTPUT_FORMATS.GENERIC_JSON]: () => {
            if (!tableState.isValid()) return JSON.stringify({}, null, 2);
            // Tool 1's original JSON output logic (service name as key, then header:value)
            const jsonOutput = tableState.rows.map(row => {
                const rowObject = {};
                tableState.headers.forEach((header, index) => {
                    rowObject[header] = row[index];
                });
                return rowObject;
            });
            return JSON.stringify(jsonOutput, null, 2);
        },
        [OUTPUT_FORMATS.SERVICE_PROVIDER_JSON]: () => {
            if (!tableState.isValid()) return JSON.stringify({}, null, 2);
            try {
                const spJson = serviceProviderConverter.tableToServiceProviderJson(tableState.headers, tableState.rows);
                return JSON.stringify(spJson, null, 2);
            } catch (error) {
                notification.show(`Error converting to Service/Provider JSON: ${error.message}`, NOTIFICATION_TYPES.ERROR);
                return JSON.stringify({ error: error.message }, null, 2);
            }
        },
        [OUTPUT_FORMATS.HTML]: () => {
            if (!tableState.isValid()) return '';
            const alignmentClass = (align) => align !== ALIGNMENTS.LEFT ? ` style="text-align: ${align};"` : '';
            const headerRow = tableState.headers
                .map((header, i) => `<th${alignmentClass(tableState.alignments[i])}>${utils.sanitizeInput(header)}</th>`)
                .join('');
            const bodyRows = tableState.rows
                .map(row => {
                    const cells = row
                        .map((cell, i) => `<td${alignmentClass(tableState.alignments[i])}>${utils.sanitizeInput(cell)}</td>`)
                        .join('');
                    return `<tr>${cells}</tr>`;
                })
                .join('');
            return `<table>\n<thead>\n<tr>${headerRow}</tr>\n</thead>\n<tbody>\n${bodyRows}\n</tbody>\n</table>`;
        }
    };

    // Table renderer (from Tool 1, largely unchanged but using utils.sanitizeInput more)
    const tableRenderer = {
        render: () => {
            if (tableState.isEmpty()) {
                elements.tableContainer.innerHTML = '<p class="empty-table-message">Paste a Markdown table above or use "Add Row/Column" to start.</p>';
                outputManager.generate();
                return;
            }
            if (!tableState.isValid()) {
                elements.tableContainer.innerHTML = '<p class="empty-table-message error-message">Table data is invalid. Ensure headers and alignments match.</p>';
                outputManager.generate();
                return;
            }

            try {
                const table = document.createElement('table');
                table.appendChild(tableRenderer.createHeader());
                table.appendChild(tableRenderer.createBody());
                elements.tableContainer.innerHTML = '';
                elements.tableContainer.appendChild(table);
                outputManager.generate();
            } catch (error) {
                console.error('Error rendering table:', error);
                elements.tableContainer.innerHTML = '<p class="empty-table-message error-message">Error rendering table. Please check your data.</p>';
            }
        },
        createHeader: () => {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            tableState.headers.forEach((header, index) => {
                const th = document.createElement('th');
                th.textContent = header; // Already sanitized by parser or input
                th.draggable = tableState.isReorderMode;
                th.dataset.index = index;
                th.classList.toggle('dragging-allowed', tableState.isReorderMode);
                th.contentEditable = !tableState.isReorderMode;
                th.tabIndex = tableState.isReorderMode ? -1 : 0;

                if (tableState.isReorderMode) {
                    th.addEventListener('dragstart', dragHandler.handleDragStart);
                    th.addEventListener('dragover', dragHandler.handleDragOver);
                    th.addEventListener('drop', dragHandler.handleDrop);
                }
                th.addEventListener('blur', () => {
                    if (!tableState.isReorderMode) {
                        const newHeader = utils.sanitizeInput(th.textContent);
                        if (tableState.headers[index] !== newHeader) {
                            tableState.saveToHistory();
                            tableState.headers[index] = newHeader;
                            outputManager.generate();
                        }
                    }
                });
                th.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !tableState.isReorderMode) { e.preventDefault(); th.blur(); } });
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            return thead;
        },
        createBody: () => {
            const tbody = document.createElement('tbody');
            tableState.rows.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                tr.draggable = tableState.isReorderMode;
                tr.dataset.index = rowIndex;
                tr.classList.toggle('dragging-allowed', tableState.isReorderMode);

                if (tableState.isReorderMode) {
                    tr.addEventListener('dragstart', dragHandler.handleDragStart);
                    tr.addEventListener('dragover', dragHandler.handleDragOver);
                    tr.addEventListener('drop', dragHandler.handleDrop);
                }
                row.forEach((cell, cellIndex) => {
                    const td = document.createElement('td');
                    td.textContent = cell; // Already sanitized
                    td.contentEditable = !tableState.isReorderMode;
                    td.tabIndex = tableState.isReorderMode ? -1 : 0;
                    td.addEventListener('blur', () => {
                        if (!tableState.isReorderMode) {
                            const newCell = utils.sanitizeInput(td.textContent);
                            if (tableState.rows[rowIndex][cellIndex] !== newCell) {
                                tableState.saveToHistory();
                                tableState.rows[rowIndex][cellIndex] = newCell;
                                outputManager.generate();
                            }
                        }
                    });
                    td.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !tableState.isReorderMode) { e.preventDefault(); td.blur(); } });
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            return tbody;
        }
    };

    // Drag and drop handler (from Tool 1, largely unchanged)
    const dragHandler = {
        currentDraggedElement: null,
        handleDragStart: (event) => {
            dragHandler.currentDraggedElement = event.target;
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', event.target.dataset.index);
            event.dataTransfer.setData('type', event.target.tagName.toLowerCase());
            event.dataTransfer.effectAllowed = 'move';
        },
        handleDragOver: (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const target = event.target.closest('tr, th');
            if (!target || target === dragHandler.currentDraggedElement) return;

            const type = event.dataTransfer.getData('type');
            if (type === 'tr' && target.tagName === 'TR') {
                const container = target.parentNode; // tbody
                const afterElement = dragHandler.getDragAfterElement(container, event.clientY, 'tr');
                if (dragHandler.currentDraggedElement) {
                    if (afterElement == null) {
                        container.appendChild(dragHandler.currentDraggedElement);
                    } else {
                        container.insertBefore(dragHandler.currentDraggedElement, afterElement);
                    }
                }
            } else if (type === 'th' && target.tagName === 'TH') {
                // For column reordering, visual feedback is harder without full re-render
                // We'll rely on the 'drop' event to actually reorder data and re-render
            }
        },
        handleDrop: (event) => {
            event.preventDefault();
            if (!dragHandler.currentDraggedElement) return;

            dragHandler.currentDraggedElement.classList.remove('dragging');
            const fromIndex = parseInt(event.dataTransfer.getData('text/plain'));
            const type = event.dataTransfer.getData('type');
            let toElement = event.target.closest('tr, th');

            if (!toElement) { // Dropped somewhere not on a valid target
                dragHandler.currentDraggedElement = null;
                tableRenderer.render(); // Re-render to restore original order if drop failed
                return;
            }

            const toIndex = parseInt(toElement.dataset.index);

            if (fromIndex !== toIndex) {
                tableState.saveToHistory();
                if (type === 'th') {
                    tableOperations.reorderColumns(fromIndex, toIndex);
                } else if (type === 'tr') {
                    // For rows, the visual drag/drop might be sufficient if handled well by getDragAfterElement
                    // Let's re-calculate toIndex based on final position
                    const parent = dragHandler.currentDraggedElement.parentNode;
                    const finalToIndex = Array.from(parent.children).indexOf(dragHandler.currentDraggedElement);
                    tableOperations.reorderRows(fromIndex, finalToIndex);
                }
                tableRenderer.render();
                analyzer.analyzeIfOpen();
            }
            dragHandler.currentDraggedElement = null;
        },
        getDragAfterElement: (container, y, selector) => {
            const draggableElements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    };

    // Table operations (from Tool 1, with additions)
    const tableOperations = {
        addColumn: () => {
            if (tableState.isReorderMode) return;
            tableState.saveToHistory();
            const newHeaderName = `Column ${tableState.headers.length + 1}`;
            tableState.headers.push(newHeaderName);
            tableState.alignments.push(ALIGNMENTS.LEFT);
            tableState.rows.forEach(row => row.push(''));
            tableRenderer.render();
            notification.show('Column added');
        },
        addRow: () => {
            if (tableState.isReorderMode) return;
            tableState.saveToHistory();
            const newRow = Array(tableState.headers.length).fill('');
            tableState.rows.push(newRow);
            tableRenderer.render();
            notification.show('Row added');
        },
        removeColumn: () => {
            if (tableState.isReorderMode) return;
            if (tableState.headers.length <= 1) {
                notification.show('Cannot remove the last column', NOTIFICATION_TYPES.WARNING);
                return;
            }
            tableState.saveToHistory();
            const indexToRemove = tableState.headers.length - 1; // remove last
            tableState.headers.splice(indexToRemove, 1);
            tableState.alignments.splice(indexToRemove, 1);
            tableState.rows.forEach(row => row.splice(indexToRemove, 1));
            tableRenderer.render();
            analyzer.analyzeIfOpen();
            notification.show('Last column removed');
        },
        removeRow: () => {
            if (tableState.isReorderMode) return;
            if (tableState.rows.length === 0) {
                notification.show('No rows to remove', NOTIFICATION_TYPES.WARNING);
                return;
            }
            tableState.saveToHistory();
            tableState.rows.pop(); // remove last
            tableRenderer.render();
            analyzer.analyzeIfOpen();
            notification.show('Last row removed');
        },
        sortRows: () => {
            if (tableState.isReorderMode) return;
            if (!tableState.rows.length) {
                notification.show('No rows to sort', NOTIFICATION_TYPES.WARNING);
                return;
            }
            tableState.saveToHistory();
            tableState.rows.sort((a, b) =>
                (a[0]?.toLowerCase() || '').localeCompare(b[0]?.toLowerCase() || '')
            );
            tableRenderer.render();
            notification.show('Rows sorted by first column');
        },
        reorderColumns: (fromIndex, toIndex) => {
            const move = (arr) => {
                const el = arr.splice(fromIndex, 1)[0];
                arr.splice(toIndex, 0, el);
            };
            move(tableState.headers);
            move(tableState.alignments);
            tableState.rows.forEach(row => move(row));
        },
        reorderRows: (fromIndex, toIndex) => {
            const el = tableState.rows.splice(fromIndex, 1)[0];
            tableState.rows.splice(toIndex, 0, el);
        },
        // New: Add Provider (integrates Tool 2 logic)
        addProviderAndUpdateTable: () => {
            if (tableState.isReorderMode) return;
            const newProviderName = elements.newProviderNameInput.value.trim();
            const supportedServicesCsv = elements.supportedServicesInput.value.trim();

            if (!newProviderName) {
                notification.show("New Provider Name is required.", NOTIFICATION_TYPES.ERROR);
                elements.newProviderNameInput.focus();
                return;
            }
            if (!supportedServicesCsv) {
                notification.show("Supported Services list is required.", NOTIFICATION_TYPES.ERROR);
                elements.supportedServicesInput.focus();
                return;
            }
            if (tableState.headers.length === 0) {
                notification.show("Cannot add provider to an empty table. Parse or create a table first.", NOTIFICATION_TYPES.ERROR);
                return;
            }


            try {
                tableState.saveToHistory();
                // 1. Convert current table to Service/Provider JSON
                const currentSpJson = serviceProviderConverter.tableToServiceProviderJson(tableState.headers, tableState.rows);

                // 2. Apply update logic
                const updatedSpJson = serviceProviderConverter.updateServiceProviderJson(currentSpJson, newProviderName, supportedServicesCsv);

                // 3. Convert updated JSON back to table structure
                const { headers, rows, alignments } = serviceProviderConverter.serviceProviderJsonToTable(updatedSpJson);

                // 4. Update tableState and re-render
                tableState.headers = headers;
                tableState.rows = rows;
                tableState.alignments = alignments; // Use new alignments or derive them

                tableRenderer.render();
                analyzer.analyzeIfOpen();
                notification.show(`Provider "${newProviderName}" added/updated.`, NOTIFICATION_TYPES.SUCCESS);
                elements.newProviderNameInput.value = ''; // Clear inputs
                elements.supportedServicesInput.value = '';
            } catch (error) {
                console.error("Error adding provider:", error);
                notification.show(`Error: ${error.message}`, NOTIFICATION_TYPES.ERROR, 5000);
                // No undo history save on error, or potentially pop the last history item if it was optimistic.
                // For now, let's just not save to history if an error occurs mid-way
                if (tableState.historyIndex > 0 && tableState.history[tableState.historyIndex].headers.length === 0) {
                    tableState.history.pop();
                    tableState.historyIndex--;
                }
            }
        }
    };

    const outputManager = {
        generate: () => {
            if (tableState.isEmpty()) { // Fix: simplified condition
                elements.outputTextArea.value = '';
                return;
            }
            if (!tableState.isValid()) {
                elements.outputTextArea.value = 'Table data is currently invalid. Cannot generate output.';
                return;
            }

            const generator = outputGenerators[tableState.outputFormat];
            if (generator) {
                elements.outputTextArea.value = generator();
            } else {
                console.error(`Unknown output format: ${tableState.outputFormat}`);
                elements.outputTextArea.value = outputGenerators[OUTPUT_FORMATS.MARKDOWN]();
            }
        },
        setFormat: (format) => {
            if (Object.values(OUTPUT_FORMATS).includes(format)) {
                tableState.outputFormat = format;
                outputManager.generate();
            }
        }
    };

    // Table analyzer (from Tool 1, minor updates)
    const analyzer = {
        analyze: () => {
            if (tableState.rows.length === 0 || tableState.headers.length === 0) {
                elements.analysisMarkdownOutput.textContent = 'No data to analyze. Table is empty.';
                return;
            }
            if (!tableState.isValid()) {
                elements.analysisMarkdownOutput.textContent = 'Table structure is invalid. Cannot analyze.';
                return;
            }

            const totalRows = tableState.rows.length;

            // Build the compact analysis table
            let analysisOutput = '| ';

            // First column: Total count
            analysisOutput += `**Total** = \`${totalRows}\` | `;

            // Skip first header (Service Name) and analyze provider columns
            const providerHeaders = tableState.headers.slice(1);
            const analysisCells = [];

            providerHeaders.forEach((header, i) => {
                const columnIndex = i + 1; // +1 because we skip first column
                const yesCount = tableState.rows.reduce((count, row) => {
                    return count + (row[columnIndex]?.trim().toLowerCase() === 'yes' ? 1 : 0);
                }, 0);
                analysisCells.push(`\`${yesCount}/${totalRows}\``);
            });

            analysisOutput += analysisCells.join(' | ') + ' |';

            elements.analysisMarkdownOutput.textContent = analysisOutput;
            notification.show('Table analyzed!', NOTIFICATION_TYPES.INFO);
        },
        analyzeIfOpen: () => {
            if (elements.analysisDetails && elements.analysisDetails.open) {
                analyzer.analyze();
            }
        }
    };

    const app = {

        init: () => {
            // Fix: Better initialization order
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    themeManager.init();
                    app.bindEvents();
                    app.initializeKeyboardShortcuts();
                    tableRenderer.render();
                    if (elements.outputFormatSelect?.value) {
                        outputManager.setFormat(elements.outputFormatSelect.value);
                    }
                });
            } else {
                themeManager.init();
                app.bindEvents();
                app.initializeKeyboardShortcuts();
                tableRenderer.render();
                if (elements.outputFormatSelect?.value) {
                    outputManager.setFormat(elements.outputFormatSelect.value);
                }
            }
        },
        parseTable: () => {
            const inputText = elements.inputTextArea.value.trim();
            if (!inputText) {
                notification.show('Input is empty. Nothing to parse.', NOTIFICATION_TYPES.WARNING);
                return;
            }
            try {
                const parsed = tableParser.parse(inputText);
                tableState.saveToHistory(); // Save *before* changing state
                Object.assign(tableState, parsed); // This overwrites current state
                tableRenderer.render();
                analyzer.analyzeIfOpen();
                notification.show('Table parsed successfully!');
            } catch (error) {
                notification.show(`Error parsing table: ${error.message}`, NOTIFICATION_TYPES.ERROR, 5000);
                console.error('Parsing error:', error);
            }
        },
        copyOutputToClipboard: async () => {
            if (!elements.outputTextArea.value) {
                notification.show('Nothing to copy from output.', NOTIFICATION_TYPES.WARNING);
                return;
            }
            const success = await utils.copyToClipboard(elements.outputTextArea.value);
            notification.show(
                success ? 'Output copied to clipboard!' : 'Failed to copy output.',
                success ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.ERROR
            );
        },
        clearAll: () => {
            if (confirm('Are you sure you want to clear all input, table data, and output?')) {
                tableState.saveToHistory(); // Save current state before clearing for undo
                elements.inputTextArea.value = '';
                elements.outputTextArea.value = '';
                // elements.tableContainer.innerHTML = ''; // render will handle this
                elements.analysisMarkdownOutput.textContent = 'Analysis results will appear here.';
                tableState.reset();
                tableRenderer.render(); // Re-render to show empty state
                outputManager.generate(); // Clear output
                notification.show('All cleared. You can undo this action.');
            }
        },
        toggleReorderMode: () => {
            tableState.isReorderMode = !tableState.isReorderMode;
            elements.reorderBtn.innerHTML = `<span class="icon">${tableState.isReorderMode ? '✏️' : '✥'}</span> ${tableState.isReorderMode ? 'Edit Mode' : 'Re-order'}`;
            elements.reorderBtn.setAttribute('aria-label', tableState.isReorderMode ? 'Switch to edit mode' : 'Switch to reorder mode');
            tableRenderer.render(); // Re-render to update draggable attributes etc.
        },
        undo: () => {
            if (tableState.undo()) {
                tableRenderer.render();
                analyzer.analyzeIfOpen();
                notification.show('Action undone.', NOTIFICATION_TYPES.INFO);
            } else {
                notification.show('Nothing to undo.', NOTIFICATION_TYPES.WARNING);
            }
        },
        redo: () => {
            if (tableState.redo()) {
                tableRenderer.render();
                analyzer.analyzeIfOpen();
                notification.show('Action redone.', NOTIFICATION_TYPES.INFO);
            } else {
                notification.show('Nothing to redo.', NOTIFICATION_TYPES.WARNING);
            }
        },
        bindEvents: () => {
            // Fix: Add null checks for all elements
            elements.themeToggle?.addEventListener('click', themeManager.toggle);
            elements.parseBtn?.addEventListener('click', app.parseTable);
            elements.analyzeBtn?.addEventListener('click', analyzer.analyze);
            elements.copyOutputBtn?.addEventListener('click', app.copyOutputToClipboard);
            elements.clearBtn?.addEventListener('click', app.clearAll);
            elements.addColumnBtn?.addEventListener('click', tableOperations.addColumn);
            elements.addRowBtn?.addEventListener('click', tableOperations.addRow);
            elements.sortRowsBtn?.addEventListener('click', tableOperations.sortRows);
            elements.removeColumnBtn?.addEventListener('click', tableOperations.removeColumn);
            elements.removeRowBtn?.addEventListener('click', tableOperations.removeRow);
            elements.reorderBtn?.addEventListener('click', app.toggleReorderMode);
            elements.addProviderBtn?.addEventListener('click', tableOperations.addProviderAndUpdateTable);

            // Fix: Better debounced input handling
            if (elements.inputTextArea) {
                elements.inputTextArea.addEventListener('input', utils.debounce(() => {
                    if (elements.inputTextArea.value.trim() === '') {
                        tableState.reset();
                        tableRenderer.render();
                        analyzer.analyzeIfOpen();
                        outputManager.generate();
                    } else {
                        app.parseTable();
                    }
                }, 500));
            }

            elements.outputFormatSelect?.addEventListener('change', (e) => outputManager.setFormat(e.target.value));

            // Fix: Use proper event for initialization
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', themeManager.init);
            } else {
                themeManager.init();
            }

            window.addEventListener('beforeunload', (e) => {
                if (!tableState.isEmpty()) {
                    e.preventDefault();
                    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                }
            });

            [elements.advancedOpsDetails, elements.analysisDetails].forEach(details => {
                if (details) {
                    details.addEventListener('toggle', () => {
                        if (details.id === 'analysisDetails' && details.open) {
                            analyzer.analyze();
                        }
                    });
                }
            });
        },
        initializeKeyboardShortcuts: () => {
            document.addEventListener('keydown', (e) => {
                const isInInput = e.target.closest('textarea, input, [contenteditable="true"]');

                if (isInInput) {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.target.blur();
                        return;
                    } else if (e.key === 'Escape' && e.target.hasAttribute('contenteditable')) {
                        e.target.blur();
                        return;
                    }

                    // Don't handle global shortcuts in input fields except for contenteditable
                    if (!e.target.hasAttribute('contenteditable')) {
                        return;
                    }
                }
                // Global keyboard shortcuts
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    app.undo();
                } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    app.redo();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isInInput) {
                    e.preventDefault();
                    app.parseTable();
                } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'C') {
                    e.preventDefault();
                    app.copyOutputToClipboard();
                }
            });
        },
    };

    app.init();
})();