# Development Guide

This guide covers setting up the development environment and working with the Hyperpro Sticker Generator codebase.

## Prerequisites

### Install Bun

Bun is a fast JavaScript runtime that we use for the development server. Install it with:

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify installation:

```bash
bun --version
```

You should see version 1.0.0 or higher.

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd Sticker-app
```

2. Install dependencies:

```bash
bun install
```

This will:
- Install the XLSX library from npm
- Copy `xlsx.full.min.js` to the `vendor/` directory
- Validate that required directories exist

3. Start the development server:

```bash
bun run dev
```

4. Open your browser to http://localhost:3000

The browser should open automatically. If not, manually navigate to http://localhost:3000.

## Development Workflow

### Hot Reload

The development server watches for file changes and automatically reloads your browser when you edit:

- HTML files (`.html`)
- CSS files (`.css`)
- JavaScript files (`.js`)
- Template files (`.txt`)
- JSON files (`.json`)

Binary files like Excel spreadsheets (`.xlsx`) do not trigger reloads.

### Making Changes

1. Edit any file in the project
2. Save the file
3. Browser automatically refreshes
4. Check the browser console for any errors

### Development Server Features

- **Port**: Runs on port 3000 by default
- **Hot reload**: WebSocket-based live reload
- **CORS enabled**: For fetch requests
- **Static file serving**: All project files served correctly
- **Auto-open browser**: Opens automatically on startup
- **Pretty logging**: Clear console messages

## Project Structure

```
Sticker-app/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── app.js              # Main application logic
│   ├── excel-parser.js     # Excel file parsing
│   ├── search.js           # Search functionality
│   ├── cart.js             # Shopping cart system
│   ├── zbl-generator.js    # ZBL file generation
│   └── batch-generator.js  # Batch processing
├── templates/
│   ├── zbl-dynamic.txt     # Dynamic label template
│   ├── zbl-fixed.txt       # Fixed label template
│   └── zbl-header.txt      # ZBL header template
├── data/
│   └── manual-info.xlsx    # Product database
├── vendor/
│   └── xlsx.full.min.js    # XLSX library (generated)
├── scripts/
│   ├── setup.js            # Post-install setup
│   ├── dev-server.js       # Development server
│   └── build.js            # Build validation
├── Docs/
│   ├── DEVELOPMENT.md      # This file
│   ├── ZBL_FORMAT.md       # ZBL format documentation
│   └── ...                 # Other documentation
└── package.json            # Bun project configuration
```

## Common Tasks

### Update Products

Edit the Excel file at `data/manual-info.xlsx`:

1. Open in Excel or LibreOffice
2. Add/modify product rows
3. Save the file
4. Refresh the application
5. Test search functionality

### Modify Label Templates

Edit template files in `templates/`:

- `zbl-dynamic.txt` - Dynamic label template with placeholders
- `zbl-fixed.txt` - Fixed label template
- `zbl-header.txt` - ZBL file header

Template format uses double curly braces for variables: `{{PRODUCT_CODE}}`

See `Docs/ZBL_FORMAT.md` for more details on the ZBL template syntax.

### Style Changes

Edit `css/styles.css`:

1. Make your CSS changes
2. Save the file
3. Browser automatically refreshes
4. Verify changes in browser

### JavaScript Changes

Edit files in `js/`:

1. Make your code changes
2. Save the file
3. Browser automatically refreshes
4. Check browser console for errors

## Scripts

### `bun run dev`

Starts the development server with hot reload.

- Opens browser automatically
- Watches for file changes
- Serves files on http://localhost:3000
- Press Ctrl+C to stop

### `bun run build`

Validates the project before deployment.

Checks:
- All required files exist
- Vendor XLSX library is present
- Templates directory has files
- File sizes are reasonable
- No debugger statements in code

Run this before deploying to production.

### `bun run setup`

Runs the post-install setup script.

- Creates vendor directory
- Copies XLSX library from node_modules
- Validates data and templates directories

This runs automatically after `bun install`.

## Deployment

### Pre-Deployment Checklist

1. Run validation:

```bash
bun run build
```

2. Verify all checks pass
3. Test the application thoroughly
4. Ensure `vendor/xlsx.full.min.js` exists

### Deploy to Production

The application is a static site - no build process needed!

1. Copy all files to your deployment target:
   - `index.html`
   - `css/` directory
   - `js/` directory
   - `templates/` directory
   - `data/` directory
   - `vendor/` directory (with `xlsx.full.min.js`)

2. Upload to your web server or static hosting service

3. Test on production URL

### Deployment Options

- Company web server
- GitHub Pages
- Netlify
- Vercel
- Any static file hosting

No special server configuration needed - just serve the files!

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can change it:

```bash
PORT=3001 bun run dev
```

### Vendor XLSX Missing

If `vendor/xlsx.full.min.js` is missing:

```bash
bun run setup
```

### Hot Reload Not Working

1. Check browser console for WebSocket errors
2. Ensure dev server is running
3. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Restart the dev server

### Excel File Not Loading

1. Verify `data/manual-info.xlsx` exists
2. Check browser console for errors
3. Ensure XLSX library loaded (check Network tab)
4. Verify file permissions

## Code Style

### JavaScript

- Use modern ES6+ syntax
- Use `const` and `let`, not `var`
- Use template literals for strings
- Keep functions focused and small
- Add comments for complex logic

### CSS

- Use semantic class names
- Keep specificity low
- Mobile-first responsive design
- Use CSS variables for colors/spacing

### HTML

- Use semantic HTML5 elements
- Keep structure clean and simple
- Use data attributes for JS hooks

## Testing

### Manual Testing Checklist

After making changes, test:

1. **Search functionality**
   - Enter product code
   - Verify results appear
   - Select a product
   - Check details preview

2. **Cart operations**
   - Add items to cart
   - Modify quantities
   - Remove items
   - Clear cart

3. **ZBL generation**
   - Generate single sticker
   - Verify .zbl file downloads
   - Check file contents

4. **Bulk paste**
   - Paste tab-separated values
   - Verify processing
   - Check cart updates

5. **Batch generation**
   - Generate batch from cart
   - Verify multi-label file
   - Check file format

## Getting Help

- Check existing documentation in `Docs/`
- Review code comments
- Check browser console for errors
- Verify network requests in DevTools

## Contributing

When making changes:

1. Test thoroughly in development
2. Run `bun run build` to validate
3. Update documentation if needed
4. Commit with clear messages
5. Test deployment process

## Notes

- The application uses vanilla JavaScript (no frameworks)
- No build/transpilation process
- Designed for simplicity and maintainability
- Easy to understand for future developers

## Future Enhancements

Possible improvements:

- TypeScript type definitions (types only, no compilation)
- CSS minification for production
- Source maps for debugging
- Performance monitoring
- Automated tests

Keep the core philosophy: simple, static, no complex build process.
