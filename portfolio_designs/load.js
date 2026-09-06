(() => {
  const designs = {
    "editorial-index": "portfolio_designs/editorial.css"
  };

  const selected = new URLSearchParams(window.location.search).get("design");

  if (designs[selected]) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = designs[selected];
    document.head.append(stylesheet);
    document.documentElement.dataset.design = selected;
  } else {
    document.documentElement.dataset.design = "plain-html";
  }

  document.querySelectorAll("[data-design-link]").forEach((link) => {
    if (link.dataset.designLink === document.documentElement.dataset.design) {
      link.setAttribute("aria-current", "page");
    }
  });
})();
