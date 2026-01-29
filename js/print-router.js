/**
 * Print Router
 * Routes ZPL print jobs to the correct printer based on label size
 */

class PrintRouter {
    constructor(printerManager, settingsStorage) {
        this.printerManager = printerManager;
        this.settingsStorage = settingsStorage;
        this.printQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Check if printing is available
     * @returns {boolean} True if both printers configured and QZ connected
     */
    canPrint() {
        return this.printerManager.checkConnection() &&
               this.settingsStorage.areBothPrintersConfigured();
    }

    /**
     * Check if small printer is configured
     * @returns {boolean} Configuration status
     */
    canPrintSmall() {
        return this.printerManager.checkConnection() &&
               this.settingsStorage.getSmallPrinter() !== null;
    }

    /**
     * Check if big printer is configured
     * @returns {boolean} Configuration status
     */
    canPrintBig() {
        return this.printerManager.checkConnection() &&
               this.settingsStorage.getBigPrinter() !== null;
    }

    /**
     * Print to small label printer
     * @param {string} zpl - ZPL code to print
     * @returns {Promise<void>}
     */
    async printSmall(zpl) {
        if (!zpl) {
            throw new Error('No ZPL data provided');
        }

        const printer = this.settingsStorage.getSmallPrinter();

        if (!printer) {
            throw new Error('Small printer not configured');
        }

        if (!this.printerManager.checkConnection()) {
            throw new Error('QZ Tray not connected');
        }

        try {
            console.log(`[PrintRouter] Printing small label to ${printer.name}`);
            await this.printerManager.printZpl(zpl, printer.name);
            this.settingsStorage.updateLastUsed('small');
            console.log('[PrintRouter] Small label printed successfully');

        } catch (error) {
            console.error('[PrintRouter] Small label print failed:', error);
            throw error;
        }
    }

    /**
     * Print to big label printer
     * @param {string} zpl - ZPL code to print
     * @returns {Promise<void>}
     */
    async printBig(zpl) {
        if (!zpl) {
            throw new Error('No ZPL data provided');
        }

        const printer = this.settingsStorage.getBigPrinter();

        if (!printer) {
            throw new Error('Big printer not configured');
        }

        if (!this.printerManager.checkConnection()) {
            throw new Error('QZ Tray not connected');
        }

        try {
            console.log(`[PrintRouter] Printing big label to ${printer.name}`);
            await this.printerManager.printZpl(zpl, printer.name);
            this.settingsStorage.updateLastUsed('big');
            console.log('[PrintRouter] Big label printed successfully');

        } catch (error) {
            console.error('[PrintRouter] Big label print failed:', error);
            throw error;
        }
    }

    /**
     * Print both small and big labels sequentially
     * @param {string} bigZpl - ZPL for big label
     * @param {string} smallZpl - ZPL for small label
     * @param {number} delay - Delay between prints in ms (default 500)
     * @returns {Promise<void>}
     */
    async printBoth(bigZpl, smallZpl, delay = 500) {
        if (!this.canPrint()) {
            throw new Error('Both printers must be configured');
        }

        try {
            console.log('[PrintRouter] Printing both labels');

            // Print big label first
            if (bigZpl) {
                await this.printBig(bigZpl);
            }

            // Wait between prints
            if (bigZpl && smallZpl) {
                await this.delay(delay);
            }

            // Print small label
            if (smallZpl) {
                await this.printSmall(smallZpl);
            }

            console.log('[PrintRouter] Both labels printed successfully');

        } catch (error) {
            console.error('[PrintRouter] Print both failed:', error);
            throw error;
        }
    }

    /**
     * Batch print multiple labels to small printer
     * @param {Array<string>} zplArray - Array of ZPL strings
     * @param {number} delay - Delay between prints in ms (default 200)
     * @returns {Promise<Object>} Results object with success/failure counts
     */
    async batchPrintSmall(zplArray, delay = 200) {
        return await this.batchPrint(zplArray, 'small', delay);
    }

    /**
     * Batch print multiple labels to big printer
     * @param {Array<string>} zplArray - Array of ZPL strings
     * @param {number} delay - Delay between prints in ms (default 200)
     * @returns {Promise<Object>} Results object with success/failure counts
     */
    async batchPrintBig(zplArray, delay = 200) {
        return await this.batchPrint(zplArray, 'big', delay);
    }

    /**
     * Internal batch print handler
     * @param {Array<string>} zplArray - Array of ZPL strings
     * @param {string} size - 'small' or 'big'
     * @param {number} delay - Delay between prints in ms
     * @returns {Promise<Object>} Results object
     */
    async batchPrint(zplArray, size, delay) {
        if (!Array.isArray(zplArray) || zplArray.length === 0) {
            throw new Error('Invalid ZPL array');
        }

        const results = {
            total: zplArray.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        console.log(`[PrintRouter] Batch printing ${zplArray.length} ${size} labels`);

        for (let i = 0; i < zplArray.length; i++) {
            try {
                if (size === 'small') {
                    await this.printSmall(zplArray[i]);
                } else {
                    await this.printBig(zplArray[i]);
                }

                results.successful++;

                // Add delay between prints (except after last one)
                if (i < zplArray.length - 1) {
                    await this.delay(delay);
                }

            } catch (error) {
                results.failed++;
                results.errors.push({
                    index: i,
                    error: error.message
                });
                console.error(`[PrintRouter] Failed to print label ${i + 1}:`, error);
            }
        }

        console.log(`[PrintRouter] Batch print complete: ${results.successful}/${results.total} successful`);
        return results;
    }

    /**
     * Add print job to queue
     * @param {Object} job - Print job {type, zpl}
     */
    queuePrintJob(job) {
        this.printQueue.push(job);
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }

    /**
     * Process print queue
     */
    async processQueue() {
        if (this.printQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;

        while (this.printQueue.length > 0) {
            const job = this.printQueue.shift();

            try {
                if (job.type === 'small') {
                    await this.printSmall(job.zpl);
                } else if (job.type === 'big') {
                    await this.printBig(job.zpl);
                } else if (job.type === 'both') {
                    await this.printBoth(job.bigZpl, job.smallZpl);
                }

                // Small delay between queued jobs
                await this.delay(200);

            } catch (error) {
                console.error('[PrintRouter] Queue job failed:', error);
                // Continue processing queue even if one job fails
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Clear print queue
     */
    clearQueue() {
        this.printQueue = [];
        this.isProcessingQueue = false;
        console.log('[PrintRouter] Print queue cleared');
    }

    /**
     * Get queue status
     * @returns {Object} Queue information
     */
    getQueueStatus() {
        return {
            length: this.printQueue.length,
            isProcessing: this.isProcessingQueue
        };
    }

    /**
     * Get configured printers info
     * @returns {Object} Printer configuration
     */
    getPrinterInfo() {
        return {
            small: this.settingsStorage.getSmallPrinter(),
            big: this.settingsStorage.getBigPrinter(),
            canPrint: this.canPrint(),
            canPrintSmall: this.canPrintSmall(),
            canPrintBig: this.canPrintBig()
        };
    }

    /**
     * Test configured printers
     * @returns {Promise<Object>} Test results
     */
    async testPrinters() {
        const results = {
            small: { success: false, error: null },
            big: { success: false, error: null }
        };

        // Test small printer
        if (this.canPrintSmall()) {
            try {
                const printer = this.settingsStorage.getSmallPrinter();
                await this.printerManager.testPrinter(printer.name, '65x35mm');
                results.small.success = true;
            } catch (error) {
                results.small.error = error.message;
            }
        }

        // Test big printer
        if (this.canPrintBig()) {
            try {
                const printer = this.settingsStorage.getBigPrinter();
                await this.printerManager.testPrinter(printer.name, '124x70mm');
                results.big.success = true;
            } catch (error) {
                results.big.error = error.message;
            }
        }

        return results;
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get status message for UI
     * @returns {string} Human-readable status
     */
    getStatusMessage() {
        if (!this.printerManager.isAvailable()) {
            return 'QZ Tray not installed';
        }

        if (!this.printerManager.checkConnection()) {
            return 'QZ Tray not connected';
        }

        const smallPrinter = this.settingsStorage.getSmallPrinter();
        const bigPrinter = this.settingsStorage.getBigPrinter();

        if (!smallPrinter && !bigPrinter) {
            return 'No printers configured';
        }

        if (!smallPrinter) {
            return 'Small printer not configured';
        }

        if (!bigPrinter) {
            return 'Big printer not configured';
        }

        return 'Ready to print';
    }

    /**
     * Check if ready for specific print type
     * @param {string} type - 'small', 'big', or 'both'
     * @returns {Object} {ready: boolean, message: string}
     */
    checkReadiness(type) {
        if (!this.printerManager.isAvailable()) {
            return { ready: false, message: 'QZ Tray not installed' };
        }

        if (!this.printerManager.checkConnection()) {
            return { ready: false, message: 'QZ Tray not connected' };
        }

        if (type === 'small') {
            const ready = this.canPrintSmall();
            return {
                ready,
                message: ready ? 'Ready' : 'Small printer not configured'
            };
        }

        if (type === 'big') {
            const ready = this.canPrintBig();
            return {
                ready,
                message: ready ? 'Ready' : 'Big printer not configured'
            };
        }

        if (type === 'both') {
            const ready = this.canPrint();
            return {
                ready,
                message: ready ? 'Ready' : 'Both printers must be configured'
            };
        }

        return { ready: false, message: 'Invalid print type' };
    }
}
