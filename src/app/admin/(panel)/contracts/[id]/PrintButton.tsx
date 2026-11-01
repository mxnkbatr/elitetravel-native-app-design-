"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-white">
      Хэвлэх / PDF
    </button>
  );
}
