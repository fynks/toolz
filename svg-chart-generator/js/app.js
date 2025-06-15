        let data = [];
        let darkMode = false;
        let chartGenerated = false;

        // Initialize the app
        document.addEventListener('DOMContentLoaded', function () {
            updateUI();
            generateChart();
        });

        function showMessage(text, isError = false, type = 'success') {
            const message = document.getElementById('message');
            const messageText = document.getElementById('messageText');
            const icon = message.querySelector('i');

            messageText.textContent = text;

            // Reset all toast classes
            message.className = '';

            // Set appropriate class and icon based on type
            if (isError || type === 'error') {
                message.classList.add('toast-error');
                icon.className = 'fas fa-exclamation-circle';
            } else if (type === 'warning') {
                message.classList.add('toast-warning');
                icon.className = 'fas fa-exclamation-triangle';
            } else if (type === 'info') {
                message.classList.add('toast-info');
                icon.className = 'fas fa-info-circle';
            } else {
                message.classList.add('toast-success');
                icon.className = 'fas fa-check-circle';
            }

            message.classList.add('show');

            setTimeout(() => {
                message.classList.remove('show');
            }, 3000);
        }

        function updateUI() {
            const entriesSection = document.getElementById('entriesSection');
            const exportOptions = document.getElementById('exportOptions');
            const emptyState = document.getElementById('emptyState');
            const chart = document.getElementById('chart');

            // Show/hide sections based on data
            if (data.length > 0) {
                entriesSection.style.display = 'block';
                // Remove stats grid functionality entirely
            } else {
                entriesSection.style.display = 'none';
            }

            // Show/hide export options
            if (chartGenerated && data.length > 0) {
                exportOptions.style.display = 'flex';
                emptyState.style.display = 'none';
                chart.style.display = 'block';
            } else {
                exportOptions.style.display = 'none';
                emptyState.style.display = 'flex';
                chart.style.display = 'none';
            }

            // Update entry count
            document.getElementById('entryCount').textContent = data.length;
        }

        function addEntry() {
            const container = document.getElementById('entries');
            const index = data.length;
            const newEntry = {
                label: `Item ${index + 1}`,
                value: Math.floor(Math.random() * 100) + 1,
                color: getRandomColor()
            };
            data.push(newEntry);

            const entryDiv = document.createElement('div');
            entryDiv.className = "entry-item fade-in";
            entryDiv.innerHTML = `
                <input type="text" 
                       class="form-input" 
                       placeholder="Enter label" 
                       value="${newEntry.label}" 
                       onchange="updateData(${index}, 'label', this.value)"
                       oninput="validateInput(this)">
                <input type="number" 
                       class="form-input" 
                       placeholder="Enter value" 
                       value="${newEntry.value}" 
                       min="0"
                       step="0.1"
                       onchange="updateData(${index}, 'value', this.value)"
                       oninput="validateInput(this)">
                <div class="color-input-wrapper">
                    <input type="color" 
                           class="color-input" 
                           value="${newEntry.color}" 
                           onchange="updateData(${index}, 'color', this.value)"
                           title="Choose color">
                </div>
                <button class="btn btn-danger" 
                        onclick="removeEntry(${index})" 
                        title="Remove entry"
                        aria-label="Remove entry">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(entryDiv);

            updateUI();
            if (chartGenerated) {
                generateChart();
            }
        }

        function removeEntry(index) {
            if (data.length <= 1) {
                showMessage('Cannot remove the last entry. Add more entries first.', true, 'error');
                return;
            }

            if (index >= 0 && index < data.length) {
                data.splice(index, 1);
                refreshEntries();
                updateUI();
                if (chartGenerated) {
                    generateChart();
                }
            }
        }

        function refreshEntries() {
            const container = document.getElementById('entries');
            container.innerHTML = '';

            data.forEach((entry, i) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = "entry-item slide-in";
                entryDiv.innerHTML = `
                    <input type="text" 
                           class="form-input" 
                           placeholder="Enter label" 
                           value="${entry.label}" 
                           onchange="updateData(${i}, 'label', this.value)"
                           oninput="validateInput(this)">
                    <input type="number" 
                           class="form-input" 
                           placeholder="Enter value" 
                           value="${entry.value}" 
                           min="0"
                           step="0.1"
                           onchange="updateData(${i}, 'value', this.value)"
                           oninput="validateInput(this)">
                    <div class="color-input-wrapper">
                        <input type="color" 
                               class="color-input" 
                               value="${entry.color}" 
                               onchange="updateData(${i}, 'color', this.value)"
                               title="Choose color">
                    </div>
                    <button class="btn btn-danger" 
                            onclick="removeEntry(${i})" 
                            title="Remove entry"
                            aria-label="Remove entry">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(entryDiv);
            });
        }

        function validateInput(input) {
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

        function getRandomColor() {
            const colors = [
                '#4f46e5', '#7c3aed', '#dc2626', '#ea580c', '#d97706',
                '#ca8a04', '#65a30d', '#16a34a', '#059669', '#0891b2',
                '#0284c7', '#2563eb', '#4338ca', '#7c2d12', '#a21caf'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function updateData(index, key, value) {
            if (index >= data.length) return;

            if (key === 'value') {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                    showMessage('Please enter a valid positive number', true, 'error');
                    return;
                }
                data[index][key] = numValue;
            } else {
                data[index][key] = value;
            }

            updateUI();
            if (chartGenerated) {
                generateChart();
            }
        }

        function generateChart() {
            if (data.length === 0) {
                addSampleData();
                return;
            }

            const svg = document.getElementById('chart');
            const xLabel = document.getElementById('xLabel').value.trim() || 'Categories';
            const yLabel = document.getElementById('yLabel').value.trim() || 'Values';
            const chartType = document.getElementById('chartType').value;

            // Validate data
            const validData = data.filter(d => d.label.trim() !== '' && !isNaN(d.value) && d.value >= 0);
            if (validData.length === 0) {
                showMessage('Please add valid data entries with labels and positive values', true, 'error');
                return;
            }

            // Clear previous content
            svg.innerHTML = '';

            // Set responsive dimensions
            const width = 900;
            const height = 500;
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            const padding = { top: 50, right: 50, bottom: 120, left: 80 };
            const usableWidth = width - padding.left - padding.right;
            const usableHeight = height - padding.top - padding.bottom;

            const maxVal = Math.max(...validData.map(d => d.value), 1);
            // Fix dark mode detection
            const textColor = document.body.classList.contains('dark-theme') ? '#ffffff' : '#000000';
            const gridColor = document.body.classList.contains('dark-theme') ? '#4b5563' : '#e5e7eb';

            // Add background
            const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            background.setAttribute("width", width);
            background.setAttribute("height", height);
            background.setAttribute("fill", document.body.classList.contains('dark-theme') ? "#1f2937" : "#ffffff");
            svg.appendChild(background);

            // Add grid lines
            addGridLines(svg, padding, usableWidth, usableHeight, width, height, maxVal, gridColor);

            // Add axes
            addAxes(svg, padding, usableWidth, usableHeight, width, height, textColor);

            // Generate chart based on type
            if (chartType === 'bar') {
                generateBarChart(svg, validData, padding, usableWidth, usableHeight, maxVal, textColor);
            } else if (chartType === 'line') {
                generateLineChart(svg, validData, padding, usableWidth, usableHeight, maxVal, textColor);
            } else if (chartType === 'pie') {
                generatePieChart(svg, validData, width, height, textColor);
            }

            // Add labels (not for pie chart)
            if (chartType !== 'pie') {
                addAxisLabels(svg, xLabel, yLabel, width, height, padding, textColor);
            }

            chartGenerated = true;
            updateUI();
            showMessage('Chart generated successfully!', false, 'success');
        }
        function addSampleData() {
            const sampleData = [
                { label: 'Product A', value: 45, color: '#4f46e5' },
                { label: 'Product B', value: 30, color: '#7c3aed' },
                { label: 'Product C', value: 25, color: '#dc2626' },
                { label: 'Product D', value: 60, color: '#16a34a' }
            ];

            data = [...sampleData];
            refreshEntries();
            updateUI();
            generateChart();
        }

        function addGridLines(svg, padding, usableWidth, usableHeight, width, height, maxVal, gridColor) {
            const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            gridGroup.setAttribute("class", "grid");

            // Horizontal grid lines
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (usableHeight / 5) * i;
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", padding.left);
                line.setAttribute("y1", y);
                line.setAttribute("x2", width - padding.right);
                line.setAttribute("y2", y);
                line.setAttribute("stroke", gridColor);
                line.setAttribute("stroke-width", "1");
                line.setAttribute("opacity", "0.5");
                gridGroup.appendChild(line);

                // Y-axis labels
                const value = maxVal - (maxVal / 5) * i;
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", padding.left - 10);
                text.setAttribute("y", y + 5);
                text.setAttribute("text-anchor", "end");
                text.setAttribute("font-size", "12");
                text.setAttribute("fill", gridColor);
                text.textContent = Math.round(value * 10) / 10;
                gridGroup.appendChild(text);
            }

            svg.appendChild(gridGroup);
        }

        function addAxes(svg, padding, usableWidth, usableHeight, width, height, textColor) {
            // X-axis
            const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
            xAxis.setAttribute("x1", padding.left);
            xAxis.setAttribute("y1", height - padding.bottom);
            xAxis.setAttribute("x2", width - padding.right);
            xAxis.setAttribute("y2", height - padding.bottom);
            xAxis.setAttribute("stroke", textColor);
            xAxis.setAttribute("stroke-width", "2");
            svg.appendChild(xAxis);

            // Y-axis
            const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
            yAxis.setAttribute("x1", padding.left);
            yAxis.setAttribute("y1", padding.top);
            yAxis.setAttribute("x2", padding.left);
            yAxis.setAttribute("y2", height - padding.bottom);
            yAxis.setAttribute("stroke", textColor);
            yAxis.setAttribute("stroke-width", "2");
            svg.appendChild(yAxis);
        }

        function generateBarChart(svg, validData, padding, usableWidth, usableHeight, maxVal, textColor) {
            const barWidth = usableWidth / validData.length * 0.8;
            const barSpacing = usableWidth / validData.length * 0.2;

            const barsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            barsGroup.setAttribute("class", "bars");

            validData.forEach((d, i) => {
                const barHeight = Math.max((d.value / maxVal) * usableHeight, 2);
                const x = padding.left + i * (barWidth + barSpacing) + barSpacing / 2;
                const y = padding.top + usableHeight - barHeight;

                // Bar
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", x);
                rect.setAttribute("y", y);
                rect.setAttribute("width", barWidth);
                rect.setAttribute("height", barHeight);
                rect.setAttribute("fill", d.color);
                rect.setAttribute("rx", "4");
                rect.setAttribute("class", "chart-bar");

                // Add hover effects
                rect.addEventListener('mouseenter', function () {
                    this.style.opacity = '0.8';
                    this.style.transform = 'translateY(-2px)';
                });
                rect.addEventListener('mouseleave', function () {
                    this.style.opacity = '1';
                    this.style.transform = 'translateY(0)';
                });

                barsGroup.appendChild(rect);

                // Value label on top of bar
                const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                valueLabel.setAttribute("x", x + barWidth / 2);
                valueLabel.setAttribute("y", y - 8);
                valueLabel.setAttribute("text-anchor", "middle");
                valueLabel.setAttribute("font-size", "12");
                valueLabel.setAttribute("font-weight", "600");
                valueLabel.setAttribute("fill", textColor);
                valueLabel.textContent = d.value;
                barsGroup.appendChild(valueLabel);

                // Category label below x-axis
                const categoryLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                categoryLabel.setAttribute("x", x + barWidth / 2);
                categoryLabel.setAttribute("y", padding.top + usableHeight + 20);
                categoryLabel.setAttribute("text-anchor", "middle");
                categoryLabel.setAttribute("font-size", "12");
                categoryLabel.setAttribute("fill", textColor);
                categoryLabel.textContent = d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label;
                barsGroup.appendChild(categoryLabel);
            });

            svg.appendChild(barsGroup);
        }

        function generateLineChart(svg, validData, padding, usableWidth, usableHeight, maxVal, textColor) {
            if (validData.length < 2) {
                showMessage('Line chart requires at least 2 data points', true, 'warning');
                return;
            }

            const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            lineGroup.setAttribute("class", "line-chart");

            // Create line path
            const points = validData.map((d, i) => {
                const x = padding.left + (i * usableWidth) / (validData.length - 1);
                const y = padding.top + usableHeight - (d.value / maxVal) * usableHeight;
                return `${x},${y}`;
            }).join(' ');

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", points);
            polyline.setAttribute("fill", "none");
            polyline.setAttribute("stroke", "#4f46e5");
            polyline.setAttribute("stroke-width", "3");
            polyline.setAttribute("stroke-linecap", "round");
            polyline.setAttribute("stroke-linejoin", "round");
            lineGroup.appendChild(polyline);

            // Add data points
            validData.forEach((d, i) => {
                const x = padding.left + (i * usableWidth) / (validData.length - 1);
                const y = padding.top + usableHeight - (d.value / maxVal) * usableHeight;

                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", "6");
                circle.setAttribute("fill", d.color);
                circle.setAttribute("stroke", "#ffffff");
                circle.setAttribute("stroke-width", "2");

                // Add hover effects
                circle.addEventListener('mouseenter', function () {
                    this.setAttribute('r', '8');
                });
                circle.addEventListener('mouseleave', function () {
                    this.setAttribute('r', '6');
                });

                lineGroup.appendChild(circle);

                // Category label below x-axis
                const categoryLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                categoryLabel.setAttribute("x", x);
                categoryLabel.setAttribute("y", padding.top + usableHeight + 20);
                categoryLabel.setAttribute("text-anchor", "middle");
                categoryLabel.setAttribute("font-size", "12");
                categoryLabel.setAttribute("fill", textColor);
                categoryLabel.textContent = d.label.length > 10 ? d.label.substring(0, 10) + '...' : d.label;
                lineGroup.appendChild(categoryLabel);
            });

            svg.appendChild(lineGroup);
        }

        function generatePieChart(svg, validData, width, height, textColor) {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 3;

            const total = validData.reduce((sum, d) => sum + d.value, 0);
            let currentAngle = -Math.PI / 2; // Start from top

            const pieGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            pieGroup.setAttribute("class", "pie-chart");

            validData.forEach((d, i) => {
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

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", pathData);
                path.setAttribute("fill", d.color);
                path.setAttribute("stroke", "#ffffff");
                path.setAttribute("stroke-width", "2");

                // Add hover effects
                path.addEventListener('mouseenter', function () {
                    this.style.opacity = '0.8';
                });
                path.addEventListener('mouseleave', function () {
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
                    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    label.setAttribute("x", labelX);
                    label.setAttribute("y", labelY);
                    label.setAttribute("text-anchor", "middle");
                    label.setAttribute("dominant-baseline", "middle");
                    label.setAttribute("font-size", "12");
                    label.setAttribute("font-weight", "600");
                    label.setAttribute("fill", "#ffffff");
                    label.textContent = `${percentage}%`;
                    pieGroup.appendChild(label);
                }

                currentAngle = endAngle;
            });

            svg.appendChild(pieGroup);

            // Add legend for pie chart
            addPieLegend(svg, validData, width, height, textColor);
        }

        function addPieLegend(svg, validData, width, height, textColor) {
            const legendGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            legendGroup.setAttribute("class", "pie-legend");

            const legendX = 50;
            let legendY = 50;

            validData.forEach((d, i) => {
                // Color box
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", legendX);
                rect.setAttribute("y", legendY - 10);
                rect.setAttribute("width", 15);
                rect.setAttribute("height", 15);
                rect.setAttribute("fill", d.color);
                rect.setAttribute("rx", "2");
                legendGroup.appendChild(rect);

                // Label
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", legendX + 20);
                text.setAttribute("y", legendY + 2);
                text.setAttribute("font-size", "12");
                text.setAttribute("fill", textColor);
                text.textContent = `${d.label}: ${d.value}`;
                legendGroup.appendChild(text);

                legendY += 25;
            });

            svg.appendChild(legendGroup);
        }

        function addAxisLabels(svg, xLabel, yLabel, width, height, padding, textColor) {
            // X-axis label
            const xText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            xText.setAttribute("x", width / 2);
            xText.setAttribute("y", height - 20);
            xText.setAttribute("text-anchor", "middle");
            xText.setAttribute("font-size", "14");
            xText.setAttribute("font-weight", "600");
            xText.setAttribute("fill", textColor);
            xText.textContent = xLabel;
            svg.appendChild(xText);

            // Y-axis label
            const yText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            yText.setAttribute("x", 25);
            yText.setAttribute("y", height / 2);
            yText.setAttribute("transform", `rotate(-90, 25, ${height / 2})`);
            yText.setAttribute("text-anchor", "middle");
            yText.setAttribute("font-size", "14");
            yText.setAttribute("font-weight", "600");
            yText.setAttribute("fill", textColor);
            yText.textContent = yLabel;
            svg.appendChild(yText);
        }

        function addDataLabels(svg, validData, chartType, padding, usableWidth, usableHeight, maxVal, textColor) {
            // This function is called from generateChart for bar and line charts
            // Individual labels are added within each chart type function
        }

        function toggleDarkMode() {
            darkMode = !darkMode;
            const body = document.body;
            const toggle = document.getElementById('darkModeToggle');
            const icon = toggle.querySelector('i');

            if (darkMode) {
                body.classList.add('dark-theme');
                icon.className = 'fas fa-sun';
                toggle.title = 'Toggle light mode';
            } else {
                body.classList.remove('dark-theme');
                icon.className = 'fas fa-moon';
                toggle.title = 'Toggle dark mode';
            }

            if (chartGenerated) {
                generateChart();
            }
        }

        async function copySVG() {
            const svg = document.getElementById('chart');
            const copyButton = document.getElementById('copy-button');
            const originalText = copyButton.innerHTML;

            try {
                copyButton.innerHTML = '<span class="loading-spinner"></span> Copying...';
                copyButton.disabled = true;

                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                svg.setAttribute('version', '1.1');

                const svgString = new XMLSerializer().serializeToString(svg);
                await navigator.clipboard.writeText(svgString);

                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                showMessage('SVG copied to clipboard!', false, 'success');

                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.disabled = false;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy SVG: ', err);
                showMessage('Failed to copy SVG. Please try again.', true, 'error');
                copyButton.innerHTML = originalText;
                copyButton.disabled = false;
            }
        }


        function downloadSVG() {
            const svg = document.getElementById('chart');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('version', '1.1');

            const svgString = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'chart.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showMessage('SVG downloaded successfully!', false, 'success');
        }
        function downloadPNG() {
            const svg = document.getElementById('chart');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            canvas.width = 1200;
            canvas.height = 600;

            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('version', '1.1');

            const svgString = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = function () {
                ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#1f2937' : '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(function (blob) {
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = 'chart.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(downloadUrl);
                    URL.revokeObjectURL(url);

                    showMessage('PNG downloaded successfully!', false, 'success');
                });
            };

            img.onerror = function () {
                showMessage('Failed to generate PNG. Please try again.', true, 'error');
                URL.revokeObjectURL(url);
            };

            img.src = url;
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        generateChart();
                        break;
                    case 'n':
                        e.preventDefault();
                        addEntry();
                        break;
                    case 'd':
                        e.preventDefault();
                        toggleDarkMode();
                        break;
                    case 'c':
                        if (chartGenerated) {
                            e.preventDefault();
                            copySVG();
                        }
                        break;
                }
            }
        });

        // Auto-generate chart when inputs change
        document.getElementById('xLabel').addEventListener('input', function () {
            if (chartGenerated) generateChart();
        });

        document.getElementById('yLabel').addEventListener('input', function () {
            if (chartGenerated) generateChart();
        });

        document.getElementById('chartType').addEventListener('change', function () {
            if (chartGenerated) generateChart();
        });