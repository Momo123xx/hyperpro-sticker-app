/**
 * Settings UI
 * Manages the printer configuration modal interface
 */

class SettingsUI {
    constructor(printerManager, settingsStorage, printRouter) {
        this.printerManager = printerManager;
        this.settingsStorage = settingsStorage;
        this.printRouter = printRouter;

        this.modalElement = null;
        this.availablePrinters = [];
        this.tempSettings = {
            smallSlot: null,
            bigSlot: null
        };

        this.isOpen = false;
    }

    /**
     * Initialize the settings UI
     */
    initialize() {
        this.createModalElement();
        this.attachEventListeners();
        console.log('[SettingsUI] Initialized');
    }

    /**
     * Create modal DOM element
     */
    createModalElement() {
        // Check if modal already exists
        let modal = document.getElementById('settings-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'settings-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        this.modalElement = modal;
    }

    /**
     * Attach event listeners to modal
     */
    attachEventListeners() {
        // Close on backdrop click
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * Open the settings modal
     */
    async open() {
        if (!this.printerManager.isAvailable()) {
            alert('QZ Tray is not installed. Please install QZ Tray to configure printers.');
            return;
        }

        if (!this.printerManager.checkConnection()) {
            alert('QZ Tray is not connected. Please ensure QZ Tray is running.');
            return;
        }

        // Load current settings
        const settings = this.settingsStorage.loadSettings();
        this.tempSettings = {
            smallSlot: settings.printers.smallSlot?.name || null,
            bigSlot: settings.printers.bigSlot?.name || null
        };

        // Render modal content
        await this.render();

        // Show modal
        this.modalElement.style.display = 'flex';
        this.isOpen = true;

        console.log('[SettingsUI] Modal opened');
    }

    /**
     * Close the settings modal
     */
    close() {
        this.modalElement.style.display = 'none';
        this.isOpen = false;
        console.log('[SettingsUI] Modal closed');
    }

    /**
     * Render modal content
     */
    async render() {
        this.modalElement.innerHTML = `
            <div class="modal-panel">
                <div class="modal-header">
                    <h2>Printer Configuration</h2>
                    <button class="modal-close" onclick="window.settingsUI.close()">&times;</button>
                </div>

                <div class="modal-body">
                    <div class="printer-discovery">
                        <h3>Available Printers</h3>
                        <button class="btn-scan" id="scan-printers-btn">
                            🔍 Scan for Printers
                        </button>
                        <div class="printer-list" id="printer-list">
                            <p class="hint">Click "Scan for Printers" to discover available network printers</p>
                        </div>
                    </div>

                    <div class="printer-slots">
                        <h3>Printer Assignment</h3>

                        <div class="printer-slot">
                            <label>Small Labels (65x35mm)</label>
                            <select id="small-printer-select" class="printer-select">
                                <option value="">-- Not Assigned --</option>
                            </select>
                            <button class="btn-test" id="test-small-btn" disabled>Test Print</button>
                        </div>

                        <div class="printer-slot">
                            <label>Big Labels (124x70mm)</label>
                            <select id="big-printer-select" class="printer-select">
                                <option value="">-- Not Assigned --</option>
                            </select>
                            <button class="btn-test" id="test-big-btn" disabled>Test Print</button>
                        </div>
                    </div>

                    <div class="printer-status" id="printer-status">
                        <p><strong>Status:</strong> <span id="status-text">Ready</span></p>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-cancel" onclick="window.settingsUI.close()">Cancel</button>
                    <button class="btn-save" id="save-settings-btn">Save Configuration</button>
                </div>
            </div>
        `;

        // Attach button listeners
        this.attachModalListeners();

        // Pre-populate selects if printers already scanned
        if (this.availablePrinters.length > 0) {
            this.populatePrinterSelects();
        }
    }

    /**
     * Attach event listeners to modal buttons
     */
    attachModalListeners() {
        // Scan button
        const scanBtn = document.getElementById('scan-printers-btn');
        scanBtn.addEventListener('click', () => this.scanPrinters());

        // Small printer select
        const smallSelect = document.getElementById('small-printer-select');
        smallSelect.addEventListener('change', (e) => {
            this.tempSettings.smallSlot = e.target.value || null;
            this.updateTestButtons();
        });

        // Big printer select
        const bigSelect = document.getElementById('big-printer-select');
        bigSelect.addEventListener('change', (e) => {
            this.tempSettings.bigSlot = e.target.value || null;
            this.updateTestButtons();
        });

        // Test buttons
        const testSmallBtn = document.getElementById('test-small-btn');
        testSmallBtn.addEventListener('click', () => this.testPrinter('small'));

        const testBigBtn = document.getElementById('test-big-btn');
        testBigBtn.addEventListener('click', () => this.testPrinter('big'));

        // Save button
        const saveBtn = document.getElementById('save-settings-btn');
        saveBtn.addEventListener('click', () => this.saveSettings());
    }

    /**
     * Scan for available printers
     */
    async scanPrinters() {
        const scanBtn = document.getElementById('scan-printers-btn');
        const printerList = document.getElementById('printer-list');

        try {
            // Show loading state
            scanBtn.disabled = true;
            scanBtn.textContent = '⏳ Scanning...';
            printerList.innerHTML = '<p class="loading">Discovering printers...</p>';

            // Scan for printers
            this.availablePrinters = await this.printerManager.findPrinters();

            if (this.availablePrinters.length === 0) {
                printerList.innerHTML = '<p class="warning">No printers found</p>';
            } else {
                // Display found printers
                this.displayPrinters();
                this.populatePrinterSelects();
            }

        } catch (error) {
            console.error('[SettingsUI] Scan failed:', error);
            printerList.innerHTML = '<p class="error">Failed to scan printers. Ensure QZ Tray is running.</p>';

        } finally {
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Scan for Printers';
        }
    }

    /**
     * Display discovered printers in list
     */
    displayPrinters() {
        const printerList = document.getElementById('printer-list');

        const html = `
            <ul class="printer-items">
                ${this.availablePrinters.map(printer => `
                    <li class="printer-item">
                        <span class="printer-icon">🖨️</span>
                        <span class="printer-name">${this.escapeHtml(printer)}</span>
                    </li>
                `).join('')}
            </ul>
            <p class="hint">${this.availablePrinters.length} printer(s) found</p>
        `;

        printerList.innerHTML = html;
    }

    /**
     * Populate printer select dropdowns
     */
    populatePrinterSelects() {
        const smallSelect = document.getElementById('small-printer-select');
        const bigSelect = document.getElementById('big-printer-select');

        // Build options HTML
        const options = this.availablePrinters.map(printer => `
            <option value="${this.escapeHtml(printer)}">${this.escapeHtml(printer)}</option>
        `).join('');

        // Update selects
        smallSelect.innerHTML = '<option value="">-- Not Assigned --</option>' + options;
        bigSelect.innerHTML = '<option value="">-- Not Assigned --</option>' + options;

        // Set current selections
        if (this.tempSettings.smallSlot) {
            smallSelect.value = this.tempSettings.smallSlot;
        }

        if (this.tempSettings.bigSlot) {
            bigSelect.value = this.tempSettings.bigSlot;
        }

        this.updateTestButtons();
    }

    /**
     * Update test button states
     */
    updateTestButtons() {
        const testSmallBtn = document.getElementById('test-small-btn');
        const testBigBtn = document.getElementById('test-big-btn');

        testSmallBtn.disabled = !this.tempSettings.smallSlot;
        testBigBtn.disabled = !this.tempSettings.bigSlot;
    }

    /**
     * Test print to selected printer
     * @param {string} slotType - 'small' or 'big'
     */
    async testPrinter(slotType) {
        const printerName = slotType === 'small' ? this.tempSettings.smallSlot : this.tempSettings.bigSlot;
        const labelSize = slotType === 'small' ? '65x35mm' : '124x70mm';
        const testBtn = document.getElementById(`test-${slotType}-btn`);
        const statusText = document.getElementById('status-text');

        if (!printerName) {
            alert('Please select a printer first');
            return;
        }

        try {
            // Show loading state
            testBtn.disabled = true;
            testBtn.textContent = '⏳ Printing...';
            statusText.textContent = `Sending test print to ${printerName}...`;

            // Send test print
            await this.printerManager.testPrinter(printerName, labelSize);

            statusText.textContent = `✓ Test print sent to ${printerName}`;
            statusText.style.color = 'green';

            // Reset status after 3 seconds
            setTimeout(() => {
                statusText.textContent = 'Ready';
                statusText.style.color = '';
            }, 3000);

        } catch (error) {
            console.error('[SettingsUI] Test print failed:', error);
            statusText.textContent = `✗ Test print failed: ${error.message}`;
            statusText.style.color = 'red';

            setTimeout(() => {
                statusText.textContent = 'Ready';
                statusText.style.color = '';
            }, 5000);

        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Print';
        }
    }

    /**
     * Save printer configuration
     */
    saveSettings() {
        try {
            // Validate selections
            if (!this.tempSettings.smallSlot && !this.tempSettings.bigSlot) {
                alert('Please assign at least one printer');
                return;
            }

            if (this.tempSettings.smallSlot === this.tempSettings.bigSlot) {
                const confirmed = confirm(
                    'Warning: You have assigned the same printer to both slots. ' +
                    'This is not recommended. Continue anyway?'
                );
                if (!confirmed) {
                    return;
                }
            }

            // Save to storage
            this.settingsStorage.setSmallPrinter(this.tempSettings.smallSlot);
            this.settingsStorage.setBigPrinter(this.tempSettings.bigSlot);

            // Show success message
            const statusText = document.getElementById('status-text');
            statusText.textContent = '✓ Configuration saved successfully';
            statusText.style.color = 'green';

            // Close modal after short delay
            setTimeout(() => {
                this.close();

                // Notify app that settings changed (if callback exists)
                if (typeof window.onPrinterSettingsChanged === 'function') {
                    window.onPrinterSettingsChanged();
                }
            }, 1000);

            console.log('[SettingsUI] Settings saved');

        } catch (error) {
            console.error('[SettingsUI] Save failed:', error);
            alert('Failed to save settings: ' + error.message);
        }
    }

    /**
     * Show a quick status message
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'info'
     */
    showStatus(message, type = 'info') {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
            statusText.style.color = type === 'success' ? 'green' : type === 'error' ? 'red' : '';
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get current modal state
     * @returns {boolean} True if modal is open
     */
    isModalOpen() {
        return this.isOpen;
    }
}
