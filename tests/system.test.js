const assert = require("assert");

const { PRODUCTS, CATEGORIES } = require("../products.js");
const {
  calculateAmount,
  calculateTotals,
  findProductByModel,
  hasDisplayableImage,
  publicModel,
  resolveProductName,
  resolveQuoteProduct,
} = require("../app.js");

const forbiddenKeys = [
  "price",
  "cost",
  "unitPrice",
  "rmb",
  "usd",
  "eur",
  "exw",
  "amount",
  "ammount",
  "dealer",
];

function scanForForbiddenKeys(value, path = "product") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForForbiddenKeys(item, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    assert(
      !forbiddenKeys.some((forbidden) => normalized.includes(forbidden)),
      `Forbidden price-like key found at ${path}.${key}`
    );
    scanForForbiddenKeys(child, `${path}.${key}`);
  }
}

assert.strictEqual(PRODUCTS.length, 37, "product library should contain 37 real Excel-derived entries");
assert(CATEGORIES.some((category) => category.name === "Pressure Fryers"), "Pressure Fryers category missing");
assert(CATEGORIES.some((category) => category.name === "Accessories"), "Accessories category missing");

scanForForbiddenKeys(PRODUCTS);

const serializedProducts = JSON.stringify(PRODUCTS);
assert(!serializedProducts.includes("绫抽暱"), "product library should not contain mojibake text");
assert(!serializedProducts.includes("鍥涢棬"), "product library should not contain mojibake text");
assert(!serializedProducts.includes("鍏棬"), "product library should not contain mojibake text");

for (const product of PRODUCTS) {
  assert(product.id, "every product needs a stable id");
  assert(product.name, `${product.id} needs an English product name`);
  assert(product.category, `${product.id} needs a category`);
  assert(Array.isArray(product.specs), `${product.id} specs should be an array`);
  assert(Array.isArray(product.sellingPoints), `${product.id} sellingPoints should be an array`);
  assert(Array.isArray(product.applications), `${product.id} applications should be an array`);
  assert(Array.isArray(product.packageInfo), `${product.id} packageInfo should be an array`);
  assert(!/[\u4e00-\u9fff]/.test(product.name), `${product.id} visible name should be English`);
  assert(!/[\u4e00-\u9fff]/.test(publicModel(product)), `${product.id} visible model should be English`);
}

const pfe800 = findProductByModel("PFE-800");
assert(pfe800, "PFE-800 should be selectable");
assert.strictEqual(pfe800.name, "JUNNUO Programmable Electric Pressure Fryer PFE-800");
assert.strictEqual(pfe800.category, "pressure-fryers");
assert.strictEqual(pfe800.notes, "Specification requires confirmation");

const ofe301 = findProductByModel("OFE-301");
assert(ofe301, "OFE-301 should be selectable");
assert.strictEqual(ofe301.name, "JUNNUO Electric Open Fryer OFE-301");
assert.strictEqual(ofe301.notes, "Specification requires confirmation");

const jh16 = findProductByModel("JH-16");
assert(jh16, "JH-16 should be selectable");
assert.strictEqual(jh16.name, "JUNNUO Countertop Pressure Fryer JH-16");

assert.strictEqual(findProductByModel("1.2米长").id, "center-island-cabinet-1200");
assert.strictEqual(findProductByModel("四门").id, "four-door-refrigerated-cabinet");
assert.strictEqual(publicModel(findProductByModel("1.2米长")), "1200 mm");
assert.strictEqual(publicModel(findProductByModel("四门")), "Four-Door");
assert.strictEqual(resolveProductName({ customName: "" }, pfe800), pfe800.name);
assert.strictEqual(resolveProductName({ customName: "Custom Pressure Fryer Name" }, pfe800), "Custom Pressure Fryer Name");

const overriddenPfe = resolveQuoteProduct(
  {
    customName: "Customer Label PFE-800",
    customModel: "PFE-800-SPECIAL",
    customCategory: "Special Frying Equipment",
    customDescription: "Customer-facing description",
    customSpecsText: "Voltage: Custom\nCapacity: Custom",
    customSellingPointsText: "Point A\nPoint B",
    customApplicationsText: "Application A",
    customPackageInfoText: "Package A",
    customNotes: "Custom note",
  },
  pfe800
);
assert.strictEqual(overriddenPfe.name, "Customer Label PFE-800");
assert.strictEqual(overriddenPfe.model, "PFE-800-SPECIAL");
assert.strictEqual(overriddenPfe.category, "Special Frying Equipment");
assert.deepStrictEqual(overriddenPfe.specs, ["Voltage: Custom", "Capacity: Custom"]);
assert.deepStrictEqual(overriddenPfe.sellingPoints, ["Point A", "Point B"]);
assert.strictEqual(overriddenPfe.notes, "Custom note");

const customItem = resolveQuoteProduct(
  {
    customName: "Manual Custom Equipment",
    customModel: "MANUAL-001",
    customCategory: "Custom Equipment",
    customDescription: "Fully manual item",
    customSpecsText: "Manual specification",
  },
  null
);
assert.strictEqual(customItem.name, "Manual Custom Equipment");
assert.strictEqual(customItem.model, "MANUAL-001");
assert.strictEqual(customItem.category, "Custom Equipment");
assert.deepStrictEqual(customItem.specs, ["Manual specification"]);

assert.strictEqual(calculateAmount(3, ""), 0, "blank Unit Price must not auto-fill");
assert.strictEqual(calculateAmount(3, 1200), 3600, "amount should equal quantity times unit price");

const totals = calculateTotals(
  [
    { quantity: 2, unitPrice: 100 },
    { quantity: 1, unitPrice: 50 },
    { quantity: 5, unitPrice: "" },
  ],
  { freight: 20, packingCharge: 10, discount: 5 }
);
assert.deepStrictEqual(totals, {
  subtotal: 250,
  freight: 20,
  packingCharge: 10,
  discount: 5,
  grandTotal: 275,
});

assert.strictEqual(hasDisplayableImage({ image: "" }), false, "blank image should not render");
assert.strictEqual(hasDisplayableImage({ image: "assets/images/products/pfe-800.jpg" }), true);

console.log("All system tests passed");
