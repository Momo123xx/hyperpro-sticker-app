/**
 * Security Utilities Module
 * Provides XSS protection, ZPL injection prevention, validation, and utilities
 */

class SecurityUtils {
  // ============ XSS PROTECTION ============

  /**
   * Escape HTML entities to prevent XSS attacks
   * @param {string} str - String to escape
   * @returns {string} HTML-safe string
   */
  static escapeHtml(str) {
    if (str == null || str === undefined) {
      return '';
    }

    const text = String(str);
    const htmlEscapeMap = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[<>&"'/]/g, (char) => htmlEscapeMap[char]);
  }

  /**
   * Sanitize multiple fields in an object for HTML display
   * @param {Object} obj - Object containing fields to sanitize
   * @param {Array} fields - Array of field names to sanitize
   * @returns {Object} New object with sanitized fields
   */
  static sanitizeForDisplay(obj, fields) {
    const sanitized = { ...obj };
    fields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = this.escapeHtml(sanitized[field]);
      }
    });
    return sanitized;
  }

  // ============ ZPL INJECTION PROTECTION ============

  /**
   * Escape ZPL command characters to prevent ZPL injection
   * ZPL uses special characters: ^, ~, \, {, }
   * @param {string} str - String to escape
   * @returns {string} ZPL-safe string
   */
  static escapeZpl(str) {
    if (str == null || str === undefined) {
      return '';
    }

    const text = String(str);
    const zplEscapeMap = {
      '^': '\\^',
      '~': '\\~',
      '\\': '\\\\',
      '{': '\\{',
      '}': '\\}'
    };

    return text.replace(/[\^~\\{}]/g, (char) => zplEscapeMap[char]);
  }

  /**
   * Sanitize multiple fields in an object for ZPL output
   * @param {Object} obj - Object containing fields to sanitize
   * @param {Array} fields - Array of field names to sanitize
   * @returns {Object} New object with sanitized fields
   */
  static sanitizeForZpl(obj, fields) {
    const sanitized = { ...obj };
    fields.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = this.escapeZpl(sanitized[field]);
      }
    });
    return sanitized;
  }

  // ============ DATA VALIDATION ============

  /**
   * Validate row data has required fields
   * Required: At least one product code (C, D, or E) + Brand (F) + Model (G)
   * @param {Object} rowData - Product data to validate
   * @returns {Object} { valid: boolean, errors: Array }
   */
  static validateRowData(rowData) {
    const errors = [];

    if (!rowData || typeof rowData !== 'object') {
      return { valid: false, errors: ['Row data is missing or invalid'] };
    }

    // Check for at least one product code
    const hasProductCode = rowData.C || rowData.D || rowData.E;
    if (!hasProductCode) {
      errors.push('Missing product code (requires at least one of: Fork Code, Shock Code, or Combi Code)');
    }

    // Check for brand name
    const brandName = (rowData.F || '').toString().trim();
    if (!brandName) {
      errors.push('Missing brand name (F)');
    }

    // Check for model type
    const modelType = (rowData.G || '').toString().trim();
    if (!modelType) {
      errors.push('Missing model type (G)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate kit type
   * @param {string} kitType - Kit type to validate
   * @returns {boolean} True if valid
   */
  static validateKitType(kitType) {
    const validTypes = ['fork', 'shock', 'combi'];
    return validTypes.includes(kitType);
  }

  /**
   * Validate and clamp quantity to safe range
   * @param {number} quantity - Quantity to validate
   * @returns {Object} { valid: boolean, clamped: number, warning: string }
   */
  static validateQuantity(quantity) {
    const MIN_QTY = 1;
    const MAX_QTY = 99;

    // Handle non-numeric values
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      return {
        valid: false,
        clamped: MIN_QTY,
        warning: `Invalid quantity "${quantity}", using default: ${MIN_QTY}`
      };
    }

    // Clamp to valid range
    let clamped = Math.floor(quantity);
    let warning = null;

    if (clamped < MIN_QTY) {
      clamped = MIN_QTY;
      warning = `Quantity ${quantity} below minimum, clamped to ${MIN_QTY}`;
    } else if (clamped > MAX_QTY) {
      clamped = MAX_QTY;
      warning = `Quantity ${quantity} above maximum, clamped to ${MAX_QTY}`;
    }

    return {
      valid: clamped === quantity,
      clamped,
      warning
    };
  }

  // ============ UTILITIES ============

  /**
   * Deep clone an object to prevent mutation issues
   * @param {*} obj - Object to clone
   * @returns {*} Deep cloned object
   */
  static deepClone(obj) {
    // Handle null and undefined
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitives
    if (typeof obj !== 'object') {
      return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    // Handle Array
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    // Handle Object
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Format validation errors for display
   * @param {Array} errors - Array of error messages
   * @returns {string} Formatted error message
   */
  static formatValidationErrors(errors) {
    if (!errors || errors.length === 0) {
      return '';
    }
    return errors.join('; ');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecurityUtils };
}
