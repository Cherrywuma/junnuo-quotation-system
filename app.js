(function (root, factory) {
  const library = root.JUNNUO_LIBRARY || (typeof require === "function" ? require("./products.js") : { PRODUCTS: [], CATEGORIES: [] });
  const api = factory(library || { PRODUCTS: [], CATEGORIES: [] });
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.JUNNUO_APP = api;
  }
})(typeof self !== "undefined" ? self : this, function ({ PRODUCTS, CATEGORIES }) {
  const DRAFT_STORAGE_KEY = "junnuoQuotationDraftsV1";
  const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe",
  ];
  const state = {
    items: [],
  };

  function money(value) {
    const number = Number(value) || 0;
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function calculateAmount(quantity, unitValue) {
    const qty = Number(quantity) || 0;
    if (unitValue === "" || unitValue === null || unitValue === undefined) return 0;
    const unit = Number(unitValue) || 0;
    return qty * unit;
  }

  function calculateTotals(items, adjustments) {
    const subtotal = items.reduce((sum, item) => sum + calculateAmount(item.quantity, item.unitPrice), 0);
    const freight = Number(adjustments.freight) || 0;
    const packingCharge = Number(adjustments.packingCharge) || 0;
    const discount = Number(adjustments.discount) || 0;
    return {
      subtotal,
      freight,
      packingCharge,
      discount,
      grandTotal: subtotal + freight + packingCharge - discount,
    };
  }

  function findProductByModel(model) {
    return PRODUCTS.find((product) => product.model === model && product.primary !== false);
  }

  function hasDisplayableImage(product) {
    return Boolean(product && product.image && String(product.image).trim());
  }

  function categoryName(id) {
    const category = CATEGORIES.find((item) => item.id === id);
    return category ? category.name : "";
  }

  function publicModel(product) {
    return product?.displayModel || product?.model || "";
  }

  function resolveProductName(item, product) {
    const customName = item?.customName ? String(item.customName).trim() : "";
    return customName || product?.name || "Select Product";
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function joinLines(values) {
    return Array.isArray(values) ? values.join("\n") : "";
  }

  function resolveTextOverride(item, key, fallback) {
    const value = item?.[key];
    return value === undefined || value === null || String(value).trim() === "" ? fallback || "" : String(value).trim();
  }

  function resolveListOverride(item, key, fallback) {
    const value = item?.[key];
    if (value === undefined || value === null || String(value).trim() === "") return fallback || [];
    return splitLines(value);
  }

  function resolveQuoteProduct(item, product) {
    return {
      name: resolveProductName(item, product),
      model: resolveTextOverride(item, "customModel", publicModel(product)),
      category: resolveTextOverride(item, "customCategory", categoryName(product?.category)),
      description: resolveTextOverride(item, "customDescription", product?.description),
      specs: resolveListOverride(item, "customSpecsText", product?.specs),
      sellingPoints: resolveListOverride(item, "customSellingPointsText", product?.sellingPoints),
      applications: resolveListOverride(item, "customApplicationsText", product?.applications),
      packageInfo: resolveListOverride(item, "customPackageInfoText", product?.packageInfo),
      notes: resolveTextOverride(item, "customNotes", product?.notes),
    };
  }

  function uniqueItemId() {
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getFormData() {
    const field = (id) => document.getElementById(id).value.trim();
    const selectedCountry = field("country");
    const customCountry = field("customCountry");
    return {
      quotationNo: field("quotationNo"),
      quotationDate: field("quotationDate"),
      customerCompany: field("customerCompany"),
      contactPerson: field("contactPerson"),
      country: selectedCountry === "__custom__" ? customCountry : selectedCountry,
      countrySelect: selectedCountry,
      customCountry,
      currency: field("currency"),
      tradeTerm: field("tradeTerm"),
      validity: field("validity"),
      deliveryTime: field("deliveryTime"),
      paymentTerms: field("paymentTerms"),
      warranty: field("warranty"),
      remarks: field("remarks"),
      freight: document.getElementById("freight").value,
      packingCharge: document.getElementById("packingCharge").value,
      discount: document.getElementById("discount").value,
    };
  }

  function countryOptions(selectedCountry = "") {
    const options = [`<option value="">Select country</option>`]
      .concat(COUNTRIES.map((country) => `<option value="${escapeHtml(country)}" ${country === selectedCountry ? "selected" : ""}>${escapeHtml(country)}</option>`))
      .concat(`<option value="__custom__" ${selectedCountry === "__custom__" ? "selected" : ""}>Custom / Other</option>`);
    return options.join("");
  }

  function updateCustomCountryVisibility() {
    const wrap = document.getElementById("customCountryWrap");
    const country = document.getElementById("country");
    if (!wrap || !country) return;
    wrap.classList.toggle("is-visible", country.value === "__custom__");
  }

  function createDraftSnapshot(form, items) {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      form: { ...form },
      items: items.map((item) => ({ ...item })),
    };
  }

  function restoreDraftSnapshot(snapshot) {
    if (!snapshot || snapshot.version !== 1) {
      return { form: {}, items: [] };
    }
    return {
      form: { ...(snapshot.form || {}) },
      items: Array.isArray(snapshot.items) ? snapshot.items.map((item) => ({ ...item })) : [],
    };
  }

  function readDrafts() {
    if (typeof localStorage === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeDrafts(drafts) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  }

  function setDraftStatus(message) {
    const status = document.getElementById("draftStatus");
    if (status) status.textContent = message;
  }

  function renderDraftOptions(selectedName = "") {
    const select = document.getElementById("draftSelect");
    if (!select) return;
    const drafts = readDrafts();
    const names = Object.keys(drafts).sort((a, b) => (drafts[b].savedAt || "").localeCompare(drafts[a].savedAt || ""));
    select.innerHTML = names.length
      ? names.map((name) => `<option value="${escapeHtml(name)}" ${name === selectedName ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")
      : `<option value="">No saved drafts</option>`;
  }

  function setFormData(form) {
    const setValue = (id, value) => {
      const field = document.getElementById(id);
      if (field) field.value = value || "";
    };
    setValue("quotationNo", form.quotationNo);
    setValue("quotationDate", form.quotationDate);
    setValue("customerCompany", form.customerCompany);
    setValue("contactPerson", form.contactPerson);
    const countryValue = form.countrySelect || (COUNTRIES.includes(form.country) ? form.country : form.country ? "__custom__" : "");
    setValue("country", countryValue);
    setValue("customCountry", countryValue === "__custom__" ? form.customCountry || form.country : "");
    updateCustomCountryVisibility();
    setValue("currency", form.currency || "USD");
    setValue("tradeTerm", form.tradeTerm || "EXW");
    setValue("validity", form.validity || "30 days");
    setValue("deliveryTime", form.deliveryTime || "To be confirmed after order confirmation");
    setValue("paymentTerms", form.paymentTerms || "T/T payment");
    setValue("warranty", form.warranty || "One year limited warranty");
    setValue("remarks", form.remarks);
    setValue("freight", form.freight || 0);
    setValue("packingCharge", form.packingCharge || 0);
    setValue("discount", form.discount || 0);
  }

  function defaultDraftName(form) {
    const customer = form.customerCompany || "Quotation";
    const number = form.quotationNo || new Date().toISOString().slice(0, 10);
    return `${customer} - ${number}`;
  }

  function saveCurrentDraft() {
    const form = getFormData();
    const nameInput = document.getElementById("draftName");
    const name = (nameInput.value || "").trim() || defaultDraftName(form);
    const drafts = readDrafts();
    drafts[name] = createDraftSnapshot(form, state.items);
    writeDrafts(drafts);
    nameInput.value = name;
    renderDraftOptions(name);
    setDraftStatus(`Saved: ${name}`);
  }

  function loadSelectedDraft() {
    const select = document.getElementById("draftSelect");
    const name = select.value;
    if (!name) {
      setDraftStatus("No draft selected");
      return;
    }
    const drafts = readDrafts();
    const restored = restoreDraftSnapshot(drafts[name]);
    setFormData(restored.form);
    state.items = restored.items.length ? restored.items : [createItem()];
    document.getElementById("draftName").value = name;
    renderItems();
    renderDraftOptions(name);
    setDraftStatus(`Loaded: ${name}`);
  }

  function deleteSelectedDraft() {
    const select = document.getElementById("draftSelect");
    const name = select.value;
    if (!name) {
      setDraftStatus("No draft selected");
      return;
    }
    const drafts = readDrafts();
    delete drafts[name];
    writeDrafts(drafts);
    document.getElementById("draftName").value = "";
    renderDraftOptions();
    setDraftStatus(`Deleted: ${name}`);
  }

  function createItem() {
    const firstCategory = CATEGORIES[0]?.id;
    const firstProduct = PRODUCTS.find((product) => product.category === firstCategory && product.primary !== false) || PRODUCTS.find((product) => product.primary !== false);
    return {
      id: uniqueItemId(),
      productId: firstProduct ? firstProduct.id : "",
      customName: "",
      customModel: "",
      customCategory: "",
      customDescription: "",
      customSpecsText: "",
      customSellingPointsText: "",
      customApplicationsText: "",
      customPackageInfoText: "",
      customNotes: "",
      quantity: 1,
      unitPrice: "",
      uploadedImage: "",
    };
  }

  function findProductById(id) {
    return PRODUCTS.find((product) => product.id === id);
  }

  function productOptions(selectedId, categoryId) {
    const customOption = `<option value="__custom__" ${selectedId === "__custom__" ? "selected" : ""}>Custom Item / Not in list</option>`;
    return (
      customOption +
      PRODUCTS
      .filter((product) => !categoryId || product.category === categoryId)
      .map((product) => {
        const model = publicModel(product) ? ` - ${publicModel(product)}` : "";
        return `<option value="${escapeHtml(product.id)}" ${product.id === selectedId ? "selected" : ""}>${escapeHtml(product.name + model)}</option>`;
      })
      .join("")
    );
  }

  function categoryOptions(selectedId) {
    return CATEGORIES.map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(category.name)}</option>`).join("");
  }

  function listBlock(title, values) {
    if (!values || !values.length) return "";
    return `
      <section class="detail-block">
        <h4>${title}</h4>
        <ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>
      </section>
    `;
  }

  function renderProductDetails(quoteProduct) {
    if (!quoteProduct) return "";
    return `
      <div class="product-details">
        <h3>Product Details</h3>
        <p>${escapeHtml(quoteProduct.description)}</p>
        <div class="detail-grid">
          ${listBlock("Technical Specifications", quoteProduct.specs)}
          ${listBlock("Selling Points", quoteProduct.sellingPoints)}
          ${listBlock("Applications", quoteProduct.applications)}
          ${listBlock("Package Information", quoteProduct.packageInfo)}
        </div>
        ${quoteProduct.notes ? `<p class="note"><strong>Notes:</strong> ${escapeHtml(quoteProduct.notes)}</p>` : ""}
      </div>
    `;
  }

  function renderItems() {
    const container = document.getElementById("quoteItems");
    container.innerHTML = state.items
      .map((item, index) => {
        let product = findProductById(item.productId);
        const category = product ? product.category : CATEGORIES[0]?.id;
        const productsInCategory = PRODUCTS.filter((entry) => entry.category === category);
        if (product && item.productId !== "__custom__" && !productsInCategory.some((entry) => entry.id === product.id)) {
          product = productsInCategory[0] || product;
          item.productId = product.id;
        }
        const quoteProduct = resolveQuoteProduct(item, product);
        const displayName = quoteProduct.name;
        const imageSource = item.uploadedImage || product?.image || "";
        const amount = calculateAmount(item.quantity, item.unitPrice);
        const imageMarkup = imageSource ? `<img class="product-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(displayName)}">` : "";
        return `
          <article class="product-card" data-item-id="${escapeHtml(item.id)}">
            <div class="product-card-top">
              <div>
                <span class="item-label">Product ${index + 1}</span>
                <h2>${escapeHtml(displayName)}</h2>
              </div>
              <button type="button" class="ghost-button no-print remove-item" ${state.items.length === 1 ? "disabled" : ""}>Remove Product</button>
            </div>
            <div class="product-editor no-print">
              <label>Select Category
                <select class="category-select">${categoryOptions(category)}</select>
              </label>
              <label>Select Model
                <select class="product-select">${productOptions(item.productId, category)}</select>
              </label>
              <label>Quote Category
                <input class="editable-field" data-field="customCategory" type="text" value="${escapeHtml(quoteProduct.category)}">
              </label>
              <label>Quote Model
                <input class="editable-field" data-field="customModel" type="text" value="${escapeHtml(quoteProduct.model)}">
              </label>
              <label>Product Name
                <input class="editable-field product-name-input" data-field="customName" type="text" value="${escapeHtml(displayName)}">
              </label>
              <label>Upload Product Image
                <input class="image-upload" type="file" accept="image/*">
              </label>
            </div>
            <div class="detail-editor no-print">
              <label>Description
                <textarea class="editable-field" data-field="customDescription" rows="3">${escapeHtml(quoteProduct.description)}</textarea>
              </label>
              <label>Technical Specifications
                <textarea class="editable-field" data-field="customSpecsText" rows="5">${escapeHtml(joinLines(quoteProduct.specs))}</textarea>
              </label>
              <label>Selling Points
                <textarea class="editable-field" data-field="customSellingPointsText" rows="5">${escapeHtml(joinLines(quoteProduct.sellingPoints))}</textarea>
              </label>
              <label>Applications
                <textarea class="editable-field" data-field="customApplicationsText" rows="4">${escapeHtml(joinLines(quoteProduct.applications))}</textarea>
              </label>
              <label>Package Information
                <textarea class="editable-field" data-field="customPackageInfoText" rows="4">${escapeHtml(joinLines(quoteProduct.packageInfo))}</textarea>
              </label>
              <label>Notes
                <textarea class="editable-field" data-field="customNotes" rows="3">${escapeHtml(quoteProduct.notes)}</textarea>
              </label>
            </div>
            <div class="quote-item-line">
              <div class="quote-line-main">
                <span class="quote-line-index">${index + 1}</span>
                <div>
                  <strong class="quote-product-name">${escapeHtml(displayName)}</strong>
                  <span class="quote-product-meta">${escapeHtml(quoteProduct.category)}${quoteProduct.model ? ` | Model: ${escapeHtml(quoteProduct.model)}` : ""}</span>
                </div>
              </div>
              <label>Quantity
                <input class="quantity-input" type="number" min="0" step="1" value="${escapeHtml(item.quantity)}">
                <span class="print-value print-quantity-value">${escapeHtml(item.quantity || 0)}</span>
              </label>
              <label>Unit Price
                <input class="unit-input" type="number" min="0" step="0.01" placeholder="Manual input" value="${escapeHtml(item.unitPrice)}">
                <span class="print-value print-unit-value">${item.unitPrice === "" ? "Manual input required" : `${escapeHtml(getFormData().currency)} ${money(item.unitPrice)}`}</span>
              </label>
              <div class="amount-box">
                <span>Amount</span>
                <strong class="line-amount-value">${escapeHtml(getFormData().currency)} ${money(amount)}</strong>
              </div>
            </div>
            <div class="product-detail-section ${imageSource ? "has-image" : "no-image"}">
              ${imageMarkup}
              <div class="line-body">
                ${renderProductDetails(quoteProduct)}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
    bindItemEvents();
    renderPreview();
  }

  function updateItemAmounts(card, item) {
    const form = getFormData();
    const amount = calculateAmount(item.quantity, item.unitPrice);
    const quantityValue = card.querySelector(".print-quantity-value");
    const unitValue = card.querySelector(".print-unit-value");
    const amountValue = card.querySelector(".line-amount-value");
    if (quantityValue) quantityValue.textContent = item.quantity || 0;
    if (unitValue) unitValue.textContent = item.unitPrice === "" ? "Manual input required" : `${form.currency} ${money(item.unitPrice)}`;
    if (amountValue) amountValue.textContent = `${form.currency} ${money(amount)}`;
  }

  function updateItemText(card, item) {
    const product = findProductById(item.productId);
    const quoteProduct = resolveQuoteProduct(item, product);
    card.querySelector(".product-card-top h2").textContent = quoteProduct.name;
    card.querySelector(".quote-product-name").textContent = quoteProduct.name;
    card.querySelector(".quote-product-meta").textContent = `${quoteProduct.category}${quoteProduct.model ? ` | Model: ${quoteProduct.model}` : ""}`;
    card.querySelector(".line-body").innerHTML = renderProductDetails(quoteProduct);
  }

  function bindItemEvents() {
    document.querySelectorAll(".product-card").forEach((card) => {
      const item = state.items.find((entry) => entry.id === card.dataset.itemId);
      card.querySelector(".category-select").addEventListener("change", (event) => {
        const product = PRODUCTS.find((entry) => entry.category === event.target.value);
        if (product) item.productId = product.id;
        item.customName = "";
        item.customModel = "";
        item.customCategory = "";
        item.customDescription = "";
        item.customSpecsText = "";
        item.customSellingPointsText = "";
        item.customApplicationsText = "";
        item.customPackageInfoText = "";
        item.customNotes = "";
        renderItems();
      });
      card.querySelector(".product-select").addEventListener("change", (event) => {
        item.productId = event.target.value;
        item.customName = "";
        item.customModel = "";
        item.customCategory = "";
        item.customDescription = "";
        item.customSpecsText = "";
        item.customSellingPointsText = "";
        item.customApplicationsText = "";
        item.customPackageInfoText = "";
        item.customNotes = "";
        renderItems();
      });
      card.querySelectorAll(".editable-field").forEach((field) => {
        field.addEventListener("input", (event) => {
          item[event.target.dataset.field] = event.target.value;
          updateItemText(card, item);
        });
      });
      card.querySelector(".quantity-input").addEventListener("input", (event) => {
        item.quantity = event.target.value;
        updateItemAmounts(card, item);
        renderPreview();
      });
      card.querySelector(".unit-input").addEventListener("input", (event) => {
        item.unitPrice = event.target.value;
        updateItemAmounts(card, item);
        renderPreview();
      });
      card.querySelector(".remove-item").addEventListener("click", () => {
        state.items = state.items.filter((entry) => entry.id !== item.id);
        renderItems();
      });
      card.querySelector(".image-upload").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          item.uploadedImage = reader.result;
          renderItems();
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function renderPreview() {
    const form = getFormData();
    const totals = calculateTotals(state.items, form);
    document.getElementById("subtotal").textContent = `${form.currency} ${money(totals.subtotal)}`;
    document.getElementById("grandTotal").textContent = `${form.currency} ${money(totals.grandTotal)}`;
    document.getElementById("previewCustomer").textContent = form.customerCompany || "Customer Company";
    document.getElementById("previewMeta").textContent = `${form.quotationNo || "Quotation No."} | ${form.quotationDate || "Date"} | ${form.tradeTerm}`;
    document.getElementById("previewCustomerDetails").innerHTML = `
      <span><strong>Contact Person:</strong> ${escapeHtml(form.contactPerson || "-")}</span>
      <span><strong>Country:</strong> ${escapeHtml(form.country || "-")}</span>
      <span><strong>Currency:</strong> ${escapeHtml(form.currency)}</span>
      <span><strong>Trade Term:</strong> ${escapeHtml(form.tradeTerm)}</span>
    `;
    document.getElementById("previewTerms").innerHTML = `
      <span><strong>Validity:</strong> ${escapeHtml(form.validity || "-")}</span>
      <span><strong>Delivery Time:</strong> ${escapeHtml(form.deliveryTime || "-")}</span>
      <span><strong>Payment Terms:</strong> ${escapeHtml(form.paymentTerms || "-")}</span>
      <span><strong>Warranty:</strong> ${escapeHtml(form.warranty || "-")}</span>
      <span><strong>Remarks:</strong> ${escapeHtml(form.remarks || "-")}</span>
    `;
    document.getElementById("summaryRows").innerHTML = `
      <div><span>Subtotal</span><strong>${form.currency} ${money(totals.subtotal)}</strong></div>
      <div><span>Freight</span><strong>${form.currency} ${money(totals.freight)}</strong></div>
      <div><span>Packing Charge</span><strong>${form.currency} ${money(totals.packingCharge)}</strong></div>
      <div><span>Discount</span><strong>${form.currency} ${money(totals.discount)}</strong></div>
      <div class="total-row"><span>Grand Total</span><strong>${form.currency} ${money(totals.grandTotal)}</strong></div>
    `;
  }

  function init() {
    if (typeof document === "undefined") return;
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("quotationDate").value = today;
    document.getElementById("country").innerHTML = countryOptions();
    updateCustomCountryVisibility();
    state.items = [createItem()];
    document.getElementById("addProduct").addEventListener("click", () => {
      state.items.push(createItem());
      renderItems();
    });
    document.getElementById("printQuote").addEventListener("click", () => window.print());
    document.getElementById("saveDraft").addEventListener("click", saveCurrentDraft);
    document.getElementById("loadDraft").addEventListener("click", loadSelectedDraft);
    document.getElementById("deleteDraft").addEventListener("click", deleteSelectedDraft);
    document.getElementById("draftSelect").addEventListener("change", (event) => {
      document.getElementById("draftName").value = event.target.value || "";
    });
    document.querySelectorAll(".quote-info input, .adjustments input").forEach((field) => field.addEventListener("input", renderPreview));
    document.getElementById("country").addEventListener("change", () => {
      updateCustomCountryVisibility();
      renderPreview();
    });
    document.getElementById("tradeTerm").addEventListener("change", renderPreview);
    document.getElementById("currency").addEventListener("change", renderItems);
    renderDraftOptions();
    renderItems();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  return {
    calculateAmount,
    calculateTotals,
    findProductByModel,
    hasDisplayableImage,
    publicModel,
    resolveProductName,
    resolveQuoteProduct,
    createDraftSnapshot,
    restoreDraftSnapshot,
    COUNTRIES,
    init,
  };
});
