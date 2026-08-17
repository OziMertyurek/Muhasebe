import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

type PdfValue = string | number | null | undefined;

export type PdfTableColumn<T> = {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
  value: (row: T) => PdfValue;
};

export type PdfMoneyItem = {
  currency: string;
  amount: { toNumber: () => number };
};

const textColor = "#223028";
const mutedColor = "#647067";
const lineColor = "#dce2dc";
const headerFill = "#f1f4f1";
const windowsFontsDir =
  process.platform === "win32" && process.env.WINDIR ? path.join(process.env.WINDIR, "Fonts") : null;
const regularFontPath = windowsFontsDir ? path.join(windowsFontsDir, "arial.ttf") : null;
const boldFontPath = windowsFontsDir ? path.join(windowsFontsDir, "arialbd.ttf") : null;

function registerFonts(doc: PDFKit.PDFDocument) {
  if (regularFontPath && existsSync(regularFontPath)) {
    doc.registerFont("AppRegular", regularFontPath);
  }

  if (boldFontPath && existsSync(boldFontPath)) {
    doc.registerFont("AppBold", boldFontPath);
  }
}

function fontName(kind: "regular" | "bold") {
  if (kind === "bold" && boldFontPath && existsSync(boldFontPath)) {
    return "AppBold";
  }

  if (regularFontPath && existsSync(regularFontPath)) {
    return "AppRegular";
  }

  return kind === "bold" ? "Helvetica-Bold" : "Helvetica";
}

export function formatPdfDate(date: Date | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatPdfDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatPdfMoney(value: { toNumber: () => number }, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value.toNumber());
}

export function formatPdfSignedMoney(value: { toNumber: () => number }, currency: string) {
  const amount = value.toNumber();
  const formatted = formatPdfMoney({ toNumber: () => Math.abs(amount) }, currency);

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function moneyItemsToText(items: PdfMoneyItem[], signed = false) {
  if (items.length === 0) {
    return "0";
  }

  return items
    .map((item) =>
      signed
        ? `${item.currency}: ${formatPdfSignedMoney(item.amount, item.currency)}`
        : `${item.currency}: ${formatPdfMoney(item.amount, item.currency)}`,
    )
    .join("\n");
}

function stringifyValue(value: PdfValue) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export async function createPdfDocument(
  title: string,
  subtitle: string,
  render: (doc: PDFKit.PDFDocument) => void,
) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    bufferPages: true,
    font: regularFontPath && existsSync(regularFontPath) ? regularFontPath : undefined,
    info: {
      Title: title,
      Author: "Local Muhasebe Takip Sistemi",
    },
  });
  const chunks: Buffer[] = [];

  registerFonts(doc);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.font(fontName("bold")).fontSize(18).fillColor(textColor).text(title);
  doc.moveDown(0.35);
  doc.font(fontName("regular")).fontSize(9).fillColor(mutedColor).text(subtitle);
  doc.text(`Oluşturulma: ${formatPdfDateTime()}`);
  doc.moveDown(1);

  render(doc);

  addFooter(doc);
  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function createPdfResponse(buffer: Buffer, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
    doc.addPage();
  }

  doc.moveDown(0.4);
  doc.font(fontName("bold")).fontSize(12).fillColor(textColor).text(title);
  doc.moveDown(0.4);
}

export function drawKeyValueList(
  doc: PDFKit.PDFDocument,
  items: Array<{ label: string; value: PdfValue }>,
) {
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelWidth = 150;

  for (const item of items) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 28) {
      doc.addPage();
    }

    const y = doc.y;
    doc.font(fontName("bold")).fontSize(8).fillColor(mutedColor).text(item.label, startX, y, {
      width: labelWidth,
    });
    doc.font(fontName("regular")).fontSize(9).fillColor(textColor).text(
      stringifyValue(item.value),
      startX + labelWidth + 8,
      y,
      { width: width - labelWidth - 8 },
    );
    doc.y = Math.max(doc.y, y + 18);
  }
}

export function drawTable<T>(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn<T>[],
  rows: T[],
  emptyText = "Bu dönem için kayıt bulunamadı.",
) {
  const tableX = doc.page.margins.left;
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);
  const padding = 3;
  const headerHeight = 20;

  if (rows.length === 0) {
    doc
      .font(fontName("regular"))
      .fontSize(9)
      .fillColor(mutedColor)
      .text(emptyText, { width: tableWidth });
    doc.moveDown(0.6);
    return;
  }

  function drawHeader() {
    if (doc.y > doc.page.height - doc.page.margins.bottom - headerHeight) {
      doc.addPage();
    }

    let x = tableX;
    const y = doc.y;
    doc.rect(tableX, y, tableWidth, headerHeight).fill(headerFill);
    doc.strokeColor(lineColor).rect(tableX, y, tableWidth, headerHeight).stroke();
    doc.font(fontName("bold")).fontSize(7.5).fillColor(textColor);

    for (const column of columns) {
      doc.text(column.header, x + padding, y + 5, {
        width: column.width - padding * 2,
        align: column.align ?? "left",
      });
      x += column.width;
    }

    doc.y = y + headerHeight;
  }

  drawHeader();

  for (const row of rows) {
    doc.font(fontName("regular")).fontSize(7.2);
    const values = columns.map((column) => stringifyValue(column.value(row)));
    const rowHeight = Math.min(
      54,
      Math.max(
        18,
        ...values.map((value, index) =>
          doc.heightOfString(value, { width: columns[index].width - padding * 2 }) + 8,
        ),
      ),
    );

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      drawHeader();
    }

    let x = tableX;
    const y = doc.y;
    doc.strokeColor(lineColor).rect(tableX, y, tableWidth, rowHeight).stroke();
    doc.fillColor(textColor);

    values.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + padding, y + 4, {
        width: column.width - padding * 2,
        height: rowHeight - 6,
        align: column.align ?? "left",
        ellipsis: true,
      });
      x += column.width;
    });

    doc.y = y + rowHeight;
  }

  doc.moveDown(0.6);
}

function addFooter(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const pageNumber = index + 1;
    const footerY = doc.page.height - 28;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font(fontName("regular"))
      .fontSize(8)
      .fillColor(mutedColor)
      .text("Local Muhasebe Takip Sistemi", doc.page.margins.left, footerY, {
        width,
        align: "left",
      })
      .text(`Sayfa ${pageNumber} / ${range.count}`, doc.page.margins.left, footerY, {
        width,
        align: "right",
      });
  }
}
