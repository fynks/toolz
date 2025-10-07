// Modern SVG Chart Generator with improved UX
class ChartGenerator {
    constructor() {
        this.data = [];
        this.chartGenerated = false;
        this.draggedIndex = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.updateUI();
    }

    cacheElements() {
        this.elements = {
            entries: document.getElementById('entries'),
            entriesSection: document.getElementById('entriesSection'),
            chart: document.getElementById('chart'),
            chartContainer: document.getElementById('chart-container'),
            emptyState: document.getElementById('emptyState'),
            exportOptions: document.getElementById('exportOptions'),
            entryCount: document.getElementById('entryCount'),
            xLabel: document.getElementById('xLabel'),
            yLabel: document.getElementById('yLabel'),
            chartType: document.getElementById('chartType'),
            message: document.getElementById('message'),
            messageText: document.getElementById('messageText'),
            darkModeToggle: document.getElementById('darkModeToggle'),
            copyButton: document.getElementById('copy-button')
        };
    }

    attachEventListeners() {
        // Remove auto-generate on input changes - only generate on button click
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    this.generateChart();
                    break;
                case 'n':
                    e.preventDefault();
                    this.addEntry();
                    break;
                case 'd':
                    e.preventDefault();
                    this.toggleDarkMode();
                    break;
                case 'c':
                    if (this.chartGenerated) {
                        e.preventDefault();
                        this.copySVG();
                    }
                    break;
            }
        }
    }

    showMessage(text, type = 'success') {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const icon = this.elements.message.querySelector('i');
        this.elements.messageText.textContent = text;
        
        this.elements.message.className = '';
        this.elements.message.classList.add(`toast-${type}`, 'show');
        icon.className = iconMap[type];

        setTimeout(() => {
            this.elements.message.classList.remove('show');
        }, 3000);
    }

    updateUI() {
        const hasData = this.data.length > 0;
        
        this.elements.entriesSection.style.display = hasData ? 'block' : 'none';
        this.elements.entryCount.textContent = this.data.length;

        if (this.chartGenerated && hasData) {
            this.elements.exportOptions.style.display = 'flex';
            this.elements.emptyState.style.display = 'none';
            this.elements.chart.style.display = 'block';
        } else {
            this.elements.exportOptions.style.display = 'none';
            this.elements.emptyState.style.display = 'flex';
            this.elements.chart.style.display = 'none';
        }
    }

    addEntry() {
        const newEntry = {
            label: `Item ${this.data.length + 1}`,
            value: Math.floor(Math.random() * 100) + 1,
            color: this.getRandomColor()
        };
        this.data.push(newEntry);
        this.refreshEntries();
        this.updateUI();
    }

    removeEntry(index) {
        if (this.data.length <= 1) {
            this.showMessage('Cannot remove the last entry. Add more entries first.', 'error');
            return;
        }

        if (index >= 0 && index < this.data.length) {
            this.data.splice(index, 1);
            this.refreshEntries();
            this.updateUI();
        }
    }

    updateData(index, key, value) {
        if (index >= this.data.length) return;

        if (key === 'value') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                this.showMessage('Please enter a valid positive number', 'error');
                return;
            }
            this.data[index][key] = numValue;
        } else {
            this.data[index][key] = value;
        }
    }

    refreshEntries() {
        this.elements.entries.innerHTML = '';

        this.data.forEach((entry, i) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = "entry-item";
            entryDiv.draggable = true;
            entryDiv.dataset.index = i;
            
            entryDiv.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <input type="text" 
                       class="form-input" 
                       placeholder="Enter label" 
                       value="${this.escapeHtml(entry.label)}" 
                       data-index="${i}"
                       data-field="label">
                <input type="number" 
                       class="form-input" 
                       placeholder="Enter value" 
                       value="${entry.value}" 
                       min="0"
                       step="0.1"
                       data-index="${i}"
                       data-field="value">
                <div class="color-input-wrapper">
                    <input type="color" 
                           class="color-input" 
                           value="${entry.color}" 
                           data-index="${i}"
                           data-field="color"
                           title="Choose color">
                </div>
                <button class="btn btn-danger" 
                        data-index="${i}"
                        data-action="remove"
                        title="Remove entry"
                        aria-label="Remove entry">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Add event listeners using event delegation
            this.attachEntryListeners(entryDiv);
            this.elements.entries.appendChild(entryDiv);
        });
    }

    attachEntryListeners(entryDiv) {
        // Input change listeners
        const inputs = entryDiv.querySelectorAll('input[data-field]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                this.updateData(index, field, e.target.value);
            });

            input.addEventListener('input', (e) => {
                this.validateInput(e.target);
            });
        });

        // Remove button listener
        const removeBtn = entryDiv.querySelector('[data-action="remove"]');
        removeBtn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            this.removeEntry(index);
        });

        // Drag and drop listeners
        entryDiv.addEventListener('dragstart', (e) => this.handleDragStart(e));
        entryDiv.addEventListener('dragover', (e) => this.handleDragOver(e));
        entryDiv.addEventListener('drop', (e) => this.handleDrop(e));
        entryDiv.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    handleDragStart(e) {
        this.draggedIndex = parseInt(e.currentTarget.dataset.index);
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetIndex = parseInt(e.currentTarget.dataset.index);
        if (targetIndex !== this.draggedIndex) {
            e.currentTarget.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const targetIndex = parseInt(e.currentTarget.dataset.index);
        
        if (this.draggedIndex !== null && targetIndex !== this.draggedIndex) {
            // Reorder the data array
            const [draggedItem] = this.data.splice(this.draggedIndex, 1);
            this.data.splice(targetIndex, 0, draggedItem);
            this.refreshEntries();
            this.showMessage('Entry reordered successfully', 'success');
        }

        e.currentTarget.classList.remove('drag-over');
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.entry-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        this.draggedIndex = null;
    }

    validateInput(input) {
        const value = input.value.trim();
        if (input.type === 'number' && (isNaN(value) || value < 0)) {
            input.style.borderColor = 'var(--danger-color)';
            return false;
        } else if (input.type === 'text' && value === '') {
            input.style.borderColor = 'var(--warning-color)';
            return false;
        } else {
            input.style.borderColor = 'var(--border-color)';
            return true;
        }
    }

    getRandomColor() {
        const colors = [
            '#4f46e5', '#7c3aed', '#dc2626', '#ea580c', '#d97706',
            '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0891b2',
            '#0284c7', '#2563eb', '#4338ca', '#7c2d12', '#a21caf'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    generateChart() {
        if (this.data.length === 0) {
            this.addSampleData();
            return;
        }

        const xLabel = this.elements.xLabel.value.trim() || 'Categories';
        const yLabel = this.elements.yLabel.value.trim() || 'Values';
        const chartType = this.elements.chartType.value;

        // Validate data
        const validData = this.data.filter(d => 
            d.label.trim() !== '' && !isNaN(d.value) && d.value >= 0
        );

        if (validData.length === 0) {
            this.showMessage('Please add valid data entries with labels and positive values', 'error');
            return;
        }

        // Clear previous content
        this.elements.chart.innerHTML = '';

        // Set responsive dimensions
        const width = 900;
        const height = 500;
        this.elements.chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.elements.chart.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        const padding = { top: 50, right: 50, bottom: 120, left: 80 };
        const usableWidth = width - padding.left - padding.right;
        const usableHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(...validData.map(d => d.value), 1);
        
        // Fix dark mode detection - use correct class and get proper colors
        const isDarkMode = document.body.classList.contains('dark-theme');
        const textColor = isDarkMode ? '#f9fafb' : '#111827';
        const gridColor = isDarkMode ? '#6b7280' : '#9ca3af';
        const bgColor = isDarkMode ? '#1f2937' : '#ffffff';

        // Add background
        const background = this.createSVGElement('rect', {
            width,
            height,
            fill: bgColor
        });
        this.elements.chart.appendChild(background);

        // Add grid lines
        this.addGridLines(padding, usableWidth, usableHeight, width, height, maxVal, gridColor, textColor);

        // Add axes
        this.addAxes(padding, usableWidth, usableHeight, width, height, textColor);

        // Generate chart based on type
        switch (chartType) {
            case 'bar':
                this.generateBarChart(validData, padding, usableWidth, usableHeight, maxVal, textColor);
                break;
            case 'line':
                this.generateLineChart(validData, padding, usableWidth, usableHeight, maxVal, textColor);
                break;
            case 'pie':
                this.generatePieChart(validData, width, height, textColor);
                break;
        }

        // Add labels (not for pie chart)
        if (chartType !== 'pie') {
            this.addAxisLabels(xLabel, yLabel, width, height, padding, textColor);
        }

        this.chartGenerated = true;
        this.updateUI();
        this.showMessage('Chart generated successfully!', 'success');
    }

    addSampleData() {
        const sampleData = [
            { label: 'Product A', value: 45, color: '#4f46e5' },
            { label: 'Product B', value: 30, color: '#7c3aed' },
            { label: 'Product C', value: 25, color: '#dc2626' },
            { label: 'Product D', value: 60, color: '#16a34a' }
        ];

        this.data = [...sampleData];
        this.refreshEntries();
        this.updateUI();
        this.generateChart();
    }

    createSVGElement(tag, attributes = {}) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    addGridLines(padding, usableWidth, usableHeight, width, height, maxVal, gridColor, textColor) {
        const gridGroup = this.createSVGElement('g', { class: 'grid' });

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (usableHeight / 5) * i;
            
            const line = this.createSVGElement('line', {
                x1: padding.left,
                y1: y,
                x2: width - padding.right,
                y2: y,
                stroke: gridColor,
                'stroke-width': '1',
                opacity: '0.5'
            });
            gridGroup.appendChild(line);

            // Y-axis labels - FIXED: use textColor instead of gridColor
            const value = maxVal - (maxVal / 5) * i;
            const text = this.createSVGElement('text', {
                x: padding.left - 10,
                y: y + 5,
                'text-anchor': 'end',
                'font-size': '12',
                fill: textColor  // Changed from gridColor to textColor
            });
            text.textContent = Math.round(value * 10) / 10;
            gridGroup.appendChild(text);
        }

        this.elements.chart.appendChild(gridGroup);
    }

    addAxes(padding, usableWidth, usableHeight, width, height, textColor) {
        // X-axis
        const xAxis = this.createSVGElement('line', {
            x1: padding.left,
            y1: height - padding.bottom,
            x2: width - padding.right,
            y2: height - padding.bottom,
            stroke: textColor,
            'stroke-width': '2'
        });
        this.elements.chart.appendChild(xAxis);

        // Y-axis
        const yAxis = this.createSVGElement('line', {
            x1: padding.left,
            y1: padding.top,
            x2: padding.left,
            y2: height - padding.bottom,
            stroke: textColor,
            'stroke-width': '2'
        });
        this.elements.chart.appendChild(yAxis);
    }

    generateBarChart(validData, padding, usableWidth, usableHeight, maxVal, textColor) {
        const barWidth = usableWidth / validData.length * 0.8;
        const barSpacing = usableWidth / validData.length * 0.2;

        const barsGroup = this.createSVGElement('g', { class: 'bars' });

        validData.forEach((d, i) => {
            const barHeight = Math.max((d.value / maxVal) * usableHeight, 2);
            const x = padding.left + i * (barWidth + barSpacing) + barSpacing / 2;
            const y = padding.top + usableHeight - barHeight;

            // Bar with rounded corners
            const rect = this.createSVGElement('rect', {
                x,
                y,
                width: barWidth,
                height: barHeight,
                fill: d.color,
                rx: '4',
                class: 'chart-bar',
                style: 'transition: opacity 0.2s, transform 0.2s; cursor: pointer;'
            });

            // Add hover effects
            rect.addEventListener('mouseenter', function() {
                this.style.opacity = '0.8';
                this.style.transform = 'translateY(-2px)';
            });
            rect.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
                this.style.transform = 'translateY(0)';
            });

            barsGroup.appendChild(rect);

            // Value label on top of bar
            const valueLabel = this.createSVGElement('text', {
                x: x + barWidth / 2,
                y: y - 8,
                'text-anchor': 'middle',
                'font-size': '12',
                'font-weight': '600',
                fill: textColor
            });
            valueLabel.textContent = d.value;
            barsGroup.appendChild(valueLabel);

            // Category label below x-axis
            const categoryLabel = this.createSVGElement('text', {
                x: x + barWidth / 2,
                y: padding.top + usableHeight + 20,
                'text-anchor': 'middle',
                'font-size': '12',
                fill: textColor
            });
            categoryLabel.textContent = d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label;
            barsGroup.appendChild(categoryLabel);
        });

        this.elements.chart.appendChild(barsGroup);
    }

    generateLineChart(validData, padding, usableWidth, usableHeight, maxVal, textColor) {
        if (validData.length < 2) {
            this.showMessage('Line chart requires at least 2 data points', 'warning');
            return;
        }

        const lineGroup = this.createSVGElement('g', { class: 'line-chart' });

        // Create line path
        const points = validData.map((d, i) => {
            const x = padding.left + (i * usableWidth) / (validData.length - 1);
            const y = padding.top + usableHeight - (d.value / maxVal) * usableHeight;
            return `${x},${y}`;
        }).join(' ');

        const polyline = this.createSVGElement('polyline', {
            points,
            fill: 'none',
            stroke: '#4f46e5',
            'stroke-width': '3',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
        });
        lineGroup.appendChild(polyline);

        // Add data points
        validData.forEach((d, i) => {
            const x = padding.left + (i * usableWidth) / (validData.length - 1);
            const y = padding.top + usableHeight - (d.value / maxVal) * usableHeight;

            const circle = this.createSVGElement('circle', {
                cx: x,
                cy: y,
                r: '6',
                fill: d.color,
                stroke: '#ffffff',
                'stroke-width': '2',
                style: 'transition: r 0.2s; cursor: pointer;'
            });

            // Add hover effects
            circle.addEventListener('mouseenter', function() {
                this.setAttribute('r', '8');
            });
            circle.addEventListener('mouseleave', function() {
                this.setAttribute('r', '6');
            });

            lineGroup.appendChild(circle);

            // Category label below x-axis
            const categoryLabel = this.createSVGElement('text', {
                x,
                y: padding.top + usableHeight + 20,
                'text-anchor': 'middle',
                'font-size': '12',
                fill: textColor
            });
            categoryLabel.textContent = d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label;
            lineGroup.appendChild(categoryLabel);
        });

        this.elements.chart.appendChild(lineGroup);
    }

    generatePieChart(validData, width, height, textColor) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        const total = validData.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = -Math.PI / 2; // Start from top

        const pieGroup = this.createSVGElement('g', { class: 'pie-chart' });

        validData.forEach((d) => {
            const sliceAngle = (d.value / total) * 2 * Math.PI;
            const endAngle = currentAngle + sliceAngle;

            const x1 = centerX + radius * Math.cos(currentAngle);
            const y1 = centerY + radius * Math.sin(currentAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');

            const path = this.createSVGElement('path', {
                d: pathData,
                fill: d.color,
                stroke: '#ffffff',
                'stroke-width': '2',
                style: 'transition: opacity 0.2s; cursor: pointer;'
            });

            // Add hover effects
            path.addEventListener('mouseenter', function() {
                this.style.opacity = '0.8';
            });
            path.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
            });

            pieGroup.appendChild(path);

            // Add percentage labels
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos(labelAngle);
            const labelY = centerY + labelRadius * Math.sin(labelAngle);
            const percentage = ((d.value / total) * 100).toFixed(1);

            if (percentage > 5) { // Only show label if slice is large enough
                const label = this.createSVGElement('text', {
                    x: labelX,
                    y: labelY,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'font-size': '12',
                    'font-weight': '600',
                    fill: '#ffffff'
                });
                label.textContent = `${percentage}%`;
                pieGroup.appendChild(label);
            }

            currentAngle = endAngle;
        });

        this.elements.chart.appendChild(pieGroup);
        this.addPieLegend(validData, width, height, textColor);
    }

    addPieLegend(validData, width, height, textColor) {
        const legendGroup = this.createSVGElement('g', { class: 'pie-legend' });

        const legendX = 50;
        let legendY = 50;

        validData.forEach((d) => {
            // Color box
            const rect = this.createSVGElement('rect', {
                x: legendX,
                y: legendY - 10,
                width: 15,
                height: 15,
                fill: d.color,
                rx: '2'
            });
            legendGroup.appendChild(rect);

            // Label
            const text = this.createSVGElement('text', {
                x: legendX + 20,
                y: legendY + 2,
                'font-size': '12',
                fill: textColor
            });
            text.textContent = `${d.label}: ${d.value}`;
            legendGroup.appendChild(text);

            legendY += 25;
        });

        this.elements.chart.appendChild(legendGroup);
    }

    addAxisLabels(xLabel, yLabel, width, height, padding, textColor) {
        // X-axis label
        const xText = this.createSVGElement('text', {
            x: width / 2,
            y: height - 20,
            'text-anchor': 'middle',
            'font-size': '14',
            'font-weight': '600',
            fill: textColor
        });
        xText.textContent = xLabel;
        this.elements.chart.appendChild(xText);

        // Y-axis label
        const yText = this.createSVGElement('text', {
            x: 25,
            y: height / 2,
            transform: `rotate(-90, 25, ${height / 2})`,
            'text-anchor': 'middle',
            'font-size': '14',
            'font-weight': '600',
            fill: textColor
        });
        yText.textContent = yLabel;
        this.elements.chart.appendChild(yText);
    }

    toggleDarkMode() {
        const body = document.body;
        const icon = this.elements.darkModeToggle.querySelector('i');

        body.classList.toggle('dark-theme');
        const isDark = body.classList.contains('dark-theme');

        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        this.elements.darkModeToggle.title = isDark ? 'Toggle light mode' : 'Toggle dark mode';

        // Regenerate chart only if one exists
        if (this.chartGenerated && this.data.length > 0) {
            this.generateChart();
        }
    }

    async copySVG() {
        const originalText = this.elements.copyButton.innerHTML;

        try {
            this.elements.copyButton.innerHTML = '<span class="loading-spinner"></span> Copying...';
            this.elements.copyButton.disabled = true;

            this.elements.chart.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            this.elements.chart.setAttribute('version', '1.1');

            const svgString = new XMLSerializer().serializeToString(this.elements.chart);
            await navigator.clipboard.writeText(svgString);

            this.elements.copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
            this.showMessage('SVG copied to clipboard!', 'success');

            setTimeout(() => {
                this.elements.copyButton.innerHTML = originalText;
                this.elements.copyButton.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy SVG:', err);
            this.showMessage('Failed to copy SVG. Please try again.', 'error');
            this.elements.copyButton.innerHTML = originalText;
            this.elements.copyButton.disabled = false;
        }
    }

    downloadSVG() {
        this.elements.chart.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.elements.chart.setAttribute('version', '1.1');

        const svgString = new XMLSerializer().serializeToString(this.elements.chart);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'chart.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('SVG downloaded successfully!', 'success');
    }

    downloadPNG() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = 1200;
        canvas.height = 600;

        this.elements.chart.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.elements.chart.setAttribute('version', '1.1');

        const svgString = new XMLSerializer().serializeToString(this.elements.chart);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const isDarkMode = document.body.classList.contains('dark-theme');
            ctx.fillStyle = isDarkMode ? '#1f2937' : '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = 'chart.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                URL.revokeObjectURL(url);

                this.showMessage('PNG downloaded successfully!', 'success');
            });
        };

        img.onerror = () => {
            this.showMessage('Failed to generate PNG. Please try again.', 'error');
            URL.revokeObjectURL(url);
        };

        img.src = url;
    }
}

// Initialize the app
let chartGenerator;

document.addEventListener('DOMContentLoaded', () => {
    chartGenerator = new ChartGenerator();
});

// Global functions for HTML onclick handlers
function addEntry() {
    chartGenerator.addEntry();
}

function generateChart() {
    chartGenerator.generateChart();
}

function toggleDarkMode() {
    chartGenerator.toggleDarkMode();
}

function copySVG() {
    chartGenerator.copySVG();
}

function downloadSVG() {
    chartGenerator.downloadSVG();
}

function downloadPNG() {
    chartGenerator.downloadPNG();
}
