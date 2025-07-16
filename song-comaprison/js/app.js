        // Global variables to store comparison results
        let comparisonResults = {
            matches: [],
            uniqueA: [],
            uniqueB: []
        };

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
        });

        function initializeApp() {
            // Load cached data if available
            loadCachedData();
            
            // Set up event listeners
            setupEventListeners();
        }

        function setupEventListeners() {
            // File upload handlers
            document.getElementById('fileA').addEventListener('change', handleFileUpload);
            document.getElementById('fileB').addEventListener('change', handleFileUpload);
            
            // Text input handlers for auto-save
            document.getElementById('textA').addEventListener('input', saveCachedData);
            document.getElementById('textB').addEventListener('input', saveCachedData);
            
            // Compare button
            document.getElementById('compareBtn').addEventListener('click', compareLists);
            
            // Save data when user types
            document.getElementById('textA').addEventListener('blur', saveCachedData);
            document.getElementById('textB').addEventListener('blur', saveCachedData);
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            const fileId = event.target.id;
            const textAreaId = fileId === 'fileA' ? 'textA' : 'textB';
            const fileNameId = fileId === 'fileA' ? 'fileNameA' : 'fileNameB';
            
            if (file) {
                // Display file name
                document.getElementById(fileNameId).textContent = file.name;
                
                // Read file content
                const reader = new FileReader();
                reader.onload = function(e) {
                    const content = e.target.result;
                    document.getElementById(textAreaId).value = content;
                    saveCachedData();
                };
                reader.readAsText(file);
            }
        }

        function saveCachedData() {
            const data = {
                listA: document.getElementById('textA').value,
                listB: document.getElementById('textB').value,
                timestamp: Date.now()
            };
            
            try {
                // Store in memory instead of localStorage
                window.cachedData = data;
            } catch (error) {
                console.warn('Unable to cache data:', error);
            }
        }

        function loadCachedData() {
            try {
                // Load from memory instead of localStorage
                const cachedData = window.cachedData;
                if (cachedData) {
                    document.getElementById('textA').value = cachedData.listA || '';
                    document.getElementById('textB').value = cachedData.listB || '';
                }
            } catch (error) {
                console.warn('Unable to load cached data:', error);
            }
        }

        function compareLists() {
            const listA = document.getElementById('textA').value.trim();
            const listB = document.getElementById('textB').value.trim();
            
            if (!listA || !listB) {
                alert('Please provide both lists to compare');
                return;
            }
            
            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('results').classList.remove('show');
            document.getElementById('compareBtn').disabled = true;
            
            // Process comparison with a slight delay to show loading
            setTimeout(() => {
                performComparison(listA, listB);
            }, 500);
        }

        function performComparison(listA, listB) {
            // Parse lists
            const songsA = parseList(listA);
            const songsB = parseList(listB);
            
            // Perform fuzzy matching
            const results = fuzzyMatch(songsA, songsB);
            
            // Store results globally
            comparisonResults = results;
            
            // Display results
            displayResults(results);
            
            // Hide loading state
            document.getElementById('loading').style.display = 'none';
            document.getElementById('results').classList.add('show');
            document.getElementById('compareBtn').disabled = false;
        }

        function parseList(text) {
            return text.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }

        function fuzzyMatch(listA, listB) {
            const matches = [];
            const uniqueA = [...listA];
            const uniqueB = [...listB];
            
            // Create a map to track which songs have been matched
            const matchedA = new Set();
            const matchedB = new Set();
            
            // Compare each song in listA with each song in listB
            for (let i = 0; i < listA.length; i++) {
                if (matchedA.has(i)) continue;
                
                const songA = listA[i];
                let bestMatch = null;
                let bestScore = 0;
                let bestIndex = -1;
                
                for (let j = 0; j < listB.length; j++) {
                    if (matchedB.has(j)) continue;
                    
                    const songB = listB[j];
                    const similarity = calculateSimilarity(songA, songB);
                    
                    // Consider it a match if similarity is above threshold (0.8)
                    if (similarity > 0.8 && similarity > bestScore) {
                        bestMatch = songB;
                        bestScore = similarity;
                        bestIndex = j;
                    }
                }
                
                if (bestMatch) {
                    matches.push({
                        songA: songA,
                        songB: bestMatch,
                        similarity: bestScore
                    });
                    matchedA.add(i);
                    matchedB.add(bestIndex);
                }
            }
            
            // Remove matched songs from unique lists
            const finalUniqueA = listA.filter((_, index) => !matchedA.has(index));
            const finalUniqueB = listB.filter((_, index) => !matchedB.has(index));
            
            return {
                matches: matches,
                uniqueA: finalUniqueA,
                uniqueB: finalUniqueB
            };
        }

        function calculateSimilarity(str1, str2) {
            // Normalize strings for comparison
            const normalize = (str) => {
                return str.toLowerCase()
                    .replace(/[^\w\s]/g, '') // Remove special characters
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
            };
            
            const normalized1 = normalize(str1);
            const normalized2 = normalize(str2);
            
            // Exact match after normalization
            if (normalized1 === normalized2) {
                return 1.0;
            }
            
            // Levenshtein distance based similarity
            const distance = levenshteinDistance(normalized1, normalized2);
            const maxLength = Math.max(normalized1.length, normalized2.length);
            
            return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
        }

        function levenshteinDistance(str1, str2) {
            const matrix = [];
            
            // Create matrix
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            
            // Fill matrix
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[str2.length][str1.length];
        }

        function displayResults(results) {
            // Update statistics
            document.getElementById('matchCount').textContent = results.matches.length;
            document.getElementById('uniqueACount').textContent = results.uniqueA.length;
            document.getElementById('uniqueBCount').textContent = results.uniqueB.length;
            
            // Update badges
            document.getElementById('matchBadge').textContent = results.matches.length;
            document.getElementById('uniqueABadge').textContent = results.uniqueA.length;
            document.getElementById('uniqueBBadge').textContent = results.uniqueB.length;
            
            // Display matches
            displaySongList('matchesList', results.matches.map(m => m.songA));
            
            // Display unique songs
            displaySongList('uniqueAList', results.uniqueA);
            displaySongList('uniqueBList', results.uniqueB);
        }

        function displaySongList(containerId, songs) {
            const container = document.getElementById(containerId);
            
            if (songs.length === 0) {
                container.innerHTML = '<div class="empty-state">No songs found</div>';
                return;
            }
            
            const html = songs.map(song => 
                `<div class="song-item">${escapeHtml(song)}</div>`
            ).join('');
            
            container.innerHTML = html;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function exportList(type) {
            let data, filename;
            
            switch (type) {
                case 'matches':
                    data = comparisonResults.matches.map(m => m.songA);
                    filename = 'matching_songs.txt';
                    break;
                case 'uniqueA':
                    data = comparisonResults.uniqueA;
                    filename = 'unique_list_a.txt';
                    break;
                case 'uniqueB':
                    data = comparisonResults.uniqueB;
                    filename = 'unique_list_b.txt';
                    break;
                default:
                    return;
            }
            
            if (data.length === 0) {
                alert('No data to export');
                return;
            }
            
            const content = data.join('\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            
            URL.revokeObjectURL(url);
        }