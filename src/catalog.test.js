import { describe, it, expect } from "vitest";
import { loadCatalog, getCatalogSync } from "./catalog.js";

describe("catalog lazy loader", () => {
  it("loadCatalog returns an array", async () => {
    const data = await loadCatalog();
    expect(Array.isArray(data)).toBe(true);
  });

  it("loadCatalog items have id + name", async () => {
    const data = await loadCatalog();
    if (data.length > 0) {
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("name");
    }
  });

  it("getCatalogSync returns cached array after load", async () => {
    await loadCatalog();
    const sync = getCatalogSync();
    expect(Array.isArray(sync)).toBe(true);
  });

  it("re-calling loadCatalog reuses same promise (no double import)", async () => {
    const a = await loadCatalog();
    const b = await loadCatalog();
    expect(a).toBe(b);
  });
});
