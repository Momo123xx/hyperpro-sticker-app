/**
 * Batch ZBL Generator
 * Generates multiple stickers from cart items with kit-specific rules
 */

class BatchZBLGenerator {
    /**
     * @param {Object} templates - Object containing all template strings
     * @param {string} templates.big - BIG sticker template (zbl-dynamic.txt)
     * @param {string} templates.smallFork - SMALL Fork sticker template
     * @param {string} templates.smallShock - SMALL Shock sticker template
     */
    constructor(templates) {
        this.templates = templates;
        this.stickerRules = {
            fork: { big: 1, smallFork: 2, smallShock: 0 },
            shock: { big: 1, smallFork: 0, smallShock: 1 },
            combi: { big: 1, smallFork: 2, smallShock: 1 }
        };
    }

    /**
     * Generate batch of stickers from cart items
     * @param {Array} cartItems - Array of cart items
     * @returns {Object} { bigZpl, smallZpl, counts }
     */
    generateBatch(cartItems) {
        const bigStickers = [];
        const smallStickers = [];
        let counts = {
            big: 0,
            smallFork: 0,
            smallShock: 0
        };

        // Process each cart item
        cartItems.forEach(item => {
            const { bigZpl, smallZpl, itemCounts } = this.generateStickerSet(
                item.kitType,
                item.rowData,
                item.quantity
            );

            bigStickers.push(...bigZpl);
            smallStickers.push(...smallZpl);

            counts.big += itemCounts.big;
            counts.smallFork += itemCounts.smallFork;
            counts.smallShock += itemCounts.smallShock;
        });

        // Combine all stickers into final ZPL strings
        const bigZpl = bigStickers.join('\n\n');
        const smallZpl = smallStickers.join('\n\n');

        return {
            bigZpl,
            smallZpl,
            counts: {
                ...counts,
                totalSmall: counts.smallFork + counts.smallShock,
                grandTotal: counts.big + counts.smallFork + counts.smallShock
            }
        };
    }

    /**
     * Generate stickers for a single cart item based on kit type
     * @param {string} kitType - 'fork', 'shock', or 'combi'
     * @param {Object} rowData - Product data
     * @param {number} quantity - Number of kits
     * @returns {Object} { bigZpl: Array, smallZpl: Array, itemCounts }
     */
    generateStickerSet(kitType, rowData, quantity) {
        const rules = this.stickerRules[kitType];
        const bigZpl = [];
        const smallZpl = [];

        // Prepare variables once for this item
        const variables = this.prepareVariables(rowData);

        // Generate stickers for each kit quantity
        for (let i = 0; i < quantity; i++) {
            // Generate BIG stickers
            for (let b = 0; b < rules.big; b++) {
                const zpl = this.replaceVariables(this.templates.big, variables);
                bigZpl.push(zpl);
            }

            // Generate SMALL Fork stickers
            for (let f = 0; f < rules.smallFork; f++) {
                const zpl = this.replaceVariables(this.templates.smallFork, variables);
                smallZpl.push(zpl);
            }

            // Generate SMALL Shock stickers
            for (let s = 0; s < rules.smallShock; s++) {
                const zpl = this.replaceVariables(this.templates.smallShock, variables);
                smallZpl.push(zpl);
            }
        }

        return {
            bigZpl,
            smallZpl,
            itemCounts: {
                big: rules.big * quantity,
                smallFork: rules.smallFork * quantity,
                smallShock: rules.smallShock * quantity
            }
        };
    }

