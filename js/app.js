let excelParser;
let productSearch;
let zblGenerator;
let batchGenerator;
let cart;
let currentRowData;
let templates = {};

async function initializeApp() {
  try {
    showLoading('Loading application...');

    // Load Excel data
    excelParser = new ExcelParser();
    await excelParser.loadExcelFile('./data/manual-info.xlsx');

    // Initialize search
    productSearch = new ProductSearch(excelParser.data);

    // Load all ZBL templates in parallel
    const [bigTemplate, smallForkTemplate, smallShockTemplate] = await Promise.all([
      fetch('./templates/zbl-dynamic.txt').then(r => {
        if (!r.ok) throw new Error('Failed to load BIG template');
        return r.text();
      }),
      fetch('./templates/zbl-small-fork.txt').then(r => {
        if (!r.ok) throw new Error('Failed to load SMALL Fork template');
        return r.text();
      }),
      fetch('./templates/zbl-small-shock.txt').then(r => {
        if (!r.ok) throw new Error('Failed to load SMALL Shock template');
        return r.text();
      })
    ]);

    // Store templates
    templates = {
      big: bigTemplate,
      smallFork: smallForkTemplate,
      smallShock: smallShockTemplate
    };

    // Initialize generators
    zblGenerator = new ZBLGenerator(bigTemplate);
    batchGenerator = new BatchZBLGenerator(templates);

    // Initialize cart
    cart = new Cart();
    cart.addListener(updateCartUI);

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
  const clearCartBtn = document.getElementById('clear-cart-btn');
  const downloadBigBtn = document.getElementById('download-big-btn');
  const downloadSmallBtn = document.getElementById('download-small-btn');
  const downloadBothBtn = document.getElementById('download-both-btn');

  // Search functionality with debouncing
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const results = productSearch.search(e.target.value);
      displaySearchResults(results);
    }, 300);
  });

  // Enter key handler for instant add
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchEnter(e.target.value);
    }
  });

  // Clear cart button
  clearCartBtn.addEventListener('click', handleClearCart);

  // Download buttons
  downloadBigBtn.addEventListener('click', () => handleDownloadBig());
  downloadSmallBtn.addEventListener('click', () => handleDownloadSmall());
  downloadBothBtn.addEventListener('click', () => handleDownloadBoth());

  // Bulk paste button
  const bulkProcessBtn = document.getElementById('bulk-process-btn');
  bulkProcessBtn.addEventListener('click', processBulkPaste);

  // Preview details toggle
  const detailsToggle = document.getElementById('preview-details-toggle');
  detailsToggle.addEventListener('click', () => {
    const detailsPanel = document.getElementById('preview-details');
    const toggleBtn = document.getElementById('preview-details-toggle');
    const isVisible = detailsPanel.style.display !== 'none';

    if (isVisible) {
      detailsPanel.style.display = 'none';
      toggleBtn.innerHTML = '<span class="toggle-icon">▼</span> Show All Details';
    } else {
      detailsPanel.style.display = 'block';
      toggleBtn.innerHTML = '<span class="toggle-icon">▲</span> Hide Details';
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
  // Summary fields (always visible)
  const summaryData = {
    'Brand Name': rowData.F || 'N/A',
    'Model Type': rowData.G || 'N/A',
    'Year': rowData.H || 'N/A'
  };

  // Detailed fields (collapsible)
  const detailsData = {
    'Fork Code': rowData.C || 'NONE',
    'Shock Code': rowData.D || 'NONE',
    'Combi Code': rowData.E || 'NONE',
    'Fork Spring': rowData.I || 'N/A',
    'Shock Spring': rowData.Q || 'N/A',
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

  // Populate summary table
  const summaryTable = document.getElementById('preview-table-summary');
  summaryTable.innerHTML = Object.entries(summaryData)
    .map(([key, value]) => `
      <tr>
        <td class="label">${key}:</td>
        <td class="value">${value}</td>
      </tr>
    `).join('');

  // Populate details table
  const detailsTable = document.getElementById('preview-table-details');
  detailsTable.innerHTML = Object.entries(detailsData)
    .map(([key, value]) => `
      <tr>
        <td class="label">${key}:</td>
        <td class="value">${value}</td>
      </tr>
    `).join('');

  // Reset to collapsed state
  document.getElementById('preview-details').style.display = 'none';
  document.getElementById('preview-details-toggle').innerHTML =
    '<span class="toggle-icon">▼</span> Show All Details';
}

function handleSearchEnter(query) {
  const result = productSearch.searchExact(query);

  if (result) {
    const { match, kitType } = result;

    // Add to cart with auto-detected kit type
    cart.addToCart(match, kitType, 1);

    // Get product code for toast message
    const productCode = match.C || match.D || match.E || 'Product';
    const kitInfo = Cart.getKitTypeInfo(kitType);
    showToast(`Added ${productCode} (${kitInfo.name}) to batch`, 'success');

    // Clear search
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
  } else {
    showToast('No exact match found', 'error');
  }
}

function parseBulkPaste(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const parsed = [];

  lines.forEach((line, index) => {
    const cells = line.split('\t');
    const productCode = (cells[0] || '').trim();
    const quantity = parseInt(cells[1]) || 1; // Default to 1 if missing

    if (productCode.length > 0 && quantity >= 1) {
      parsed.push({ productCode, quantity, lineNum: index + 1 });
    }
  });

  return parsed;
}

function processBulkPaste() {
  const textarea = document.getElementById('bulk-paste-input');
  const text = textarea.value;
  const resultsDiv = document.getElementById('bulk-results');

  if (!text.trim()) {
    showToast('No data to process', 'error');
    return;
  }

  const parsed = parseBulkPaste(text);
  const errors = [];
  let successCount = 0;

  parsed.forEach(item => {
    const result = productSearch.searchExact(item.productCode);

    if (result) {
      const { match, kitType } = result;
      cart.addToCart(match, kitType, item.quantity);
      successCount++;
    } else {
      errors.push(`Line ${item.lineNum}: "${item.productCode}" not found`);
    }
  });

  // Display results
  let resultHTML = `<div class="bulk-success">✓ Successfully added ${successCount} items</div>`;

  if (errors.length > 0) {
    resultHTML += `<div class="bulk-error">⚠ ${errors.length} errors:</div>`;
    resultHTML += `<ul class="bulk-error-list">`;
    errors.forEach(err => {
      resultHTML += `<li>${err}</li>`;
    });
    resultHTML += `</ul>`;
  }

  resultsDiv.innerHTML = resultHTML;

  // Clear textarea if all successful
  if (errors.length === 0) {
    textarea.value = '';
  }

  showToast(`Bulk paste: ${successCount} added, ${errors.length} errors`,
            errors.length === 0 ? 'success' : 'info');
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

// ============ CART FUNCTIONS ============

function updateCartUI() {
  renderCartItems();
  updateCartSummary();
  updateDownloadButtons();
}

function renderCartItems() {
  const container = document.getElementById('cart-items-container');
  const items = cart.getItems();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-message">
        <p>Your batch is empty</p>
        <p class="hint">Use Enter key or bulk paste to add products</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const productCode = item.productCode || 'N/A';

    return `
      <div class="cart-item-simple" data-item-id="${item.id}">
        <span class="cart-item-code">${productCode}</span>
        <span class="cart-item-qty">Qty: ${item.quantity}</span>
        <button class="cart-item-remove" data-item-id="${item.id}" title="Remove">×</button>
      </div>
    `;
  }).join('');

  // Add event listeners to remove buttons
  container.querySelectorAll('.cart-item-remove').forEach(button => {
    button.addEventListener('click', (e) => {
      const itemId = parseInt(e.target.dataset.itemId);
      handleRemoveItem(itemId);
    });
  });
}

function updateCartSummary() {
  const summary = cart.getCartSummary();

  document.getElementById('total-items').textContent = summary.totalItems;
  document.getElementById('total-big').textContent = summary.totalBig;
  document.getElementById('total-small').textContent = summary.totalSmall;
}

function updateDownloadButtons() {
  const isEmpty = cart.isEmpty();
  document.getElementById('download-big-btn').disabled = isEmpty;
  document.getElementById('download-small-btn').disabled = isEmpty;
  document.getElementById('download-both-btn').disabled = isEmpty;
}

function handleRemoveItem(itemId) {
  if (cart.removeFromCart(itemId)) {
    showToast('Item removed from batch', 'info');
  }
}

function handleClearCart() {
  if (cart.isEmpty()) {
    return;
  }

  if (confirm('Are you sure you want to clear all items from the batch?')) {
    cart.clearCart();
    showToast('Batch cleared', 'info');
  }
}

function handleDownloadBig() {
  try {
    showLoading('Generating BIG stickers...');
    const items = cart.getItems();
    const { bigZpl, counts } = batchGenerator.generateBatch(items);

    const timestamp = BatchZBLGenerator.generateTimestamp();
    const filename = `job_${timestamp}_BIG.zpl`;

    BatchZBLGenerator.downloadFile(bigZpl, filename);
    hideLoading();
    showToast(`Downloaded ${counts.big} BIG stickers`, 'success');
  } catch (error) {
    console.error('Error generating BIG file:', error);
    hideLoading();
    showToast('Failed to generate BIG file', 'error');
  }
}

function handleDownloadSmall() {
  try {
    showLoading('Generating SMALL stickers...');
    const items = cart.getItems();
    const { smallZpl, counts } = batchGenerator.generateBatch(items);

    const timestamp = BatchZBLGenerator.generateTimestamp();
    const filename = `job_${timestamp}_SMALL.zpl`;

    BatchZBLGenerator.downloadFile(smallZpl, filename);
    hideLoading();
    showToast(`Downloaded ${counts.totalSmall} SMALL stickers`, 'success');
  } catch (error) {
    console.error('Error generating SMALL file:', error);
    hideLoading();
    showToast('Failed to generate SMALL file', 'error');
  }
}

function handleDownloadBoth() {
  try {
    showLoading('Generating both files...');
    const items = cart.getItems();
    const { bigZpl, smallZpl, counts } = batchGenerator.generateBatch(items);

    const timestamp = BatchZBLGenerator.generateTimestamp();

    // Download BIG file
    BatchZBLGenerator.downloadFile(bigZpl, `job_${timestamp}_BIG.zpl`);

    // Download SMALL file after a short delay
    setTimeout(() => {
      BatchZBLGenerator.downloadFile(smallZpl, `job_${timestamp}_SMALL.zpl`);
      hideLoading();
      showToast(`Downloaded ${counts.big} BIG + ${counts.totalSmall} SMALL stickers`, 'success');
    }, 500);
  } catch (error) {
    console.error('Error generating files:', error);
    hideLoading();
    showToast('Failed to generate files', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);
