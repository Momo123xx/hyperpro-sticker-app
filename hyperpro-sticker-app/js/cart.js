/**
 * Cart Management System
 * Handles cart state, item management, and sticker calculations
 */

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
    }

    /**
     * Add item to cart
     * @param {Object} rowData - Product data from CSV
     * @param {string} kitType - 'fork', 'shock', or 'combi'
     * @param {number} quantity - Number of kits
     * @returns {Object} The added cart item
     */
    addToCart(rowData, kitType, quantity = 1) {
        const item = {
            id: this.nextId++,
            rowData: rowData,
            kitType: kitType,
            quantity: quantity,
            productCode: rowData['Product Code'],
            productName: rowData['Product Name'],
            timestamp: Date.now()
        };

        this.items.push(item);
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
        if (newQuantity < 1) return false;

        const item = this.items.find(item => item.id === itemId);
        if (item) {
            item.quantity = newQuantity;
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
     * Calculate sticker breakdown for a specific item
     * @param {Object} item - Cart item
     * @returns {Object} Breakdown of stickers { big, smallFork, smallShock, total }
     */
    calculateItemStickers(item) {
        const rules = STICKER_RULES[item.kitType];
        return {
            big: rules.big * item.quantity,
            smallFork: rules.smallFork * item.quantity,
            smallShock: rules.smallShock * item.quantity,
            total: (rules.big + rules.smallFork + rules.smallShock) * item.quantity
        };
    }

    /**
     * Calculate total stickers across all cart items
     * @returns {Object} Summary { totalItems, totalBig, totalSmallFork, totalSmallShock, totalSmall, grandTotal }
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
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback());
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Cart, STICKER_RULES };
}
