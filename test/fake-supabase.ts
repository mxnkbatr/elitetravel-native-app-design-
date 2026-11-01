/**
 * In-memory stand-in for the parts of the Supabase query builder the server code uses,
 * so payment flows can be tested end to end without a database.
 */
type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null };

const UNIQUE: Record<string, string[][]> = {
  payments: [["id"]],
  receipts: [["payment_id"]],
  booking_requests: [["id"]],
  booking_messages: [["booking_id", "key"]],
};

const DEFAULTS: Record<string, () => Row> = {
  payments: () => ({ status: "pending", method: "qpay", created_at: new Date().toISOString(), paid_at: null, qpay_invoice_id: null }),
  receipts: () => ({ status: "pending", attempts: 0, created_at: new Date().toISOString(), bill_id: null, lottery: null, qr_data: null, error: null, provider: null }),
  booking_messages: () => ({ created_at: new Date().toISOString(), key: null, author: null }),
};

export class FakeSupabase {
  tables = new Map<string, Row[]>();
  private nextId = 1;

  reset() {
    this.tables.clear();
    this.nextId = 1;
  }

  rows(table: string) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  seed(table: string, rows: Row[]) {
    this.rows(table).push(...rows.map((r) => ({ ...r })));
  }

  from(table: string) {
    return new Query(this, table);
  }

  newId() {
    return this.nextId++;
  }
}

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: ((r: Row) => boolean)[] = [];
  private payload: Row[] | Row | null = null;
  private returning = false;
  private head = false;
  private counting = false;
  private one: "single" | "maybe" | null = null;
  private sort: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private conflict: { cols: string[]; ignore: boolean } | null = null;

  constructor(
    private db: FakeSupabase,
    private table: string,
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== "select") this.returning = true;
    if (opts?.count) this.counting = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.payload = rows;
    this.conflict = { cols: (opts?.onConflict ?? "id").split(","), ignore: !!opts?.ignoreDuplicates };
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => r[c] !== v);
    return this;
  }
  gt(c: string, v: string | number) {
    this.filters.push((r) => (r[c] as string | number) > v);
    return this;
  }
  lt(c: string, v: string | number) {
    this.filters.push((r) => (r[c] as string | number) < v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  is(c: string, v: null) {
    this.filters.push((r) => (r[c] ?? null) === v);
    return this;
  }
  not(c: string, op: string, v: null) {
    if (op === "is") this.filters.push((r) => (r[c] ?? null) !== v);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sort = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, bad);
  }

  private matches() {
    return this.db.rows(this.table).filter((r) => this.filters.every((f) => f(r)));
  }

  private conflictWith(row: Row, cols: string[]) {
    if (cols.some((c) => row[c] == null)) return undefined;
    return this.db.rows(this.table).find((r) => cols.every((c) => r[c] === row[c]));
  }

  private shape(rows: Row[]): Result {
    let list = [...rows];
    if (this.sort) {
      const { col, asc } = this.sort;
      list.sort((a, b) => ((a[col] as string) < (b[col] as string) ? -1 : (a[col] as string) > (b[col] as string) ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) list = list.slice(0, this.max);
    const copies = list.map((r) => ({ ...r }));
    if (this.head) return { data: null, error: null, count: copies.length };
    if (this.one === "maybe") return { data: copies[0] ?? null, error: null };
    if (this.one === "single") return copies[0] ? { data: copies[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    return { data: copies, error: null, count: this.counting ? copies.length : null };
  }

  private run(): Result {
    const table = this.db.rows(this.table);
    if (this.op === "select") return this.shape(this.matches());

    if (this.op === "update") {
      const hit = this.matches();
      for (const r of hit) Object.assign(r, this.payload);
      return this.returning ? this.shape(hit) : { data: null, error: null };
    }

    if (this.op === "delete") {
      const hit = new Set(this.matches());
      this.db.tables.set(this.table, table.filter((r) => !hit.has(r)));
      return { data: null, error: null };
    }

    const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
    const written: Row[] = [];
    for (const raw of incoming) {
      const row: Row = { ...(DEFAULTS[this.table]?.() ?? {}), ...raw };
      if (row.id == null && this.table !== "booking_requests") row.id = this.db.newId();
      if (this.op === "upsert" && this.conflict) {
        const existing = this.conflictWith(row, this.conflict.cols);
        if (existing) {
          if (!this.conflict.ignore) Object.assign(existing, raw);
          continue;
        }
      } else {
        for (const cols of UNIQUE[this.table] ?? []) {
          if (this.conflictWith(row, cols)) return { data: null, error: { code: "23505", message: `duplicate ${cols.join(",")}` } };
        }
      }
      table.push(row);
      written.push(row);
    }
    return this.returning ? this.shape(written) : { data: null, error: null };
  }
}

export const fake = new FakeSupabase();
