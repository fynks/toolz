(() => {
    "use strict";

    // Theme elements
    const themeToggle = document.getElementById('themeToggle');
    const sunPath = themeToggle.querySelector('.sun');
    const moonPath = themeToggle.querySelector('.moon');

    // Input/Output elements
    const inputTextArea = document.getElementById("input");
    const outputTextArea = document.getElementById("output");

    // Table elements
    const tableContainer = document.getElementById("tableContainer");
    const analysisSection = document.getElementById('analysisSection');
    const analysisMarkdownOutput = document.getElementById('analysisMarkdownOutput');

    // Control buttons
    const parseBtn = document.getElementById("parseBtn");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const clearBtn = document.getElementById("clearBtn");

    // Table editing buttons
    const addColumnBtn = document.getElementById("addColumnBtn");
    const addRowBtn = document.getElementById("addRowBtn");
    const sortRowsBtn = document.getElementById("sortRowsBtn");
    const removeColumnBtn = document.getElementById("removeColumnBtn");
    const removeRowBtn = document.getElementById("removeRowBtn");
    const reorderBtn = document.getElementById("reorderBtn");

    // Notification element
    const notificationDiv = document.getElementById("notification");

    let tableData = {
        headers: [],
        rows: [],
        alignments: []
    };

    let isReorderMode = false;
    let outputFormat = 'markdown'; // Default output format

    // Theme switching function
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Toggle icon visibility
        sunPath.style.display = newTheme === 'dark' ? 'block' : 'none';
        moonPath.style.display = newTheme === 'dark' ? 'none' : 'block';
    };

    // Initialize theme
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') ||
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        sunPath.style.display = savedTheme === 'dark' ? 'block' : 'none';
        moonPath.style.display = savedTheme === 'dark' ? 'none' : 'block';
    };

    // Event listeners
    themeToggle.addEventListener('click', toggleTheme);
    window.addEventListener('DOMContentLoaded', initTheme);

    const showNotification = (message, type = "success") => {
        notificationDiv.textContent = message;
        notificationDiv.style.backgroundColor = type === "error" ? "#dc3545" : "#4CAF50";
        notificationDiv.style.display = "block";
        setTimeout(() => {
            notificationDiv.style.display = "none";
        }, 3000);
    };

    const sanitizeInput = (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const parseTable = () => {
        const inputText = inputTextArea.value.trim();
        if (!inputText) {
            showNotification("Please enter a markdown table", "error");
            return;
        }

        const lines = inputText.split("\n");
        if (lines.length < 2) {
            showNotification("Invalid table format", "error");
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
            showNotification("Table parsed successfully!");
        } catch (error) {
            showNotification(`Error parsing table: ${error.message}`, "error");
            console.error("Parsing error:", error);
        }
    };

    const renderTable = () => {
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        tableData.headers.forEach((header, index) => {
            const th = document.createElement("th");
            th.textContent = header;
            th.draggable = isReorderMode;
            th.dataset.index = index;
            th.classList.toggle('dragging-allowed', isReorderMode);
            if (isReorderMode) {
                th.addEventListener("dragstart", handleDragStart);
                th.addEventListener("dragover", handleDragOver);
                th.addEventListener("drop", handleDrop);
            } else {
                th.removeEventListener("dragstart", handleDragStart);
                th.removeEventListener("dragover", handleDragOver);
                th.removeEventListener("drop", handleDrop);
            }
            th.contentEditable = !isReorderMode;
            th.tabIndex = isReorderMode ? -1 : 0; // Prevent focus during drag
            th.addEventListener("blur", () => {
                if (!isReorderMode) {
                    tableData.headers[index] = sanitizeInput(th.textContent);
                    generateOutput();
                }
            });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        tableData.rows.forEach((row, rowIndex) => {
            const tr = document.createElement("tr");
            tr.draggable = isReorderMode;
            tr.dataset.index = rowIndex;
            tr.classList.toggle('dragging-allowed', isReorderMode);
            if (isReorderMode) {
                tr.addEventListener("dragstart", handleDragStart);
                tr.addEventListener("dragover", handleDragOver);
                tr.addEventListener("drop", handleDrop);
            } else {
                tr.removeEventListener("dragstart", handleDragStart);
                tr.removeEventListener("dragover", handleDragOver);
                tr.removeEventListener("drop", handleDrop);
            }
            row.forEach((cell, cellIndex) => {
                const td = document.createElement("td");
                td.contentEditable = !isReorderMode;
                td.tabIndex = isReorderMode ? -1 : 0; // Prevent focus during drag
                td.textContent = cell;
                td.addEventListener("blur", () => {
                    if (!isReorderMode) {
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

    const analyzeTableData = () => {
        if (tableData.rows.length === 0 || tableData.headers.length === 0) {
            return;
        }

        const totalRows = tableData.rows.length;
        let markdownOutput = `| **Total** = \`${totalRows}\` |`;

        // Start the loop from the second column (index 1)
        for (let i = 1; i < tableData.headers.length; i++) {
            const header = tableData.headers[i];
            const yesCount = tableData.rows.reduce((count, row) => {
                return count + (row[i]?.toLowerCase() === 'yes' ? 1 : 0);
            }, 0);
            markdownOutput += ` \`${yesCount}/${totalRows}\` |`;
        }

        analysisMarkdownOutput.textContent = markdownOutput;
        showNotification("Table analyzed!"); // Added notification here
    };

    // Generic drag handlers for rows and columns
    const handleDragStart = (event) => {
        event.target.classList.add("dragging");
        event.dataTransfer.setData("text/plain", event.target.dataset.index);
        event.dataTransfer.setData("type", event.target.tagName.toLowerCase()); // Identify if it's a row or column
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        const draggableType = event.dataTransfer.getData("type");
        const container = draggableType === 'tr' ? tableContainer.querySelector('tbody') : tableContainer.querySelector('thead tr');
        const mouseY = event.clientY;

        if (draggableType === 'tr') {
            // Logic for reordering rows
            const afterElement = getDragAfterElement(container, mouseY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const fromIndex = parseInt(event.dataTransfer.getData("text/plain"));
        const toIndex = parseInt(event.target.dataset.index);
        const type = event.dataTransfer.getData("type");

        if (fromIndex !== toIndex) {
            if (type === 'th') {
                reorderColumns(fromIndex, toIndex);
            } else if (type === 'tr') {
                // Find the actual index after potential reordering in handleDragOver
                const tbody = tableContainer.querySelector('tbody');
                const droppedRow = tbody.querySelector(`tr.dragging`);
                if (droppedRow) {
                    const newIndex = Array.from(tbody.children).indexOf(droppedRow);
                    reorderRows(fromIndex, newIndex);
                }
            }
            renderTable();
            analyzeTableData();
        }
        event.target.classList.remove("dragging");
        const draggedElement = document.querySelector('.dragging');
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
        }
    };

    /**
     * Determines the element after which the draggable element should be inserted.
     * @param {HTMLElement} container The container of the draggable elements.
     * @param {number} y The vertical position of the mouse.
     * @returns {HTMLElement|null} The element after which to insert, or null if at the end.
     */
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];

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

    const reorderRows = (fromIndex, toIndex) => {
        const element = tableData.rows[fromIndex];
        tableData.rows.splice(fromIndex, 1);
        tableData.rows.splice(toIndex, 0, element);
    };

    const addColumn = () => {
        if (isReorderMode) return;
        tableData.headers.push("New Column");
        tableData.alignments.push("left");
        tableData.rows.forEach(row => row.push(""));
        renderTable();
        showNotification("Column added");
    };

    const addRow = () => {
        if (isReorderMode) return;
        const newRow = Array(tableData.headers.length).fill("");
        tableData.rows.push(newRow);
        renderTable();
        showNotification("Row added");
    };

    const sortRows = () => {
        if (isReorderMode) return;
        if (!tableData.rows.length) {
            showNotification("No rows to sort", "error");
            return;
        }
        tableData.rows.sort((a, b) => (a[0]?.toLowerCase() || "").localeCompare(b[0]?.toLowerCase() || ""));
        renderTable();
        showNotification("Rows sorted alphabetically");
    };

    const removeColumn = () => {
        if (isReorderMode) return;
        if (tableData.headers.length <= 1) {
            showNotification("Cannot remove the last column", "error");
            return;
        }
        const indexToRemove = tableData.headers.length - 1; // Remove the last column
        tableData.headers.splice(indexToRemove, 1);
        tableData.alignments.splice(indexToRemove, 1);
        tableData.rows.forEach(row => row.splice(indexToRemove, 1));
        renderTable();
        analyzeTableData();
        showNotification("Column removed");
    };

    const removeRow = () => {
        if (isReorderMode) return;
        if (tableData.rows.length === 0) {
            showNotification("No rows to remove", "error");
            return;
        }
        tableData.rows.pop();
        renderTable();
        analyzeTableData();
        showNotification("Row removed");
    };

    const generateMarkdown = () => {
        const alignments = { center: ":---:", right: "---:", left: ":---" };
        const separator = `| ${tableData.alignments.map(align => alignments[align]).join(" | ")} |`;
        const header = `| ${tableData.headers.join(" | ")} |`;
        const rows = tableData.rows.map(row => `| ${row.join(" | ")} |`).join("\n");
        return [header, separator, rows].join("\n");
    };

    const generateJSON = () => {
        const jsonOutput = {};
        tableData.rows.forEach(row => {
          const serviceName = row[0]?.replace(/\*\*/g, ''); // Remove ** from service name
           if (serviceName) {
              jsonOutput[serviceName] = {};
              for (let i = 1; i < tableData.headers.length; i++) {
                  jsonOutput[serviceName][tableData.headers[i].replace(/\*\*/g, '')] = row[i] ? row[i].toLowerCase() : "no";
              }
           }
        });
          return JSON.stringify(jsonOutput, null, 2);
      };

     const generateOutput = () => {
            const output = outputFormat === 'markdown' ? generateMarkdown() : generateJSON();
             outputTextArea.value = output;
     }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(outputTextArea.value);
            showNotification("Copied to clipboard!");
        } catch (err) {
            console.error('Could not copy text: ', err);
            outputTextArea.select();
            document.execCommand("copy");
            showNotification("Copied to clipboard!");
        }
    };

    const clearAll = () => {
        if (confirm("Are you sure you want to clear everything?")) {
            inputTextArea.value = "";
            outputTextArea.value = "";
            tableContainer.innerHTML = "";
            tableData = { headers: [], rows: [], alignments: [] };
            analysisMarkdownOutput.textContent = "";
             outputFormat = 'markdown';
            showNotification("All cleared");
        }
    };

    const toggleReorderMode = () => {
        isReorderMode = !isReorderMode;
        reorderBtn.textContent = isReorderMode ? "Edit Table" : "Re-order";
        renderTable();
    };
    
    //Add event listener for dropdown
    document.addEventListener('change', function(e) {
       if(e.target && e.target.id == 'outputFormat'){
          outputFormat = e.target.value;
          generateOutput();
        }
    });
    

    // Event Listeners using modern syntax
    parseBtn.addEventListener("click", () => {
        parseTable();
    });

    analyzeBtn.addEventListener("click", () => {
        analyzeTableData();
        analysisSection.open = true; // Manually open analysis section
    });

    copyBtn.addEventListener("click", copyToClipboard);
    clearBtn.addEventListener("click", clearAll);
    addColumnBtn.addEventListener("click", addColumn);
    addRowBtn.addEventListener("click", addRow);
    sortRowsBtn.addEventListener("click", sortRows);
    removeColumnBtn.addEventListener("click", removeColumn);
    removeRowBtn.addEventListener("click", removeRow);
    reorderBtn.addEventListener("click", toggleReorderMode);
    inputTextArea.addEventListener("input", debounce(parseTable, 300));

})();