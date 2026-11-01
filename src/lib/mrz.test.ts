import { checkDigit, readMrz } from "@/lib/mrz";
import { describe, expect, it } from "vitest";

// ICAO 9303 specimen passport
const L1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const L2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";
const now = new Date("2026-11-01");

describe("MRZ", () => {
  it("computes ICAO check digits", () => {
    expect(checkDigit("L898902C3")).toBe("6");
    expect(checkDigit("740812")).toBe("2");
    expect(checkDigit("120415")).toBe("9");
  });

  it("reads the ICAO specimen", () => {
    expect(readMrz(`${L1}\n${L2}`, now)).toEqual({
      name: "ERIKSSON ANNA MARIA",
      gender: "F",
      birth: "1974-08-12",
      expiry: "2012-04-15",
      passport: "L898902C3",
      nationality: "UTO",
      valid: true,
    });
  });

  it("finds the zone among other OCR text and spacing", () => {
    const text = `REPUBLIC OF UTOPIA\nPASSPORT  PASS\n${L1.slice(0, 20)} ${L1.slice(20)}\n${L2.replace("<<<<<", "<< <<<")}\n`;
    expect(readMrz(text, now)?.valid).toBe(true);
  });

  it("repairs typical OCR confusions in numeric fields", () => {
    // 7408122 → 74O8I22, 120415 → I2O4I5
    const noisy = L2.replace("7408122", "74O8I22").replace("1204159", "I2O4I59");
    const r = readMrz(`${L1}\n${noisy}`, now);
    expect(r).toMatchObject({ birth: "1974-08-12", expiry: "2012-04-15", valid: true });
  });

  it("realigns a second line whose «<» run was miscounted", () => {
    const short = L2.replace("<<<<<10", "<<<10");
    const long = L2.replace("<<<<<10", "<<<<<<<<10");
    expect(readMrz(`${L1}\n${short}`, now)?.valid).toBe(true);
    expect(readMrz(`${L1}\n${long}`, now)?.valid).toBe(true);
  });

  it("repairs filler «<» that the OCR read as L or K (seen with Tesseract)", () => {
    const ocr = "P<MNGBATBOLD<<ERDENE<TUGS<<<LLLLLLLLLLLLLKLKLKL\nE123456782MNG9001158M3106202<<<<<<<<<<<<L<L<<8";
    expect(readMrz(ocr, now)).toMatchObject({
      name: "BATBOLD ERDENE TUGS",
      passport: "E12345678",
      birth: "1990-01-15",
      expiry: "2031-06-20",
      gender: "M",
      valid: true,
    });
  });

  it("keeps a real L at the end of a name", () => {
    const l1 = "P<MNGBAYAL<<TEMUULEN<<<<<<<<<<<<<<<<<<<<<<<<".slice(0, 44);
    expect(readMrz(`${l1}\n${L2}`, now)?.name).toBe("BAYAL TEMUULEN");
  });

  it("flags a misread it cannot verify", () => {
    const wrong = L2.replace("L898902C3", "L898902C8");
    expect(readMrz(`${L1}\n${wrong}`, now)?.valid).toBe(false);
  });

  it("still reads the dates when the name line is unreadable", () => {
    const r = readMrz(`glare glare\n${L2}`, now);
    expect(r).toMatchObject({ passport: "L898902C3", birth: "1974-08-12", name: "", valid: false });
  });

  it("returns null when there is no zone", () => {
    expect(readMrz("just a photo of a beach", now)).toBeNull();
  });
});
