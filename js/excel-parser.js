class ExcelParser {
  constructor() {
    this.workbook = null;
    this.data = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // milliseconds
  }

  async loadExcelFile(url, retryCount = 0) {
    try {
      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
      }

      // Get array buffer
      const arrayBuffer = await response.arrayBuffer();

      // Validate array buffer before XLSX.read()
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Excel file is empty or invalid (0 bytes)');
      }

      if (arrayBuffer.byteLength < 100) {
        throw new Error(`Excel file is too small (${arrayBuffer.byteLength} bytes), possibly corrupted`);
      }

      console.log(`Excel file loaded: ${arrayBuffer.byteLength} bytes`);

      // Try to read the Excel file with XLSX
      try {
        this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } catch (xlsxError) {
        // Log detailed XLSX error
        ErrorHandler.logError(xlsxError, 'ExcelParser.XLSX.read', {
          category: 'XLSX_ERROR',
          arrayBufferSize: arrayBuffer.byteLength,
          fileUrl: url,
          userMessage: 'Failed to parse Excel file. The file may be corrupted or use an unsupported format.',
          xlsxErrorName: xlsxError.name,
          xlsxErrorMessage: xlsxError.message
        });
        throw xlsxError;
      }

      // Validate workbook structure
      if (!this.workbook) {
        throw new Error('XLSX.read returned null or undefined workbook');
      }

      if (!this.workbook.SheetNames || this.workbook.SheetNames.length === 0) {
        throw new Error('Excel file has no sheets');
      }

      console.log(`Excel workbook loaded with ${this.workbook.SheetNames.length} sheet(s)`);

      // Parse the data
      this.parseData();
      return true;
    } catch (error) {
      // Check if we should retry
      if (retryCount < this.maxRetries) {
        console.warn(`Excel load failed (attempt ${retryCount + 1}/${this.maxRetries}), retrying in ${this.retryDelay}ms...`);

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));

        // Exponential backoff
        this.retryDelay *= 2;

        return this.loadExcelFile(url, retryCount + 1);
      }

      // Max retries reached, log error and throw
      ErrorHandler.logError(error, 'ExcelParser.loadExcelFile', {
        category: 'XLSX_ERROR',
        fileUrl: url,
        retryCount,
        userMessage: 'Failed to load Excel file after multiple attempts. Please check the file and try again.'
      });

      throw error;
    }
  }

  parseData() {
    try {
      if (!this.workbook) {
        throw new Error('No workbook loaded');
      }

      if (!this.workbook.SheetNames || this.workbook.SheetNames.length === 0) {
        throw new Error('Workbook has no sheets');
      }

      const sheetName = this.workbook.SheetNames[0];
      const sheet = this.workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook`);
      }

      // Convert sheet to JSON
      let jsonData;
      try {
        jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      } catch (conversionError) {
        ErrorHandler.logError(conversionError, 'ExcelParser.sheet_to_json', {
          category: 'XLSX_ERROR',
          sheetName,
          userMessage: 'Failed to convert Excel sheet to data format.'
        });
        throw conversionError;
      }

      if (!jsonData || jsonData.length < 2) {
        throw new Error('Excel file is empty or has no data rows (needs at least header + 1 data row)');
      }

      // Convert to objects with column letters as keys
      const headers = jsonData[0];
      if (!headers || headers.length === 0) {
        throw new Error('Excel file has no header row');
      }

      this.data = jsonData.slice(1).map((row, rowIndex) => {
        const obj = {};
        headers.forEach((header, index) => {
          const columnLetter = this.getColumnLetter(index);
          obj[columnLetter] = row[index] !== undefined && row[index] !== null ? row[index] : '';
        });
        return obj;
      });

      console.log(`✅ Loaded ${this.data.length} rows from Excel file (sheet: ${sheetName})`);

      if (this.data.length === 0) {
        console.warn('⚠️ Excel file has headers but no data rows');
      }
    } catch (error) {
      ErrorHandler.logError(error, 'ExcelParser.parseData', {
        category: 'XLSX_ERROR',
        userMessage: 'Failed to parse Excel data. Please check the file format.'
      });
      throw error;
    }
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
