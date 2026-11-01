import { DRAFT_TEMPLATE, renderContract, unfilledParts } from "@/lib/contract";
import { documentSlots } from "@/lib/documents";
import { describe, expect, it } from "vitest";

describe("documentSlots", () => {
  it("asks each traveller, adults only or children only as the document requires", () => {
    const slots = documentSlots(["visa_photo", "employment_letter", "birth_certificate"], { adults: 2, kids: 1 });
    expect(slots.filter((s) => s.type === "visa_photo")).toHaveLength(3);
    expect(slots.filter((s) => s.type === "employment_letter")).toHaveLength(2);
    expect(slots.filter((s) => s.type === "birth_certificate")).toHaveLength(1);
  });

  it("labels slots only when there is more than one", () => {
    expect(documentSlots(["passport_copy"], { adults: 1, kids: 0 })[0].label).toBe("");
    expect(documentSlots(["passport_copy"], { adults: 2, kids: 0 }).map((s) => s.label)).toEqual(["Зорчигч 1", "Зорчигч 2"]);
  });

  it("asks nothing when the tour requires nothing, or no children travel", () => {
    expect(documentSlots(undefined, { adults: 2, kids: 2 })).toEqual([]);
    expect(documentSlots(["minor_consent"], { adults: 2, kids: 0 })).toEqual([]);
  });
});

describe("contract template", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(renderContract("{{name}} · {{ tour }} · {{nope}}", { name: "Бат", tour: "Бали" } as never)).toBe("Бат · Бали · {{nope}}");
  });

  it("the draft cannot be published until its bracketed parts are filled", () => {
    expect(DRAFT_TEMPLATE.published).toBe(false);
    expect(unfilledParts(DRAFT_TEMPLATE.body).length).toBeGreaterThan(0);
    expect(unfilledParts(DRAFT_TEMPLATE.body.replace(/\[[^\]]+\]/g, "бөглөсөн"))).toEqual([]);
  });
});
