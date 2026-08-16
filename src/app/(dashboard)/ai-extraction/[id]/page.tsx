import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, ExternalLink, FileText, Pencil, ScanText, SearchCheck } from "lucide-react";
import { archiveAiExtractionJobAction } from "@/app/(dashboard)/ai-extraction/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { parseCanonicalDraftJson, type CanonicalExtractedInvoiceDraft } from "@/lib/ai-invoice-extraction-core";
import type { AiMatchResult, AiProductMatchResult } from "@/lib/ai-matching-core";
import {
  aiExtractionStatusLabels,
  formatConfidence,
} from "@/lib/ai-extraction-utils";
import { formatDate } from "@/lib/company-utils";
import { getDocumentProcessorMode, getProcessingUnavailableMessage } from "@/lib/document-processing-providers";
import { fileRelatedTypeLabels, formatFileSize, getFileKind } from "@/lib/file-utils";
import { calculateCurrentStock } from "@/lib/inventory-core";
import { productUnitOptions } from "@/lib/product-utils";
import { prisma } from "@/lib/prisma";

type AiExtractionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    extracted?: string;
    parsed?: string;
    companyMatched?: string;
    productsMatched?: string;
    reviewed?: string;
    posted?: string;
  }>;
};

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#607167]">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-[#223028]">{value || "-"}</p>
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text" }: {
  label: string;
  name: string;
  defaultValue: string | null;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#46534b]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8cf] bg-white px-3 text-sm text-[#16201b] shadow-sm outline-none transition focus:border-[#1f6f54]"
      />
    </label>
  );
}

function SelectField({ label, name, defaultValue, children }: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-[#46534b]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8cf] bg-white px-3 text-sm text-[#16201b] shadow-sm outline-none transition focus:border-[#1f6f54]"
      >
        {children}
      </select>
    </label>
  );
}

