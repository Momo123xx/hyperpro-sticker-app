let excelParser;
let productSearch;
let zblGenerator;
let currentRowData;

async function initializeApp() {
  try {
    showLoading('Loading application...');

    // Load Excel data
    excelParser = new ExcelParser();
    await excelParser.loadExcelFile('./data/manual-info.xlsx');

    // Initialize search
    productSearch = new ProductSearch(excelParser.data);

    // Load ZBL template
    const templateResponse = await fetch('./templates/zbl-dynamic.txt');
    if (!templateResponse.ok) {
      throw new Error('Failed to load ZBL template');
    }
    const templateText = await templateResponse.text();
    zblGenerator = new ZBLGenerator(templateText);

    // Set up event listeners
    setupEventListeners();

    hideLoading();
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    showError(`Failed to initialize application: ${error.message}`);
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const generateBtn = document.getElementById('generate-btn');

  // Search functionality with debouncing
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const results = productSearch.search(e.target.value);
      displaySearchResults(results);
    }, 300);
  });

  // Generate button
  generateBtn.addEventListener('click', () => {
    if (currentRowData) {
      try {
        const zblContent = zblGenerator.generate(currentRowData);
        const code = currentRowData.C || currentRowData.D || currentRowData.E || 'unknown';
        const filename = `label-${code}-${Date.now()}.zbl`;
        zblGenerator.downloadZBL(zblContent, filename);
        console.log(`Generated ZBL file: ${filename}`);
      } catch (error) {
        console.error('Error generating ZBL:', error);
        showError(`Failed to generate ZBL file: ${error.message}`);
      }
    }
  });
}

function displaySearchResults(results) {
  const container = document.getElementById('search-results');

  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No products found</div>';
    return;
  }

  container.innerHTML = results.map((row, index) => {
    const code = row.C || row.D || row.E || 'N/A';
    const brand = row.F || 'N/A';
    const model = row.G || 'N/A';

    return `
      <div class="result-item" data-index="${index}">
        <strong>${code}</strong> - ${brand} ${model}
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.result-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      currentRowData = results[index];
      displayPreview(currentRowData);
      document.getElementById('preview-section').style.display = 'block';

      // Scroll to preview section
      document.getElementById('preview-section').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });
}

function displayPreview(rowData) {
  const previewData = {
    'Brand Name': rowData.F || 'N/A',
    'Model Type': rowData.G || 'N/A',
    'Year': rowData.H || 'N/A',
    'Fork Spring': rowData.I || 'N/A',
    'Shock Spring': rowData.Q || 'N/A',
    'Fork Code': rowData.C || 'NONE',
    'Shock Code': rowData.D || 'NONE',
    'Combi Code': rowData.E || 'NONE',
    'Oil Type': rowData.J || 'N/A',
    'Oil Level': rowData.K || 'N/A',
    'Fork Preload': rowData.L || 'N/A',
    'Fork Sag': rowData.M || 'N/A',
    'Fork Compression': rowData.N || 'N/A',
    'Fork Extra Info': rowData.P || '',
    'Shock Preload': rowData.R || 'N/A',
    'Shock Sag': rowData.S || 'N/A',
    'Shock Compression': rowData.T || 'N/A',
    'Rear Extra Info': rowData.V || ''
  };

  // Build HTML table
  const table = document.getElementById('preview-table');
  table.innerHTML = Object.entries(previewData)
    .map(([key, value]) => `
      <tr>
        <td class="label">${key}:</td>
        <td class="value">${value}</td>
      </tr>
    `).join('');

  return previewData;
}

function showLoading(message) {
  const main = document.querySelector('main');
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-indicator';
  loadingDiv.className = 'loading';
  loadingDiv.textContent = message;
  main.prepend(loadingDiv);
}

function hideLoading() {
  const loading = document.getElementById('loading-indicator');
  if (loading) {
    loading.remove();
  }
}

function showError(message) {
  const main = document.querySelector('main');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  errorDiv.textContent = message;
  main.prepend(errorDiv);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);
