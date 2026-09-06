# Portfolio designs

`index.html` is the portfolio and the only source of truth for its content.

With no query parameter, the browser renders that file with its default styles.
There is no plain-theme stylesheet. If JavaScript fails or the entire
`portfolio_designs` directory is removed, the portfolio content still works.

The files here are optional:

- `config.json` lists the available designs and controls their visibility.
- `load.js` loads a requested design and creates the design bar.
- `editorial.css` is the editorial design.

Without them, `/` remains the complete plain-HTML portfolio. The editorial view
is available at `/?design=editorial-index`.

Run `python3 manage.py` from the repository, then use **manage designs** in the
local design bar. **Save to repo** writes the selection directly to
`config.json`. The public site never receives an editor or a GitHub credential.

## Adding a design

1. Add a CSS file to this directory.
2. Add its name, label, path, and visibility to `config.json`.

Designs may change presentation, but must never contain another copy of the
portfolio content.
