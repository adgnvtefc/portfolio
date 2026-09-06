# Portfolio designs

`index.html` is the portfolio and the only source of truth for its content.

With no query parameter, the browser renders that file with its default styles.
There is no plain-theme stylesheet. If JavaScript fails or the entire
`portfolio_designs` directory is removed, the portfolio content still works.

The files here are optional:

- `config.js` lists the available designs and their default visibility.
- `load.js` loads a requested design and creates the design bar.
- `editorial.css` is the editorial design.

Without them, `/` remains the complete plain-HTML portfolio. The editorial view
is available at `/?design=editorial-index`.

On a local preview, use **manage designs** in the design bar to choose which
options appear. The selection is saved in that browser. The manager can also
copy a viewer link that carries the chosen options to somebody else.

## Adding a design

1. Add a CSS file to this directory.
2. Add its name, label, path, and default visibility to `config.js`.

Designs may change presentation, but must never contain another copy of the
portfolio content.
