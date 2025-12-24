# Hyperpro Sticker App Implementation Plan

## Problem Statement

Hyperpro needs a replacement for their end-of-life internal sticker generation application. The new web app must read product data from a bundled Excel file (MANUAL INFO), allow users to search for products by code, preview the data, and generate downloadable Zebra label files (.zbl) based on the ZBL_DYNAMIC_0.5.zpl template.

## Objectives

1. Build a simple, maintainable web application requiring no authentication
2. Enable fast product lookup across multiple code columns (C, D, E)
3. Display comprehensive data preview before label generation
4. Generate properly formatted .zbl files with all variable substitutions
5. Ensure reliable handling of missing data with appropriate defaults

## Technical Approach

### Architecture Decision

**Chosen Stack: Static HTML + Vanilla JavaScript + Minimal Dependencies**

Rationale:
- No backend required - all processing happens client-side
- Minimal deployment complexity - can be hosted on any static server
- Fast performance with no network calls after initial load
- Easy maintenance with minimal dependencies

### Core Technologies

1. **HTML5** - Structure and layout
2. **Vanilla JavaScript (ES6+)** - Application logic
3. **SheetJS (xlsx)** - Client-side Excel parsing
4. **CSS3** - Styling with responsive design
5. **No build process initially** - Direct browser execution

### File Structure

All files will be organized in a new `hyperpro-sticker-app/` directory:

```
hyperpro-sticker-app/
├── index.html              # Main application page
├── css/
│   └── styles.css         # Application styles
├── js/
│   ├── app.js            # Main application logic
│   ├── excel-parser.js   # Excel file handling
│   ├── zbl-generator.js  # ZBL file generation
│   └── search.js         # Search functionality
├── data/
│   └── manual-info.xlsx  # Bundled Excel data
├── templates/
│   └── zbl-dynamic.txt   # ZBL template (converted from .zpl)
└── README.md             # Documentation
```

## Implementation Steps

### Step 1: Project Setup

1. Create main project directory `hyperpro-sticker-app/` in the current working directory
2. Create subdirectory structure: `css/`, `js/`, `data/`, `templates/`
3. Set up basic HTML skeleton with semantic structure in `hyperpro-sticker-app/index.html`
4. Include SheetJS library via CDN or local copy
5. Create responsive CSS layout in `hyperpro-sticker-app/css/styles.css`

### Step 2: Excel Data Loading

```javascript
// excel-parser.js
class ExcelParser {
  constructor() {
    this.workbook = null;
    this.data = [];
  }

  async loadExcelFile(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
    this.parseData();
  }

  parseData() {
    const sheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Convert to objects with column letters as keys
    const headers = jsonData[0];
    this.data = jsonData.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        const columnLetter = this.getColumnLetter(index);
        obj[columnLetter] = row[index] || '';
      });
      return obj;
    });
  }

  getColumnLetter(index) {
    return String.fromCharCode(65 + index); // A=0, B=1, etc.
  }
}
```

### Step 3: Search Implementation

```javascript
// search.js
class ProductSearch {
  constructor(data) {
    this.data = data;
  }

  search(query) {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    return this.data.filter(row => {
      // Search in columns C, D, E
      const cValue = (row.C || '').toString().toLowerCase();
      const dValue = (row.D || '').toString().toLowerCase();
      const eValue = (row.E || '').toString().toLowerCase();

      return cValue.includes(lowerQuery) ||
             dValue.includes(lowerQuery) ||
             eValue.includes(lowerQuery);
    });
  }
}
```

### Step 4: Data Preview Table

```javascript
// app.js - Preview functionality
function displayPreview(rowData) {
  const previewData = {
    'Brand Name': rowData.F || 'N/A',
    'Model Type': rowData.G || 'N/A',
    'Year': rowData.H || 'N/A',
    'Fork Spring': rowData.I || 'N/A',
    'Shock Spring': rowData.Q || 'N/A',
    'Fork Code': rowData.C || 'NONE',
    'Shock Code': rowData.D || 'NONE',
    'Combi Code': rowData.C || 'NONE', // Assuming same as Fork Code
    'Oil Type': rowData.J || 'N/A',
    'Oil Level': rowData.K || 'N/A',
    'Fork Preload': rowData.L || 'N/A',
    'Fork Sag': rowData.M || 'N/A',
    'Fork Compression': rowData.N || 'N/A',
    'Fork Extra Info': rowData.P || '',
    'Shock Preload': rowData.R || 'N/A', // Column R assumed
    'Shock Sag': rowData.S || 'N/A',
    'Shock Compression': rowData.T || 'N/A',
    'Rear Extra Info': rowData.V || ''
  };

  // Build HTML table
  const table = document.getElementById('preview-table');
  table.innerHTML = Object.entries(previewData)
    .map(([key, value]) => `
      <tr>
        <td class="label">${key}:</td>
        <td class="value">${value}</td>
      </tr>
    `).join('');

  return previewData;
}
```

### Step 5: ZBL Generation

```javascript
// zbl-generator.js
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
      COMBICODE: rowData.C || 'NONE',
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
    const f = forkInfo || '';
    const r = rearInfo || '';

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
}
```

### Step 6: Main Application Integration

