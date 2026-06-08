import { prisma } from "@/lib/prisma";

export const companySettingKeys = [
  "company.name",
  "company.taxNumber",
  "company.taxOffice",
  "company.email",
  "company.phone",
  "company.country",
  "company.city",
  "company.address",
  "app.defaultCurrency",
  "app.defaultVatRate",
  "company.notes",
] as const;

export type CompanySettingKey = (typeof companySettingKeys)[number];

export type CompanySettings = Record<CompanySettingKey, string>;

export const defaultCompanySettings: CompanySettings = {
  "company.name": "",
  "company.taxNumber": "",
  "company.taxOffice": "",
  "company.email": "",
  "company.phone": "",
  "company.country": "",
  "company.city": "",
  "company.address": "",
  "app.defaultCurrency": "TRY",
  "app.defaultVatRate": "20",
  "company.notes": "",
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...companySettingKeys] } },
  });
  const settings = { ...defaultCompanySettings };

  for (const row of rows) {
    if (companySettingKeys.includes(row.key as CompanySettingKey)) {
      settings[row.key as CompanySettingKey] = row.value;
    }
  }

  return settings;
}

export async function upsertCompanySettings(settings: CompanySettings) {
  await prisma.$transaction(
    companySettingKeys.map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: settings[key] },
        create: { key, value: settings[key] },
      }),
    ),
  );
}

export function getSettingValue(settings: CompanySettings, key: CompanySettingKey) {
  return settings[key] ?? defaultCompanySettings[key];
}