function ActionButton({ action, icon: Icon, label, tone = "green" }: {
  action: string;
  icon: typeof FileText;
  label: string;
  tone?: "green" | "blue" | "brown";
}) {
  const className = {
    green: "bg-[#1f6f54] hover:bg-[#195d47]",
    blue: "bg-[#274c77] hover:bg-[#203f64]",
    brown: "bg-[#6f4e37] hover:bg-[#5d422f]",
  }[tone];

  return (
    <form action={action} method="post">
      <button className={`inline-flex h-10 w-fit items-center gap-2 rounded-md px-4 text-sm font-semibold text-white shadow-sm transition ${className}`}>
        <Icon className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}

function parseDraft(value: string | null) {
  try {
    return parseCanonicalDraftJson(value);
  } catch {
    return null;
  }
}

function getCompanyMatch(draft: CanonicalExtractedInvoiceDraft | null) {
  const value = draft?.matches.company;
  return isRecord(value) ? value as unknown as AiMatchResult : null;
}

function getProductMatches(draft: CanonicalExtractedInvoiceDraft | null) {
  return Array.isArray(draft?.matches.products)
    ? draft.matches.products.filter(isRecord) as unknown as AiProductMatchResult[]
    : [];
}

function matchLabel(match: AiMatchResult | AiProductMatchResult | null | undefined) {
  if (!match) return "Yok";
  if (match.status === "EXACT") return `Kesin - ${match.reason}`;
  if (match.status === "HIGH_CONFIDENCE") return `Guclu aday - %${Math.round(match.confidence * 100)}`;
  if (match.status === "AMBIGUOUS") return "Belirsiz";
  return "Bulunamadi";
}

function messageForQuery(query?: Awaited<AiExtractionDetailPageProps["searchParams"]>) {
  if (query?.extracted === "1") return { tone: "ok" as const, text: "Dosyadan metin cikarildi." };
  if (query?.parsed === "1") return { tone: "ok" as const, text: "Fatura taslagi olusturuldu." };
  if (query?.companyMatched === "1") return { tone: "ok" as const, text: "Cari eslestirme tamamlandi." };
  if (query?.productsMatched === "1") return { tone: "ok" as const, text: "Urun eslestirme tamamlandi." };
  if (query?.reviewed === "1") return { tone: "ok" as const, text: "Taslak incelendi olarak kaydedildi. Muhasebe veya stok kaydi olusturulmadi." };
  if (query?.posted === "1") return { tone: "ok" as const, text: "AI taslagi faturaya kaydedildi." };
  if (query?.error) return { tone: "error" as const, text: "Islem tamamlanamadi. Taslak ve kaynak dosya korunuyor." };
  return null;
}

function getPostingReadiness(
  job: { postedInvoiceId: string | null },
  draft: CanonicalExtractedInvoiceDraft | null,
  selectedCompanyId: string,
  invoiceType: string,
) {
  if (job.postedInvoiceId) return "KAYDEDILDI";
  if (!draft) return "TASLAK YOK";
  if (!selectedCompanyId || !invoiceType || !draft.document.invoiceNumber || !draft.document.invoiceDate) {
    return "EKSIK BILGI";
  }
  if (draft.validation.status !== "OK") return "KONTROL GEREKLI";
  if (draft.lineItems.length === 0) return "KALEM YOK";
  return "KAYDA HAZIR";
}

export default async function AiExtractionDetailPage({
  params,
  searchParams,
}: AiExtractionDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [job, companies, products] = await Promise.all([
    prisma.aiExtractionJob.findFirst({
      where: {
        id,
        deletedAt: null,
        fileAttachment: { deletedAt: null },
      },
      include: {
        fileAttachment: {
          select: {
            id: true,
            originalFileName: true,
            storedFileName: true,
            mimeType: true,
            fileSize: true,
            relatedType: true,
            uploadedAt: true,
          },
        },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, taxNumber: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ name: "asc" }, { sku: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        stockMovements: {
          select: {
            type: true,
            quantity: true,
          },
        },
      },
    }),
  ]);

  if (!job) {
    notFound();
  }

  const draft = parseDraft(job.extractedJson);
  const companyMatch = getCompanyMatch(draft);
  const productMatches = getProductMatches(draft);
  const notice = messageForQuery(query);
  const selectedCompanyId = draft?.review.selectedCompanyId ?? companyMatch?.matchedId ?? "";
  const invoiceType = draft?.review.invoiceType === "SALES" || draft?.review.invoiceType === "PURCHASE"
    ? draft.review.invoiceType
    : "";
  const postingReadiness = getPostingReadiness(job, draft, selectedCompanyId, invoiceType);
  const processorMode = getDocumentProcessorMode();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/ai-extraction" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]">
            <ArrowLeft className="h-4 w-4" />
            AI analiz kayitlarina don
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">AI Fatura Okuma</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-[#16201b]">
            {job.fileAttachment.originalFileName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Bu ekran son inceleme adimidir. Onaydan sonra gercek fatura olusur; stok etkisi sadece urune bagli kalemlerde uygulanir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton action={`/ai-extraction/${job.id}/extract`} icon={FileText} label="Metin Cikar" />
          <ActionButton action={`/ai-extraction/${job.id}/parse`} icon={ScanText} label="Taslak Olustur" tone="blue" />
          <ActionButton action={`/ai-extraction/${job.id}/match-company`} icon={SearchCheck} label="Cari Esle" tone="brown" />
          <ActionButton action={`/ai-extraction/${job.id}/match-products`} icon={SearchCheck} label="Urunleri Esle" tone="blue" />
          <Link href={`/ai-extraction/${job.id}/edit`} className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#223028] shadow-sm transition hover:border-[#aebdae]">
            <Pencil className="h-4 w-4" />
            JSON Duzenle
          </Link>
          <form action={archiveAiExtractionJobAction.bind(null, job.id)}>
            <ConfirmSubmitButton
              message="Bu AI analiz kaydi arsivlenecek. Kaynak dosya silinmez."
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d8b4ae] bg-white px-4 text-sm font-semibold text-[#8b2f28] shadow-sm transition hover:border-[#b9473d]"
            >
              <Archive className="h-4 w-4" />
              Arsivle
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>

      {notice ? (
        <div className={`rounded-md border px-4 py-3 text-sm font-medium ${
          notice.tone === "ok"
            ? "border-[#b8dcc7] bg-[#f4fbf6] text-[#1f6f54]"
            : "border-[#e8c4bf] bg-[#fff7f5] text-[#8b2f28]"
        }`}>
          {notice.text}
        </div>
      ) : null}

      {processorMode !== "LOCAL" && !job.postedInvoiceId ? (
        <div className="rounded-md border border-[#ead7a4] bg-[#fffaf0] px-4 py-3 text-sm font-medium text-[#6f5220]">
          {getProcessingUnavailableMessage()}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#16201b]">Kaynak dosya</h2>
            <Link href={`/files/${job.fileAttachment.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8cf] px-3 text-sm font-semibold text-[#223028] transition hover:border-[#aebdae]">
              Dosya detay
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Orijinal dosya" value={job.fileAttachment.originalFileName} />
            <InfoItem label="Saklanan dosya" value={job.fileAttachment.storedFileName} />
            <InfoItem label="Dosya turu" value={getFileKind(job.fileAttachment.mimeType)} />
            <InfoItem label="Mime type" value={job.fileAttachment.mimeType ?? "-"} />
            <InfoItem label="Dosya boyutu" value={formatFileSize(job.fileAttachment.fileSize)} />
            <InfoItem label="Yuklenme" value={formatDate(job.fileAttachment.uploadedAt)} />
            <InfoItem label="Iliski tipi" value={fileRelatedTypeLabels[job.fileAttachment.relatedType]} />
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Analiz durumu</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Durum" value={aiExtractionStatusLabels[job.status]} />
            <InfoItem label="Kayit hazirligi" value={postingReadiness} />
            <InfoItem label="Guven skoru" value={formatConfidence(job.confidence ?? draft?.confidence.score)} />
            <InfoItem label="Olusturulma" value={formatDate(job.createdAt)} />
            <InfoItem label="Guncellenme" value={formatDate(job.updatedAt)} />
            <InfoItem label="Olusan fatura" value={job.postedInvoiceId ?? "-"} />
          </div>
          {job.postedInvoiceId ? (
            <Link href={`/invoices/${job.postedInvoiceId}`} className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]">
              Faturayi ac
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>

      <form action={`/ai-extraction/${job.id}/create-invoice`} method="post" className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Inceleme taslagi</h2>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              Alanlari duzeltip onayladiginizda bu taslaktan gercek fatura olusturulur. Tahsilat/odeme olusmaz.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-3 py-1 text-xs font-semibold text-[#46534b]">
            {postingReadiness}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Cari secimi" name="companyId" defaultValue={selectedCompanyId}>
            <option value="">Secilmedi</option>
            <option value="__NEW__">Yeni cari olustur</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}{company.taxNumber ? ` - ${company.taxNumber}` : ""}
              </option>
            ))}
          </SelectField>
          <SelectField label="Fatura tipi" name="invoiceType" defaultValue={invoiceType}>
            <option value="">Secin</option>
            <option value="SALES">Ben fatura kestim</option>
            <option value="PURCHASE">Bana fatura kesildi</option>
          </SelectField>
          <Field label="Fatura no" name="invoiceNumber" defaultValue={draft?.document.invoiceNumber ?? null} />
          <Field label="Fatura tarihi" name="invoiceDate" type="date" defaultValue={draft?.document.invoiceDate ?? null} />
          <Field label="Vade tarihi" name="dueDate" type="date" defaultValue={draft?.document.dueDate ?? null} />
          <Field label="Para birimi" name="currency" defaultValue={draft?.document.currency ?? "TRY"} />
          <Field label="Firma adi" name="companyName" defaultValue={draft?.document.companyName ?? null} />
          <Field label="Vergi no" name="taxNumber" defaultValue={draft?.document.taxNumber ?? null} />
          <Field label="Vergi dairesi" name="taxOffice" defaultValue={draft?.document.taxOffice ?? null} />
          <Field label="Ara toplam" name="subtotal" defaultValue={draft?.document.subtotal ?? null} />
          <Field label="KDV toplami" name="vatAmount" defaultValue={draft?.document.vatAmount ?? null} />
          <Field label="Iskonto" name="discountAmount" defaultValue={draft?.document.discountAmount ?? "0"} />
          <Field label="Genel toplam" name="totalAmount" defaultValue={draft?.document.totalAmount ?? null} />
        </div>

        <div className="mt-5 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4">
          <p className="text-sm font-semibold text-[#223028]">Cari eslesme</p>
          <p className="mt-2 text-sm text-[#647067]">
            {matchLabel(companyMatch)}
          </p>
        </div>

        <input type="hidden" name="lineCount" value={draft?.lineItems.length ?? 0} />
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1160px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#f1f4f1] text-xs font-semibold uppercase text-[#607167]">
              <tr>
                <th className="px-3 py-3">Urun</th>
                <th className="px-3 py-3">Aciklama</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Barkod</th>
                <th className="px-3 py-3">Miktar</th>
                <th className="px-3 py-3">Birim</th>
                <th className="px-3 py-3">Birim fiyat</th>
                <th className="px-3 py-3">Iskonto</th>
                <th className="px-3 py-3">KDV %</th>
                <th className="px-3 py-3">Satir toplami</th>
                <th className="px-3 py-3">Eslesme</th>
              </tr>
            </thead>
            <tbody>
              {(draft?.lineItems ?? []).map((line, index) => {
                const productMatch = productMatches.find((match) => match.lineIndex === index);
                const selectedProductId = productMatch?.matchedId ?? "";

                return (
                  <tr key={`${line.description ?? "line"}-${index}`} className="border-t border-[#e5e9e5] align-top">
                    <td className="px-3 py-3">
                      <select name={`line-${index}-productId`} defaultValue={selectedProductId} className="h-10 w-44 rounded-md border border-[#cfd8cf] bg-white px-2 text-sm">
                        <option value="">Serbest satir</option>
                        <option value="__NEW__">Yeni urun olustur</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} - {product.name} - Stok: {calculateCurrentStock(product.stockMovements).toString()}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3"><input name={`line-${index}-description`} defaultValue={line.description ?? ""} className="h-10 w-56 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-sku`} defaultValue={line.sku ?? ""} className="h-10 w-32 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-barcode`} defaultValue={line.barcode ?? ""} className="h-10 w-36 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-quantity`} defaultValue={line.quantity ?? ""} className="h-10 w-24 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3">
                      <select name={`line-${index}-unit`} defaultValue={line.unit ?? "ADET"} className="h-10 w-28 rounded-md border border-[#cfd8cf] bg-white px-2">
                        {productUnitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3"><input name={`line-${index}-unitPrice`} defaultValue={line.unitPrice ?? ""} className="h-10 w-28 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-discountAmount`} defaultValue={line.discountAmount ?? "0"} className="h-10 w-28 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-vatRate`} defaultValue={line.vatRate ?? ""} className="h-10 w-24 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3"><input name={`line-${index}-lineTotal`} defaultValue={line.lineTotal ?? ""} className="h-10 w-28 rounded-md border border-[#cfd8cf] px-2" /></td>
                    <td className="px-3 py-3 text-[#647067]">{matchLabel(productMatch)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <WarningList title="Dogrulama uyarilari" warnings={draft?.validation.warnings ?? []} />
          <WarningList title="Kalite uyarilari" warnings={draft?.confidence.warnings ?? []} />
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-md border border-[#dce2dc] bg-[#fbfcfa] p-4 text-sm text-[#46534b]">
          <input type="checkbox" name="confirmCreateInvoice" value="yes" required disabled={Boolean(job.postedInvoiceId)} className="mt-1 h-4 w-4 rounded border-[#cfd8cf]" />
          <span>Incelemeyi tamamladim. Bu taslaktan fatura ve urune bagli stok hareketleri olusturulsun; tahsilat/odeme olusturulmasin.</span>
        </label>

        <div className="mt-5 flex justify-end">
          <button disabled={Boolean(job.postedInvoiceId)} className="inline-flex h-10 w-fit items-center rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:cursor-not-allowed disabled:bg-[#9aa89f]">
            Onayla ve Faturayi Kaydet
          </button>
        </div>
      </form>

      <section className="grid gap-5 lg:grid-cols-2">
        <TextBlock title="Ham cikarilan metin" value={job.rawExtractedText} />
        <TextBlock title="Taslak JSON" value={job.extractedJson} />
      </section>
    </div>
  );
}

function WarningList({ title, warnings }: { title: string; warnings: string[] }) {
  return (
    <div className="rounded-md border border-[#ead7a4] bg-[#fffaf0] p-4">
      <p className="text-sm font-semibold text-[#6f5220]">{title}</p>
      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-[#6f5220]">
          {warnings.map((warning) => <li key={warning}>- {warning}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#6f5220]">Uyari yok.</p>
      )}
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#16201b]">{title}</h2>
      {value ? (
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 font-mono text-sm leading-6 text-[#223028]">{value}</pre>
      ) : (
        <p className="mt-4 text-sm text-[#647067]">Henuz veri yok.</p>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
