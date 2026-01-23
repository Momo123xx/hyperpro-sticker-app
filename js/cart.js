/**
 * Cart Management System
 * Handles cart state, item management, and sticker calculations
 */

// Cart configuration
const CART_CONFIG = {
    MAX_ITEMS: 500,                // Cart size limit
    MAX_ID: 999999,                // ID reset threshold
    STORAGE_KEY: 'hyperpro_cart',  // localStorage key
    STORAGE_VERSION: 1             // Schema version
};

// Kit type sticker rules
const STICKER_RULES = {
    fork: { big: 1, smallFork: 2, smallShock: 0 },    // 3 total per kit
    shock: { big: 1, smallFork: 0, smallShock: 1 },   // 2 total per kit
    combi: { big: 1, smallFork: 2, smallShock: 1 }    // 4 total per kit
};

class Cart {
    constructor() {
        this.items = [];
        this.nextId = 1;
        this.listeners = [];
        this.loadFromStorage();  // Auto-restore cart from localStorage
    }

    /**
     * Add item to cart
     * @param {Object} rowData - Product data from CSV
     * @param {string} kitType - 'fork', 'shock', or 'combi'
     * @param {number} quantity - Number of kits
     * @returns {Object} The added cart item or null if validation fails
     */
    addToCart(rowData, kitType, quantity = 1) {
        // Issue #3: Validate row data
        const validation = SecurityUtils.validateRowData(rowData);
        if (!validation.valid) {
            const errorMsg = SecurityUtils.formatValidationErrors(validation.errors);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.logError(
                    new Error(`Invalid row data: ${errorMsg}`),
                    'Cart.addToCart',
                    {
                        category: 'VALIDATION_ERROR',
                        validationErrors: validation.errors,
                        userMessage: 'Cannot add item: product data is incomplete'
                    }
                );
            } else {
                console.error('Invalid row data:', validation.errors);
            }
            return null;
        }

