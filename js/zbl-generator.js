class ZBLGenerator {
  constructor(template) {
    this.template = template;
  }

  generate(rowData) {
    // Prepare all variables
    const variables = this.prepareVariables(rowData);

    // Replace placeholders in template
    let zblContent = this.template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      zblContent = zblContent.replace(regex, value);
    });

    return zblContent;
  }

  prepareVariables(rowData) {
    // Prepare raw variables (before sanitization)
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

    // Combine notes field BEFORE sanitization
    vars.NOTES = this.combineNotes(rowData.P, rowData.V);

    // CRITICAL: Calculate font sizes BEFORE sanitization
    // (escaping characters changes string length)
    vars.BRAND_FONT_SIZE = this.calculateBrandFontSize(vars.BRAND_NAME);
    vars.MODEL_FONT_SIZE = this.calculateModelFontSize(vars.MODEL_TYPE);
    vars.KIT_FONT_SIZE = this.calculateKitFontSize(vars);
    vars.BRAND_FONT_SIZE_SMALL = this.calculateBrandFontSizeSmall(vars.BRAND_NAME);
    vars.MODEL_FONT_SIZE_SMALL = this.calculateModelFontSizeSmall(vars.MODEL_TYPE);
    vars.NOTES_FONT_SIZE = this.calculateNotesFontSize(vars.NOTES);

    // Sanitize all text fields for ZPL injection protection
    const textFields = [
      'BRAND_NAME', 'MODEL_TYPE', 'YEAR', 'FORK_SPRING', 'SHOCK_SPRING',
      'FORKCODE', 'SHOCKCODE', 'COMBICODE', 'OIL_TYPE', 'OIL_LEVEL',
      'FORK_PRELOAD', 'SHOCK_PRELOAD', 'FORK_SAG', 'SHOCK_SAG',
      'FORK_COMPRESSION', 'SHOCK_COMPRESSION', 'NOTES'
    ];

    textFields.forEach(field => {
      if (vars[field]) {
        vars[field] = SecurityUtils.escapeZpl(vars[field]);
      }
    });

    return vars;
  }

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

  downloadZBL(content, filename) {
    try {
      // Validate inputs
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content for download: content must be a non-empty string');
      }

      const finalFilename = filename || 'label.zbl';

      // Create blob
      let blob;
      try {
        blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      } catch (blobError) {
        throw new Error(`Failed to create Blob: ${blobError.message}`);
      }

      // Create object URL
      let url;
      try {
        url = URL.createObjectURL(blob);
      } catch (urlError) {
        throw new Error(`Failed to create object URL: ${urlError.message}`);
      }

      // Create and trigger download
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        a.click();
      } catch (downloadError) {
        throw new Error(`Failed to trigger download: ${downloadError.message}`);
      } finally {
        // Always clean up the URL
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch (revokeError) {
            console.warn('Failed to revoke object URL:', revokeError);
          }
        }
      }

      console.log(`✅ File downloaded: ${finalFilename} (${content.length} bytes)`);
    } catch (error) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.logError(error, 'ZBLGenerator.downloadZBL', {
          category: 'DOWNLOAD_ERROR',
          filename: filename || 'label.zbl',
          contentLength: content ? content.length : 0,
          userMessage: `Failed to download file. Please try again.`
        });
      } else {
        console.error('Download error:', error);
      }
      throw error;
    }
  }

  updateTemplate(template) {
    this.template = template;
  }
}