```javascript
// app.js - Main application
let excelParser;
let productSearch;
let zblGenerator;
let currentRowData;

async function initializeApp() {
  // Load Excel data
  excelParser = new ExcelParser();
  await excelParser.loadExcelFile('./data/manual-info.xlsx');

  // Initialize search
  productSearch = new ProductSearch(excelParser.data);

  // Load ZBL template
  const templateResponse = await fetch('./templates/zbl-dynamic.txt');
  const templateText = await templateResponse.text();
  zblGenerator = new ZBLGenerator(templateText);

  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const generateBtn = document.getElementById('generate-btn');

  // Search functionality with debouncing
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const results = productSearch.search(e.target.value);
      displaySearchResults(results);
    }, 300);
  });

  // Generate button
  generateBtn.addEventListener('click', () => {
    if (currentRowData) {
      const zblContent = zblGenerator.generate(currentRowData);
      const filename = `label-${currentRowData.C || 'unknown'}-${Date.now()}.zbl`;
      zblGenerator.downloadZBL(zblContent, filename);
    }
  });
}

function displaySearchResults(results) {
  const container = document.getElementById('search-results');

  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No products found</div>';
    return;
  }

  container.innerHTML = results.map(row => `
    <div class="result-item" data-row='${JSON.stringify(row)}'>
      <strong>${row.C || 'N/A'}</strong> -
      ${row.F || 'N/A'} ${row.G || 'N/A'}
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      currentRowData = JSON.parse(item.dataset.row);
      displayPreview(currentRowData);
      document.getElementById('preview-section').style.display = 'block';
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeApp);
```

### Step 7: HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hyperpro Sticker Generator</title>
  <link rel="stylesheet" href="css/styles.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</head>
<body>
  <div class="container">
    <header>
      <h1>Hyperpro Sticker Generator</h1>
    </header>

    <main>
      <section id="search-section">
        <h2>Search Product</h2>
        <input type="text" id="search-input" placeholder="Enter product code...">
        <div id="search-results"></div>
      </section>

      <section id="preview-section" style="display: none;">
        <h2>Preview Data</h2>
        <table id="preview-table"></table>
        <button id="generate-btn" class="btn-primary">Generate Sticker (.zbl)</button>
      </section>
    </main>
  </div>

  <script src="js/excel-parser.js"></script>
  <script src="js/search.js"></script>
  <script src="js/zbl-generator.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

## Potential Challenges and Solutions

### Challenge 1: Large Excel Files
**Problem:** Loading large Excel files may cause performance issues
**Solution:**
- Implement lazy loading with pagination
- Consider preprocessing Excel to JSON for faster loading
- Show loading indicator during initial data load

### Challenge 2: Browser Compatibility
**Problem:** SheetJS may have issues in older browsers
**Solution:**
- Include polyfills for older browsers
- Provide fallback error messages
- Test across major browsers (Chrome, Firefox, Safari, Edge)

### Challenge 3: Missing Column Mappings
**Problem:** Some columns (like Shock Preload) aren't clearly mapped
**Solution:**
- Work with stakeholders to confirm all column mappings
- Provide configuration file for easy column mapping updates
- Add validation to ensure all required columns exist

### Challenge 4: Special Characters in ZPL
**Problem:** Special characters may not render correctly in ZPL
**Solution:**
- Implement character sanitization
- Test with various special characters
- Use ZPL's UTF-8 encoding directives (^CI28)

## Testing Strategy

### 1. Unit Tests
- Test font size calculations with various string lengths
- Test notes combination logic
- Test search functionality across columns
- Test data defaulting for missing values

### 2. Integration Tests
- Test Excel file parsing with sample data
- Test end-to-end flow from search to download
- Test ZBL generation with all variable substitutions

### 3. User Acceptance Testing
- Test with real MANUAL INFO file
- Verify generated labels print correctly on Zebra printer
- Test edge cases (very long text, missing data, special characters)
- Validate search results accuracy

### 4. Performance Testing
- Measure search response time with full dataset
- Test with Excel files of varying sizes
- Ensure smooth UI interactions

## Success Criteria

1. **Search Performance:** Results appear within 500ms of typing
2. **Data Accuracy:** 100% accurate mapping from Excel to ZBL variables
3. **File Generation:** Valid .zbl files that print correctly on Zebra printers
4. **User Experience:** Clear, intuitive interface requiring no training
5. **Reliability:** Handles missing data gracefully with appropriate defaults
6. **Browser Support:** Works on Chrome, Firefox, Safari, Edge (latest 2 versions)
7. **Load Time:** Initial app load under 3 seconds on standard connection

## Deployment Considerations

### Hosting Options
1. **GitHub Pages** - Free, simple deployment for static sites
2. **Netlify/Vercel** - Easy CI/CD integration
3. **Company Web Server** - If internal hosting required
4. **Electron App** - If desktop application preferred later

### Update Process
1. Replace `manual-info.xlsx` with new version
2. Test with sample searches
3. Deploy updated files
4. No database migrations or backend updates needed

## Future Enhancements

1. **Second Template Support**
   - Add template selection dropdown
   - Load multiple template files

2. **Excel Upload Feature**
   - Allow users to upload new MANUAL INFO files
   - Store in browser localStorage or IndexedDB

3. **Visual Preview**
   - Render actual label preview using Canvas/SVG
   - Show exact label dimensions and layout

4. **Batch Generation**
   - Select multiple products
   - Generate ZIP file with multiple labels

5. **Export History**
   - Track generated labels
   - Re-generate previous labels

## Maintenance Notes

- Keep Excel column mappings in a separate config file for easy updates
- Document any changes to ZPL template format
- Maintain backward compatibility when updating
- Regular testing with actual Zebra printers recommended
- Consider adding error logging/analytics for production issues