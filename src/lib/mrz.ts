/**
 * Passport machine-readable zone (ICAO 9303, TD3: two lines of 44 characters) → passenger fields.
 * OCR text is noisy, so digits/letters are corrected per field and every field is verified
 * against its check digit before it is trusted.
 */

export type MrzResult = {
  name: string;
  gender?: "M" | "F";
  /** YYYY-MM-DD */
  birth?: string;
  /** YYYY-MM-DD */
  expiry?: string;
  passport: string;
  nationality: string;
  /** Every check digit matched */
  valid: boolean;
};

const LEN = 44;
const WEIGHTS = [7, 3, 1];

function charValue(c: string) {
  if (c === "<") return 0;
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  return c.charCodeAt(0) - 55; // A=10 … Z=35
}

export function checkDigit(field: string) {
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += charValue(field[i]) * WEIGHTS[i % 3];
  return String(sum % 10);
}

const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", U: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6", T: "7" };
const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "6": "G", "8": "B" };
const digits = (s: string) => [...s].map((c) => TO_DIGIT[c] ?? c).join("");
const letters = (s: string) => [...s].map((c) => TO_LETTER[c] ?? c).join("");

/** OCR text → the two MRZ lines, cleaned and padded to 44 characters, or null. */
export function findMrzLines(text: string): [string, string] | null {
  const lines = text
    .toUpperCase()
    .replace(/[«‹]/g, "<")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, "").replace(/[^A-Z0-9<]/g, ""))
    .filter((l) => l.length >= 30);
  const fit = (l: string) => (l.length >= LEN ? l.slice(0, LEN) : l.padEnd(LEN, "<"));

  for (let i = lines.length - 2; i >= 0; i--) {
    const top = lines[i];
    if (/^P[A-Z0-9<]/.test(top) && top.includes("<<")) return [fit(cleanFirst(top)), alignSecond(lines[i + 1])];
  }
  // The first line is often lost to glare; the second still carries everything but the name
  const second = lines.reverse().find((l) => /^[A-Z0-9<]{9}[0-9OQDUILZSBGT][A-Z0-9<]{3}[0-9OQDUILZSBGT]{6}/.test(l));
  return second ? ["P<<<" + "<".repeat(LEN - 4), alignSecond(second)] : null;
}

/**
 * OCR often miscounts a run of «<», which shifts the final check digits. The layout is fixed —
 * 28 characters, a 14-character personal number padded with «<», its check digit, then the
 * composite check digit — so rebuild it from both ends.
 */
function alignSecond(l: string) {
  if (l.length < 30) return l.padEnd(LEN, "<");
  const head = l.slice(0, 28);
  const composite = l[l.length - 1];
  // Tesseract tends to read runs of «<» as L or K; an empty personal number is all filler
  const middle = /^[<LK]+$/.test(l.slice(28, -1)) ? "<".repeat(15) : l.slice(28, -1);
  const personalCheck = middle[middle.length - 1] ?? "<";
  const personal = middle.slice(0, -1).replace(/<+$/, "").padEnd(14, "<").slice(0, 14);
  return head + personal + personalCheck + composite;
}

/** Names never contain «<<<», so from the first filler-looking tail on everything is filler. */
function cleanFirst(l: string) {
  const tail = l.slice(5).search(/<[<LK]*$/);
  if (tail < 0) return l;
  const at = tail + 5;
  const rest = l.slice(at);
  // Only when the tail really looks like filler (a run, not a lone separator before a name)
  return rest.length >= 3 ? l.slice(0, at) + "<".repeat(rest.length) : l;
}

function date(yymmdd: string, kind: "birth" | "expiry", now: Date) {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  const century = kind === "birth" ? (yy > now.getFullYear() % 100 ? 1900 : 2000) : 2000;
  return `${century + yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Parses TD3 lines (as returned by findMrzLines). */
export function parseMrz([line1, line2]: [string, string], now = new Date()): MrzResult | null {
  if (line2.length !== LEN) return null;

  let passport = line2.slice(0, 9);
  const passportCheck = digits(line2[9]);
  // Document numbers mix letters and digits; only swap O→0 if that is what makes the check pass
  if (checkDigit(passport) !== passportCheck && checkDigit(passport.replace(/O/g, "0")) === passportCheck) passport = passport.replace(/O/g, "0");
  const nationality = letters(line2.slice(10, 13));
  const birthRaw = digits(line2.slice(13, 19));
  const birthCheck = digits(line2[19]);
  const sex = letters(line2[20]);
  const expiryRaw = digits(line2.slice(21, 27));
  const expiryCheck = digits(line2[27]);
  const personal = line2.slice(28, 42);
  const personalCheck = digits(line2[42]);
  const finalCheck = digits(line2[43]);

  const fieldsOk =
    checkDigit(passport) === passportCheck && checkDigit(birthRaw) === birthCheck && checkDigit(expiryRaw) === expiryCheck;
  const personalOk = personalCheck === "<" || checkDigit(personal) === personalCheck || /^<+$/.test(personal);
  const composite = passport + passportCheck + birthRaw + birthCheck + expiryRaw + expiryCheck + personal + personalCheck;
  const compositeOk = checkDigit(composite) === finalCheck;

  const [surname = "", given = ""] = letters(line1.slice(5)).split("<<");
  const clean = (s: string) => s.replace(/<+/g, " ").replace(/[^A-Z ]/g, "").trim();
  const name = [clean(surname), clean(given)].filter(Boolean).join(" ");

  const birth = date(birthRaw, "birth", now);
  const expiry = date(expiryRaw, "expiry", now);
  const cleanPassport = passport.replace(/</g, "");
  if (!cleanPassport && !birth && !expiry) return null;

  return {
    name,
    gender: sex === "M" || sex === "F" ? sex : undefined,
    birth,
    expiry,
    passport: cleanPassport,
    nationality: nationality.replace(/</g, ""),
    valid: fieldsOk && personalOk && compositeOk && name.length > 0,
  };
}

/** OCR text straight to a result. */
export function readMrz(text: string, now = new Date()) {
  const lines = findMrzLines(text);
  return lines ? parseMrz(lines, now) : null;
}
