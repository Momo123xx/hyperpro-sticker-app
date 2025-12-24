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
}
