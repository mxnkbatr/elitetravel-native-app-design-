import { afterEach, describe, expect, it, vi } from "vitest";
import { qpayMode } from "./qpay";

describe("qpayMode", () => {
  afterEach(() => vi.unstubAllEnvs());

  const creds = () => {
    vi.stubEnv("QPAY_USERNAME", "u");
    vi.stubEnv("QPAY_PASSWORD", "p");
    vi.stubEnv("QPAY_INVOICE_CODE", "c");
  };

  it("goes live only with all three credentials", () => {
    vi.stubEnv("QPAY_MODE", "live");
    vi.stubEnv("QPAY_USERNAME", "");
    expect(qpayMode()).toBe("off");
    creds();
    expect(qpayMode()).toBe("live");
  });

  it("accepts QPay's client name / secret naming", () => {
    vi.stubEnv("QPAY_MODE", "live");
    vi.stubEnv("QPAY_USERNAME", "");
    vi.stubEnv("QPAY_PASSWORD", "");
    vi.stubEnv("QPAY_CLIENT_NAME", "u");
    vi.stubEnv("QPAY_CLIENT_SECRET", "p");
    vi.stubEnv("QPAY_INVOICE_CODE", "c");
    expect(qpayMode()).toBe("live");
  });

  it("never runs the mock on Vercel production", () => {
    vi.stubEnv("QPAY_MODE", "mock");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(qpayMode()).toBe("off");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(qpayMode()).toBe("mock");
  });

  it("defaults to mock in development and off elsewhere when unconfigured", () => {
    vi.stubEnv("QPAY_MODE", "");
    vi.stubEnv("QPAY_USERNAME", "");
    vi.stubEnv("QPAY_CLIENT_NAME", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(qpayMode()).toBe("mock");
    vi.stubEnv("NODE_ENV", "production");
    expect(qpayMode()).toBe("off");
  });
});
