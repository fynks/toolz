(() => {
    "use strict";

    // Constants
    const THEMES = Object.freeze({
        DARK: 'dark',
        LIGHT: 'light'
    });

    const OUTPUT_FORMATS = Object.freeze({
        MARKDOWN: 'markdown',
        JSON: 'json',
        HTML: 'html'
    });

    const ALIGNMENTS = Object.freeze({
        CENTER: 'center',
        RIGHT: 'right',
        LEFT: 'left'
    });

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

    // DOM element references - using more efficient query patterns
    const elements = {
        // Theme elements
        themeToggle: document.getElementById('themeToggle'),
        get sunPath() { return this.themeToggle?.querySelector('.sun'); },
        get moonPath() { return this.themeToggle?.querySelector('.moon'); },

        // Input/Output elements
        inputTextArea: document.getElementById("input"),
        outputTextArea: document.getElementById("output"),

        // Table elements
        tableContainer: document.getElementById("tableContainer"),
        analysisSection: document.getElementById('analysisSection'),
        analysisMarkdownOutput: document.getElementById('analysisMarkdownOutput'),

        // Control buttons
        parseBtn: document.getElementById("parseBtn"),
        analyzeBtn: document.getElementById("analyzeBtn"),
        copyBtn: document.getElementById("copyBtn"),
        clearBtn: document.getElementById("clearBtn"),

        // Table editing buttons
        addColumnBtn: document.getElementById("addColumnBtn"),
        addRowBtn: document.getElementById("addRowBtn"),
        sortRowsBtn: document.getElementById("sortRowsBtn"),
        removeColumnBtn: document.getElementById("removeColumnBtn"),
        removeRowBtn: document.getElementById("removeRowBtn"),
        reorderBtn: document.getElementById("reorderBtn"),

        // Notification element
        notificationDiv: document.getElementById("notification")
    };

    // Application state
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

        // Save current state to history for undo functionality
        saveToHistory() {
            const state = {
                headers: [...this.headers],
                rows: this.rows.map(row => [...row]),
                alignments: [...this.alignments]
            };

            // Remove any future history if we're not at the end
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(state);
            this.historyIndex++;

            // Limit history size
            if (this.history.length > 50) {
                this.history.shift();
                this.historyIndex--;
            }
        }

        // Undo last action
        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const state = this.history[this.historyIndex];
                this.headers = [...state.headers];
                this.rows = state.rows.map(row => [...row]);
                this.alignments = [...state.alignments];
                return true;
            }
            return false;
        }

        // Redo last undone action
        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const state = this.history[this.historyIndex];
                this.headers = [...state.headers];
                this.rows = state.rows.map(row => [...row]);
                this.alignments = [...state.alignments];
                return true;
            }
            return false;
        }

        reset() {
            this.headers = [];
            this.rows = [];
            this.alignments = [];
            this.isReorderMode = false;
            this.outputFormat = OUTPUT_FORMATS.MARKDOWN;
            this.history = [];
            this.historyIndex = -1;
        }

        isEmpty() {
            return this.headers.length === 0 && this.rows.length === 0;
        }

        isValid() {
            return this.headers.length > 0 && this.alignments.length === this.headers.length;
        }
    }

    // Initialize application state
    const tableState = new TableState();

    // Utility functions
    const utils = {
        sanitizeInput: (str) => {
            if (typeof str !== 'string') return '';
            return str
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        debounce: (func, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        },

        throttle: (func, limit) => {
            let inThrottle;
            return (...args) => {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        escapeCSV: (str) => {
            if (typeof str !== 'string') return '';
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        },

        validateTableStructure: (headers, rows) => {
            if (!Array.isArray(headers) || headers.length === 0) {
                throw new Error('Headers must be a non-empty array');
            }
            
            if (!Array.isArray(rows)) {
                throw new Error('Rows must be an array');
            }

            const headerCount = headers.length;
            rows.forEach((row, index) => {
                if (!Array.isArray(row)) {
                    throw new Error(`Row ${index + 1} must be an array`);
                }
                if (row.length !== headerCount) {
                    throw new Error(`Row ${index + 1} has ${row.length} cells, expected ${headerCount}`);
                }
            });
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
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            }
        }
    };

    // Notification system
    const notification = {
        show: (message, type = NOTIFICATION_TYPES.SUCCESS, duration = 3000) => {
            if (!elements.notificationDiv) return;

            const colors = {
                [NOTIFICATION_TYPES.SUCCESS]: '#4CAF50',
                [NOTIFICATION_TYPES.ERROR]: '#dc3545',
                [NOTIFICATION_TYPES.WARNING]: '#ff9800',
                [NOTIFICATION_TYPES.INFO]: '#2196F3'
            };

            elements.notificationDiv.textContent = message;
            elements.notificationDiv.style.backgroundColor = colors[type] || colors[NOTIFICATION_TYPES.SUCCESS];
            elements.notificationDiv.style.display = 'block';
            elements.notificationDiv.setAttribute('aria-live', 'polite');

            setTimeout(() => {
                elements.notificationDiv.style.display = 'none';
            }, duration);
        }
    };

    // Theme management
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

    
    // Table parsing with improved error handling and HTML support
    const tableParser = {
        parse: (inputText) => {
            if (!inputText?.trim()) {
                throw new Error('Please enter a markdown or HTML table');
            }
    
            const trimmedInput = inputText.trim();
            
            // Detect if input is HTML table
            if (trimmedInput.toLowerCase().includes('<table')) {
                return tableParser.parseHTML(trimmedInput);
            } else {
                return tableParser.parseMarkdown(trimmedInput);
            }
        },
    
        parseMarkdown: (inputText) => {
            const lines = inputText.trim().split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('Markdown table must have at least a header and separator row');
            }
    
            const headers = tableParser.parseRow(lines[0]);
            const separatorCells = tableParser.parseRow(lines[1]);
            
            if (headers.length !== separatorCells.length) {
                throw new Error('Header and separator row must have the same number of columns');
            }
    
            const alignments = separatorCells.map(cell => {
                const trimmed = cell.trim();
                if (trimmed.startsWith(':') && trimmed.endsWith(':')) return ALIGNMENTS.CENTER;
                if (trimmed.endsWith(':')) return ALIGNMENTS.RIGHT;
                return ALIGNMENTS.LEFT;
            });
    
            const rows = lines.slice(2).map((line, index) => {
                const row = tableParser.parseRow(line);
                if (row.length !== headers.length) {
                    console.warn(`Row ${index + 3} has ${row.length} columns, expected ${headers.length}. Padding with empty cells.`);
                    // Pad or trim row to match header length
                    while (row.length < headers.length) row.push('');
                    if (row.length > headers.length) row.splice(headers.length);
                }
                return row;
            });
    
            return {
                headers: headers.map(utils.sanitizeInput),
                alignments,
                rows: rows.map(row => row.map(utils.sanitizeInput))
            };
        },
    
        parseHTML: (htmlText) => {
            try {
                // Create a temporary DOM element to parse HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlText;
                
                const table = tempDiv.querySelector('table');
                if (!table) {
                    throw new Error('No table element found in HTML input');
                }
    
                // Extract headers
                const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
                if (!headerRow) {
                    throw new Error('No header row found in HTML table');
                }
    
                const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => 
                    cell.textContent.trim()
                );
    
                if (headers.length === 0) {
                    throw new Error('No headers found in HTML table');
                }
    
                // Extract alignments from CSS classes or styles (default to left)
                const alignments = Array.from(headerRow.querySelectorAll('th, td')).map(cell => {
                    const classList = cell.classList;
                    const style = cell.style.textAlign || '';
                    
                    if (classList.contains('text-center') || style === 'center') return ALIGNMENTS.CENTER;
                    if (classList.contains('text-right') || style === 'right') return ALIGNMENTS.RIGHT;
                    return ALIGNMENTS.LEFT;
                });
    
                // Extract body rows
                const tbody = table.querySelector('tbody');
                const bodyRows = tbody ? 
                    Array.from(tbody.querySelectorAll('tr')) :
                    Array.from(table.querySelectorAll('tr')).slice(1); // Skip first row if no tbody
    
                const rows = bodyRows.map((row, index) => {
                    const cells = Array.from(row.querySelectorAll('td, th')).map(cell => 
                        cell.textContent.trim()
                    );
                    
                    if (cells.length !== headers.length) {
                        console.warn(`HTML row ${index + 1} has ${cells.length} columns, expected ${headers.length}. Padding with empty cells.`);
                        // Pad or trim row to match header length
                        while (cells.length < headers.length) cells.push('');
                        if (cells.length > headers.length) cells.splice(headers.length);
                    }
                    
                    return cells;
                });
    
                return {
                    headers: headers.map(utils.sanitizeInput),
                    alignments,
                    rows: rows.map(row => row.map(utils.sanitizeInput))
                };
    
            } catch (error) {
                throw new Error(`Error parsing HTML table: ${error.message}`);
            }
        },
    
        parseRow: (line) => {
            return line.split('|')
                      .filter((cell, index, array) => {
                          // Remove empty cells at start and end (table borders)
                          return !(index === 0 && cell.trim() === '') && 
                                 !(index === array.length - 1 && cell.trim() === '');
                      })
                      .map(cell => cell.trim());
        }
    };
    
    // Output generators
    const outputGenerators = {
        [OUTPUT_FORMATS.MARKDOWN]: () => {
            const separator = `| ${tableState.alignments.map(align => ALIGNMENT_MARKERS[align]).join(' | ')} |`;
            const header = `| ${tableState.headers.join(' | ')} |`;
            const rows = tableState.rows.map(row => `| ${row.join(' | ')} |`).join('\n');
            return [header, separator, rows].filter(Boolean).join('\n');
        },

        [OUTPUT_FORMATS.JSON]: () => {
            const jsonOutput = {};
            tableState.rows.forEach(row => {
                const serviceName = row[0]?.replace(/\*\*/g, '');
                if (serviceName) {
                    jsonOutput[serviceName] = {};
                    for (let i = 1; i < tableState.headers.length; i++) {
                        const key = tableState.headers[i].replace(/\*\*/g, '');
                        jsonOutput[serviceName][key] = row[i] ? row[i].toLowerCase() : 'no';
                    }
                }
            });
            return JSON.stringify(jsonOutput, null, 2);
        },
        [OUTPUT_FORMATS.HTML]: () => {
            const alignmentClass = (align) => align !== ALIGNMENTS.LEFT ? ` class="text-${align}"` : '';
            
            const headerRow = tableState.headers
                .map((header, i) => `<th${alignmentClass(tableState.alignments[i])}>${header}</th>`)
                .join('');
            
            const bodyRows = tableState.rows
                .map(row => {
                    const cells = row
                        .map((cell, i) => `<td${alignmentClass(tableState.alignments[i])}>${cell}</td>`)
                        .join('');
                    return `<tr>${cells}</tr>`;
                })
                .join('');

            return `<table>
<thead>
<tr>${headerRow}</tr>
</thead>
<tbody>
${bodyRows}
</tbody>
</table>`;
        }
    };

    // Table renderer with improved performance
    const tableRenderer = {
        render: () => {
            if (!tableState.isValid()) {
                elements.tableContainer.innerHTML = '';
                return;
            }

            const table = tableRenderer.createTable();
            elements.tableContainer.innerHTML = '';
            elements.tableContainer.appendChild(table);
            outputManager.generate();
        },

        createTable: () => {
            const table = document.createElement('table');
            table.appendChild(tableRenderer.createHeader());
            table.appendChild(tableRenderer.createBody());
            return table;
        },

        createHeader: () => {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            tableState.headers.forEach((header, index) => {
                const th = tableRenderer.createHeaderCell(header, index);
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            return thead;
        },

        createHeaderCell: (header, index) => {
            const th = document.createElement('th');
            th.textContent = header;
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
                    tableState.saveToHistory();
                    tableState.headers[index] = utils.sanitizeInput(th.textContent);
                    outputManager.generate();
                }
            });

            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !tableState.isReorderMode) {
                    e.preventDefault();
                    th.blur();
                }
            });

            return th;
        },

        createBody: () => {
            const tbody = document.createElement('tbody');

            tableState.rows.forEach((row, rowIndex) => {
                const tr = tableRenderer.createRow(row, rowIndex);
                tbody.appendChild(tr);
            });

            return tbody;
        },

        createRow: (row, rowIndex) => {
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
                const td = tableRenderer.createCell(cell, rowIndex, cellIndex);
                tr.appendChild(td);
            });

            return tr;
        },

        createCell: (cell, rowIndex, cellIndex) => {
            const td = document.createElement('td');
            td.contentEditable = !tableState.isReorderMode;
            td.tabIndex = tableState.isReorderMode ? -1 : 0;
            td.textContent = cell;

            td.addEventListener('blur', () => {
                if (!tableState.isReorderMode) {
                    tableState.saveToHistory();
                    tableState.rows[rowIndex][cellIndex] = utils.sanitizeInput(td.textContent);
                    outputManager.generate();
                }
            });

            td.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !tableState.isReorderMode) {
                    e.preventDefault();
                    td.blur();
                }
            });

            return td;
        }
    };

    // Drag and drop handler
    const dragHandler = {
        handleDragStart: (event) => {
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', event.target.dataset.index);
            event.dataTransfer.setData('type', event.target.tagName.toLowerCase());
        },

        handleDragOver: (event) => {
            event.preventDefault();
            const draggableType = event.dataTransfer.getData('type');
            
            if (draggableType === 'tr') {
                const container = elements.tableContainer.querySelector('tbody');
                const afterElement = dragHandler.getDragAfterElement(container, event.clientY);
                const draggable = document.querySelector('.dragging');
                
                if (afterElement == null) {
                    container.appendChild(draggable);
                } else {
                    container.insertBefore(draggable, afterElement);
                }
            }
        },

        handleDrop: (event) => {
            event.preventDefault();
            const fromIndex = parseInt(event.dataTransfer.getData('text/plain'));
            const toIndex = parseInt(event.target.dataset.index);
            const type = event.dataTransfer.getData('type');

            if (fromIndex !== toIndex) {
                tableState.saveToHistory();
                
                if (type === 'th') {
                    tableOperations.reorderColumns(fromIndex, toIndex);
                } else if (type === 'tr') {
                    const tbody = elements.tableContainer.querySelector('tbody');
                    const droppedRow = tbody.querySelector('tr.dragging');
                    if (droppedRow) {
                        const newIndex = Array.from(tbody.children).indexOf(droppedRow);
                        tableOperations.reorderRows(fromIndex, newIndex);
                    }
                }
                
                tableRenderer.render();
                analyzer.analyze();
            }

            // Clean up dragging classes
            document.querySelectorAll('.dragging').forEach(el => {
                el.classList.remove('dragging');
            });
        },

        getDragAfterElement: (container, y) => {
            const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];

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

    // Table operations
    const tableOperations = {
        addColumn: () => {
            if (tableState.isReorderMode) return;
            
            tableState.saveToHistory();
            tableState.headers.push('New Column');
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
                notification.show('Cannot remove the last column', NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableState.saveToHistory();
            const indexToRemove = tableState.headers.length - 1;
            tableState.headers.splice(indexToRemove, 1);
            tableState.alignments.splice(indexToRemove, 1);
            tableState.rows.forEach(row => row.splice(indexToRemove, 1));
            
            tableRenderer.render();
            analyzer.analyze();
            notification.show('Column removed');
        },

        removeRow: () => {
            if (tableState.isReorderMode) return;
            
            if (tableState.rows.length === 0) {
                notification.show('No rows to remove', NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableState.saveToHistory();
            tableState.rows.pop();
            
            tableRenderer.render();
            analyzer.analyze();
            notification.show('Row removed');
        },

        sortRows: () => {
            if (tableState.isReorderMode) return;
            
            if (!tableState.rows.length) {
                notification.show('No rows to sort', NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableState.saveToHistory();
            tableState.rows.sort((a, b) => 
                (a[0]?.toLowerCase() || '').localeCompare(b[0]?.toLowerCase() || '')
            );
            
            tableRenderer.render();
            notification.show('Rows sorted alphabetically');
        },

        reorderColumns: (fromIndex, toIndex) => {
            const move = (arr) => {
                const element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
            };

            move(tableState.headers);
            move(tableState.alignments);
            tableState.rows.forEach(row => move(row));
        },

        reorderRows: (fromIndex, toIndex) => {
            const element = tableState.rows[fromIndex];
            tableState.rows.splice(fromIndex, 1);
            tableState.rows.splice(toIndex, 0, element);
        },

        duplicateRow: (rowIndex) => {
            if (tableState.isReorderMode) return;
            
            tableState.saveToHistory();
            const rowToDuplicate = [...tableState.rows[rowIndex]];
            tableState.rows.splice(rowIndex + 1, 0, rowToDuplicate);
            
            tableRenderer.render();
            notification.show('Row duplicated');
        },

        insertRowAfter: (rowIndex) => {
            if (tableState.isReorderMode) return;
            
            tableState.saveToHistory();
            const newRow = Array(tableState.headers.length).fill('');
            tableState.rows.splice(rowIndex + 1, 0, newRow);
            
            tableRenderer.render();
            notification.show('Row inserted');
        }
    };

    // Output manager
    const outputManager = {
        generate: () => {
            if (!tableState.isValid()) {
                elements.outputTextArea.value = '';
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

    // Table analyzer
    const analyzer = {
        analyze: () => {
            if (tableState.rows.length === 0 || tableState.headers.length === 0) {
                elements.analysisMarkdownOutput.textContent = '';
                return;
            }

            const totalRows = tableState.rows.length;
            let markdownOutput = `| **Total** = \`${totalRows}\` |`;

            // Start from the second column (index 1)
            for (let i = 1; i < tableState.headers.length; i++) {
                const yesCount = tableState.rows.reduce((count, row) => {
                    return count + (row[i]?.toLowerCase() === 'yes' ? 1 : 0);
                }, 0);
                markdownOutput += ` \`${yesCount}/${totalRows}\` |`;
            }

            elements.analysisMarkdownOutput.textContent = markdownOutput;
            notification.show('Table analyzed!');
        },

        getColumnStats: (columnIndex) => {
            if (columnIndex >= tableState.headers.length) return null;

            const values = tableState.rows.map(row => row[columnIndex] || '');
            const uniqueValues = [...new Set(values)];
            const emptyCells = values.filter(val => !val.trim()).length;

            return {
                columnName: tableState.headers[columnIndex],
                totalCells: values.length,
                uniqueValues: uniqueValues.length,
                emptyCells,
                mostCommon: analyzer.getMostCommonValue(values)
            };
        },

        getMostCommonValue: (values) => {
            const frequency = {};
            values.forEach(val => {
                frequency[val] = (frequency[val] || 0) + 1;
            });

            return Object.entries(frequency)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
        }
    };

    // Main application controller
    const app = {
        init: () => {
            themeManager.init();
            app.bindEvents();
            app.initializeKeyboardShortcuts();
        },

        parseTable: () => {
            const inputText = elements.inputTextArea.value.trim();
            
            try {
                const parsed = tableParser.parse(inputText);
                tableState.saveToHistory();
                Object.assign(tableState, parsed);
                tableRenderer.render();
                notification.show('Table parsed successfully!');
            } catch (error) {
                notification.show(`Error parsing table: ${error.message}`, NOTIFICATION_TYPES.ERROR);
                console.error('Parsing error:', error);
            }
        },

        copyToClipboard: async () => {
            const success = await utils.copyToClipboard(elements.outputTextArea.value);
            notification.show(
                success ? 'Copied to clipboard!' : 'Failed to copy to clipboard',
                success ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.ERROR
            );
        },

        clearAll: () => {
            if (confirm('Are you sure you want to clear everything?')) {
                elements.inputTextArea.value = '';
                elements.outputTextArea.value = '';
                elements.tableContainer.innerHTML = '';
                elements.analysisMarkdownOutput.textContent = '';
                tableState.reset();
                notification.show('All cleared');
            }
        },

        toggleReorderMode: () => {
            tableState.isReorderMode = !tableState.isReorderMode;
            elements.reorderBtn.textContent = tableState.isReorderMode ? 'Edit Table' : 'Re-order';
            tableRenderer.render();
        },

        undo: () => {
            if (tableState.undo()) {
                tableRenderer.render();
                analyzer.analyze();
                notification.show('Undone', NOTIFICATION_TYPES.INFO);
            } else {
                notification.show('Nothing to undo', NOTIFICATION_TYPES.WARNING);
            }
        },

        redo: () => {
            if (tableState.redo()) {
                tableRenderer.render();
                analyzer.analyze();
                notification.show('Redone', NOTIFICATION_TYPES.INFO);
            } else {
                notification.show('Nothing to redo', NOTIFICATION_TYPES.WARNING);
            }
        },

        bindEvents: () => {
            // Theme toggle
            elements.themeToggle?.addEventListener('click', themeManager.toggle);

            // Table operations
            elements.parseBtn?.addEventListener('click', app.parseTable);
            elements.analyzeBtn?.addEventListener('click', () => {
                analyzer.analyze();
                if (elements.analysisSection) {
                    elements.analysisSection.open = true;
                }
            });
            elements.copyBtn?.addEventListener('click', app.copyToClipboard);
            elements.clearBtn?.addEventListener('click', app.clearAll);
            elements.addColumnBtn?.addEventListener('click', tableOperations.addColumn);
            elements.addRowBtn?.addEventListener('click', tableOperations.addRow);
            elements.sortRowsBtn?.addEventListener('click', tableOperations.sortRows);
            elements.removeColumnBtn?.addEventListener('click', tableOperations.removeColumn);
            elements.removeRowBtn?.addEventListener('click', tableOperations.removeRow);
            elements.reorderBtn?.addEventListener('click', app.toggleReorderMode);

            // Input handling
            elements.inputTextArea?.addEventListener('input', 
                utils.debounce(app.parseTable, 300)
            );

            // Output format change
            document.addEventListener('change', (e) => {
                if (e.target?.id === 'outputFormat') {
                    outputManager.setFormat(e.target.value);
                }
            });

            // Window events
            window.addEventListener('DOMContentLoaded', themeManager.init);
            window.addEventListener('beforeunload', (e) => {
                if (!tableState.isEmpty()) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        },

        initializeKeyboardShortcuts: () => {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Z for undo
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    app.undo();
                }
                
                // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
                if ((e.ctrlKey || e.metaKey) && (
                    (e.key === 'z' && e.shiftKey) || e.key === 'y'
                )) {
                    e.preventDefault();
                    app.redo();
                }
                
                // Ctrl/Cmd + Enter for parse
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    app.parseTable();
                }
                
                // Ctrl/Cmd + Shift + C for copy
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    app.copyToClipboard();
                }
            });
        }
    };

    // Initialize the application
    app.init();

})();