        // Issue #5: Validate kit type
        if (!SecurityUtils.validateKitType(kitType)) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.logError(
                    new Error(`Invalid kit type: ${kitType}`),
                    'Cart.addToCart',
                    {
                        category: 'VALIDATION_ERROR',
                        kitType,
                        userMessage: `Invalid kit type: ${kitType}. Must be fork, shock, or combi.`
                    }
                );
            } else {
                console.error(`Invalid kit type: ${kitType}`);
            }
            return null;
        }

        // Issue #3: Validate & clamp quantity
        const qtyCheck = SecurityUtils.validateQuantity(quantity);
        const finalQuantity = qtyCheck.clamped;

        if (qtyCheck.warning) {
            console.warn(qtyCheck.warning);
        }

        // Issue #6: Check cart limit
        if (this.items.length >= CART_CONFIG.MAX_ITEMS) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.logError(
                    new Error('Cart is full'),
                    'Cart.addToCart',
                    {
                        category: 'CART_ERROR',
                        currentItems: this.items.length,
                        maxItems: CART_CONFIG.MAX_ITEMS,
                        userMessage: `Cart is full (maximum ${CART_CONFIG.MAX_ITEMS} items). Please remove items or generate labels.`
                    }
                );
            } else {
                console.error(`Cart is full (${CART_CONFIG.MAX_ITEMS} items)`);
            }
            return null;
        }

        // Issue #7: Check ID overflow & reset
        if (this.nextId > CART_CONFIG.MAX_ID) {
            console.warn(`ID overflow at ${this.nextId}, resetting to 1`);
            this.nextId = 1;
        }

        // Issue #4: Deep clone rowData to prevent mutation
        const clonedRowData = SecurityUtils.deepClone(rowData);

        // Determine product code based on kit type
        let productCode = 'N/A';
        if (kitType === 'fork') {
            productCode = clonedRowData.C || 'N/A';
        } else if (kitType === 'shock') {
            productCode = clonedRowData.D || 'N/A';
        } else if (kitType === 'combi') {
            productCode = clonedRowData.E || 'N/A';
        }

        // Create item with cloned data
        const item = {
            id: this.nextId++,
            rowData: clonedRowData,
            kitType: kitType,
            quantity: finalQuantity,
            productCode: productCode,
            productName: `${clonedRowData.F || ''} ${clonedRowData.G || ''}`.trim() || 'N/A',
            timestamp: Date.now()
        };

        this.items.push(item);

        // Issue #8: Save to localStorage
        this.saveToStorage();

        this.notifyListeners();
        return item;
    }

    /**
     * Remove item from cart by ID
     * @param {number} itemId - ID of the item to remove
     * @returns {boolean} True if item was removed
     */
    removeFromCart(itemId) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== itemId);

        if (this.items.length < initialLength) {
            this.saveToStorage();
            this.notifyListeners();
            return true;
        }
        return false;
    }

    /**
     * Update quantity of a cart item
     * @param {number} itemId - ID of the item
     * @param {number} newQuantity - New quantity (must be >= 1)
     * @returns {boolean} True if quantity was updated
     */
    updateQuantity(itemId, newQuantity) {
        // Validate and clamp quantity
        const qtyCheck = SecurityUtils.validateQuantity(newQuantity);
        const finalQuantity = qtyCheck.clamped;

        if (qtyCheck.warning) {
            console.warn(qtyCheck.warning);
        }

        const item = this.items.find(item => item.id === itemId);
        if (item) {
            item.quantity = finalQuantity;
            this.saveToStorage();
            this.notifyListeners();
            return true;
        }
        return false;
    }

    /**
     * Clear all items from cart
     */
    clearCart() {
        this.items = [];
        this.saveToStorage();
        this.notifyListeners();
    }

    /**
     * Get all cart items
     * @returns {Array} Array of cart items
     */
    getItems() {
        return [...this.items];
    }

    /**
     * Get cart item count
     * @returns {number} Number of items in cart
     */
    getItemCount() {
        return this.items.length;
    }

    /**
     * Get total jobs count (sum of all quantities)
     * @returns {number} Total jobs (each product × quantity)
     */
    getTotalJobs() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * Calculate sticker breakdown for a specific item
     * @param {Object} item - Cart item
     * @returns {Object} Breakdown of stickers { big, smallFork, smallShock, total }
     */
    calculateItemStickers(item) {
        // Validate kit type and fallback to 'fork' if invalid
        let kitType = item.kitType;
        if (!SecurityUtils.validateKitType(kitType)) {
            console.warn(`Invalid kit type '${kitType}', defaulting to fork`);
            kitType = 'fork';
        }

        const rules = STICKER_RULES[kitType];
        return {
            big: rules.big * item.quantity,
            smallFork: rules.smallFork * item.quantity,
            smallShock: rules.smallShock * item.quantity,
            total: (rules.big + rules.smallFork + rules.smallShock) * item.quantity
        };
    }

    /**
     * Calculate total stickers across all cart items
     * @returns {Object} Summary { totalItems, totalJobs, totalBig, totalSmallFork, totalSmallShock, totalSmall, grandTotal }
     */
    getCartSummary() {
        let totalBig = 0;
        let totalSmallFork = 0;
        let totalSmallShock = 0;

        this.items.forEach(item => {
            const stickers = this.calculateItemStickers(item);
            totalBig += stickers.big;
            totalSmallFork += stickers.smallFork;
            totalSmallShock += stickers.smallShock;
        });

        return {
            totalItems: this.items.length,
            totalJobs: this.getTotalJobs(),
            totalBig: totalBig,
            totalSmallFork: totalSmallFork,
            totalSmallShock: totalSmallShock,
            totalSmall: totalSmallFork + totalSmallShock,
            grandTotal: totalBig + totalSmallFork + totalSmallShock
        };
    }

    /**
     * Get kit type display information
     * @param {string} kitType - Kit type
     * @returns {Object} Display info { name, color, description }
     */
    static getKitTypeInfo(kitType) {
        const info = {
            fork: {
                name: 'Fork Kit',
                color: 'blue',
                description: '1 BIG + 2 SMALL Fork'
            },
            shock: {
                name: 'Shock Kit',
                color: 'orange',
                description: '1 BIG + 1 SMALL Shock'
            },
            combi: {
                name: 'Combi Kit',
                color: 'purple',
                description: '1 BIG + 2 SMALL Fork + 1 SMALL Shock'
            }
        };
        return info[kitType] || info.fork;
    }

    /**
     * Register a listener for cart changes
     * @param {Function} callback - Function to call when cart changes
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of cart changes
     * Isolates each callback so one failure doesn't break others
     */
    notifyListeners() {
        this.listeners.forEach((callback, index) => {
            try {
                callback();
            } catch (error) {
                // Log error but continue with other listeners
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.logError(error, `Cart.notifyListeners[${index}]`, {
                        category: 'EVENT_ERROR',
                        listenerIndex: index,
                        showUser: false
                    });
                } else {
                    console.error(`Error in cart listener ${index}:`, error);
                }
            }
        });
    }

    /**
     * Check if cart is empty
     * @returns {boolean} True if cart has no items
     */
    isEmpty() {
        return this.items.length === 0;
    }

    /**
     * Get sticker rules for a kit type
     * @param {string} kitType - Kit type
     * @returns {Object} Sticker rules
     */
    static getStickerRules(kitType) {
        return STICKER_RULES[kitType] || STICKER_RULES.fork;
    }

    // ============ LOCALSTORAGE METHODS ============

    /**
     * Save cart to localStorage
     */
    saveToStorage() {
        try {
            const cartData = {
                version: CART_CONFIG.STORAGE_VERSION,
                items: this.items,
                nextId: this.nextId,
                timestamp: Date.now()
            };

            localStorage.setItem(CART_CONFIG.STORAGE_KEY, JSON.stringify(cartData));
        } catch (error) {
            // Handle quota exceeded or permission errors
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.logError(error, 'Cart.saveToStorage', {
                    category: 'STORAGE_ERROR',
                    showUser: false
                });
            } else {
                console.warn('Failed to save cart to localStorage:', error);
            }
        }
    }

    /**
     * Load cart from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
            if (!stored) {
                return; // No saved cart
            }

            const cartData = JSON.parse(stored);

            // Version check
            if (cartData.version !== CART_CONFIG.STORAGE_VERSION) {
                console.warn('Cart storage version mismatch, clearing old data');
                this.clearStorage();
                return;
            }

            // Validate restored items
            if (Array.isArray(cartData.items)) {
                const validItems = cartData.items.filter(item => {
                    // Basic validation of restored items
                    return item &&
                           typeof item === 'object' &&
                           item.rowData &&
                           item.kitType &&
                           SecurityUtils.validateKitType(item.kitType) &&
                           SecurityUtils.validateRowData(item.rowData).valid;
                });

                this.items = validItems;
                this.nextId = cartData.nextId || 1;

                console.log(`✅ Cart restored: ${validItems.length} items`);
            }
        } catch (error) {
            // Handle corrupted data
            console.warn('Failed to load cart from localStorage, clearing:', error);
            this.clearStorage();

            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.logError(error, 'Cart.loadFromStorage', {
                    category: 'STORAGE_ERROR',
                    userMessage: 'Could not restore previous cart. Starting with empty cart.',
                    showUser: false
                });
            }
        }
    }

    /**
     * Clear cart from localStorage
     */
    clearStorage() {
        try {
            localStorage.removeItem(CART_CONFIG.STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to clear cart storage:', error);
        }
    }

    /**
     * Get storage info for debugging
     * @returns {Object} Storage information
     */
    getStorageInfo() {
        try {
            const stored = localStorage.getItem(CART_CONFIG.STORAGE_KEY);
            if (!stored) {
                return { exists: false };
            }

            const cartData = JSON.parse(stored);
            return {
                exists: true,
                version: cartData.version,
                itemCount: cartData.items ? cartData.items.length : 0,
                nextId: cartData.nextId,
                timestamp: cartData.timestamp,
                size: stored.length
            };
        } catch (error) {
            return { exists: false, error: error.message };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Cart, STICKER_RULES };
}
