# Portfolio designs

`index.html` is the portfolio and the only source of truth for its content.

With no query parameter, the browser renders that file with its default styles.
There is no plain-theme stylesheet. If JavaScript fails or the entire
`portfolio_designs` directory is removed, the portfolio content still works.

The files here are optional:

- `load.js` loads a requested design from the URL.
- `editorial.css` is the editorial design.

Without them, `/` remains the complete plain-HTML portfolio. The editorial view
is available at `/?design=editorial-index`.

## Adding a design

1. Add a CSS file to this directory.
2. Add its name and path to `load.js`.
3. Add an ordinary link in the design picker in `index.html`.

Designs may change presentation, but must never contain another copy of the
portfolio content.
