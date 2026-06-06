(function (root, factory) {
  const library = root.JUNNUO_LIBRARY || (typeof require === "function" ? require("./products.js") : { PRODUCTS: [], CATEGORIES: [] });
  const api = factory(library || { PRODUCTS: [], CATEGORIES: [] });
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.JUNNUO_APP = api;
  }
})(typeof self !== "undefined" ? self : this, function ({ PRODUCTS, CATEGORIES }) {
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
    return {
      quotationNo: field("quotationNo"),
      quotationDate: field("quotationDate"),
      customerCompany: field("customerCompany"),
      contactPerson: field("contactPerson"),
      country: field("country"),
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

  function createItem() {
    const firstCategory = CATEGORIES[0]?.id;
    const firstProduct = PRODUCTS.find((product) => product.category === firstCategory && product.primary !== false) || PRODUCTS.find((product) => product.primary !== false);
    return {
      id: uniqueItemId(),
      productId: firstProduct ? firstProduct.id : "",
      quantity: 1,
      unitPrice: "",
      uploadedImage: "",
    };
  }

  function findProductById(id) {
    return PRODUCTS.find((product) => product.id === id);
  }

  function productOptions(selectedId, categoryId) {
    return PRODUCTS
      .filter((product) => !categoryId || product.category === categoryId)
      .map((product) => {
        const model = publicModel(product) ? ` - ${publicModel(product)}` : "";
        return `<option value="${escapeHtml(product.id)}" ${product.id === selectedId ? "selected" : ""}>${escapeHtml(product.name + model)}</option>`;
      })
      .join("");
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

  function renderProductDetails(product) {
    if (!product) return "";
    return `
      <div class="product-details">
        <h3>Product Details</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="detail-grid">
          ${listBlock("Technical Specifications", product.specs)}
          ${listBlock("Selling Points", product.sellingPoints)}
          ${listBlock("Applications", product.applications)}
          ${listBlock("Package Information", product.packageInfo)}
        </div>
        ${product.notes ? `<p class="note"><strong>Notes:</strong> ${escapeHtml(product.notes)}</p>` : ""}
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
        if (product && !productsInCategory.some((entry) => entry.id === product.id)) {
          product = productsInCategory[0] || product;
          item.productId = product.id;
        }
        const imageSource = item.uploadedImage || product?.image || "";
        const amount = calculateAmount(item.quantity, item.unitPrice);
        const imageMarkup = imageSource ? `<img class="product-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.name)}">` : "";
        return `
          <article class="product-card" data-item-id="${escapeHtml(item.id)}">
            <div class="product-card-top">
              <div>
                <span class="item-label">Product ${index + 1}</span>
                <h2>${escapeHtml(product?.name || "Select Product")}</h2>
              </div>
              <button type="button" class="ghost-button no-print remove-item" ${state.items.length === 1 ? "disabled" : ""}>Remove Product</button>
            </div>
            <div class="product-editor no-print">
              <label>Select Category
                <select class="category-select">${categoryOptions(category)}</select>
              </label>
              <label>Select Model
                <select class="product-select">${productOptions(product?.id, category)}</select>
              </label>
              <label>Upload Product Image
                <input class="image-upload" type="file" accept="image/*">
              </label>
            </div>
            <div class="quote-item-line">
              <div class="quote-line-main">
                <span class="quote-line-index">${index + 1}</span>
                <div>
                  <strong>${escapeHtml(product?.name || "Select Product")}</strong>
                  <span>${escapeHtml(categoryName(product?.category))}${publicModel(product) ? ` | Model: ${escapeHtml(publicModel(product))}` : ""}</span>
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
                ${renderProductDetails(product)}
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

  function bindItemEvents() {
    document.querySelectorAll(".product-card").forEach((card) => {
      const item = state.items.find((entry) => entry.id === card.dataset.itemId);
      card.querySelector(".category-select").addEventListener("change", (event) => {
        const product = PRODUCTS.find((entry) => entry.category === event.target.value);
        if (product) item.productId = product.id;
        renderItems();
      });
      card.querySelector(".product-select").addEventListener("change", (event) => {
        item.productId = event.target.value;
        renderItems();
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
    state.items = [createItem()];
    document.getElementById("addProduct").addEventListener("click", () => {
      state.items.push(createItem());
      renderItems();
    });
    document.getElementById("printQuote").addEventListener("click", () => window.print());
    document.querySelectorAll(".quote-info input, .adjustments input").forEach((field) => field.addEventListener("input", renderPreview));
    document.getElementById("tradeTerm").addEventListener("change", renderPreview);
    document.getElementById("currency").addEventListener("change", renderItems);
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
    init,
  };
});
