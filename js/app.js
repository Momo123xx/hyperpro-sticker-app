let excelParser;
let productSearch;
let zblGenerator;
let batchGenerator;
let cart;
let currentRowData;
let templates = {};
let currentMatchResult = null; // Stores { match, kitType } when exact match found

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
  // Validate all required DOM elements exist
  const searchInput = ErrorHandler.validateElement('#search-input', 'setupEventListeners');
  const clearCartBtn = ErrorHandler.validateElement('#clear-cart-btn', 'setupEventListeners');
  const downloadBigBtn = ErrorHandler.validateElement('#download-big-btn', 'setupEventListeners');
  const downloadSmallBtn = ErrorHandler.validateElement('#download-small-btn', 'setupEventListeners');
  const downloadBothBtn = ErrorHandler.validateElement('#download-both-btn', 'setupEventListeners');

  if (!searchInput || !clearCartBtn || !downloadBigBtn || !downloadSmallBtn || !downloadBothBtn) {
    throw new Error('Required DOM elements missing in setupEventListeners');
  }

  // Search functionality with debouncing
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    try {
      clearTimeout(searchTimeout);

      // Clear quantity field when user starts typing
      clearQuantityField();
      currentMatchResult = null;

      searchTimeout = setTimeout(() => {
        try {
          const query = e.target.value;
          const results = productSearch.search(query);
          displaySearchResults(results);

          // Check for exact match to set quantity value
          checkExactMatchAndSetQuantity(query);
        } catch (error) {
          ErrorHandler.logError(error, 'EventListener:search-input-timeout', {
            category: 'EVENT_ERROR',
            userMessage: 'Search failed. Please try again.'
          });
        }
      }, 300);
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:search-input', {
        category: 'EVENT_ERROR'
      });
    }
  });

  // Enter key and arrow keys handler
  searchInput.addEventListener('keydown', (e) => {
    try {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchEnter(e.target.value);
      } else if (e.key === 'ArrowUp' && currentMatchResult) {
        e.preventDefault();
        adjustQuantity(1);
      } else if (e.key === 'ArrowDown' && currentMatchResult) {
        e.preventDefault();
        adjustQuantity(-1);
      }
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:search-keydown', {
        category: 'EVENT_ERROR',
        userMessage: 'Failed to process key. Please try again.'
      });
    }
  });

  // Quantity input event listeners
  const quantityInput = ErrorHandler.validateElement('#quantity-input', 'setupEventListeners');

  if (quantityInput) {
    // Handle Enter key in quantity field
    quantityInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuantityEnter();
      }
    });

    // Enforce 2-digit max during input and sync .active class
    quantityInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);

      // Handle empty or invalid values
      if (isNaN(value) || value < 1) {
        // Allow temporary empty state while typing
        if (e.target.value === '') {
          e.target.classList.remove('active');
          return;
        }
        e.target.value = 1;
        value = 1;
      } else if (value > 99) {
        e.target.value = 99;
        value = 99;
      }

      // Sync .active class with field state
      if (e.target.value && parseInt(e.target.value) >= 1) {
        e.target.classList.add('active');
      } else {
        e.target.classList.remove('active');
      }
    });

    // Validate on blur - ensure valid value
    quantityInput.addEventListener('blur', (e) => {
      let value = parseInt(e.target.value);

      if (isNaN(value) || e.target.value === '') {
        // Empty field on blur: keep it empty if no exact match
        if (!currentMatchResult) {
          e.target.value = '';
          e.target.classList.remove('active');
        } else {
          // Has exact match: fill with 1
          e.target.value = 1;
          e.target.classList.add('active');
        }
      } else {
        // Clamp to valid range
        e.target.value = Math.max(1, Math.min(99, value));
        e.target.classList.add('active');
      }
    });
  }

  // Clear cart button
  clearCartBtn.addEventListener('click', () => {
    try {
      handleClearCart();
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:clear-cart-btn', {
        category: 'EVENT_ERROR',
        userMessage: 'Failed to clear cart. Please try again.'
      });
    }
  });

  // Download buttons
  downloadBigBtn.addEventListener('click', () => {
    try {
      handleDownloadBig();
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:download-big-btn', {
        category: 'EVENT_ERROR',
        userMessage: 'Failed to download BIG stickers. Please try again.'
      });
    }
  });

  downloadSmallBtn.addEventListener('click', () => {
    try {
      handleDownloadSmall();
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:download-small-btn', {
        category: 'EVENT_ERROR',
        userMessage: 'Failed to download SMALL stickers. Please try again.'
      });
    }
  });

  downloadBothBtn.addEventListener('click', () => {
    try {
      handleDownloadBoth();
    } catch (error) {
      ErrorHandler.logError(error, 'EventListener:download-both-btn', {
        category: 'EVENT_ERROR',
        userMessage: 'Failed to download stickers. Please try again.'
      });
    }
  });

  // Bulk paste button
  const bulkProcessBtn = ErrorHandler.validateElement('#bulk-process-btn', 'setupEventListeners');
  if (bulkProcessBtn) {
    bulkProcessBtn.addEventListener('click', () => {
      try {
        processBulkPaste();
      } catch (error) {
        ErrorHandler.logError(error, 'EventListener:bulk-process-btn', {
          category: 'EVENT_ERROR',
          userMessage: 'Failed to process bulk paste. Please try again.'
        });
      }
    });
  }

  // Preview details toggle
  const detailsToggle = ErrorHandler.validateElement('#preview-details-toggle', 'setupEventListeners');
  if (detailsToggle) {
    detailsToggle.addEventListener('click', () => {
      try {
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
      } catch (error) {
        ErrorHandler.logError(error, 'EventListener:preview-details-toggle', {
          category: 'EVENT_ERROR',
          userMessage: 'Failed to toggle details. Please try again.'
        });
      }
    });
  }
}