    /**
     * Prepare variables from row data
     * @param {Object} rowData - Product data
     * @returns {Object} Variables object
     */
    prepareVariables(rowData) {
        const vars = {
            BRAND_NAME: rowData.F || 'N/A',
            MODEL_TYPE: rowData.G || 'N/A',
            YEAR: rowData.H || 'N/A',
            FORK_SPRING: rowData.I || 'N/A',
            SHOCK_SPRING: rowData.Q || 'N/A',
            FORKCODE: rowData.C || 'NONE',
            SHOCKCODE: rowData.D || 'NONE',
            COMBICODE: rowData.E || 'NONE',
            OIL_TYPE: rowData.J || 'N/A',
            OIL_LEVEL: rowData.K || 'N/A',
            FORK_PRELOAD: rowData.L || 'N/A',
            SHOCK_PRELOAD: rowData.R || 'N/A',
            FORK_SAG: rowData.M || 'N/A',
            SHOCK_SAG: rowData.S || 'N/A',
            FORK_COMPRESSION: rowData.N || 'N/A',
            SHOCK_COMPRESSION: rowData.T || 'N/A'
        };

        // Calculate font sizes for BIG stickers
        vars.BRAND_FONT_SIZE = this.calculateBrandFontSize(vars.BRAND_NAME);
        vars.MODEL_FONT_SIZE = this.calculateModelFontSize(vars.MODEL_TYPE);
        vars.KIT_FONT_SIZE = this.calculateKitFontSize(vars);

        // Calculate font sizes for SMALL stickers
        vars.BRAND_FONT_SIZE_SMALL = this.calculateBrandFontSizeSmall(vars.BRAND_NAME);
        vars.MODEL_FONT_SIZE_SMALL = this.calculateModelFontSizeSmall(vars.MODEL_TYPE);

        // Combine notes field
        vars.NOTES = this.combineNotes(rowData.P, rowData.V);
        vars.NOTES_FONT_SIZE = this.calculateNotesFontSize(vars.NOTES);

        return vars;
    }

    /**
     * Replace placeholders in template with variables
     * @param {string} template - ZPL template
     * @param {Object} variables - Variables object
     * @returns {string} ZPL with substituted values
     */
    replaceVariables(template, variables) {
        let zpl = template;

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            zpl = zpl.replace(regex, value);
        });

        return zpl;
    }

    // Font size calculation methods (copied from ZBLGenerator for consistency)
    calculateBrandFontSize(text) {
        const len = text.length;
        if (len <= 25) return 50;
        if (len <= 40) return 40;
        if (len <= 60) return 35;
        if (len <= 80) return 30;
        return 25;
    }

    calculateModelFontSize(text) {
        const len = text.length;
        if (len <= 25) return 50;
        if (len <= 40) return 40;
        if (len <= 60) return 32;
        if (len <= 80) return 26;
        if (len <= 100) return 22;
        if (len <= 130) return 20;
        return 18;
    }

    calculateBrandFontSizeSmall(text) {
        const len = text.length;
        if (len <= 20) return 35;
        if (len <= 30) return 30;
        if (len <= 50) return 25;
        if (len <= 70) return 22;
        return 18;
    }

    calculateModelFontSizeSmall(text) {
        const len = text.length;
        if (len <= 20) return 35;
        if (len <= 30) return 30;
        if (len <= 50) return 24;
        if (len <= 70) return 20;
        if (len <= 90) return 18;
        if (len <= 120) return 16;
        return 14;
    }

    calculateKitFontSize(vars) {
        const kitLine = `FORKKIT: ${vars.FORKCODE} --- SHOCKKIT: ${vars.SHOCKCODE} --- COMBIKIT: ${vars.COMBICODE}`;
        const len = kitLine.length;
        if (len <= 40) return 28;
        if (len <= 60) return 26;
        if (len <= 80) return 24;
        if (len <= 100) return 22;
        if (len <= 120) return 20;
        return 18;
    }

    calculateNotesFontSize(text) {
        const len = text.length;
        if (len <= 80) return 26;
        if (len <= 120) return 24;
        if (len <= 160) return 22;
        if (len <= 200) return 20;
        if (len <= 250) return 18;
        return 16;
    }

    combineNotes(forkInfo, rearInfo) {
        const f = (forkInfo || '').toString().trim();
        const r = (rearInfo || '').toString().trim();

        if (f && r) return `F: ${f} / R: ${r}`;
        if (f) return `F: ${f}`;
        if (r) return `R: ${r}`;
        return '';
    }

    /**
     * Generate timestamp for filename
     * @returns {string} Formatted timestamp
     */
    static generateTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/[-:]/g, '')
            .replace('T', '_')
            .substring(0, 15);
    }

    /**
     * Download ZPL file
     * @param {string} content - ZPL content
     * @param {string} filename - Filename
     */
    static downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BatchZBLGenerator };
}
