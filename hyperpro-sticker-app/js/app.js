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
  const addToCartBtn = document.getElementById('add-to-cart-btn');
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

  // Add to cart button
  addToCartBtn.addEventListener('click', handleAddToCart);

  // Clear cart button
  clearCartBtn.addEventListener('click', handleClearCart);

  // Download buttons
  downloadBigBtn.addEventListener('click', () => handleDownloadBig());
  downloadSmallBtn.addEventListener('click', () => handleDownloadSmall());
  downloadBothBtn.addEventListener('click', () => handleDownloadBoth());
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
        <p class="hint">Search and add products to start building your print batch</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const stickers = cart.calculateItemStickers(item);
    const kitInfo = Cart.getKitTypeInfo(item.kitType);

    return `
      <div class="cart-item" data-item-id="${item.id}">
        <div class="cart-item-header">
          <div class="cart-item-info">
            <div class="cart-item-code">${item.productCode}</div>
            <div class="cart-item-name">${item.productName}</div>
          </div>
          <button class="cart-item-remove" data-item-id="${item.id}" title="Remove item">×</button>
        </div>
        <div class="cart-item-details">
          <span class="kit-badge ${kitInfo.color}">${kitInfo.name}</span>
          <span class="cart-item-quantity">Qty: ${item.quantity}</span>
        </div>
        <div class="cart-item-breakdown">
          → ${stickers.big} BIG + ${stickers.smallFork + stickers.smallShock} SMALL stickers
        </div>
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

function handleAddToCart() {
  if (!currentRowData) {
    showToast('Please select a product first', 'error');
    return;
  }

  const kitType = document.getElementById('kit-type-select').value;
  const quantity = parseInt(document.getElementById('quantity-input').value);

  if (quantity < 1) {
    showToast('Quantity must be at least 1', 'error');
    return;
  }

  try {
    cart.addToCart(currentRowData, kitType, quantity);

    const productCode = currentRowData.C || currentRowData.D || currentRowData.E || 'Product';
    const kitInfo = Cart.getKitTypeInfo(kitType);
    showToast(`Added ${quantity}x ${kitInfo.name} to batch`, 'success');

    // Reset quantity to 1
    document.getElementById('quantity-input').value = 1;
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('Failed to add item to cart', 'error');
  }
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
