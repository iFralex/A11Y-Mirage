import { describe, it, expect } from "vitest";

describe("Project setup", () => {
  it("vitest is configured with jsdom environment", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});
