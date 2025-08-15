(() => {
    "use strict";
    
    // Constants
    const THEMES = Object.freeze({
        DARK: "dark",
        LIGHT: "light"
    });
    
    const FORMATS = Object.freeze({
        MARKDOWN: "markdown",
        JSON: "json",
        HTML: "html"
    });
    
    const ALIGNMENTS = Object.freeze({
        CENTER: "center",
        RIGHT: "right",
        LEFT: "left"
    });
    
    const ALIGNMENT_MARKERS = Object.freeze({
        [ALIGNMENTS.CENTER]: ":---:",
        [ALIGNMENTS.RIGHT]: "---:",
        [ALIGNMENTS.LEFT]: ":---"
    });
    
    const NOTIFICATION_TYPES = Object.freeze({
        SUCCESS: "success",
        ERROR: "error",
        WARNING: "warning",
        INFO: "info"
    });
    
    // DOM Elements
    const elements = {
        themeToggle: document.getElementById("themeToggle"),
        get sunPath() { return this.themeToggle?.querySelector(".sun"); },
        get moonPath() { return this.themeToggle?.querySelector(".moon"); },
        inputTextArea: document.getElementById("input"),
        outputTextArea: document.getElementById("output"),
        outputFormat: document.getElementById("outputFormat"),
        tableContainer: document.getElementById("tableContainer"),
        analysisSection: document.getElementById("analysisSection"),
        analysisMarkdownOutput: document.getElementById("analysisMarkdownOutput"),
        parseBtn: document.getElementById("parseBtn"),
        analyzeBtn: document.getElementById("analyzeBtn"),
        copyBtn: document.getElementById("copyBtn"),
        clearBtn: document.getElementById("clearBtn"),
        addColumnBtn: document.getElementById("addColumnBtn"),
        addRowBtn: document.getElementById("addRowBtn"),
        sortRowsBtn: document.getElementById("sortRowsBtn"),
        removeColumnBtn: document.getElementById("removeColumnBtn"),
        removeRowBtn: document.getElementById("removeRowBtn"),
        reorderBtn: document.getElementById("reorderBtn"),
        notificationDiv: document.getElementById("notification")
    };
    
    // Table Model
    class TableModel {
        constructor() {
            this.reset();
        }
        
        saveToHistory() {
            const state = {
                headers: [...this.headers],
                rows: this.rows.map(row => [...row]),
                alignments: [...this.alignments]
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
                this.headers = [...state.headers];
                this.rows = state.rows.map(row => [...row]);
                this.alignments = [...state.alignments];
                return true;
            }
            return false;
        }
        
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
            this.outputFormat = FORMATS.MARKDOWN;
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
    
    const tableModel = new TableModel();
    
    // Utility Functions
    const escapeHtml = (text) => {
        if (typeof text !== "string") return String(text || "");
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };
    
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand("copy");
            document.body.removeChild(textarea);
            return success;
        }
    };
    
    const showNotification = (message, type = NOTIFICATION_TYPES.SUCCESS, duration = 3000) => {
        if (!elements.notificationDiv) return;
        
        const colors = {
            [NOTIFICATION_TYPES.SUCCESS]: "#4CAF50",
            [NOTIFICATION_TYPES.ERROR]: "#dc3545",
            [NOTIFICATION_TYPES.WARNING]: "#ff9800",
            [NOTIFICATION_TYPES.INFO]: "#2196F3"
        };
        
        elements.notificationDiv.textContent = message;
        elements.notificationDiv.style.backgroundColor = colors[type] || colors[NOTIFICATION_TYPES.SUCCESS];
        elements.notificationDiv.style.display = "block";
        elements.notificationDiv.setAttribute("aria-live", "polite");
        
        setTimeout(() => {
            elements.notificationDiv.style.display = "none";
        }, duration);
    };
    
    // Theme Management
    const themeManager = {
        toggle() {
            const currentTheme = document.documentElement.getAttribute("data-theme") === THEMES.DARK 
                ? THEMES.LIGHT 
                : THEMES.DARK;
            this.set(currentTheme);
        },
        
        set(theme) {
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
            this.updateIcons(theme);
        },
        
        updateIcons(theme) {
            if (elements.sunPath && elements.moonPath) {
                elements.sunPath.style.display = theme === THEMES.DARK ? "block" : "none";
                elements.moonPath.style.display = theme === THEMES.DARK ? "none" : "block";
            }
        },
        
        init() {
            const savedTheme = localStorage.getItem("theme") || 
                (window.matchMedia("(prefers-color-scheme: dark)").matches 
                    ? THEMES.DARK 
                    : THEMES.LIGHT);
            this.set(savedTheme);
        }
    };
    
    // Table Parser
    const tableParser = {
        parse(input) {
            if (!input?.trim()) throw new Error("Please enter a markdown or HTML table");
            
            const trimmedInput = input.trim();
            const isHTML = this.detectHTMLTable(trimmedInput);
            const isMarkdown = this.detectMarkdownTable(trimmedInput);
            
            if (isHTML) return this.parseHTML(trimmedInput);
            if (isMarkdown) return this.parseMarkdown(trimmedInput);
            
            throw new Error("Input does not appear to be a valid HTML or Markdown table");
        },
        
        detectHTMLTable(input) {
            return /<table[\s\S]*?<\/table>/i.test(input) || input.toLowerCase().includes("<table");
        },
        
        detectMarkdownTable(input) {
            const lines = input.split("\n").filter(line => line.trim());
            if (lines.length < 2) return false;
            
            const hasPipes = lines.some(line => line.includes("|"));
            const hasSeparator = lines.some(line => /^\s*\|?\s*:?-+:?\s*\|\s*/.test(line));
            
            return hasPipes && hasSeparator;
        },
        
        parseMarkdown(input) {
            const lines = input.trim().split("\n").filter(line => line.trim());
            if (lines.length < 2) throw new Error("Markdown table must have at least a header and separator row");
            
            const headers = this.parseRow(lines[0]);
            const separators = this.parseRow(lines[1]);
            
            if (headers.length !== separators.length) {
                throw new Error("Header and separator row must have the same number of columns");
            }
            
            const alignments = separators.map(separator => {
                const trimmed = separator.trim();
                if (trimmed.startsWith(":") && trimmed.endsWith(":")) return ALIGNMENTS.CENTER;
                if (trimmed.endsWith(":")) return ALIGNMENTS.RIGHT;
                return ALIGNMENTS.LEFT;
            });
            
            const rows = lines.slice(2).map((line, index) => {
                const cells = this.parseRow(line);
                if (cells.length !== headers.length) {
                    while (cells.length < headers.length) cells.push("");
                    if (cells.length > headers.length) cells.splice(headers.length);
                }
                return cells;
            });
            
            return {
                headers: headers.map(escapeHtml),
                alignments,
                rows: rows.map(row => row.map(escapeHtml))
            };
        },
        
        parseHTML(input) {
            try {
                const container = document.createElement("div");
                container.innerHTML = input;
                const table = container.querySelector("table");
                
                if (!table) throw new Error("No table element found in HTML input");
                
                let headerRow = table.querySelector("thead tr");
                if (!headerRow) headerRow = table.querySelector("tr:has(th)");
                if (!headerRow) headerRow = table.querySelector("tr");
                if (!headerRow) throw new Error("No header row found in HTML table");
                
                const headers = Array.from(headerRow.querySelectorAll("th, td"))
                    .map(cell => cell.textContent?.trim() || cell.innerText?.trim() || "");
                
                if (headers.length === 0) throw new Error("No headers found in HTML table");
                
                const alignments = Array.from(headerRow.querySelectorAll("th, td")).map(cell => {
                    const classList = cell.classList;
                    const computedStyle = window.getComputedStyle(cell);
                    const inlineAlign = cell.style.textAlign || "";
                    const computedAlign = computedStyle.textAlign || inlineAlign;
                    
                    if (classList.contains("text-center") || classList.contains("center") || computedAlign === "center") {
                        return ALIGNMENTS.CENTER;
                    }
                    if (classList.contains("text-right") || classList.contains("right") || computedAlign === "right") {
                        return ALIGNMENTS.RIGHT;
                    }
                    return ALIGNMENTS.LEFT;
                });
                
                const tbody = table.querySelector("tbody");
                let rows;
                
                if (tbody) {
                    rows = Array.from(tbody.querySelectorAll("tr"));
                } else {
                    const allRows = Array.from(table.querySelectorAll("tr"));
                    const headerIndex = allRows.indexOf(headerRow);
                    rows = allRows.slice(headerIndex + 1);
                }
                
                const parsedRows = rows.map((row, index) => {
                    const cells = [];
                    Array.from(row.querySelectorAll("td, th")).forEach(cell => {
                        const colspan = parseInt(cell.getAttribute("colspan") || "1", 10);
                        const content = cell.textContent?.trim() || cell.innerText?.trim() || "";
                        cells.push(content);
                        for (let i = 1; i < colspan; i++) {
                            cells.push("");
                        }
                    });
                    
                    while (cells.length < headers.length) cells.push("");
                    if (cells.length > headers.length) cells.splice(headers.length);
                    
                    return cells;
                });
                
                return {
                    headers: headers.map(escapeHtml),
                    alignments,
                    rows: parsedRows.map(row => row.map(escapeHtml))
                };
            } catch (error) {
                throw new Error(`Error parsing HTML table: ${error.message}`);
            }
        },
        
        parseRow(row) {
            return row.split("|")
                .filter((cell, index, array) => 
                    !(index === 0 && cell.trim() === "" || index === array.length - 1 && cell.trim() === "")
                )
                .map(cell => cell.trim());
        }
    };
    
    // Output Generators
    const outputGenerators = {
        [FORMATS.MARKDOWN]() {
            const separatorRow = `| ${tableModel.alignments.map(align => ALIGNMENT_MARKERS[align]).join(" | ")} |`;
            return [
                `| ${tableModel.headers.join(" | ")} |`,
                separatorRow,
                tableModel.rows.map(row => `| ${row.join(" | ")} |`).join("\n")
            ].filter(Boolean).join("\n");
        },
        
        [FORMATS.JSON]() {
            const result = {};
            tableModel.rows.forEach(row => {
                const key = row[0]?.replace(/\*\*/g, "");
                if (key) {
                    result[key] = {};
                    for (let i = 1; i < tableModel.headers.length; i++) {
                        const header = tableModel.headers[i].replace(/\*\*/g, "");
                        result[key][header] = row[i] ? row[i].toLowerCase() : "no";
                    }
                }
            });
            return JSON.stringify(result, null, 2);
        },
        
        [FORMATS.HTML]() {
            const getClass = (alignment) => alignment !== ALIGNMENTS.LEFT ? ` class="text-${alignment}"` : "";
            
            return `<table>
<thead>
<tr>${tableModel.headers.map((header, index) => 
    `<th${getClass(tableModel.alignments[index])}>${header}</th>`
).join("")}</tr>
</thead>
<tbody>
${tableModel.rows.map(row => 
    `<tr>${row.map((cell, index) => 
        `<td${getClass(tableModel.alignments[index])}>${cell}</td>`
    ).join("")}</tr>`
).join("")}
</tbody>
</table>`;
        }
    };
    
    // Table Renderer
    const tableRenderer = {
        render() {
            if (!tableModel.isValid()) {
                elements.tableContainer.innerHTML = "";
                elements.outputTextArea.value = "";
                return;
            }
            
            const table = this.createTable();
            elements.tableContainer.innerHTML = "";
            elements.tableContainer.appendChild(table);
            
            // Generate output after rendering the table
            outputManager.generate();
        },
        
        createTable() {
            const table = document.createElement("table");
            table.appendChild(this.createHeader());
            table.appendChild(this.createBody());
            return table;
        },
        
        createHeader() {
            const thead = document.createElement("thead");
            const tr = document.createElement("tr");
            
            tableModel.headers.forEach((header, index) => {
                const th = this.createHeaderCell(header, index);
                tr.appendChild(th);
            });
            
            thead.appendChild(tr);
            return thead;
        },
        
        createHeaderCell(content, index) {
            const th = document.createElement("th");
            th.textContent = content;
            th.draggable = tableModel.isReorderMode;
            th.dataset.index = index;
            th.classList.toggle("dragging-allowed", tableModel.isReorderMode);
            th.contentEditable = !tableModel.isReorderMode;
            th.tabIndex = tableModel.isReorderMode ? -1 : 0;
            
            if (tableModel.isReorderMode) {
                th.addEventListener("dragstart", dragManager.handleDragStart);
                th.addEventListener("dragover", dragManager.handleDragOver);
                th.addEventListener("drop", dragManager.handleDrop);
            }
            
            th.addEventListener("blur", () => {
                if (!tableModel.isReorderMode) {
                    tableModel.saveToHistory();
                    tableModel.headers[index] = escapeHtml(th.textContent);
                    outputManager.generate();
                }
            });
            
            th.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !tableModel.isReorderMode) {
                    event.preventDefault();
                    th.blur();
                }
            });
            
            return th;
        },
        
        createBody() {
            const tbody = document.createElement("tbody");
            
            tableModel.rows.forEach((row, rowIndex) => {
                const tr = this.createRow(row, rowIndex);
                tbody.appendChild(tr);
            });
            
            return tbody;
        },
        
        createRow(cells, rowIndex) {
            const tr = document.createElement("tr");
            tr.draggable = tableModel.isReorderMode;
            tr.dataset.index = rowIndex;
            tr.classList.toggle("dragging-allowed", tableModel.isReorderMode);
            
            if (tableModel.isReorderMode) {
                tr.addEventListener("dragstart", dragManager.handleDragStart);
                tr.addEventListener("dragover", dragManager.handleDragOver);
                tr.addEventListener("drop", dragManager.handleDrop);
            }
            
            cells.forEach((cell, cellIndex) => {
                const td = this.createCell(cell, rowIndex, cellIndex);
                tr.appendChild(td);
            });
            
            return tr;
        },
        
        createCell(content, rowIndex, cellIndex) {
            const td = document.createElement("td");
            td.contentEditable = !tableModel.isReorderMode;
            td.tabIndex = tableModel.isReorderMode ? -1 : 0;
            td.textContent = content;
            td.dataset.row = rowIndex;
            td.dataset.col = cellIndex;
            
            td.addEventListener("blur", () => {
                if (!tableModel.isReorderMode) {
                    tableModel.saveToHistory();
                    tableModel.rows[rowIndex][cellIndex] = escapeHtml(td.textContent);
                    outputManager.generate();
                }
            });
            
            td.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !tableModel.isReorderMode) {
                    event.preventDefault();
                    td.blur();
                }
            });
            
            return td;
        }
    };
    
    // Drag Manager
    const dragManager = {
        handleDragStart(event) {
            event.target.classList.add("dragging");
            event.dataTransfer.setData("text/plain", event.target.dataset.index);
            event.dataTransfer.setData("type", event.target.tagName.toLowerCase());
        },
        
        handleDragOver(event) {
            event.preventDefault();
            if (event.dataTransfer.getData("type") === "tr") {
                const tbody = elements.tableContainer.querySelector("tbody");
                const afterElement = this.getDragAfterElement(tbody, event.clientY);
                const draggingElement = document.querySelector(".dragging");
                
                if (afterElement) {
                    tbody.insertBefore(draggingElement, afterElement);
                } else {
                    tbody.appendChild(draggingElement);
                }
            }
        },
        
        handleDrop(event) {
            event.preventDefault();
            const fromIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
            const toIndex = parseInt(event.target.dataset.index, 10);
            const type = event.dataTransfer.getData("type");
            
            if (fromIndex !== toIndex) {
                tableModel.saveToHistory();
                
                if (type === "th") {
                    tableOperations.reorderColumns(fromIndex, toIndex);
                } else if (type === "tr") {
                    const tbody = elements.tableContainer.querySelector("tbody");
                    const draggingRow = tbody.querySelector("tr.dragging");
                    if (draggingRow) {
                        const currentIndex = Array.from(tbody.children).indexOf(draggingRow);
                        tableOperations.reorderRows(fromIndex, currentIndex);
                    }
                }
                
                tableRenderer.render();
            }
            
            document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
        },
        
        getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll("tr:not(.dragging)")];
            
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
    
    // Table Operations
    const tableOperations = {
        addColumn() {
            if (tableModel.isReorderMode) return;
            
            tableModel.saveToHistory();
            tableModel.headers.push("New Column");
            tableModel.alignments.push(ALIGNMENTS.LEFT);
            tableModel.rows.forEach(row => row.push(""));
            tableRenderer.render();
            outputManager.generate();
            showNotification("Column added");
        },
        
        addRow() {
            if (tableModel.isReorderMode) return;
            
            // Ensure there are headers before adding a row
            if (tableModel.headers.length === 0) {
                showNotification("Please add headers first", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableModel.saveToHistory();
            const newRow = Array(tableModel.headers.length).fill("");
            tableModel.rows.push(newRow);
            tableRenderer.render();
            outputManager.generate();
            showNotification("Row added");
        },
        
        removeColumn() {
            if (tableModel.isReorderMode) return;
            if (tableModel.headers.length <= 1) {
                showNotification("Cannot remove the last column", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableModel.saveToHistory();
            const lastIndex = tableModel.headers.length - 1;
            tableModel.headers.splice(lastIndex, 1);
            tableModel.alignments.splice(lastIndex, 1);
            tableModel.rows.forEach(row => row.splice(lastIndex, 1));
            tableRenderer.render();
            outputManager.generate();
            analysisManager.analyze();
            showNotification("Column removed");
        },
        
        removeColumnAt(index) {
            if (tableModel.isReorderMode) return;
            if (tableModel.headers.length <= 1) {
                showNotification("Cannot remove the last column", NOTIFICATION_TYPES.ERROR);
                return;
            }
            if (index < 0 || index >= tableModel.headers.length) {
                showNotification("Invalid column index", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableModel.saveToHistory();
            tableModel.headers.splice(index, 1);
            tableModel.alignments.splice(index, 1);
            tableModel.rows.forEach(row => row.splice(index, 1));
            tableRenderer.render();
            outputManager.generate();
            showNotification("Column removed");
        },
        
        removeRow() {
            if (tableModel.isReorderMode) return;
            
            if (tableModel.rows.length > 0) {
                tableModel.saveToHistory();
                tableModel.rows.pop();
                tableRenderer.render();
                outputManager.generate();
                showNotification("Row removed");
            } else {
                showNotification("No rows to remove", NOTIFICATION_TYPES.ERROR);
            }
        },
        
        removeRowAt(index) {
            if (tableModel.isReorderMode) return;
            
            if (index < 0 || index >= tableModel.rows.length) {
                showNotification("Invalid row index", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            if (tableModel.rows.length > 0) {
                tableModel.saveToHistory();
                tableModel.rows.splice(index, 1);
                tableRenderer.render();
                outputManager.generate();
                showNotification("Row removed");
            } else {
                showNotification("No rows to remove", NOTIFICATION_TYPES.ERROR);
            }
        },
        
        sortRows() {
            if (tableModel.isReorderMode) return;
            
            if (tableModel.rows.length > 1) {
                tableModel.saveToHistory();
                tableModel.rows.sort((a, b) => 
                    (a[0]?.toLowerCase() || "").localeCompare(b[0]?.toLowerCase() || "")
                );
                tableRenderer.render();
                outputManager.generate();
                showNotification("Rows sorted alphabetically");
            } else {
                showNotification("Need at least 2 rows to sort", NOTIFICATION_TYPES.ERROR);
            }
        },
        
        reorderColumns(fromIndex, toIndex) {
            const moveElement = (array) => {
                const element = array[fromIndex];
                array.splice(fromIndex, 1);
                array.splice(toIndex, 0, element);
            };
            
            moveElement(tableModel.headers);
            moveElement(tableModel.alignments);
            tableModel.rows.forEach(row => moveElement(row));
        },
        
        reorderRows(fromIndex, toIndex) {
            const row = tableModel.rows[fromIndex];
            tableModel.rows.splice(fromIndex, 1);
            tableModel.rows.splice(toIndex, 0, row);
        },
        
        duplicateRow(index) {
            if (tableModel.isReorderMode) return;
            
            tableModel.saveToHistory();
            const newRow = [...tableModel.rows[index]];
            tableModel.rows.splice(index + 1, 0, newRow);
            tableRenderer.render();
            showNotification("Row duplicated");
        },
        
        insertRowAfter(index) {
            if (tableModel.isReorderMode) return;
            
            tableModel.saveToHistory();
            const newRow = Array(tableModel.headers.length).fill("");
            tableModel.rows.splice(index + 1, 0, newRow);
            tableRenderer.render();
            showNotification("Row inserted");
        }
    };
    
    // Analysis Manager
    const analysisManager = {
        analyze() {
            if (tableModel.rows.length === 0 || tableModel.headers.length === 0) {
                elements.analysisMarkdownOutput.textContent = "";
                return;
            }
            
            const totalRows = tableModel.rows.length;
            let result = `| **Total** = \`${totalRows}\` |`;
            
            for (let i = 1; i < tableModel.headers.length; i++) {
                const count = tableModel.rows.reduce((sum, row) => 
                    sum + ("yes" === row[i]?.toLowerCase() ? 1 : 0), 0
                );
                result += ` \`${count}/${totalRows}\` |`;
            }
            
            elements.analysisMarkdownOutput.textContent = result;
            showNotification("Table analyzed!");
        },
        
        getColumnStats(columnIndex) {
            if (columnIndex >= tableModel.headers.length) return null;
            
            const values = tableModel.rows.map(row => row[columnIndex] || "");
            const uniqueValues = [...new Set(values)];
            const emptyCells = values.filter(value => !value.trim()).length;
            
            return {
                columnName: tableModel.headers[columnIndex],
                totalCells: values.length,
                uniqueValues: uniqueValues.length,
                emptyCells,
                mostCommon: this.getMostCommonValue(values)
            };
        },
        
        getMostCommonValue(values) {
            const counts = {};
            values.forEach(value => {
                counts[value] = (counts[value] || 0) + 1;
            });
            
            return Object.entries(counts)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || "";
        }
    };
    
    // Output Manager
    const outputManager = {
        generate() {
            if (!tableModel.isValid()) {
                elements.outputTextArea.value = "";
                return;
            }
            
            const generator = outputGenerators[tableModel.outputFormat];
            elements.outputTextArea.value = generator ? generator() : outputGenerators[FORMATS.MARKDOWN]();
        },
        
        setFormat(format) {
            if (Object.values(FORMATS).includes(format)) {
                tableModel.outputFormat = format;
                this.generate();
            }
        }
    };
    
    // Application Controller
    const appController = {
        init() {
            themeManager.init();
            this.bindEvents();
            this.initializeKeyboardShortcuts();
        },
        
        parseTable() {
            const input = elements.inputTextArea?.value?.trim();
            if (!input) {
                showNotification("Please enter a table to parse", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            try {
                const parsedTable = tableParser.parse(input);
                tableModel.saveToHistory();
                Object.assign(tableModel, parsedTable);
                tableRenderer.render();
                outputManager.generate();
                showNotification("Table parsed successfully!");
            } catch (error) {
                console.error("Error parsing table:", error);
                showNotification(`Error parsing table: ${error.message}`, NOTIFICATION_TYPES.ERROR);
            }
        },
        
        async copyToClipboard() {
            const success = await copyToClipboard(elements.outputTextArea.value);
            showNotification(
                success ? "Copied to clipboard!" : "Failed to copy to clipboard",
                success ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.ERROR
            );
        },
        
        clearAll() {
            const hasData = elements.inputTextArea?.value?.trim() || 
                           !tableModel.isEmpty() || 
                           elements.outputTextArea?.value?.trim();
                           
            if (hasData && !confirm("Are you sure you want to clear everything?")) {
                return;
            }
            
            if (elements.inputTextArea) elements.inputTextArea.value = "";
            if (elements.outputTextArea) elements.outputTextArea.value = "";
            if (elements.tableContainer) elements.tableContainer.innerHTML = "";
            if (elements.analysisMarkdownOutput) elements.analysisMarkdownOutput.textContent = "";
            
            tableModel.reset();
            showNotification("All cleared");
        },
        
        toggleReorderMode() {
            if (tableModel.isEmpty()) {
                showNotification("Please create a table first", NOTIFICATION_TYPES.ERROR);
                return;
            }
            
            tableModel.isReorderMode = !tableModel.isReorderMode;
            if (elements.reorderBtn) {
                elements.reorderBtn.textContent = tableModel.isReorderMode ? "Edit Table" : "Re-order";
                elements.reorderBtn.classList.toggle("btn-secondary", tableModel.isReorderMode);
            }
            
            tableRenderer.render();
            showNotification(
                tableModel.isReorderMode ? "Reorder mode enabled" : "Edit mode enabled",
                NOTIFICATION_TYPES.INFO
            );
        },
        
        undo() {
            if (tableModel.undo()) {
                tableRenderer.render();
                showNotification("Undone", NOTIFICATION_TYPES.INFO);
            } else {
                showNotification("Nothing to undo", NOTIFICATION_TYPES.WARNING);
            }
        },
        
        redo() {
            if (tableModel.redo()) {
                tableRenderer.render();
                showNotification("Redone", NOTIFICATION_TYPES.INFO);
            } else {
                showNotification("Nothing to redo", NOTIFICATION_TYPES.WARNING);
            }
        },
        
        bindEvents() {
            elements.themeToggle?.addEventListener("click", () => themeManager.toggle());
            elements.parseBtn?.addEventListener("click", () => this.parseTable());
            elements.analyzeBtn?.addEventListener("click", () => {
                analysisManager.analyze();
                if (elements.analysisSection) {
                    elements.analysisSection.open = true;
                }
            });
            elements.copyBtn?.addEventListener("click", () => this.copyToClipboard());
            elements.clearBtn?.addEventListener("click", () => this.clearAll());
            elements.addColumnBtn?.addEventListener("click", () => tableOperations.addColumn());
            elements.addRowBtn?.addEventListener("click", () => tableOperations.addRow());
            elements.sortRowsBtn?.addEventListener("click", () => tableOperations.sortRows());
            elements.removeColumnBtn?.addEventListener("click", () => tableOperations.removeColumn());
            elements.removeRowBtn?.addEventListener("click", () => tableOperations.removeRow());
            elements.reorderBtn?.addEventListener("click", () => this.toggleReorderMode());
            elements.inputTextArea?.addEventListener("input", debounce(() => this.parseTable(), 300));
            elements.outputFormat?.addEventListener("change", (event) => {
                outputManager.setFormat(event.target.value);
            });
            
            document.addEventListener("change", (event) => {
                if (event.target?.id === "outputFormat") {
                    outputManager.setFormat(event.target.value);
                }
            });
            
            window.addEventListener("DOMContentLoaded", () => themeManager.init());
            window.addEventListener("beforeunload", (event) => {
                if (!tableModel.isEmpty()) {
                    event.preventDefault();
                    event.returnValue = "";
                }
            });
        },
        
        initializeKeyboardShortcuts() {
            document.addEventListener("keydown", (event) => {
                // Undo (Ctrl/Cmd + Z)
                if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
                    event.preventDefault();
                    this.undo();
                }
                
                // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
                if ((event.ctrlKey || event.metaKey) && 
                    ((event.key === "z" && event.shiftKey) || event.key === "y")) {
                    event.preventDefault();
                    this.redo();
                }
                
                // Parse table (Ctrl/Cmd + Enter)
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    this.parseTable();
                }
                
                // Copy to clipboard (Ctrl/Cmd + Shift + C)
                if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "C") {
                    event.preventDefault();
                    this.copyToClipboard();
                }
            });
        }
    };
    
    // Initialize the application
    appController.init();
})();