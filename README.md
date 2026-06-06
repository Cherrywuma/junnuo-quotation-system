# JUNNUO Commercial Kitchen Equipment Quotation

Static GitHub Pages quotation system for JUNNUO commercial kitchen equipment.

## Scope

- English-only quotation interface and print output.
- Product data is cleaned from the provided Excel files.
- No product selling values, source quotation values, cost fields, or currency-specific value fields are stored in the product library.
- Unit Price is always entered manually by the user in the browser.

## Local Test

Open `index.html` in a browser, or run a simple local static server from this folder:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Automated Checks

```powershell
node tests/system.test.js
```

## GitHub Pages Deployment

1. Push this folder to a GitHub repository.
2. In GitHub, open Settings.
3. Open Pages.
4. Select the branch that contains `index.html`.
5. Use the repository root as the publishing folder.
6. Save and wait for the GitHub Pages URL to become available.
