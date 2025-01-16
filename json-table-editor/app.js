(() => {
    "use strict";

    // --- DOM Elements ---
    const themeToggle = document.getElementById('themeToggle');
    const sunPath = themeToggle.querySelector('.sun');
    const moonPath = themeToggle.querySelector('.moon');
    const inputTextArea = document.getElementById("input");
    const outputTextArea = document.getElementById("output");
    const tableContainer = document.getElementById("tableContainer");
    const notificationDiv = document.getElementById("notification");
    const analysisSection = document.getElementById('analysisSection');
    const analysisMarkdownOutput = document.getElementById('analysisMarkdownOutput');
    const markdownRadio = document.getElementById('markdownRadio');
    const jsonRadio = document.getElementById('jsonRadio');
    const markdownOutputRadio = document.getElementById('markdownOutputRadio');
    const jsonOutputRadio = document.getElementById('jsonOutputRadio');
    const parseBtn = document.getElementById("parseBtn");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const clearBtn = document.getElementById("clearBtn");
    const insertColumnBtn = document.getElementById("insertColumnBtn");
    const insertRowBtn = document.getElementById("insertRowBtn");
    const sortRowsBtn = document.getElementById("sortRowsBtn");
    const deleteSelectedColumnsBtn = document.getElementById("deleteSelectedColumnsBtn");
    const deleteSelectedRowsBtn = document.getElementById("deleteSelectedRowsBtn");

    // --- Data State ---
    let tableData = {
        headers: [],
        rows: [],
        alignments: []
    };

    // --- Helper Functions ---
    const showNotification = (message, type = "success") => {
        notificationDiv.textContent = message;
        notificationDiv.className = `notification ${type}`;
        notificationDiv.style.display = "block";
        setTimeout(() => {
            notificationDiv.style.display = "none";
        }, 3000);
    };

    const sanitizeInput = (str) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- Theme Functions ---
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        sunPath.style.display = newTheme === 'dark' ? 'block' : 'none';
        moonPath.style.display = newTheme === 'dark' ? 'none' : 'block';
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') ||
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        sunPath.style.display = savedTheme === 'dark' ? 'block' : 'none';
        moonPath.style.display = savedTheme === 'dark' ? 'none' : 'block';
    };

    // --- Parsing Functions ---
    const parseTable = () => {
        const inputType = document.querySelector('input[name="inputType"]:checked').value;
        const inputText = inputTextArea.value.trim();

        if (!inputText) {
            showNotification(`Please enter ${inputType} table data`, "error");
            return;
        }

        if (inputType === 'markdown') {
            parseMarkdownTable(inputText);
        } else if (inputType === 'json') {
            parseJsonTable(inputText);
        }
    };

    const parseMarkdownTable = (inputText) => {
        const lines = inputText.split("\n");
        if (lines.length < 2) {
            showNotification("Invalid Markdown format: Table must have at least a header and separator.", "error");
            return;
        }

        try {
            tableData.headers = lines[0].split("|").filter(cell => cell.trim()).map(cell => sanitizeInput(cell.trim()));
            const separatorLine = lines[1].split("|").filter(cell => cell.trim());
            tableData.alignments = separatorLine.map(cell => {
                cell = cell.trim();
                if (cell.startsWith(":") && cell.endsWith(":")) return "center";
                if (cell.endsWith(":")) return "right";
                return "left";
            });
            tableData.rows = lines.slice(2).map(row => row.split("|").filter(cell => cell.trim()).map(cell => sanitizeInput(cell.trim())));
            renderTable();
            showNotification("Markdown table parsed successfully.");
        } catch (error) {
            showNotification(`Error parsing Markdown table: ${error.message}`, "error");
            console.error("Markdown parsing error:", error);
        }
    };

    const parseJsonTable = (inputText) => {
        try {
            const jsonData = JSON.parse(inputText);
            if (!jsonData || typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
                showNotification("Invalid JSON format: The JSON data must represent a non-empty object.", "error");
                return;
            }
            const firstRow = Object.values(jsonData)[0];
            if (!firstRow || typeof firstRow !== 'object') {
                showNotification("Invalid JSON format: Each entry should be an object.", "error");
                return;
            }

            tableData.headers = [" "].concat(Object.keys(firstRow));
            tableData.alignments = Array(tableData.headers.length).fill("left");
            tableData.rows = Object.entries(jsonData).map(([rowHeader, rowData]) => {
                return [sanitizeInput(rowHeader)].concat(Object.values(rowData).map(value => sanitizeInput(String(value))));
            });

            renderTable();
            showNotification("Table data parsed successfully from JSON.");
        } catch (error) {
            showNotification(`Error parsing JSON: ${error.message}`, "error");
            console.error("JSON parsing error:", error);
        }
    };

    // --- Rendering Functions ---
    const renderTable = () => {
        const table = document.createElement("table");
        table.classList.add("editable-table"); // Add class for styling

        // Render Table Header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        // Add a select-all checkbox to the header row
        const selectAllTh = document.createElement("th");
        const selectAllCheckbox = document.createElement("input");
        selectAllCheckbox.type = "checkbox";
        selectAllCheckbox.ariaLabel = "Select all columns";
        selectAllCheckbox.addEventListener('change', toggleSelectAllColumns);
        selectAllTh.appendChild(selectAllCheckbox);
        headerRow.appendChild(selectAllTh);

        tableData.headers.forEach((header, index) => {
            const th = document.createElement("th");
            th.textContent = header;
            th.draggable = index > 0; // Make only data columns draggable
            th.dataset.columnIndex = index;
            th.addEventListener("dragstart", handleDragStart);
            th.addEventListener("dragover", handleDragOver);
            th.addEventListener("drop", handleDrop);
            th.contentEditable = index > 0;
            th.addEventListener("blur", () => {
                if (index > 0) {
                    tableData.headers[index] = sanitizeInput(th.textContent);
                    generateOutput();
                }
            });
            // Add a checkbox for column selection
            const colCheckbox = document.createElement("input");
            colCheckbox.type = "checkbox";
            colCheckbox.ariaLabel = `Select column ${header}`;
            colCheckbox.dataset.columnIndex = index;
            th.insertBefore(colCheckbox, th.firstChild);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Render Table Body
        const tbody = document.createElement("tbody");
        tableData.rows.forEach((row, rowIndex) => {
            const tr = document.createElement("tr");
            tr.draggable = true; // Make rows draggable
            tr.dataset.rowIndex = rowIndex;
            tr.addEventListener("dragstart", handleRowDragStart);
            tr.addEventListener("dragover", handleRowDragOver);
            tr.addEventListener("drop", handleRowDrop);

            // Add a checkbox for row selection
            const tdCheckbox = document.createElement("td");
            const rowCheckbox = document.createElement("input");
            rowCheckbox.type = "checkbox";
            rowCheckbox.ariaLabel = `Select row ${rowIndex + 1}`;
            tdCheckbox.appendChild(rowCheckbox);
            tr.appendChild(tdCheckbox);

            row.forEach((cell, cellIndex) => {
                const td = document.createElement("td");
                td.contentEditable = cellIndex > 0;
                td.textContent = cell;
                td.addEventListener("blur", () => {
                    if (cellIndex > 0) {
                        tableData.rows[rowIndex][cellIndex] = sanitizeInput(td.textContent);
                        generateOutput();
                    }
                });
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        tableContainer.innerHTML = "";
        tableContainer.appendChild(table);
        generateOutput();
    };

    // --- Table Manipulation Functions ---
    const insertColumn = (index) => {
        const colIndex = parseInt(prompt("Enter the index to insert the column (starting from 1):"), 10);
        if (isNaN(colIndex) || colIndex < 1 || colIndex > tableData.headers.length) {
            showNotification("Invalid column index.", "error");
            return;
        }

        const headerName = prompt("Enter the new column header:", "New Column");
        if (headerName === null) return; // User cancelled

        tableData.headers.splice(colIndex, 0, sanitizeInput(headerName));
        tableData.alignments.splice(colIndex, 0, "left");
        tableData.rows.forEach(row => row.splice(colIndex, 0, ""));
        renderTable();
        showNotification(`Column "${headerName}" inserted at position ${colIndex + 1}.`);
    };

    const insertRow = () => {
        const rowIndex = parseInt(prompt("Enter the index to insert the row (starting from 1):"), 10);
        if (isNaN(rowIndex) || rowIndex < 1 || rowIndex > tableData.rows.length + 1) {
            showNotification("Invalid row index.", "error");
            return;
        }
        const newRow = Array(tableData.headers.length).fill("");
        if (tableData.headers.length > 0) {
            newRow[0] = "New Row"; // Default row header if headers exist
        }
        tableData.rows.splice(rowIndex - 1, 0, newRow);
        renderTable();
        showNotification(`Row inserted at position ${rowIndex}.`);
    };

    const deleteSelectedColumns = () => {
        if (!confirm("Are you sure you want to delete the selected columns?")) {
            return;
        }
        const selectedIndices = Array.from(tableContainer.querySelectorAll('thead input[type="checkbox"]:checked'))
            .slice(1) // Skip the select-all checkbox
            .map(checkbox => parseInt(checkbox.closest('th').dataset.columnIndex));

        if (selectedIndices.length === 0) {
            showNotification("No columns selected for deletion.", "error");
            return;
        }

        // Sort indices in descending order to avoid issues when splicing
        selectedIndices.sort((a, b) => b - a);

        selectedIndices.forEach(index => {
            if (index > 0) { // Prevent deletion of the row header column
                tableData.headers.splice(index, 1);
                tableData.alignments.splice(index, 1);
                tableData.rows.forEach(row => row.splice(index, 1));
            }
        });
        renderTable();
        analyzeTableData();
        showNotification(`${selectedIndices.length} column(s) deleted.`);
    };

    const deleteSelectedRows = () => {
        if (!confirm("Are you sure you want to delete the selected rows?")) {
            return;
        }
        const selectedIndices = Array.from(tableContainer.querySelectorAll('tbody input[type="checkbox"]:checked'))
            .map(checkbox => parseInt(checkbox.closest('tr').dataset.rowIndex));

        if (selectedIndices.length === 0) {
            showNotification("No rows selected for deletion.", "error");
            return;
        }

        // Sort indices in descending order to avoid issues when splicing
        selectedIndices.sort((a, b) => b - a);

        selectedIndices.forEach(index => {
            tableData.rows.splice(index, 1);
        });
        renderTable();
        analyzeTableData();
        showNotification(`${selectedIndices.length} row(s) deleted.`);
    };

    const sortRows = () => {
        if (tableData.rows.length === 0) {
            showNotification("No rows to sort.", "error");
            return;
        }
        tableData.rows.sort((a, b) => (a[0]?.toLowerCase() || "").localeCompare(b[0]?.toLowerCase() || ""));
        renderTable();
        showNotification("Rows sorted alphabetically.");
    };

    // --- Drag and Drop for Columns ---
    const handleDragStart = (event) => {
        event.target.classList.add("dragging");
        event.dataTransfer.setData("text/plain", event.target.dataset.columnIndex);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const fromIndex = parseInt(event.dataTransfer.getData("text/plain"));
        const toIndex = parseInt(event.target.dataset.columnIndex);
        if (fromIndex !== toIndex) {
            reorderColumns(fromIndex, toIndex);
            renderTable();
            analyzeTableData();
        }
    };

    const reorderColumns = (fromIndex, toIndex) => {
        const move = (arr) => {
            const element = arr[fromIndex];
            arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, element);
        };
        move(tableData.headers);
        move(tableData.alignments);
        tableData.rows.forEach(row => move(row));
    };

    // --- Drag and Drop for Rows ---
    const handleRowDragStart = (event) => {
        event.target.classList.add("dragging");
        event.dataTransfer.setData("text/plain", event.target.dataset.rowIndex);
    };

    const handleRowDragOver = (event) => {
        event.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const targetElement = event.target.closest('tr');
        if (draggingElement && targetElement && draggingElement !== targetElement) {
            const tbody = targetElement.parentNode;
            const rect = targetElement.getBoundingClientRect();
            const mouseY = event.clientY;
            if (mouseY < rect.top + rect.height / 2) {
                tbody.insertBefore(draggingElement, targetElement);
            } else {
                tbody.insertBefore(draggingElement, targetElement.nextSibling);
            }
        }
    };

    const handleRowDrop = (event) => {
        event.preventDefault();
        const fromIndex = parseInt(event.dataTransfer.getData("text/plain"));
        const toIndex = Array.from(tableContainer.querySelector('tbody').children).indexOf(document.querySelector('.dragging'));
        if (fromIndex !== toIndex) {
            reorderRows(fromIndex, toIndex);
            renderTable(); // Re-render to update data-rowindex
        }
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    };

    const reorderRows = (fromIndex, toIndex) => {
        const element = tableData.rows[fromIndex];
        tableData.rows.splice(fromIndex, 1);
        tableData.rows.splice(toIndex, 0, element);
    };

    const toggleSelectAllColumns = (event) => {
        const checked = event.target.checked;
        tableContainer.querySelectorAll('thead th input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = checked;
        });
    };

    // --- Analysis Function ---
    const analyzeTableData = () => {
        if (tableData.rows.length === 0 || tableData.headers.length <= 1) {
            return;
        }

        const totalRows = tableData.rows.length;
        let markdownOutput = `| **Total** = \`${totalRows}\` |`;

        for (let i = 1; i < tableData.headers.length; i++) {
            const header = tableData.headers[i];
            const yesCount = tableData.rows.reduce((count, row) => {
                return count + (row[i]?.toLowerCase() === 'yes' ? 1 : 0);
            }, 0);
            markdownOutput += ` \`${yesCount}/${totalRows}\` |`;
        }

        analysisMarkdownOutput.textContent = markdownOutput;
    };

    // --- Output Generation Functions ---
    const generateMarkdown = () => {
        if (tableData.headers.length <= 1 || tableData.rows.length === 0) {
            return "";
        }
        const alignments = { center: ":---:", right: "---:", left: ":---" };
        const separator = `| ${tableData.alignments.slice(1).map(align => alignments[align]).join(" | ")} |`;
        const header = `| ${tableData.headers.slice(1).join(" | ")} |`;
        const rows = tableData.rows.map(row => `| ${row.slice(1).join(" | ")} |`).join("\n");
        return [header, separator, rows].join("\n");
    };

    const generateJson = () => {
        if (tableData.headers.length <= 1 || tableData.rows.length === 0) {
            return "";
        }
        const jsonOutput = {};
        tableData.rows.forEach(row => {
            const rowHeader = row[0];
            const rowData = {};
            for (let i = 1; i < tableData.headers.length; i++) {
                rowData[tableData.headers[i]] = row[i];
            }
            jsonOutput[rowHeader] = rowData;
        });
        return JSON.stringify(jsonOutput, null, 2);
    };

    const generateOutput = () => {
        const outputType = document.querySelector('input[name="outputType"]:checked').value;
        if (outputType === 'markdown') {
            outputTextArea.value = generateMarkdown();
        } else if (outputType === 'json') {
            outputTextArea.value = generateJson();
        }
    };

    // --- Utility Functions ---
    const clearAll = () => {
        if (confirm("Are you sure you want to clear all table data? This action cannot be undone.")) {
            inputTextArea.value = "";
            outputTextArea.value = "";
            tableContainer.innerHTML = "";
            tableData = { headers: [], rows: [], alignments: [] };
            analysisMarkdownOutput.textContent = "";
            showNotification("All data cleared.");
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(outputTextArea.value);
            showNotification("Output copied to clipboard!");
        } catch (err) {
            console.error('Could not copy text: ', err);
            outputTextArea.select();
            document.execCommand("copy");
            showNotification("Output copied to clipboard!");
        }
    };

    // --- Event Listeners ---
    themeToggle.addEventListener('click', toggleTheme);
    window.addEventListener('DOMContentLoaded', initTheme);
    parseBtn.addEventListener("click", parseTable);
    analyzeBtn.addEventListener("click", () => {
        analyzeTableData();
        analysisSection.open = true;
    });
    copyBtn.addEventListener("click", copyToClipboard);
    clearBtn.addEventListener("click", clearAll);
    insertColumnBtn.addEventListener("click", insertColumn);
    insertRowBtn.addEventListener("click", insertRow);
    sortRowsBtn.addEventListener("click", sortRows);
    deleteSelectedColumnsBtn.addEventListener("click", deleteSelectedColumns);
    deleteSelectedRowsBtn.addEventListener("click", deleteSelectedRows);
    inputTextArea.addEventListener("input", debounce(parseTable, 300));
    markdownOutputRadio.addEventListener('change', generateOutput);
    jsonOutputRadio.addEventListener('change', generateOutput);

})();