class ProductSearch {
  constructor(data) {
    this.data = data;
  }

  search(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();

    const results = this.data.filter(row => {
      // Search in columns C, D, E (product codes)
      const cValue = (row.C || '').toString().toLowerCase();
      const dValue = (row.D || '').toString().toLowerCase();
      const eValue = (row.E || '').toString().toLowerCase();

      return cValue.includes(lowerQuery) ||
             dValue.includes(lowerQuery) ||
             eValue.includes(lowerQuery);
    });

    // Limit results to 50 for performance
    return results.slice(0, 50);
  }

  updateData(data) {
    this.data = data;
  }

  getDataSize() {
    return this.data.length;
  }

  /**
   * Search for exact product code match
   * @param {string} query - Product code to search for
   * @returns {Object|null} { match: rowData, kitType: 'fork'|'shock'|'combi' } or null
   */
  searchExact(query) {
    if (!query || query.trim().length === 0) return null;

    const normalized = query.trim().toUpperCase();

    // Search for exact match in each column
    for (const row of this.data) {
      // Column C = Fork kit
      if ((row.C || '').toString().toUpperCase() === normalized) {
        return { match: row, kitType: 'fork' };
      }
      // Column D = Shock kit
      if ((row.D || '').toString().toUpperCase() === normalized) {
        return { match: row, kitType: 'shock' };
      }
      // Column E = Combi kit
      if ((row.E || '').toString().toUpperCase() === normalized) {
        return { match: row, kitType: 'combi' };
      }
    }

    return null; // No exact match found
  }
}
