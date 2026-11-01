import { PrintButton } from "@/app/admin/(panel)/contracts/[id]/PrintButton";
import { requireAdmin } from "@/lib/server/auth";
import { signedContract } from "@/lib/server/contract";
import { notFound } from "next/navigation";

/** A signed contract exactly as the traveller signed it, ready to print or save as PDF. */
export default async function AdminSignedContractPage({ params }: PageProps<"/admin/contracts/[id]">) {
  await requireAdmin("bookings.view");
  const { id } = await params;
  const c = await signedContract(id);
  if (!c) notFound();

  return (
    <article className="mx-auto max-w-3xl rounded-[1.4rem] bg-white p-6 shadow-sm sm:p-10 print:shadow-none">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <pre className="whitespace-pre-wrap font-serif text-[0.95rem] leading-relaxed text-ink">{c.body}</pre>
      <div className="mt-8 border-t border-[var(--line)] pt-5 text-sm">
        <p>
          Захиалагч: <b>{c.signed_name}</b>
        </p>
        <p className="text-muted">Цахимаар гарын үсэг зурсан: {new Date(c.signed_at).toLocaleString("mn-MN")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.signature_png} alt="Гарын үсэг" className="mt-2 h-20" />
        <p className="mt-4 break-all font-mono text-[0.65rem] text-muted">
          Хувилбар {c.version} · SHA-256 {c.body_sha256}
          {c.ip ? ` · IP ${c.ip}` : ""}
        </p>
      </div>
    </article>
  );
}
