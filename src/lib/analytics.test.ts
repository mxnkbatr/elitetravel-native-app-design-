import { isBot, parseEvent, visitSource } from "@/lib/analytics";
import { describe, expect, it } from "vitest";

const own = "elitetravel.mn";

describe("visitSource", () => {
  it("prefers the utm tag and folds known networks", () => {
    expect(visitSource("https://www.google.com/", "ig", own)).toBe("instagram");
    expect(visitSource("https://l.instagram.com/?u=x", null, own)).toBe("instagram");
    expect(visitSource("https://m.facebook.com/", null, own)).toBe("facebook");
    expect(visitSource("https://www.google.mn/", null, own)).toBe("google");
    expect(visitSource("https://news.mn/article", null, own)).toBe("news.mn");
  });

  it("treats internal navigation and missing referrers as direct (null)", () => {
    expect(visitSource("https://elitetravel.mn/tours", null, own)).toBeNull();
    expect(visitSource("", null, own)).toBeNull();
    expect(visitSource("not a url", null, own)).toBeNull();
  });
});

describe("parseEvent", () => {
  const base = { visitor: "v_abcdefgh12", session: "s_abcdefgh12", type: "tour_view", path: "/tours/bali?utm_source=ig", tour: "bali", device: "phone" };

  it("keeps only clean fields and drops the query string", () => {
    expect(parseEvent(base, own)).toEqual({
      visitor: "v_abcdefgh12",
      session: "s_abcdefgh12",
      type: "tour_view",
      path: "/tours/bali",
      tour_id: "bali",
      source: null,
      utm_campaign: null,
      device: "phone",
    });
  });

  it("rejects unknown event types and malformed ids", () => {
    expect(parseEvent({ ...base, type: "purchase" }, own)).toBeNull();
    expect(parseEvent({ ...base, visitor: "x" }, own)).toBeNull();
    expect(parseEvent("nope", own)).toBeNull();
    expect(parseEvent({ ...base, tour: "Bali; drop table" }, own)?.tour_id).toBeNull();
  });
});

describe("isBot", () => {
  it("skips crawlers and requests without a user agent", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148")).toBe(false);
  });
});
