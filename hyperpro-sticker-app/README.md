# Hyperpro Sticker Generator

A client-side web application for generating Zebra label files (.zbl) from product data.

## Overview

This application allows Hyperpro staff to search for products from an Excel database and generate downloadable ZBL files for printing stickers on Zebra printers. All processing happens client-side, requiring no backend infrastructure.

## Features

- **Fast Product Search**: Search across multiple product code columns (C, D, E)
- **Data Preview**: View comprehensive product information before generating labels
- **ZBL Generation**: Create properly formatted Zebra label files with variable substitution
- **Dynamic Font Sizing**: Automatically adjusts font sizes based on text length
- **Client-Side Processing**: No server required, works offline after initial load
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

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
│   └── manual-info.xlsx  # Product database (to be added)
├── templates/
│   └── zbl-dynamic.txt   # ZBL template (to be added)
└── README.md             # This file
```

## Setup Instructions

### 1. Add Required Files

Place the following files in the appropriate directories:

- **Product Database**: Copy `MANUAL INFO.xlsx` to `data/manual-info.xlsx`
- **ZBL Template**: Copy `ZBL_DYNAMIC_0.5.zpl` to `templates/zbl-dynamic.txt`

### 2. Host the Application

Since this is a static web application, you can host it using any of these methods:

#### Option A: Local Development Server

Using Python (Python 3):
```bash
cd hyperpro-sticker-app
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

#### Option B: Static Hosting Services

- **GitHub Pages**: Push to GitHub and enable Pages
- **Netlify**: Drag and drop the folder to Netlify
- **Vercel**: Deploy via CLI or web interface
- **Internal Web Server**: Copy files to your company's web server

### 3. Browser Requirements

Supported browsers (latest 2 versions):
- Google Chrome
- Mozilla Firefox
- Safari
- Microsoft Edge

## Usage

### Searching for Products

1. Type a product code in the search box
2. Results appear automatically as you type (minimum 2 characters)
3. Click on a result to view full details

### Generating Stickers

1. After selecting a product, review the preview data
2. Click "Generate Sticker (.zbl)" button
3. The ZBL file downloads automatically
4. Transfer the file to your Zebra printer or print management system

## Column Mappings

The application reads data from the following Excel columns:

| Field | Column | Description |
|-------|--------|-------------|
| Fork Code | C | Fork kit product code |
| Shock Code | D | Shock kit product code |
| Combi Code | E | Combination kit product code |
| Brand Name | F | Motorcycle brand |
| Model Type | G | Motorcycle model |
| Year | H | Model year |
| Fork Spring | I | Fork spring specification |
| Oil Type | J | Recommended oil type |
| Oil Level | K | Oil level specification |
| Fork Preload | L | Fork preload setting |
| Fork Sag | M | Fork sag measurement |
| Fork Compression | N | Fork compression setting |
| Fork Extra Info | P | Additional fork notes |
| Shock Spring | Q | Shock spring specification |
| Shock Preload | R | Shock preload setting |
| Shock Sag | S | Shock sag measurement |
| Shock Compression | T | Shock compression setting |
| Rear Extra Info | V | Additional shock notes |

## ZBL Template Variables

The following variables are replaced in the ZBL template:

- `{BRAND_NAME}`, `{MODEL_TYPE}`, `{YEAR}`
- `{FORK_SPRING}`, `{SHOCK_SPRING}`
- `{FORKCODE}`, `{SHOCKCODE}`, `{COMBICODE}`
- `{OIL_TYPE}`, `{OIL_LEVEL}`
- `{FORK_PRELOAD}`, `{SHOCK_PRELOAD}`
- `{FORK_SAG}`, `{SHOCK_SAG}`
- `{FORK_COMPRESSION}`, `{SHOCK_COMPRESSION}`
- `{BRAND_FONT_SIZE}`, `{MODEL_FONT_SIZE}`, `{KIT_FONT_SIZE}`, `{NOTES_FONT_SIZE}`
- `{NOTES}` (combined fork and rear extra info)

## Font Size Calculation

Font sizes are automatically calculated based on text length:

- **Brand Name**: 50pt (≤25 chars) down to 25pt (>80 chars)
- **Model Type**: 50pt (≤25 chars) down to 18pt (>130 chars)
- **Kit Line**: 28pt (≤40 chars) down to 18pt (>120 chars)
- **Notes**: 26pt (≤80 chars) down to 16pt (>250 chars)

## Troubleshooting

### "Failed to load Excel file" Error

- Verify `manual-info.xlsx` exists in the `data/` directory
- Check that the file is a valid Excel file (.xlsx format)
- Ensure proper CORS headers if hosting on a web server

### "Failed to load ZBL template" Error

- Verify `zbl-dynamic.txt` exists in the `templates/` directory
- Check that the template contains the correct variable placeholders

### Search Returns No Results

- Ensure you're typing at least 2 characters
- Verify the Excel file contains data in columns C, D, or E
- Check browser console for JavaScript errors

### Generated ZBL File Won't Print

- Verify the template file is valid ZPL format
- Test the template with a simple manual substitution
- Check that all variable placeholders are present in the template

## Updating Product Data

To update the product database:

1. Replace `data/manual-info.xlsx` with the new file
2. Refresh the browser page
3. The application automatically loads the new data

No code changes required.

## Updating the ZBL Template

To modify the label format:

1. Edit `templates/zbl-dynamic.txt`
2. Use `{VARIABLE_NAME}` syntax for placeholders
3. Test with a sample product
4. Refresh the browser page

## Technical Details

### Dependencies

- **SheetJS (xlsx.js)**: Client-side Excel parsing
  - Loaded via CDN: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js

### Architecture

- Pure vanilla JavaScript (ES6+)
- No build process or bundler required
- All processing happens in the browser
- No external API calls after initial load

### Performance

- Search results limited to 50 items
- 300ms debounce on search input
- Optimized for files with thousands of product rows

## Security Notes

- No authentication required (internal use only)
- No data transmitted to external servers
- All processing happens locally in the browser
- Excel file and template stored on trusted hosting

## Future Enhancements

Potential improvements for future versions:

1. **Multiple Template Support**: Select between different label formats
2. **Excel Upload**: Allow users to upload new product files
3. **Visual Label Preview**: Show label appearance before generating
4. **Batch Generation**: Generate multiple labels at once
5. **Export History**: Track previously generated labels

## Support

For technical issues or questions, contact your IT department or the application maintainer.

## License

Internal use only. © 2025 Hyperpro.
