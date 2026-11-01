import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, decryptBytes, encrypt, encryptBytes, passportStorageReady } from "./passports";

describe("passport encryption", () => {
  const original = process.env.PASSPORT_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.PASSPORT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });
  afterEach(() => {
    process.env.PASSPORT_ENCRYPTION_KEY = original;
  });

  const passengers = [{ name: "BAT ERDENE", passport: "E1234567", expiry: "2030-01-01" }];

  it("round-trips and never stores the passport number in clear", () => {
    const sealed = encrypt(passengers);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("E1234567");
    expect(decrypt(sealed)).toEqual(passengers);
  });

  it("rejects tampered data", () => {
    const [v, iv, tag, data] = encrypt(passengers).split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64")].join("."))).toThrow();
  });

  it("cannot be read with another key", () => {
    const sealed = encrypt(passengers);
    process.env.PASSPORT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decrypt(sealed)).toThrow();
  });

  it("encrypts uploaded files and detects tampering", () => {
    const file = new Uint8Array(randomBytes(5000));
    const sealed = encryptBytes(file);
    expect(Buffer.from(sealed).includes(Buffer.from(file.subarray(0, 32)))).toBe(false);
    expect(Buffer.from(decryptBytes(sealed)).equals(Buffer.from(file))).toBe(true);
    sealed[sealed.length - 1] ^= 1;
    expect(() => decryptBytes(sealed)).toThrow();
  });

  it("refuses to work without a proper key", () => {
    process.env.PASSPORT_ENCRYPTION_KEY = "short";
    expect(passportStorageReady()).toBe(false);
    expect(() => encrypt(passengers)).toThrow();
  });
});
