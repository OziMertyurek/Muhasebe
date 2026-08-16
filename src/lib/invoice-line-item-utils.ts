import { Prisma } from "#prisma/client";

export type InvoiceLineDecimalInput = Prisma.Decimal | string | number;

export type InvoiceLineCalculationInput = {
  description: string;
  quantity: InvoiceLineDecimalInput;
  unitPrice: InvoiceLineDecimalInput;
  vatRate: InvoiceLineDecimalInput;
  discountAmount?: InvoiceLineDecimalInput | null;
};

export type InvoiceLineCalculationResult = {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  grossBeforeDiscount: Prisma.Decimal;
  taxableBase: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

export type InvoiceTotalsCalculationResult = {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

export type InvoiceLineValidationField =
  | "description"
  | "quantity"
  | "unitPrice"
  | "vatRate"
  | "discountAmount"
  | "lines";

export type InvoiceLineValidationErrorCode =
  | "DESCRIPTION_REQUIRED"
  | "QUANTITY_REQUIRED"
  | "QUANTITY_POSITIVE"
  | "UNIT_PRICE_REQUIRED"
  | "UNIT_PRICE_NON_NEGATIVE"
  | "VAT_RATE_REQUIRED"
  | "VAT_RATE_NON_NEGATIVE"
  | "DISCOUNT_NON_NEGATIVE"
  | "DISCOUNT_EXCEEDS_GROSS"
  | "LINE_REQUIRED";

export type InvoiceLineValidationError = {
  field: InvoiceLineValidationField;
  code: InvoiceLineValidationErrorCode;
  message: string;
};

const moneyScale = 2;
const oneHundred = new Prisma.Decimal(100);
const zero = new Prisma.Decimal(0);

export class InvoiceLineValidationException extends Error {
  readonly errors: InvoiceLineValidationError[];

  constructor(errors: InvoiceLineValidationError[]) {
    super("Fatura kalemi doÄŸrulama hatasÄ±.");
    this.name = "InvoiceLineValidationException";
    this.errors = errors;
  }
}

export function calculateInvoiceLine(
  input: InvoiceLineCalculationInput,
): InvoiceLineCalculationResult {
  const errors = validateInvoiceLine(input);

  if (errors.length > 0) {
    throw new InvoiceLineValidationException(errors);
  }

  const quantity = toDecimal(input.quantity);
  const unitPrice = toMoneyDecimal(input.unitPrice);
  const vatRate = toDecimal(input.vatRate);
  const discountAmount = toMoneyDecimal(input.discountAmount ?? 0);
  const grossBeforeDiscount = roundMoney(quantity.times(unitPrice));
  const taxableBase = roundMoney(grossBeforeDiscount.minus(discountAmount));
  const vatAmount = roundMoney(taxableBase.times(vatRate).dividedBy(oneHundred));
  const lineTotal = roundMoney(taxableBase.plus(vatAmount));

  return {
    description: input.description.trim(),
    quantity,
    unitPrice,
    vatRate,
    discountAmount,
    grossBeforeDiscount,
    taxableBase,
    vatAmount,
    lineTotal,
  };
}

export function calculateInvoiceTotals(
  lines: InvoiceLineCalculationInput[],
): InvoiceTotalsCalculationResult {
  const errors = validateInvoiceLines(lines);

  if (errors.length > 0) {
    throw new InvoiceLineValidationException(errors);
  }

  return lines.map(calculateInvoiceLine).reduce(
    (totals, line) => ({
      subtotal: totals.subtotal.plus(line.grossBeforeDiscount),
      discountAmount: totals.discountAmount.plus(line.discountAmount),
      vatAmount: totals.vatAmount.plus(line.vatAmount),
      totalAmount: totals.totalAmount.plus(line.lineTotal),
    }),
    {
      subtotal: zero,
      discountAmount: zero,
      vatAmount: zero,
      totalAmount: zero,
    },
  );
}

export function validateInvoiceLines(
  lines: InvoiceLineCalculationInput[],
): InvoiceLineValidationError[] {
  if (lines.length === 0) {
    return [
      {
        field: "lines",
        code: "LINE_REQUIRED",
        message: "En az bir fatura kalemi girilmeli.",
      },
    ];
  }

  return lines.flatMap(validateInvoiceLine);
}

export function validateInvoiceLine(
  input: InvoiceLineCalculationInput,
): InvoiceLineValidationError[] {
  const errors: InvoiceLineValidationError[] = [];

  if (!input.description.trim()) {
    errors.push({
      field: "description",
      code: "DESCRIPTION_REQUIRED",
      message: "Kalem aÃ§Ä±klamasÄ± boÅŸ olamaz.",
    });
  }

  const quantity = parseDecimal(input.quantity);
  const unitPrice = parseDecimal(input.unitPrice);
  const vatRate = parseDecimal(input.vatRate);
  const discountAmount = parseDecimal(input.discountAmount ?? 0);

  if (!quantity) {
    errors.push({
      field: "quantity",
      code: "QUANTITY_REQUIRED",
      message: "Miktar geÃ§erli bir sayÄ± olmalÄ±.",
    });
  } else if (quantity.lessThanOrEqualTo(0)) {
    errors.push({
      field: "quantity",
      code: "QUANTITY_POSITIVE",
      message: "Miktar 0'dan bÃ¼yÃ¼k olmalÄ±.",
    });
  }

  if (!unitPrice) {
    errors.push({
      field: "unitPrice",
      code: "UNIT_PRICE_REQUIRED",
      message: "Birim fiyat geÃ§erli bir sayÄ± olmalÄ±.",
    });
  } else if (unitPrice.lessThan(0)) {
    errors.push({
      field: "unitPrice",
      code: "UNIT_PRICE_NON_NEGATIVE",
      message: "Birim fiyat negatif olamaz.",
    });
  }

  if (!vatRate) {
    errors.push({
      field: "vatRate",
      code: "VAT_RATE_REQUIRED",
      message: "KDV oranÄ± geÃ§erli bir sayÄ± olmalÄ±.",
    });
  } else if (vatRate.lessThan(0)) {
    errors.push({
      field: "vatRate",
      code: "VAT_RATE_NON_NEGATIVE",
      message: "KDV oranÄ± negatif olamaz.",
    });
  }

  if (!discountAmount) {
    errors.push({
      field: "discountAmount",
      code: "DISCOUNT_NON_NEGATIVE",
      message: "Ä°skonto tutarÄ± geÃ§erli bir sayÄ± olmalÄ±.",
    });
  } else if (discountAmount.lessThan(0)) {
    errors.push({
      field: "discountAmount",
      code: "DISCOUNT_NON_NEGATIVE",
      message: "Ä°skonto tutarÄ± negatif olamaz.",
    });
  }

  if (
    quantity &&
    quantity.greaterThan(0) &&
    unitPrice &&
    unitPrice.greaterThanOrEqualTo(0) &&
    discountAmount &&
    discountAmount.greaterThanOrEqualTo(0)
  ) {
    const grossBeforeDiscount = roundMoney(quantity.times(unitPrice));

    if (discountAmount.greaterThan(grossBeforeDiscount)) {
      errors.push({
        field: "discountAmount",
        code: "DISCOUNT_EXCEEDS_GROSS",
        message: "Ä°skonto tutarÄ± KDV Ã¶ncesi satÄ±r tutarÄ±nÄ± aÅŸamaz.",
      });
    }
  }

  return errors;
}

function parseDecimal(value: InvoiceLineDecimalInput | null | undefined) {
  try {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
}

function toDecimal(value: InvoiceLineDecimalInput) {
  return new Prisma.Decimal(value);
}

function toMoneyDecimal(value: InvoiceLineDecimalInput) {
  return roundMoney(toDecimal(value));
}

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(moneyScale, Prisma.Decimal.ROUND_HALF_UP);
}
