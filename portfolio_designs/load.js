(async () => {
  const scriptUrl = document.currentScript?.src;
  if (!scriptUrl) return;

  const designDirectory = new URL("./", scriptUrl);

  let config;
  try {
    const response = await fetch(new URL("config.json", designDirectory), {
      cache: "no-store"
    });
    if (!response.ok) return;
    config = await response.json();
  } catch {
    return;
  }

  let catalog = Array.isArray(config.designs) ? config.designs : [];
  if (!catalog.length) return;

  const params = new URLSearchParams(window.location.search);
  const fallbackDesign = catalog.find((design) => !design.stylesheet) || catalog[0];
  const selectedDesign =
    catalog.find((design) => design.id === params.get("design")) || fallbackDesign;

  if (selectedDesign.stylesheet) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(selectedDesign.stylesheet, designDirectory);
    document.head.append(stylesheet);
  }

  document.documentElement.dataset.design = selectedDesign.id;

  async function localEditorIsAvailable() {
    if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return false;
    }

    try {
      const response = await fetch("/__portfolio/status", { cache: "no-store" });
      if (!response.ok) return false;
      const status = await response.json();
      return status.editor === true && status.writable === true;
    } catch {
      return false;
    }
  }

  const canManage = await localEditorIsAvailable();
  let manager;

  function visibleDesigns() {
    return catalog.filter((design) => design.showInBar);
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

  function syncManager() {
    if (!manager) return;

    manager.checkboxes.forEach((checkbox) => {
      const design = catalog.find((candidate) => candidate.id === checkbox.value);
      checkbox.checked = design?.showInBar === true;
    });
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
      "Choose which designs visitors can select. Saving changes the configuration file in this repository.";

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

    const status = document.createElement("p");
    status.className = "design-manager-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const actions = document.createElement("p");
    actions.className = "design-manager-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save to repo";

    const showAllButton = document.createElement("button");
    showAllButton.type = "button";
    showAllButton.textContent = "Show all";

    const hideAllButton = document.createElement("button");
    hideAllButton.type = "button";
    hideAllButton.textContent = "Hide all";

    const closeButton = document.createElement("button");
    closeButton.type = "submit";
    closeButton.textContent = "Close";

    actions.append(saveButton, showAllButton, hideAllButton, closeButton);
    form.append(title, description, fieldset, status, actions);
    dialog.append(form);
    document.body.append(dialog);

    showAllButton.addEventListener("click", () => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = true;
      });
      status.textContent = "";
    });

    hideAllButton.addEventListener("click", () => {
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      status.textContent = "";
    });

    saveButton.addEventListener("click", async () => {
      const visibleIds = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

      saveButton.disabled = true;
      status.textContent = "Saving…";

      try {
        const response = await fetch("/__portfolio/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibleIds })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not save the configuration.");
        }

        catalog = result.designs;
        renderBar();
        syncManager();
        status.textContent = "Saved to portfolio_designs/config.json.";
      } catch (error) {
        status.textContent = error.message;
      } finally {
        saveButton.disabled = false;
      }
    });

    return { dialog, checkboxes };
  }

  function openManager() {
    manager ||= createManager();
    syncManager();
    manager.dialog.showModal();
  }

  function renderBar() {
    document.querySelector(".design-bar")?.remove();

    const designs = visibleDesigns();
    if (!designs.length && !canManage) return;

    const bar = document.createElement("nav");
    bar.className = "design-bar";
    bar.setAttribute("aria-label", "Portfolio design");

    if (designs.length) {
      const label = document.createElement("span");
      label.textContent = "Design: ";
      bar.append(label);

      designs.forEach((design, index) => {
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
      if (designs.length) bar.append(" | ");
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
