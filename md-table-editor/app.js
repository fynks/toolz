       'use strict';
        
        
        let tableData = {
            headers: [],
            rows: [],
            alignments: []
        };
        
       
        document.addEventListener('DOMContentLoaded', () => {
            initializeApp();
            setupEventListeners();
        });
        
        function initializeApp() {
            loadSavedTables();
        }
        
        function setupEventListeners() {
            document.getElementById('input').addEventListener('input', debounce(parseTable, 300));
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', handleButtonClick);
            });
        }
        
        function handleButtonClick(e) {
            const action = e.target.getAttribute('data-action');
            const actions = {
                'parse': parseTable,
                'save': saveCurrentTable,
                'copy': copyToClipboard,
                'clear': clearAll,
                'addColumn': addColumn,
                'addRow': addRow,
                'removeColumn': removeColumn,
                'removeRow': removeRow
            };
            if (actions[action]) {
                actions[action]();
            }
        }
        
        function parseTable() {
            const input = document.getElementById('input').value;
            if (!input.trim()) {
                showNotification('Please enter a markdown table', 'error');
                return;
            }
        
            const lines = input.trim().split('\n');
            if (lines.length < 3) {
                showNotification('Invalid table format', 'error');
                return;
            }
        
            try {
                
                tableData.headers = lines[0]
                    .split('|')
                    .filter(cell => cell.trim())
                    .map(cell => sanitizeInput(cell.trim()));
        
                
                const alignmentRow = lines[1].split('|').filter(cell => cell.trim());
                tableData.alignments = alignmentRow.map(cell => {
                    cell = cell.trim();
                    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
                    if (cell.endsWith(':')) return 'right';
                    return 'left';
                });
        
                
                tableData.rows = lines.slice(2).map(line =>
                    line.split('|')
                        .filter(cell => cell.trim())
                        .map(cell => sanitizeInput(cell.trim()))
                );
        
                renderTable();
                showNotification('Table parsed successfully!');
            } catch (error) {
                showNotification('Error parsing table', 'error');
                console.error('Parse error:', error);
            }
        }
        
        function renderTable() {
            const container = document.getElementById('tableContainer');
            const table = document.createElement('table');
            
           
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            tableData.headers.forEach((header, index) => {
                const th = createHeaderCell(header, index);
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
        
            const tbody = document.createElement('tbody');
            tableData.rows.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                row.forEach((cell, colIndex) => {
                    const td = createDataCell(cell, rowIndex, colIndex);
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            container.innerHTML = '';
            container.appendChild(table);
            
            generateMarkdown();
        }
        
        function createHeaderCell(content, index) {
            const th = document.createElement('th');
            th.contentEditable = true;
            th.textContent = content;
            th.draggable = true;
            th.dataset.index = index;
            
            th.addEventListener('dragstart', handleDragStart);
            th.addEventListener('dragover', handleDragOver);
            th.addEventListener('drop', handleDrop);
            th.addEventListener('blur', () => {
                tableData.headers[index] = sanitizeInput(th.textContent);
                generateMarkdown();
            });
            
            return th;
        }
        
        function createDataCell(content, rowIndex, colIndex) {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.textContent = content;
            
            td.addEventListener('blur', () => {
                tableData.rows[rowIndex][colIndex] = sanitizeInput(td.textContent);
                generateMarkdown();
            });
            
            return td;
        }
        
        function handleDragStart(e) {
            e.target.classList.add('dragging');
            e.dataTransfer.setData('text/plain', e.target.dataset.index);
        }
        
        function handleDragOver(e) {
            e.preventDefault();
        }
        
        function handleDrop(e) {
            e.preventDefault();
            const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const dropIdx = parseInt(e.target.dataset.index);
            
            if (draggedIdx === dropIdx) return;
        
            reorderColumns(draggedIdx, dropIdx);
            renderTable();
        }
        
        function reorderColumns(fromIndex, toIndex) {
            const reorderArray = (arr) => {
                const element = arr[fromIndex];
                arr.splice(fromIndex, 1);
                arr.splice(toIndex, 0, element);
            };
        
            reorderArray(tableData.headers);
            reorderArray(tableData.alignments);
            tableData.rows.forEach(row => reorderArray(row));
        }
        
        function addColumn() {
            tableData.headers.push('New Column');
            tableData.alignments.push('left');
            tableData.rows.forEach(row => row.push(''));
            renderTable();
            showNotification('Column added');
        }
        
        function addRow() {
            const newRow = Array(tableData.headers.length).fill('');
            tableData.rows.push(newRow);
            renderTable();
            showNotification('Row added');
        }
        
        function removeColumn() {
            if (tableData.headers.length <= 1) {
                showNotification('Cannot remove last column', 'error');
                return;
            }
            tableData.headers.pop();
            tableData.alignments.pop();
            tableData.rows.forEach(row => row.pop());
            renderTable();
            showNotification('Column removed');
        }
        
        function removeRow() {
            if (tableData.rows.length <= 1) {
                showNotification('Cannot remove last row', 'error');
                return;
            }
            tableData.rows.pop();
            renderTable();
            showNotification('Row removed');
        }
        
        function generateMarkdown() {
            const alignmentMap = {
                'center': ':---:',
                'right': '---:',
                'left': ':---'
            };
        
            const markdown = [
                `| ${tableData.headers.join(' | ')} |`,
                `| ${tableData.alignments.map(a => alignmentMap[a]).join(' | ')} |`,
                ...tableData.rows.map(row => `| ${row.join(' | ')} |`)
            ].join('\n');
        
            document.getElementById('output').value = markdown;
            return markdown;
        }
        
        
        async function saveCurrentTable() {
            const markdown = generateMarkdown();
            if (!markdown) {
                showNotification('No table to save', 'error');
                return;
            }
        
            const name = await promptAsync('Enter a name for this table:');
            if (!name) return;
        
            try {
                const savedTables = getSavedTables();
                savedTables[name] = {
                    markdown,
                    date: new Date().toISOString()
                };
                
                localStorage.setItem('savedTables', JSON.stringify(savedTables));
                showNotification('Table saved successfully!');
                loadSavedTables();
            } catch (error) {
                showNotification('Error saving table', 'error');
                console.error('Save error:', error);
            }
        }
        
        function getSavedTables() {
            try {
                return JSON.parse(localStorage.getItem('savedTables')) || {};
            } catch {
                return {};
            }
        }
        
        function loadSavedTables() {
            const savedTables = getSavedTables();
            const container = document.getElementById('saveList');
            container.innerHTML = '';
        
            Object.entries(savedTables).forEach(([name, data]) => {
                const item = createSavedTableItem(name, data);
                container.appendChild(item);
            });
        }
        
        function createSavedTableItem(name, data) {
            const item = document.createElement('div');
            item.className = 'saved-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            
            const actions = document.createElement('div');
            actions.className = 'item-actions';
            
            const loadBtn = createButton('Load', () => loadTable(data.markdown));
            loadBtn.className = 'load-btn';
            const deleteBtn = createButton('Delete', () => deleteTable(name));
            deleteBtn.className = 'delete-btn';
            
            actions.appendChild(loadBtn);
            actions.appendChild(deleteBtn);
            
            item.appendChild(nameSpan);
            item.appendChild(actions);
            
            return item;
        }
        
        function createButton(text, onClick) {
            const button = document.createElement('button');
            button.textContent = text;
            button.addEventListener('click', onClick);
            return button;
        }
        
     
        async function copyToClipboard() {
            try {
                const output = document.getElementById('output').value;
                await navigator.clipboard.writeText(output);
                showNotification('Copied to clipboard!');
            } catch {
                const output = document.getElementById('output');
                output.select();
                document.execCommand('copy');
                showNotification('Copied to clipboard!');
            }
        }
        
        function clearAll() {
            if (!confirm('Are you sure you want to clear everything?')) return;
            
            document.getElementById('input').value = '';
            document.getElementById('output').value = '';
            document.getElementById('tableContainer').innerHTML = '';
            tableData = {headers: [], rows: [], alignments: []};
            showNotification('All cleared');
        }
        
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.style.backgroundColor = type === 'error' ? '#dc3545' : '#4CAF50';
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
        
        function sanitizeInput(input) {
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        function promptAsync(message) {
            return new Promise(resolve => {
                resolve(prompt(message));
            });
        }
        
  
        initializeApp();