function displaySearchResults(results) {
  try {
    const container = ErrorHandler.validateElement('#search-results', 'displaySearchResults');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">No products found</div>';
      return;
    }

    container.innerHTML = results.map((row, index) => {
      const code = SecurityUtils.escapeHtml(row.C || row.D || row.E || 'N/A');
      const brand = SecurityUtils.escapeHtml(row.F || 'N/A');
      const model = SecurityUtils.escapeHtml(row.G || 'N/A');

      return `
        <div class="result-item" data-index="${index}">
          <strong>${code}</strong> - ${brand} ${model}
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        try {
          const rowData = results[index];
          const code = rowData.C || rowData.D || rowData.E || '';

          // Fill search input with product code
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.value = code;
          }

          // Clear results dropdown
          container.innerHTML = '';

          // Trigger exact match check to set quantity to 1
          checkExactMatchAndSetQuantity(code);

          // Focus quantity field for immediate input
          const quantityInput = document.getElementById('quantity-input');
          if (quantityInput) {
            setTimeout(() => quantityInput.focus(), 50);
          }
        } catch (error) {
          ErrorHandler.logError(error, 'EventListener:result-item-click', {
            category: 'EVENT_ERROR',
            userMessage: 'Failed to select product. Please try again.'
          });
        }
      });
    });
  } catch (error) {
    ErrorHandler.logError(error, 'displaySearchResults', {
      category: 'DOM_ERROR',
      userMessage: 'Failed to display search results. Please try again.'
    });
  }
}

function displayPreview(rowData) {
  try {
    // Summary fields (always visible) - with XSS protection
    const summaryData = {
      'Brand Name': SecurityUtils.escapeHtml(rowData.F || 'N/A'),
      'Model Type': SecurityUtils.escapeHtml(rowData.G || 'N/A'),
      'Year': SecurityUtils.escapeHtml(rowData.H || 'N/A')
    };

    // Detailed fields (collapsible) - with XSS protection
    const detailsData = {
      'Fork Code': SecurityUtils.escapeHtml(rowData.C || 'NONE'),
      'Shock Code': SecurityUtils.escapeHtml(rowData.D || 'NONE'),
      'Combi Code': SecurityUtils.escapeHtml(rowData.E || 'NONE'),
      'Fork Spring': SecurityUtils.escapeHtml(rowData.I || 'N/A'),
      'Shock Spring': SecurityUtils.escapeHtml(rowData.Q || 'N/A'),
      'Oil Type': SecurityUtils.escapeHtml(rowData.J || 'N/A'),
      'Oil Level': SecurityUtils.escapeHtml(rowData.K || 'N/A'),
      'Fork Preload': SecurityUtils.escapeHtml(rowData.L || 'N/A'),
      'Fork Sag': SecurityUtils.escapeHtml(rowData.M || 'N/A'),
      'Fork Compression': SecurityUtils.escapeHtml(rowData.N || 'N/A'),
      'Fork Extra Info': SecurityUtils.escapeHtml(rowData.P || ''),
      'Shock Preload': SecurityUtils.escapeHtml(rowData.R || 'N/A'),
      'Shock Sag': SecurityUtils.escapeHtml(rowData.S || 'N/A'),
      'Shock Compression': SecurityUtils.escapeHtml(rowData.T || 'N/A'),
      'Rear Extra Info': SecurityUtils.escapeHtml(rowData.V || '')
    };

    // Populate summary table
    const summaryTable = ErrorHandler.validateElement('#preview-table-summary', 'displayPreview');
    if (summaryTable) {
      summaryTable.innerHTML = Object.entries(summaryData)
        .map(([key, value]) => `
          <tr>
            <td class="label">${key}:</td>
            <td class="value">${value}</td>
          </tr>
        `).join('');
    }

    // Populate details table
    const detailsTable = ErrorHandler.validateElement('#preview-table-details', 'displayPreview');
    if (detailsTable) {
      detailsTable.innerHTML = Object.entries(detailsData)
        .map(([key, value]) => `
          <tr>
            <td class="label">${key}:</td>
            <td class="value">${value}</td>
          </tr>
        `).join('');
    }

    // Reset to collapsed state
    const previewDetails = document.getElementById('preview-details');
    const previewToggle = document.getElementById('preview-details-toggle');
    if (previewDetails) {
      previewDetails.style.display = 'none';
    }
    if (previewToggle) {
      previewToggle.innerHTML = '<span class="toggle-icon">▼</span> Show All Details';
    }
  } catch (error) {
    ErrorHandler.logError(error, 'displayPreview', {
      category: 'DOM_ERROR',
      userMessage: 'Failed to display product preview. Please try again.'
    });
  }
}

function handleSearchEnter(query) {
  // Use existing match result if available
  const result = currentMatchResult || productSearch.searchExact(query);

  if (result) {
    const { match, kitType } = result;

    // Get quantity from input field (default to 1 if empty)
    const quantityInput = document.getElementById('quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;

    // Add to cart with specified quantity
    const addedItem = cart.addToCart(match, kitType, quantity);

    if (addedItem) {
      // Get product code for toast message
      const productCode = match.C || match.D || match.E || 'Product';
      const kitInfo = Cart.getKitTypeInfo(kitType);
      const qtyText = quantity > 1 ? `${quantity}x ` : '';
      showToast(`Added ${qtyText}${productCode} (${kitInfo.name}) to batch`, 'success');

      // Check cart limit
      checkCartLimitWarning();
    }

    // Clear search and quantity
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    clearQuantityField();
    currentMatchResult = null;
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
      const addedItem = cart.addToCart(match, kitType, item.quantity);
      if (addedItem) {
        successCount++;
      } else {
        errors.push(`Line ${item.lineNum}: "${item.productCode}" could not be added (cart may be full)`);
      }
    } else {
      errors.push(`Line ${item.lineNum}: "${item.productCode}" not found`);
    }
  });

  // Check cart limit
  checkCartLimitWarning();

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

/**
 * Check cart limit and show warning if approaching or at limit
 */
function checkCartLimitWarning() {
  const currentCount = cart.getItemCount();
  const limit = CART_CONFIG.MAX_ITEMS;
  const warningThreshold = Math.floor(limit * 0.9); // 90% full

  if (currentCount >= limit) {
    showToast(`Cart is full (${limit} items maximum)`, 'error');
  } else if (currentCount >= warningThreshold) {
    const remaining = limit - currentCount;
    showToast(`Cart nearly full: ${remaining} slots remaining`, 'warning');
  }
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
  try {
    const container = ErrorHandler.validateElement('#cart-items-container', 'renderCartItems');
    if (!container) return;

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
      const productCode = SecurityUtils.escapeHtml(item.productCode || 'N/A');

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
        try {
          const itemId = parseInt(e.target.dataset.itemId);
          handleRemoveItem(itemId);
        } catch (error) {
          ErrorHandler.logError(error, 'EventListener:cart-item-remove', {
            category: 'EVENT_ERROR',
            userMessage: 'Failed to remove item. Please try again.'
          });
        }
      });
    });
  } catch (error) {
    ErrorHandler.logError(error, 'renderCartItems', {
      category: 'DOM_ERROR',
      userMessage: 'Failed to render cart items. Please refresh the page.'
    });
  }
}

function updateCartSummary() {
  try {
    const summary = cart.getCartSummary();

    const totalItems = document.getElementById('total-items');
    const totalBig = document.getElementById('total-big');
    const totalSmall = document.getElementById('total-small');

    if (totalItems) totalItems.textContent = summary.totalItems;
    if (totalBig) totalBig.textContent = summary.totalBig;
    if (totalSmall) totalSmall.textContent = summary.totalSmall;
  } catch (error) {
    ErrorHandler.logError(error, 'updateCartSummary', {
      category: 'DOM_ERROR',
      showUser: false
    });
  }
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

/**
 * Check if query has exact match and set quantity
 */
function checkExactMatchAndSetQuantity(query) {
  const result = productSearch.searchExact(query);

  if (result) {
    currentMatchResult = result;
    setQuantityValue(1);
  } else {
    currentMatchResult = null;
    clearQuantityField();
  }
}

/**
 * Set quantity field to a specific value with visual feedback
 */
function setQuantityValue(value) {
  const quantityInput = document.getElementById('quantity-input');
  if (quantityInput) {
    quantityInput.value = value;
    quantityInput.classList.add('active');
  }
}

/**
 * Clear quantity field (set to empty)
 */
function clearQuantityField() {
  const quantityInput = document.getElementById('quantity-input');
  if (quantityInput) {
    quantityInput.value = '';
    quantityInput.classList.remove('active');
  }
}

/**
 * Adjust quantity by delta (for arrow keys)
 */
function adjustQuantity(delta) {
  const quantityInput = document.getElementById('quantity-input');
  if (!quantityInput) return;

  let currentQty = parseInt(quantityInput.value) || 1;
  let newQty = currentQty + delta;

  // Clamp between 1 and 99
  newQty = Math.max(1, Math.min(99, newQty));
  quantityInput.value = newQty;

  // Sync .active class
  quantityInput.classList.add('active');
}

/**
 * Handle Enter key from quantity field
 */
function handleQuantityEnter() {
  if (currentMatchResult) {
    const quantityInput = document.getElementById('quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;

    const { match, kitType } = currentMatchResult;

    // Add to cart with specified quantity
    cart.addToCart(match, kitType, quantity);

    // Get product code for toast message
    const productCode = match.C || match.D || match.E || 'Product';
    const kitInfo = Cart.getKitTypeInfo(kitType);
    showToast(`Added ${quantity}x ${productCode} (${kitInfo.name}) to batch`, 'success');

    // Clear search and quantity
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '';
    clearQuantityField();
    currentMatchResult = null;

    // Focus back to search input
    document.getElementById('search-input').focus();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeApp();
  } catch (error) {
    ErrorHandler.logError(error, 'DOMContentLoaded', {
      category: 'INIT_ERROR',
      userMessage: 'Failed to initialize application. Please refresh the page.'
    });
  }
});
