(() => {
  const catalog = Array.isArray(window.PORTFOLIO_DESIGNS)
    ? window.PORTFOLIO_DESIGNS
    : [];

  if (!catalog.length) return;

  const storageKey = "portfolio-design-visibility";
  const validIds = new Set(catalog.map((design) => design.id));
  const defaultIds = catalog
    .filter((design) => design.showInBar)
    .map((design) => design.id);
  const params = new URLSearchParams(window.location.search);
  const fallbackDesign = catalog.find((design) => !design.stylesheet) || catalog[0];
  const selectedDesign =
    catalog.find((design) => design.id === params.get("design")) || fallbackDesign;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(
    window.location.hostname
  );
  const canManage = isLocal || params.get("manage-designs") === "1";

  function readStoredIds() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey));
      return Array.isArray(stored) ? stored.filter((id) => validIds.has(id)) : null;
    } catch {
      return null;
    }
  }

  function readUrlIds() {
    if (!params.has("show")) return null;
    if (params.get("show") === "none") return [];

    return params
      .get("show")
      .split(",")
      .filter((id) => validIds.has(id));
  }

  function writeStoredIds(ids) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // The URL still carries the selection when browser storage is unavailable.
    }
  }

  function clearStoredIds() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The defaults still work when browser storage is unavailable.
    }
  }

  function setShowParameter(url, ids) {
    url.searchParams.set("show", ids.length ? ids.join(",") : "none");
  }

  function designUrl(designId) {
    const url = new URL(window.location.href);

    if (designId === fallbackDesign.id) {
      url.searchParams.delete("design");
    } else {
      url.searchParams.set("design", designId);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }

  function viewerUrl(ids) {
    const url = new URL(window.location.href);
    url.searchParams.delete("manage-designs");
    setShowParameter(url, ids);
    return url.href;
  }

  if (selectedDesign.stylesheet) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = selectedDesign.stylesheet;
    document.head.append(stylesheet);
  }

  document.documentElement.dataset.design = selectedDesign.id;

  let visibleIds = readUrlIds() ?? readStoredIds() ?? defaultIds;
  let manager;

  function syncManager() {
    if (!manager) return;

    manager.checkboxes.forEach((checkbox) => {
      checkbox.checked = visibleIds.includes(checkbox.value);
    });
    manager.viewerLink.value = viewerUrl(visibleIds);
  }

  function createManager() {
    const dialog = document.createElement("dialog");
    dialog.className = "design-manager";
    dialog.setAttribute("aria-labelledby", "design-manager-title");

    const form = document.createElement("form");
    form.method = "dialog";

    const title = document.createElement("h2");
    title.id = "design-manager-title";
    title.textContent = "Manage design bar";

    const description = document.createElement("p");
    description.textContent =
      "Choose which designs appear. This browser remembers your selection; the viewer link carries it to other people.";

    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "Visible designs";
    fieldset.append(legend);

    const checkboxes = catalog.map((design) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "visible-design";
      checkbox.value = design.id;
      label.append(checkbox, ` ${design.label}`);
      fieldset.append(label, document.createElement("br"));
      return checkbox;
    });

    const linkLabel = document.createElement("label");
    linkLabel.className = "viewer-link-label";
    linkLabel.textContent = "Viewer link ";

    const viewerLink = document.createElement("input");
    viewerLink.type = "text";
    viewerLink.readOnly = true;
    viewerLink.setAttribute("aria-label", "Viewer link with selected designs");
    linkLabel.append(viewerLink);

    const actions = document.createElement("p");
    actions.className = "design-manager-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy viewer link";

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Reset defaults";

    const closeButton = document.createElement("button");
    closeButton.type = "submit";
    closeButton.textContent = "Close";

    actions.append(saveButton, copyButton, resetButton, closeButton);
    form.append(title, description, fieldset, linkLabel, actions);
    dialog.append(form);
    document.body.append(dialog);

    const currentCheckboxIds = () =>
      checkboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        viewerLink.value = viewerUrl(currentCheckboxIds());
      });
    });

    saveButton.addEventListener("click", () => {
      visibleIds = currentCheckboxIds();
      writeStoredIds(visibleIds);

      const url = new URL(window.location.href);
      setShowParameter(url, visibleIds);
      window.history.replaceState({}, "", url);

      renderBar();
      dialog.close();
    });

    resetButton.addEventListener("click", () => {
      visibleIds = [...defaultIds];
      clearStoredIds();

      const url = new URL(window.location.href);
      url.searchParams.delete("show");
      window.history.replaceState({}, "", url);

      renderBar();
      syncManager();
    });

    copyButton.addEventListener("click", async () => {
      viewerLink.value = viewerUrl(currentCheckboxIds());

      try {
        await window.navigator.clipboard.writeText(viewerLink.value);
        copyButton.textContent = "Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy viewer link";
        }, 1200);
      } catch {
        viewerLink.focus();
        viewerLink.select();
      }
    });

    return { dialog, checkboxes, viewerLink };
  }

  function openManager() {
    manager ||= createManager();
    syncManager();
    manager.dialog.showModal();
  }

  function renderBar() {
    document.querySelector(".design-bar")?.remove();

    const visibleDesigns = catalog.filter((design) => visibleIds.includes(design.id));
    if (!visibleDesigns.length && !canManage) return;

    const bar = document.createElement("nav");
    bar.className = "design-bar";
    bar.setAttribute("aria-label", "Portfolio design");

    if (visibleDesigns.length) {
      const label = document.createElement("span");
      label.textContent = "Design: ";
      bar.append(label);

      visibleDesigns.forEach((design, index) => {
        if (index) bar.append(" | ");

        if (design.id === selectedDesign.id) {
          const current = document.createElement("strong");
          current.textContent = design.label;
          current.setAttribute("aria-current", "page");
          bar.append(current);
        } else {
          const link = document.createElement("a");
          link.href = designUrl(design.id);
          link.textContent = design.label;
          bar.append(link);
        }
      });
    }

    if (canManage) {
      if (visibleDesigns.length) bar.append(" | ");
      const manageButton = document.createElement("button");
      manageButton.type = "button";
      manageButton.textContent = "manage designs";
      manageButton.addEventListener("click", openManager);
      bar.append(manageButton);
    }

    document.body.prepend(bar);
  }

  renderBar();
})();
