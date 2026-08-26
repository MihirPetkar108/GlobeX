// Exporter journey: auth (demo bypass) -> direction chooser -> discover -> assess -> settle.
// No backend (FastAPI/Hardhat/Supabase/n8n) is running for this run, so data-backed
// sections are expected to show real loading/error states, not fabricated success.
// Real Supabase auth is deliberately not configured yet (see src/hooks/useAuth.ts's
// enterDemo) - "View workspace" is the project's own sanctioned dev bypass.
//
// Every step after login uses in-app <Link> clicks, never cy.visit(), because
// the demo session lives only in React state (useState in useAuth.ts) - a hard
// navigation would drop it and bounce every protected route back to /auth.

describe("Exporter journey", () => {
  it("walks auth -> direction -> discover -> assess -> settle via in-app nav", () => {
    cy.visit("/auth");
    cy.contains("Sign in to GlobeXAI").should("be.visible");

    cy.contains("button", "View workspace").click();
    cy.location("pathname", { timeout: 10000 }).should("eq", "/home");
    cy.contains("Choose how you'd like to work today.", { timeout: 10000 }).should("be.visible");

    cy.contains("button", "Export").click();
    // DirectionChooser plays a ~420ms transition overlay before swapping in
    // the real dashboard - assert the dashboard actually replaces it.
    cy.contains(/Exporter Command Center/i, { timeout: 10000 }).should("be.visible");

    cy.get('a[href="/discover"]').first().click();
    cy.location("pathname").should("eq", "/discover");
    cy.contains("Global Trade Destination Discovery & Marketplace").should("be.visible");
    // Ranking result depends on a live FastAPI backend that isn't running this
    // run - assert the honest tool UI renders instead of a blank screen.
    cy.contains(/Rank Global Markets|Where Should I Export My Product/i).should("be.visible");

    cy.get('a[href="/assess"]').first().click();
    cy.location("pathname").should("eq", "/assess");
    cy.get("body").should("not.be.empty");

    cy.get('a[href="/escrow"]').first().click();
    cy.location("pathname").should("eq", "/escrow");
    cy.contains("Programmable Smart Escrow").should("be.visible");
    cy.contains("Enter a trade ID to view its escrow.").should("be.visible");
  });
});
