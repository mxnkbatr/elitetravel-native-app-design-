# Elite Travel — төлбөр, И-баримт, паспорт

## Төлбөрийн урсгал
1. Аялагч захиалга өгнө → утсанд нь `access_token` хадгалагдана (`/bookings/<id>`).
2. «QPay · Урьдчилгаа/Бүтэн» → `POST /api/payments/qpay/create` QPay invoice үүсгэж QR, банк/хэтэвчний deeplink буцаана. Утсан дээр bottom sheet-ээр харагдана.
3. QPay `GET|POST /api/payments/qpay/callback?payment=<id>` дуудна → сервер заавал `payment/check`-ээр давхар шалгаад, `pending → paid` болгоно (давхар callback-д нэг л удаа).
4. Callback алдагдвал: нээлттэй sheet 4 секунд тутам `POST /api/payments/qpay/status`, өдөр бүрийн cron (`/api/cron/daily`) сүүлийн 7 хоногийн pending төлбөрийг дахин шалгана.
5. Төлбөр ормогц: захиалга баталгаажна (бүтэн бол «Төлсөн»), аялагчид мэдэгдэл очиж, И-баримт (`receipts`) автоматаар үүснэ.

Горим (`.env`):
- `QPAY_MODE=mock` — локал туршилт. Бодит дуудлагагүй, sheet дээрх «Туршилт: төлсөнд тооцох» товчоор төлбөрийг дуурайна. Vercel production дээр хэзээ ч асахгүй.
- `QPAY_MODE=live` + `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE` — `QPAY_BASE_URL`-ээр sandbox (`https://merchant-sandbox.qpay.mn`) эсвэл production-ыг сонгоно.
- `EBARIMT_MODE=mock | posapi | off` — PosAPI 3.0 хэрэгжүүлэлт (`src/lib/server/ebarimt.ts`) татварын эрх ирсний дараа. Унтраалттай үед баримтууд `pending` хэвээр үлдэж, асаахад cron гаргана.

## Паспортын мэдээлэл
- Аялагч зөвшөөрлийн checkbox тэмдэглэж байж хадгална (`passport_consent_at`, хувилбар `CONSENT_VERSION`).
- AES-256-GCM-ээр шифрлэгдэж `passengers_enc`-д хадгалагдана. Түлхүүр: `PASSPORT_ENCRYPTION_KEY` (`openssl rand -base64 32`). **Түлхүүрээ алдвал хадгалсан паспорт уншигдахгүй.**
- Админ дэлгэрэнгүйг зөвхөн «Паспорт» дарж эсвэл Excel татаж хардаг, бүгд `passport_access_log`-д бүртгэгдэнэ.
- Аялагч болон админ хүссэн үедээ устгана. `PASSPORT_RETENTION_DAYS` тохируулбал хөдөлснөөс хойш тэдэн хоногийн дараа cron автоматаар устгана.

## Компаниас шууд асуух зүйлс
Код дотор `TODO(confirm with provider)` гэж тэмдэглэсэн газрууд эдгээрээс хамаарна.

**QPay** (info@qpay.mn, 7610-2211)
- Invoice хэр удаан хүчинтэй вэ?
- Callback амжилтгүй болбол дахин илгээдэг үү, хэдэн удаа?
- Буцаалтын (refund) API бий юу?
- Sandbox эрх, албан API баримт бичиг.
- Мөнгө merchant-ийн дансанд хэдэн хоногт шилжих вэ?
- ~~Invoice-ийн `urls` жагсаалтад хуваан төлөх аппууд орох уу?~~ 2026-10-31-ний бодит invoice-д 23 холбоос ирсэн: «Toki App» байгаа, Pocket, Simple, Dari алга.
- Access token-ий хүчинтэй хугацаа, refresh endpoint.

**Toki** (help.toki.mn)
- QPay QR-ээр PayLater-аар төлөхөд merchant-д `payment/check` дээр PAID гэж ирэх үү?
- Merchant тусдаа гэрээ хийх шаардлагатай юу?
- Нэг удаагийн дээд дүн хэд вэ (3–12 сая хүрэх үү)?
- Аялал жуулчлал, урьдчилгаа төлбөрийг зөвшөөрөх үү? Буцаалт хэрхэн хийгдэх вэ?

**Pocket, Simple, Dari**
- QPay QR-ээр хуваан төлөх боломжтой юу?
- Merchant нөхцөл, шимтгэл, нэг удаагийн хязгаар (Dari MoneyMate 5 сая).

**Татварын алба (ebarimt)**
- Гадаад аяллын багцын НӨАТ, хотын татварын нөхцөл.
- PosAPI 3.0 холболтын бичиг баримт, merchant TIN / POS бүртгэл, барааны ангиллын код.
- Компанид (B2B) баримт олгох журам.

**Хувь хүний мэдээлэл**
- Паспортын мэдээллийг хэр удаан хадгалах ёстой/болох вэ (`PASSPORT_RETENTION_DAYS`)?

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
