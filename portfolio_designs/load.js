(async () => {
  const scriptUrl = document.currentScript?.src;
  if (!scriptUrl) return;

  const designDirectory = new URL("./", scriptUrl);

  let config;
  try {
    const response = await fetch(new URL("config.json", designDirectory));
    if (!response.ok) return;
    config = await response.json();
  } catch {
    return;
  }

  const designs = Array.isArray(config.designs) ? config.designs : [];
  if (!designs.length) return;

  const params = new URLSearchParams(window.location.search);
  const defaultDesign = designs.find((design) => !design.stylesheet) || designs[0];
  const selectedDesign =
    designs.find((design) => design.id === params.get("design")) || defaultDesign;

  if (selectedDesign.stylesheet) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(selectedDesign.stylesheet, designDirectory);
    document.head.append(stylesheet);
  }

  document.documentElement.dataset.design = selectedDesign.id;

  const visibleDesigns = designs.filter((design) => design.showInBar);
  if (!visibleDesigns.length) return;

  const bar = document.createElement("nav");
  bar.className = "design-bar";
  bar.setAttribute("aria-label", "Portfolio design");
  bar.append("Design: ");

  visibleDesigns.forEach((design, index) => {
    if (index) bar.append(" | ");

    if (design.id === selectedDesign.id) {
      const current = document.createElement("strong");
      current.textContent = design.label;
      current.setAttribute("aria-current", "page");
      bar.append(current);
      return;
    }

    const url = new URL(window.location.href);
    if (design.id === defaultDesign.id) {
      url.searchParams.delete("design");
    } else {
      url.searchParams.set("design", design.id);
    }

    const link = document.createElement("a");
    link.href = `${url.pathname}${url.search}${url.hash}`;
    link.textContent = design.label;
    bar.append(link);
  });

  document.body.prepend(bar);
})();
