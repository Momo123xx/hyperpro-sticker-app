/**
 * PDF Generator
 * Converts ZPL to PDF using Labelary API and handles downloads
 */

class PdfGenerator {
    constructor() {
        this.baseUrl = 'http://api.labelary.com/v1/printers';
        this.dpi = '12dpmm'; // 12 dots per mm (≈300 DPI to match ZPL templates)

        // Label dimensions in inches (Labelary requires inches)
        this.labelDimensions = {
            small: {
                width: 2.56,   // 65mm = 2.56 inches
                height: 1.38,  // 35mm = 1.38 inches
                mm: '65x35mm'
            },
            big: {
                width: 4.88,   // 124mm = 4.88 inches
                height: 2.75,  // 70mm = 2.75 inches
                mm: '124x70mm'
            }
        };
    }

    /**
     * Convert ZPL to PDF using Labelary API
     * @param {string} zpl - ZPL code to convert
     * @param {string} labelSize - 'small' or 'big'
     * @returns {Promise<Blob>} PDF blob
     */
    async convertZplToPdf(zpl, labelSize) {
        if (!zpl || typeof zpl !== 'string') {
            const error = new Error('Invalid ZPL data');
            console.error('[PdfGenerator] Validation failed:', error);
            throw error;
        }

        if (!['small', 'big'].includes(labelSize)) {
            const error = new Error('Invalid label size. Must be "small" or "big"');
            console.error('[PdfGenerator] Validation failed:', error);
            throw error;
        }

        const dimensions = this.labelDimensions[labelSize];
        const url = this.buildLabelaryUrl(dimensions.width, dimensions.height);

        devLog('PdfGenerator', 'Starting PDF conversion', {
            'Label Size': dimensions.mm,
            'Dimensions': `${dimensions.width}" x ${dimensions.height}"`,
            'API URL': url,
            'ZPL Length': `${zpl.length} characters`,
            'ZPL Preview': `${zpl.substring(0, 100)}...`
        });

        try {
            devLog('PdfGenerator', 'Sending request to Labelary API...');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/pdf'
                },
                body: zpl
            });

            devLog('PdfGenerator', 'Response received', {
                'Status': `${response.status} ${response.statusText}`,
                'Content-Type': response.headers.get('content-type'),
                'Content-Length': response.headers.get('content-length')
            });

            if (!response.ok) {
                const responseText = await response.text();
                const error = new Error(`Labelary API error: ${response.status} ${response.statusText} - ${responseText}`);
                devError('PdfGenerator', 'Labelary API error response', error, { responseText });
                throw error;
            }

            const blob = await response.blob();
            devLog('PdfGenerator', 'Blob received', {
                'Blob Type': blob.type,
                'Blob Size': `${blob.size} bytes`
            });

            // Accept both PDF and PNG formats
            const acceptedTypes = ['application/pdf', 'image/png'];
            if (!acceptedTypes.includes(blob.type)) {
                const error = new Error(`Unexpected response type. Received: ${blob.type}`);
                devError('PdfGenerator', 'Invalid blob type received', error, { blobType: blob.type });
                throw error;
            }
            devLog('PdfGenerator', '✓ Conversion successful', { 'Format': blob.type });
            return blob;

        } catch (error) {
            devError('PdfGenerator', '✗ Conversion failed', error, {
                'Error Type': error.name,
                'Error Message': error.message
            });
            throw error;
        }
    }

    /**
     * Build Labelary API URL
     * @param {number} width - Label width in inches
     * @param {number} height - Label height in inches
     * @returns {string} Complete API URL
     */
    buildLabelaryUrl(width, height) {
        // Format: http://api.labelary.com/v1/printers/8dpmm/labels/4.88x2.75/0/
        return `${this.baseUrl}/${this.dpi}/labels/${width}x${height}/0/`;
    }

    /**
     * Open ZPL as PDF/PNG in new tab
     * @param {string} zpl - ZPL code to convert and open
     * @param {string} filename - Filename without extension (for fallback)
     * @param {string} labelSize - 'small' or 'big'
     * @returns {Promise<boolean>} Success status
     */
    async openInNewTab(zpl, filename, labelSize) {
        devLog('PdfGenerator', `openInNewTab called`, {
            'Filename': filename,
            'Label Size': labelSize
        });

        try {
            // Convert ZPL to PDF/PNG
            devLog('PdfGenerator', 'Calling convertZplToPdf...');
            const blob = await this.convertZplToPdf(zpl, labelSize);

            // Open the blob in a new tab
            devLog('PdfGenerator', 'Opening in new tab...');
            this.openPdfInNewTab(blob);

            devLog('PdfGenerator', `✓ Successfully opened in new tab`, { 'Filename': filename });
            return true;

        } catch (error) {
            devError('PdfGenerator', `✗ Failed to open in new tab: ${filename}`, error);
            throw error;
        }
    }

    /**
     * Open PDF blob in a new browser tab
     * @param {Blob} blob - PDF blob to open
     */
    openPdfInNewTab(blob) {
        console.log('[PdfGenerator] Creating object URL for PDF blob...');
        console.log(`  Blob size: ${blob.size} bytes`);
        console.log(`  Blob type: ${blob.type}`);

        const url = URL.createObjectURL(blob);
        console.log(`[PdfGenerator] Object URL created: ${url.substring(0, 50)}...`);

        console.log('[PdfGenerator] Attempting to open new window...');
        const newWindow = window.open(url, '_blank');

        // Clean up object URL after window opens
        if (newWindow) {
            console.log('[PdfGenerator] ✓ New window opened successfully');
            newWindow.addEventListener('load', () => {
                console.log('[PdfGenerator] PDF loaded in new window');
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    console.log('[PdfGenerator] Object URL revoked');
                }, 1000);
            });
        } else {
            // If popup was blocked, fallback to download
            console.warn('[PdfGenerator] ⚠ Popup blocked by browser, falling back to download');
            const link = document.createElement('a');
            link.href = url;
            link.download = 'labels.pdf';
            document.body.appendChild(link);
            console.log('[PdfGenerator] Triggering download...');
            link.click();
            document.body.removeChild(link);
            setTimeout(() => {
                URL.revokeObjectURL(url);
                console.log('[PdfGenerator] Object URL revoked (download fallback)');
            }, 100);
        }
    }

    /**
     * Download blob as file (follows pattern from BatchZBLGenerator)
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename with extension
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up object URL after a short delay
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    }


    /**
     * Batch convert multiple ZPL files to single PDF
     * @param {Array<string>} zplArray - Array of ZPL strings
     * @param {string} labelSize - 'small' or 'big'
     * @returns {Promise<Blob>} Combined PDF blob
     */
    async batchConvertToPdf(zplArray, labelSize) {
        if (!Array.isArray(zplArray) || zplArray.length === 0) {
            throw new Error('Invalid ZPL array');
        }

        console.log(`[PdfGenerator] Batch converting ${zplArray.length} labels`);

        try {
            // Note: Labelary API processes multiple labels in a single request
            // by concatenating ZPL with proper separators
            const combinedZpl = zplArray.join('\n');
            return await this.convertZplToPdf(combinedZpl, labelSize);

        } catch (error) {
            console.error('[PdfGenerator] Batch conversion failed:', error);
            throw error;
        }
    }

    /**
     * Batch download as PDF
     * @param {Array<string>} zplArray - Array of ZPL strings
     * @param {string} filename - Base filename without extension
     * @param {string} labelSize - 'small' or 'big'
     * @returns {Promise<boolean>} Success status
     */
    async batchDownloadAsPdf(zplArray, filename, labelSize) {
        try {
            const pdfBlob = await this.batchConvertToPdf(zplArray, labelSize);
            this.downloadBlob(pdfBlob, `${filename}.pdf`);
            console.log(`[PdfGenerator] Batch download complete: ${filename}.pdf`);
            return true;

        } catch (error) {
            console.error('[PdfGenerator] Batch download failed:', error);
            throw error;
        }
    }

    /**
     * Test Labelary API connectivity
     * @returns {Promise<boolean>} API availability status
     */
    async testApiConnection() {
        const testZpl = '^XA^FO20,20^A0N,25,25^FDTEST^FS^XZ';

        try {
            await this.convertZplToPdf(testZpl, 'small');
            console.log('[PdfGenerator] Labelary API is available');
            return true;

        } catch (error) {
            console.error('[PdfGenerator] Labelary API unavailable:', error);
            return false;
        }
    }

    /**
     * Get label dimensions for a given size
     * @param {string} labelSize - 'small' or 'big'
     * @returns {Object} Dimensions object
     */
    getDimensions(labelSize) {
        if (!['small', 'big'].includes(labelSize)) {
            throw new Error('Invalid label size');
        }
        return { ...this.labelDimensions[labelSize] };
    }

    /**
     * Determine label size from ZPL dimensions
     * @param {string} zpl - ZPL code to analyze
     * @returns {string} 'small' or 'big'
     */
    detectLabelSize(zpl) {
        // Check for label format command (^PW and ^LL)
        // Small: ^PW184 (65mm at 8dpmm), Big: ^PW352 (124mm at 8dpmm)

        const pwMatch = zpl.match(/\^PW(\d+)/);
        if (pwMatch) {
            const width = parseInt(pwMatch[1]);
            // 184 dots = 65mm (small), 352 dots = 124mm (big)
            return width > 200 ? 'big' : 'small';
        }

        // Default to small if cannot detect
        console.warn('[PdfGenerator] Could not detect label size, defaulting to small');
        return 'small';
    }

    /**
     * Estimate PDF file size
     * @param {string} labelSize - 'small' or 'big'
     * @param {number} labelCount - Number of labels
     * @returns {string} Estimated size (e.g., "2.5 MB")
     */
    estimatePdfSize(labelSize, labelCount) {
        // Rough estimate: small labels ~50KB each, big labels ~100KB each
        const sizePerLabel = labelSize === 'small' ? 50 : 100;
        const totalKb = sizePerLabel * labelCount;

        if (totalKb < 1024) {
            return `${totalKb.toFixed(0)} KB`;
        } else {
            const totalMb = totalKb / 1024;
            return `${totalMb.toFixed(1)} MB`;
        }
    }
}
