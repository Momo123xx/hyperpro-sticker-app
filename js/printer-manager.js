/**
 * Printer Manager
 * Manages QZ Tray connection, printer discovery, and print job submission
 */

class PrinterManager {
    constructor() {
        this.isQzAvailable = typeof qz !== 'undefined';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 2000;
        this.connectionListeners = [];

        // QZ Tray certificate configuration (self-signed for internal use)
        this.certificateConfig = {
            algorithm: "SHA512",
            keep: false
        };
    }

    /**
     * Initialize QZ Tray connection
     * @returns {Promise<boolean>} Connection success status
     */
    async initialize() {
        if (!this.isQzAvailable) {
            console.warn('[PrinterManager] QZ Tray not available');
            this.notifyConnectionChange('unavailable');
            return false;
        }

        try {
            // Set up certificate for QZ Tray
            this.setupCertificate();

            // Attempt connection
            await this.connect();

            // Set up disconnect handler
            this.setupDisconnectHandler();

            return true;

        } catch (error) {
            console.error('[PrinterManager] Initialization failed:', error);
            this.notifyConnectionChange('error', error);
            return false;
        }
    }

    /**
     * Set up QZ Tray certificate
     */
    setupCertificate() {
        // For internal use, we use a simple self-signed certificate approach
        // In production, you may want to use proper certificate signing
        qz.security.setCertificatePromise((resolve) => {
            // Use default certificate for now
            resolve();
        });

        qz.security.setSignaturePromise((toSign) => {
            return (resolve) => {
                // Use default signature for now
                resolve();
            };
        });
    }

