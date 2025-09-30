   // Theme management
   const themeToggle = document.querySelector('.theme-toggle');
   const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
   
   // Set initial theme based on system preference
   document.documentElement.setAttribute('data-theme', 
     prefersDarkScheme.matches ? 'dark' : 'light'
   );

   themeToggle.addEventListener('click', () => {
     const currentTheme = document.documentElement.getAttribute('data-theme');
     const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
     document.documentElement.setAttribute('data-theme', newTheme);
   });

   // Tab management
   const tabButtons = document.querySelectorAll('.tab-button');
   const tabContents = document.querySelectorAll('.tab-content');
   let currentJSON = {};

   const activateTab = (tabId) => {
     tabContents.forEach(content => content.classList.remove('active'));
     tabButtons.forEach(button => button.classList.remove('active'));
     document.getElementById(tabId).classList.add('active');
     document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
   };

   tabButtons.forEach(button => {
     button.addEventListener('click', (e) => {
       activateTab(e.target.dataset.tab);
     });
   });

   // Copy functionality with feedback
   const copyToClipboard = async (text, button) => {
     try {
       await navigator.clipboard.writeText(text);
       const originalText = button.textContent;
       button.textContent = 'Copied!';
       button.style.backgroundColor = 'var(--success-color)';
       
       setTimeout(() => {
         button.textContent = originalText;
         button.style.backgroundColor = '';
       }, 2000);
     } catch (err) {
       console.error('Failed to copy:', err);
       alert('Failed to copy to clipboard');
     }
   };

   // Markdown to JSON conversion
   document.getElementById('convertToJsonBtn').addEventListener('click', () => {
     const markdownText = document.getElementById('markdownInput').value.trim();
     const jsonOutput = document.getElementById('jsonOutput');
     const selectJsonBtn = document.getElementById('selectJsonBtn');

     if (!markdownText) {
       jsonOutput.textContent = "Please paste a Markdown table.";
       selectJsonBtn.style.display = 'none';
       return;
     }

     try {
       const lines = markdownText.split('\n').map(line => line.trim());
       if (lines.length < 2) throw new Error("Invalid Markdown table");

       const [headerLine, ...dataLines] = lines;
       const headers = headerLine.split('|')
         .map(h => h.trim())
         .filter(Boolean)
         .map(h => h.replace(/\*\*/g, ''));

       const jsonData = {};
       dataLines.forEach(line => {
         if (line.startsWith('|') && !line.includes('-')) {
           const cells = line.split('|')
             .map(c => c.trim())
             .filter(Boolean)
             .map(c => c.replace(/\*\*/g, ''));

           if (cells.length > 0) {
             const host = cells[0];
             jsonData[host] = {};
             for (let i = 1; i < cells.length; i++) {
               const cellValue = cells[i];
               // Check for checkmark (✅) or cross mark (❌), or traditional yes/no
               if (cellValue === '✅' || cellValue.toLowerCase() === 'yes') {
                 jsonData[host][headers[i]] = '✅';
               } else if (cellValue === '❌' || cellValue.toLowerCase() === 'no') {
                 jsonData[host][headers[i]] = '❌';
               } else {
                 // Default to cross mark for empty or unknown values
                 jsonData[host][headers[i]] = '❌';
               }
             }
           }
         }
       });

       currentJSON = jsonData;
       jsonOutput.textContent = JSON.stringify(jsonData, null, 2);
       selectJsonBtn.style.display = 'block';
     } catch (error) {
       jsonOutput.textContent = `Error: ${error.message}`;
       selectJsonBtn.style.display = 'none';
     }
   });

   // JSON Update functionality
   document.getElementById('updateJsonBtn').addEventListener('click', () => {
     const jsonInput = document.getElementById('existingJsonInput').value.trim();
     const newProviderName = document.getElementById('newProviderName').value.trim();
     const supportedServices = document.getElementById('supportedServices').value.trim();
     const updatedJsonOutput = document.getElementById('updatedJsonOutput');
     const selectUpdatedJsonBtn = document.getElementById('selectUpdatedJsonBtn');

     if (!newProviderName || !supportedServices) {
       updatedJsonOutput.textContent = "Please enter both provider name and supported services.";
       selectUpdatedJsonBtn.style.display = 'none';
       return;
     }

  function normalizeServiceName(name) {
      return name.toLowerCase().trim();
  }
  
  function capitalizeFirstLetter(string) {
    // Find first letter using regex
    const match = string.match(/[a-zA-Z]/);
    if (!match) return string; // Return unchanged if no letters found
    
    const index = match.index;
    return string.slice(0, index) + 
           string[index].toUpperCase() + 
           string.slice(index + 1);
}

  // Helper function to normalize values to checkmarks
  function normalizeValue(value) {
    if (!value) return '❌';
    const val = value.toString().toLowerCase().trim();
    return (val === 'yes' || val === '✅') ? '✅' : '❌';
  }

try {
  let baseJSON = jsonInput ? JSON.parse(jsonInput) : currentJSON;
  if (Object.keys(baseJSON).length === 0) {
      throw new Error("No valid JSON data provided");
  }

  const supportedServicesList = supportedServices.split(',').map(s => normalizeServiceName(s));
  const updatedJSON = {};
  
  // First normalize existing services and convert values to checkmarks
  Object.entries(baseJSON).forEach(([service, providers]) => {
      const normalizedService = normalizeServiceName(service);
      updatedJSON[normalizedService] = {};
      Object.entries(providers).forEach(([provider, value]) => {
          updatedJSON[normalizedService][provider] = normalizeValue(value);
      });
  });

  // Update existing services
  Object.keys(updatedJSON).forEach(service => {
      updatedJSON[service][newProviderName] = 
          supportedServicesList.includes(normalizeServiceName(service)) ? '✅' : '❌';
  });

  // Add new services if they don't exist
  supportedServicesList.forEach(normalizedService => {
      if (!Object.keys(updatedJSON).some(existing => 
          normalizeServiceName(existing) === normalizedService)) {
          updatedJSON[normalizedService] = {};
          // Copy providers from first existing service
          const firstService = Object.keys(updatedJSON)[0];
          Object.keys(updatedJSON[firstService]).forEach(provider => {
              updatedJSON[normalizedService][provider] = '❌';
          });
          updatedJSON[normalizedService][newProviderName] = '✅';
      }
  });

  const finalJSON = {};
  Object.entries(updatedJSON).forEach(([service, providers]) => {
      finalJSON[capitalizeFirstLetter(service)] = providers;
  });

  currentJSON = finalJSON;
  updatedJsonOutput.textContent = JSON.stringify(finalJSON, null, 2);
  selectUpdatedJsonBtn.style.display = 'block';
     } catch (error) {
       updatedJsonOutput.textContent = `Error: ${error.message}`;
       selectUpdatedJsonBtn.style.display = 'none';
     }
   });

   // JSON to Markdown conversion
   document.getElementById('convertToMarkdownBtn').addEventListener('click', () => {
     const jsonInput = document.getElementById('inputJsonForMarkdown').value.trim();
     const markdownOutput = document.getElementById('markdownOutput');
     const selectMarkdownBtn = document.getElementById('selectMarkdownBtn');

     try {
       let jsonData = jsonInput ? JSON.parse(jsonInput) : currentJSON;
       if (Object.keys(jsonData).length === 0) {
         throw new Error("No valid JSON data provided");
       }

       // Normalize the JSON data to use checkmarks
       const normalizedData = {};
       Object.entries(jsonData).forEach(([service, providers]) => {
         normalizedData[service] = {};
         Object.entries(providers).forEach(([provider, value]) => {
           normalizedData[service][provider] = normalizeValue(value);
         });
       });

       const services = Object.keys(normalizedData);
       const providers = Object.keys(normalizedData[services[0]]);

       // Create markdown table
       let markdownTable = [
         `| **Service Name** | ${providers.map(p => `**${p}**`).join(' | ')} |`,
         `| ${':---'.repeat(1)} | ${providers.map(() => ':---').join(' | ')} |`,
         ...services.map(service => 
           `| ${service} | ${providers.map(provider => 
             normalizedData[service][provider] || '❌'
           ).join(' | ')} |`
         )
       ].join('\n');

       markdownOutput.textContent = markdownTable;
       selectMarkdownBtn.style.display = 'block';
     } catch (error) {
       markdownOutput.textContent = `Error: ${error.message}`;
       selectMarkdownBtn.style.display = 'none';
     }
   });

   // Copy button functionality
   document.getElementById('selectJsonBtn').addEventListener('click', () => {
     copyToClipboard(
       document.getElementById('jsonOutput').textContent,
       document.getElementById('selectJsonBtn')
     );
   });

   document.getElementById('selectUpdatedJsonBtn').addEventListener('click', () => {
     copyToClipboard(
       document.getElementById('updatedJsonOutput').textContent,
       document.getElementById('selectUpdatedJsonBtn')
     );
   });

   document.getElementById('selectMarkdownBtn').addEventListener('click', () => {
     copyToClipboard(
       document.getElementById('markdownOutput').textContent,
       document.getElementById('selectMarkdownBtn')
     );
   });

   // Initialize the first tab as active
   activateTab('markdownToJson');