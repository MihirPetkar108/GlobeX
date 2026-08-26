// Importer journey: auth (demo bypass) -> direction chooser -> Import -> discover.
// The importer-side of /discover has NO real destination/demand model (only the
// exporter's XGBoost forecaster exists) - this is a deliberate, documented gap
// per the project's honesty rules (see DiscoverPage.tsx's NotModelledState).
// This spec asserts that gap renders honestly, not that it "still works" - a
// padded/faked importer result would be the bug, not the gap itself.

describe("Importer journey", () => {
  it("walks auth -> direction (Import) -> discover shows the honest importer gap", () => {
    cy.visit("/auth");
    cy.contains("button", "View workspace").click();
    cy.location("pathname", { timeout: 10000 }).should("eq", "/home");
    cy.contains("Choose how you'd like to work today.", { timeout: 10000 }).should("be.visible");

    cy.contains("button", "Import").click();
    cy.contains(/Exporter Command Center/i, { timeout: 10000 }).should("not.exist");
    cy.contains(/Importer Command Center/i, { timeout: 10000 }).should("be.visible");

    cy.get('a[href="/discover"]').first().click();
    cy.location("pathname").should("eq", "/discover");

    // Importer framing: the page title/copy forks, and the missing-model gap
    // is named explicitly rather than silently reusing the exporter's ranking.
    cy.contains("Supplier Discovery & Marketplace").should("be.visible");
    cy.contains("Not modelled yet").should("be.visible");
    cy.contains("This is a real gap, not a loading state").should("exist");

    // The shared, direction-agnostic listing catalog underneath the gap is
    // still real - assert it renders regardless of the importer-side gap.
    cy.contains(/Verified Supplier Listings|Export Commodities Inventory Catalog/i).should("exist");
  });
});