    /**
     * Connect to QZ Tray
     * @returns {Promise<void>}
     */
    async connect() {
        if (!this.isQzAvailable) {
            throw new Error('QZ Tray is not available');
        }

        if (this.isConnected) {
            console.log('[PrinterManager] Already connected');
            return;
        }

        try {
            await qz.websocket.connect();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('[PrinterManager] Connected to QZ Tray');
            this.notifyConnectionChange('connected');

        } catch (error) {
            console.error('[PrinterManager] Connection failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect from QZ Tray
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await qz.websocket.disconnect();
            this.isConnected = false;
            console.log('[PrinterManager] Disconnected from QZ Tray');
            this.notifyConnectionChange('disconnected');

        } catch (error) {
            console.error('[PrinterManager] Disconnect error:', error);
        }
    }

    /**
     * Set up auto-reconnect on disconnect
     */
    setupDisconnectHandler() {
        qz.websocket.setClosedCallbacks(() => {
            console.warn('[PrinterManager] QZ Tray connection closed');
            this.isConnected = false;
            this.notifyConnectionChange('disconnected');
            this.attemptReconnect();
        });
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[PrinterManager] Max reconnect attempts reached');
            this.notifyConnectionChange('failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[PrinterManager] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('[PrinterManager] Reconnect failed:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * Find available printers
     * @returns {Promise<Array<string>>} List of printer names
     */
    async findPrinters() {
        if (!this.isConnected) {
            throw new Error('Not connected to QZ Tray');
        }

        try {
            const printers = await qz.printers.find();
            console.log('[PrinterManager] Found printers:', printers);
            return printers;

        } catch (error) {
            console.error('[PrinterManager] Error finding printers:', error);
            throw error;
        }
    }

    /**
     * Find Zebra printers specifically
     * @returns {Promise<Array<string>>} List of Zebra printer names
     */
    async findZebraPrinters() {
        const allPrinters = await this.findPrinters();
        const zebraPrinters = allPrinters.filter(printer =>
            printer.toLowerCase().includes('zebra')
        );
        console.log('[PrinterManager] Found Zebra printers:', zebraPrinters);
        return zebraPrinters;
    }

    /**
     * Get default printer
     * @returns {Promise<string>} Default printer name
     */
    async getDefaultPrinter() {
        if (!this.isConnected) {
            throw new Error('Not connected to QZ Tray');
        }

        try {
            const defaultPrinter = await qz.printers.getDefault();
            console.log('[PrinterManager] Default printer:', defaultPrinter);
            return defaultPrinter;

        } catch (error) {
            console.error('[PrinterManager] Error getting default printer:', error);
            throw error;
        }
    }

    /**
     * Print ZPL to specified printer
     * @param {string} zpl - ZPL code to print
     * @param {string} printerName - Target printer name
     * @returns {Promise<void>}
     */
    async printZpl(zpl, printerName) {
        if (!this.isConnected) {
            throw new Error('Not connected to QZ Tray');
        }

        if (!zpl || typeof zpl !== 'string') {
            throw new Error('Invalid ZPL data');
        }

        if (!printerName || typeof printerName !== 'string') {
            throw new Error('Invalid printer name');
        }

        try {
            console.log(`[PrinterManager] Printing to ${printerName}`);

            // Create printer configuration
            const config = qz.configs.create(printerName);

            // Prepare print data
            const data = [{
                type: 'raw',
                format: 'command',
                data: zpl
            }];

            // Submit print job
            await qz.print(config, data);
            console.log('[PrinterManager] Print job sent successfully');

        } catch (error) {
            console.error('[PrinterManager] Print error:', error);
            throw error;
        }
    }

    /**
     * Test printer with sample ZPL
     * @param {string} printerName - Printer to test
     * @param {string} labelSize - '65x35mm' or '124x70mm'
     * @returns {Promise<void>}
     */
    async testPrinter(printerName, labelSize) {
        // Generate test label based on size
        const testZpl = this.generateTestLabel(labelSize);
        await this.printZpl(testZpl, printerName);
    }

    /**
     * Generate test label ZPL
     * @param {string} labelSize - '65x35mm' or '124x70mm'
     * @returns {string} ZPL code for test label
     */
    generateTestLabel(labelSize) {
        if (labelSize === '65x35mm') {
            // Small label test (65x35mm = 184x99 dots at 8dpmm)
            return `^XA
^FO20,20^A0N,40,40^FDTEST LABEL^FS
^FO20,70^A0N,20,20^FDSmall: 65x35mm^FS
^XZ`;
        } else {
            // Big label test (124x70mm = 352x198 dots at 8dpmm)
            return `^XA
^FO30,30^A0N,60,60^FDTEST LABEL^FS
^FO30,110^A0N,30,30^FDBig: 124x70mm^FS
^FO30,160^A0N,25,25^FD${new Date().toLocaleString()}^FS
^XZ`;
        }
    }

    /**
     * Check if QZ Tray is available
     * @returns {boolean} Availability status
     */
    isAvailable() {
        return this.isQzAvailable;
    }

    /**
     * Check connection status
     * @returns {boolean} Connection status
     */
    checkConnection() {
        return this.isConnected;
    }

    /**
     * Get QZ Tray version
     * @returns {Promise<string>} QZ Tray version
     */
    async getVersion() {
        if (!this.isQzAvailable) {
            throw new Error('QZ Tray not available');
        }

        try {
            const version = await qz.api.getVersion();
            return version;
        } catch (error) {
            console.error('[PrinterManager] Error getting version:', error);
            throw error;
        }
    }

    /**
     * Add connection status listener
     * @param {Function} callback - Callback function (status, error) => void
     */
    addConnectionListener(callback) {
        if (typeof callback === 'function') {
            this.connectionListeners.push(callback);
        }
    }

    /**
     * Remove connection status listener
     * @param {Function} callback - Callback to remove
     */
    removeConnectionListener(callback) {
        const index = this.connectionListeners.indexOf(callback);
        if (index > -1) {
            this.connectionListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of connection status change
     * @param {string} status - 'connected', 'disconnected', 'unavailable', 'error', 'failed'
     * @param {Error} error - Optional error object
     */
    notifyConnectionChange(status, error = null) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(status, error);
            } catch (err) {
                console.error('[PrinterManager] Listener error:', err);
            }
        });
    }

    /**
     * Get connection status info
     * @returns {Object} Status information
     */
    getStatusInfo() {
        return {
            available: this.isQzAvailable,
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }

    /**
     * Reset reconnect attempts counter
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }

    /**
     * Force reconnect (manual retry)
     * @returns {Promise<boolean>} Success status
     */
    async forceReconnect() {
        this.resetReconnectAttempts();

        try {
            if (this.isConnected) {
                await this.disconnect();
            }
            await this.connect();
            return true;
        } catch (error) {
            console.error('[PrinterManager] Force reconnect failed:', error);
            return false;
        }
    }
}
