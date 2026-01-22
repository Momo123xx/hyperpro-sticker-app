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

    // Calculate font sizes based on character count
    vars.BRAND_FONT_SIZE = this.calculateBrandFontSize(vars.BRAND_NAME);
    vars.MODEL_FONT_SIZE = this.calculateModelFontSize(vars.MODEL_TYPE);
    vars.KIT_FONT_SIZE = this.calculateKitFontSize(vars);

    // Calculate small font sizes for small stickers
    vars.BRAND_FONT_SIZE_SMALL = this.calculateBrandFontSizeSmall(vars.BRAND_NAME);
    vars.MODEL_FONT_SIZE_SMALL = this.calculateModelFontSizeSmall(vars.MODEL_TYPE);

    // Combine notes field
    vars.NOTES = this.combineNotes(rowData.P, rowData.V);
    vars.NOTES_FONT_SIZE = this.calculateNotesFontSize(vars.NOTES);

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
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'label.zbl';
    a.click();
    URL.revokeObjectURL(url);
  }

  updateTemplate(template) {
    this.template = template;
  }
}
