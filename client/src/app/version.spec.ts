import { CLIENT_VERSION } from "./version";

describe("CLIENT_VERSION", () => {
  it("should be defined as a valid string", () => {
    expect(CLIENT_VERSION).toBeDefined();
    expect(typeof CLIENT_VERSION).toBe("string");
    expect(CLIENT_VERSION.length).toBeGreaterThan(0);
  });

  it("should match default or window override", () => {
    const expected = (window as any)?.CLIENT_VERSION_OVERRIDE || "0.0.0_dev";
    expect(CLIENT_VERSION).toBe(expected);
  });
});
