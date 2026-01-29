/**
 * Printer Settings Storage Manager
 * Manages persistent storage of printer configuration using localStorage
 * Follows the same versioning pattern as cart.js for consistency
 */

class SettingsStorage {
    constructor() {
        this.STORAGE_KEY = 'hyperpro_printer_settings';
        this.CURRENT_VERSION = 1;
        this.defaultSettings = this.getDefaultSettings();
    }

    /**
     * Get default settings structure
     * @returns {Object} Default settings object
     */
    getDefaultSettings() {
        return {
            version: this.CURRENT_VERSION,
            timestamp: Date.now(),
            printers: {
                smallSlot: null,
                bigSlot: null
            },
            qzSettings: {
                autoConnect: true,
                reconnectAttempts: 3,
                reconnectDelay: 2000
            }
        };
    }

    /**
     * Load settings from localStorage
     * @returns {Object} Settings object or default if invalid/missing
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);

            if (!stored) {
                console.log('[SettingsStorage] No saved settings found, using defaults');
                return this.defaultSettings;
            }

            const settings = JSON.parse(stored);

            // Version validation - clear if version mismatch
            if (!settings.version || settings.version !== this.CURRENT_VERSION) {
                console.warn('[SettingsStorage] Version mismatch, clearing settings');
                this.clearSettings();
                return this.defaultSettings;
            }

            // Validate structure
            if (!this.validateSettings(settings)) {
                console.warn('[SettingsStorage] Invalid settings structure, using defaults');
                this.clearSettings();
                return this.defaultSettings;
            }

            console.log('[SettingsStorage] Settings loaded successfully');
            return settings;

        } catch (error) {
            console.error('[SettingsStorage] Error loading settings:', error);
            return this.defaultSettings;
        }
    }

    /**
     * Save settings to localStorage
     * @param {Object} settings - Settings object to save
     * @returns {boolean} Success status
     */
    saveSettings(settings) {
        try {
            // Ensure version and timestamp are set
            settings.version = this.CURRENT_VERSION;
            settings.timestamp = Date.now();

            // Validate before saving
            if (!this.validateSettings(settings)) {
                console.error('[SettingsStorage] Cannot save invalid settings');
                return false;
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            console.log('[SettingsStorage] Settings saved successfully');
            return true;

        } catch (error) {
            console.error('[SettingsStorage] Error saving settings:', error);
            return false;
        }
    }

    /**
     * Validate settings structure
     * @param {Object} settings - Settings to validate
     * @returns {boolean} Validation result
     */
    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }

        // Check required properties
        if (!settings.printers || typeof settings.printers !== 'object') {
            return false;
        }

        if (!settings.qzSettings || typeof settings.qzSettings !== 'object') {
            return false;
        }

        // Validate printer slots (can be null or valid printer object)
        const { smallSlot, bigSlot } = settings.printers;

        if (smallSlot !== null && !this.validatePrinterSlot(smallSlot)) {
            return false;
        }

        if (bigSlot !== null && !this.validatePrinterSlot(bigSlot)) {
            return false;
        }

        return true;
    }

    /**
     * Validate individual printer slot
     * @param {Object} slot - Printer slot to validate
     * @returns {boolean} Validation result
     */
    validatePrinterSlot(slot) {
        if (!slot || typeof slot !== 'object') {
            return false;
        }

        return (
            typeof slot.name === 'string' &&
            slot.name.length > 0 &&
            typeof slot.labelSize === 'string' &&
            typeof slot.assignedDate === 'number'
        );
    }

    /**
     * Get small printer configuration
     * @returns {Object|null} Small printer config or null
     */
    getSmallPrinter() {
        const settings = this.loadSettings();
        return settings.printers.smallSlot;
    }

    /**
     * Get big printer configuration
     * @returns {Object|null} Big printer config or null
     */
    getBigPrinter() {
        const settings = this.loadSettings();
        return settings.printers.bigSlot;
    }

    /**
     * Save small printer configuration
     * @param {string} printerName - Printer name
     * @returns {boolean} Success status
     */
    setSmallPrinter(printerName) {
        const settings = this.loadSettings();

        if (!printerName) {
            settings.printers.smallSlot = null;
        } else {
            settings.printers.smallSlot = {
                name: printerName,
                labelSize: '65x35mm',
                assignedDate: Date.now(),
                lastUsed: null
            };
        }

        return this.saveSettings(settings);
    }

    /**
     * Save big printer configuration
     * @param {string} printerName - Printer name
     * @returns {boolean} Success status
     */
    setBigPrinter(printerName) {
        const settings = this.loadSettings();

        if (!printerName) {
            settings.printers.bigSlot = null;
        } else {
            settings.printers.bigSlot = {
                name: printerName,
                labelSize: '124x70mm',
                assignedDate: Date.now(),
                lastUsed: null
            };
        }

        return this.saveSettings(settings);
    }

    /**
     * Update last used timestamp for a printer slot
     * @param {string} slotType - 'small' or 'big'
     */
    updateLastUsed(slotType) {
        const settings = this.loadSettings();
        const slot = slotType === 'small' ? 'smallSlot' : 'bigSlot';

        if (settings.printers[slot]) {
            settings.printers[slot].lastUsed = Date.now();
            this.saveSettings(settings);
        }
    }

    /**
     * Check if both printer slots are configured
     * @returns {boolean} True if both slots have printers assigned
     */
    areBothPrintersConfigured() {
        const settings = this.loadSettings();
        return settings.printers.smallSlot !== null &&
               settings.printers.bigSlot !== null;
    }

    /**
     * Get QZ Tray settings
     * @returns {Object} QZ settings
     */
    getQzSettings() {
        const settings = this.loadSettings();
        return settings.qzSettings;
    }

    /**
     * Update QZ Tray settings
     * @param {Object} qzSettings - QZ settings to update
     * @returns {boolean} Success status
     */
    updateQzSettings(qzSettings) {
        const settings = this.loadSettings();
        settings.qzSettings = { ...settings.qzSettings, ...qzSettings };
        return this.saveSettings(settings);
    }

    /**
     * Clear all settings
     */
    clearSettings() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('[SettingsStorage] Settings cleared');
        } catch (error) {
            console.error('[SettingsStorage] Error clearing settings:', error);
        }
    }

    /**
     * Export settings as JSON string (for debugging/backup)
     * @returns {string} JSON string of current settings
     */
    exportSettings() {
        const settings = this.loadSettings();
        return JSON.stringify(settings, null, 2);
    }

    /**
     * Import settings from JSON string (for debugging/restore)
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Success status
     */
    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            return this.saveSettings(settings);
        } catch (error) {
            console.error('[SettingsStorage] Error importing settings:', error);
            return false;
        }
    }
}
