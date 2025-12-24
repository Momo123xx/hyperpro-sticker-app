class ExcelParser {
  constructor() {
    this.workbook = null;
    this.data = [];
  }

  async loadExcelFile(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load Excel file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      this.parseData();
      return true;
    } catch (error) {
      console.error('Error loading Excel file:', error);
      throw error;
    }
  }

  parseData() {
    if (!this.workbook) {
      throw new Error('No workbook loaded');
    }

    const sheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (jsonData.length < 2) {
      throw new Error('Excel file is empty or has no data rows');
    }

    // Convert to objects with column letters as keys
    const headers = jsonData[0];
    this.data = jsonData.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        const columnLetter = this.getColumnLetter(index);
        obj[columnLetter] = row[index] !== undefined && row[index] !== null ? row[index] : '';
      });
      return obj;
    });

    console.log(`Loaded ${this.data.length} rows from Excel file`);
  }

  getColumnLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  getData() {
    return this.data;
  }

  getRowCount() {
    return this.data.length;
  }
}
