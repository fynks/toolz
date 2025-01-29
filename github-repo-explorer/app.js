     const API_BASE = 'https://api.github.com/repos/';
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
        const searchInput = document.querySelector('.search-input');
        const resultContainer = document.querySelector('.result-container');

        // Cache management functions
        const getCachedData = (repoPath) => {
            const cache = localStorage.getItem(`repo_${repoPath}`);
            if (!cache) return null;

            const { data, timestamp } = JSON.parse(cache);
            if (Date.now() - timestamp > CACHE_EXPIRY) {
                localStorage.removeItem(`repo_${repoPath}`);
                return null;
            }
            return data;
        };

        const setCacheData = (repoPath, data) => {
            const cacheObj = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(`repo_${repoPath}`, JSON.stringify(cacheObj));
        };


        const fetchRepoData = async (repoPath, forceRefresh = false) => {
            try {
               const cachedData = getCachedData(repoPath);

                if (cachedData && !forceRefresh) {
                   const shouldRefresh = await showRefreshConfirm();
                    if (!shouldRefresh) {
                         displayRepoInfo(...Object.values(cachedData), true); //true for cached data
                        return;
                    }
                }
                
                resultContainer.innerHTML = '<div class="loading">Fetching repository data...</div>';

               const [repoResponse, languagesResponse, contributorsResponse, pullsResponse, releasesResponse] = await Promise.all([
                    fetch(`${API_BASE}${repoPath}`),
                    fetch(`${API_BASE}${repoPath}/languages`),
                    fetch(`${API_BASE}${repoPath}/contributors?per_page=10`),
                    fetch(`${API_BASE}${repoPath}/pulls?state=all&per_page=5`),
                    fetch(`${API_BASE}${repoPath}/releases?per_page=5`)
                ]);

               if (repoResponse.status === 403) {
                    throw new Error('GitHub API rate limit reached. Please try again later.');
                }

               if (!repoResponse.ok) {
                    throw new Error('Repository not found');
                }

                const repo = await repoResponse.json();
                const languages = await languagesResponse.json();
                const contributors = await contributorsResponse.json();
                const pulls = await pullsResponse.json();
                const releases = await releasesResponse.json();

                const data = { repo, languages, contributors, pulls, releases };
                setCacheData(repoPath, data);
                displayRepoInfo(repo, languages, contributors, pulls, releases);

            } catch (error) {
                console.error('GitHub API Error:', error);
                 resultContainer.innerHTML = `
                    <div class="error">
                        <h3>⚠️ ${error.message}</h3>
                       ${error.message.includes('rate limit') ?
                            '<p>Too many requests. Please wait a few minutes.</p>' :
                            ''}
                    </div>`;
            }
        };

        const showRefreshConfirm = () => {
            return new Promise((resolve) => {
                const dialog = document.createElement('div');
                dialog.className = 'refresh-dialog';
                dialog.innerHTML = `
                    <div class="refresh-content">
                        <p>Cached data available. Refresh?</p>
                        <button onclick="this.closest('.refresh-dialog').remove(); ${resolve(false)}">Use Cached</button>
                        <button onclick="this.closest('.refresh-dialog').remove(); ${resolve(true)}">Refresh</button>
                    </div>
                `;
                document.body.appendChild(dialog);
            });
        };

        const displayRepoInfo = (repo, languages, contributors, pulls, releases, isCached = false) => {
            if (!repo) {
                resultContainer.innerHTML = '<div class="no-results">No repository found for this path.</div>';
                 return;
            }

           const languageTotal = Object.values(languages).reduce((a, b) => a + b, 0);
            const languageBars = Object.entries(languages)
                .map(([name, value]) =>
                    `<div class="language-bar" title="${name}: ${((value / languageTotal) * 100).toFixed(1)}%" 
             style="width: ${(value / languageTotal) * 100}%; background: ${getRandomColor()}"></div>`
                ).join('');

            const contributorList = contributors.map(contributor => `
                <a href="${contributor.html_url}" class="contributor" target="_blank">
                    <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar">
                    <span>${contributor.login}</span>
                </a>
            `).join('');

            const getRelativeTime = (date) => {
                const now = new Date();
                const diff = (now.getTime() - date.getTime()) / 1000; // Convert to seconds

               const intervals = {
                    year: 31536000,
                    month: 2592000,
                    week: 604800,
                    day: 86400,
                    hour: 3600,
                    minute: 60
                };
                
                for (let [unit, seconds] of Object.entries(intervals)) {
                   const interval = Math.floor(diff / seconds);
                    if (interval >= 1) {
                        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
                    }
                }
                return 'just now';
            };

            const lastUpdated = new Date(repo.updated_at);
            const relativeTime = getRelativeTime(lastUpdated);
            const fullDate = lastUpdated.toLocaleString();

            resultContainer.innerHTML = `
                <div class="repo-card">
                    <div class="repo-header">
                        <img src="${repo.owner.avatar_url}" alt="${repo.owner.login}" class="repo-avatar">
                        <div>
                            <h2 class="repo-title">${repo.full_name}</h2>
                            <p>${repo.description || 'No description provided'}</p>
                        </div>
                    </div>
                    <div class="repo-meta">
                        <div class="meta-item">
                            <span class="tag">${repo.visibility}</span>
                            <span>${repo.default_branch}</span>
                        </div>
                         <div class="meta-item">
                            <span class="last-updated" title="${fullDate}">Last updated: ${relativeTime}</span>
                        </div>
                    </div>
                    <div class="repo-stats">
                        <div class="stat-item">
                            <div class="stat-value">${repo.stargazers_count.toLocaleString()}</div>
                            <div class="stat-label">Stars</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${repo.forks_count.toLocaleString()}</div>
                            <div class="stat-label">Forks</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${repo.open_issues_count.toLocaleString()}</div>
                            <div class="stat-label">Issues</div>
                        </div>
                          <div class="stat-item">
                              <div class="stat-value">${Array.isArray(pulls) ? pulls.length.toLocaleString() : '0'}</div>
                              <div class="stat-label">Pull Requests</div>
                          </div>
                    </div>

                    <h3>Languages</h3>
                    <div class="language-chart">${languageBars}</div>

                    <h3>Top Contributors</h3>
                    <div class="contributors">${contributorList}</div>
                     ${isCached ? '<p class="cached-indicator">Data loaded from cache</p>' : ''}
                </div>
            `;
        };
        
        const getRandomColor = () => {
           return `hsl(${Math.random() * 360}, 70%, 50%)`;
        };

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const repoPath = searchInput.value.trim();
                if (repoPath) fetchRepoData(repoPath);
            }
        });

        // Accessibility improvement: keyboard focus on input and results
         searchInput.addEventListener('focus', () => {
           searchInput.classList.add('focused');
         });
        
         searchInput.addEventListener('blur', () => {
          searchInput.classList.remove('focused');
         });
        
        // Function to add focus style
        const addFocusStyle = () => {
           const focusedElement = document.activeElement;
          if(focusedElement){
             focusedElement.classList.add('focused-element')
          }
        }
        
        // Function to remove focus style
        const removeFocusStyle = (e) => {
           const focusedElement = document.activeElement;
          if(focusedElement && e.relatedTarget !== focusedElement){
            focusedElement.classList.remove('focused-element')
           }
        }
       document.addEventListener('focusin', addFocusStyle);
       document.addEventListener('focusout', removeFocusStyle);
     