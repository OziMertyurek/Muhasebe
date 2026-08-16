import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  DatabaseBackup,
  Download,
  FileArchive,
  FolderArchive,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { HelpHint } from "@/components/ui/help-hint";
import {
  formatBackupReminderDate,
  getBackupReminderStatus,
} from "@/lib/backup-reminder-utils";
import {
  formatFileSize,
  getDatabaseBackupInfo,
  getUploadsBackupInfo,
} from "@/lib/backup-utils";
import { RestoreValidationForm } from "@/components/settings/restore-validation-form";
import { isPostgresRuntime } from "@/lib/app-paths";

export const dynamic = "force-dynamic";

type BackupSettingsPageProps = {
  searchParams?: Promise<{
    reminderSaved?: string;
  }>;
};

const checklist = [
  "Tam yedeği indir",
  "ZIP dosyasını harici diske veya güvenli bulut depolamaya koy",
  "Yedek tarihini not al",
  "Önemli işlemlerden önce yeni yedek al",
];

export default async function BackupSettingsPage({ searchParams }: BackupSettingsPageProps) {
  const database = getDatabaseBackupInfo();
  const uploads = getUploadsBackupInfo();
  const postgresRuntime = isPostgresRuntime();
  const [backupReminder, params] = await Promise.all([
    getBackupReminderStatus(),
    searchParams,
  ]);
  const selectedReminderValue = backupReminder.enabled
    ? String(backupReminder.intervalDays)
    : "off";

  if (postgresRuntime) {
    return (
      <div className="space-y-6">
        <section className="border-b border-[#dce2dc] pb-6">
          <Link
            href="/settings"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Ayarlara don
          </Link>
          <p className="mt-4 text-sm font-medium text-[#607167]">Ayarlar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            Yedekleme
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
            Hosted PostgreSQL yedekleri uygulama icinden ZIP olarak alinmaz;
            hosting veya veritabani saglayicisi uzerinden yonetilir.
          </p>
        </section>

        <section className="rounded-lg border border-[#bfd8cc] bg-[#fbfffc] p-5 shadow-sm ring-1 ring-[#e2f1e7]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">PostgreSQL yedekleme politikasi</h2>
              <p className="mt-2 text-sm leading-6 text-[#46534b]">
                V1 hosted production ortaminda veritabani yedekleme, geri yukleme
                ve disaster recovery islemleri sadece hosting/veritabani saglayicisi
                veya onayli operasyon proseduru ile yapilir. Uygulama icinden
                SQLite DB indirme ve ZIP restore kapali durumdadir.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#e0c4bf] bg-[#fff7f5] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fdecea] text-[#8b2f28]">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#8b2f28]">Operasyon notu</h2>
              <p className="mt-2 text-sm leading-6 text-[#6f4a45]">
                Production restore islemi uygulama kullanicisinin yapabilecegi bir
                islem degildir. Canli veritabani geri yukleme karari Product Owner
                ve hosting/veritabani operasyon sureciyle verilmelidir.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1f6f54] hover:text-[#195d47]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ayarlara dön
        </Link>
        <p className="mt-4 text-sm font-medium text-[#607167]">Ayarlar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
          Yedekleme
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          {postgresRuntime
            ? "Hosted PostgreSQL yedekleri uygulama icinden ZIP olarak alinmaz; hosting veya veritabani saglayicisi uzerinden yonetilir."
            : "Local SQLite veritabani ve yuklenen dosyalar GitHub'a gitmez. Bu yuzden duzenli olarak tam yedek alinmalidir."}
        </p>
      </section>

      <HelpHint
        title="Yedekleme ve geri yukleme icin ipucu"
        items={[
          "Duzenli olarak Tam Yedek Indir kullanin.",
          "Restore islemi mevcut verileri etkileyebilir.",
          "Bilinmeyen yedek dosyalarini kullanmayin.",
        ]}
        href="/help#yedekleme"
      />

      {params?.reminderSaved === "1" ? (
        <div className="rounded-md border border-[#b9d8c7] bg-[#f1faf4] px-4 py-3 text-sm font-medium text-[#14543f]">
          Yedek hatırlatma ayarı kaydedildi.
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e0c4bf] bg-[#fff7f5] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fdecea] text-[#8b2f28]">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#8b2f28]">Önemli yedekleme notu</h2>
            <p className="mt-2 text-sm leading-6 text-[#6f4a45]">
              GitHub sadece kodu saklar. Veritabanı, upload dosyaları ve alınan yedekler
              ayrıca korunmalıdır. Tam yedek, local kullanım için önerilen ana yedekleme
              yöntemidir.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-[#16201b]">
              Otomatik yedek hatırlatma
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              Sistem arka planda otomatik yedek almaz. Sadece son tam yedek tarihine göre
              size hatırlatma gösterir.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-[#46534b] md:grid-cols-3">
              <InfoLine
                label="Son tam yedek"
                value={formatBackupReminderDate(backupReminder.lastFullBackupAt)}
              />
              <InfoLine
                label="Hatırlatma durumu"
                value={backupReminder.enabled ? "Aktif" : "Kapalı"}
              />
              <InfoLine
                label="Geçen süre"
                value={
                  backupReminder.daysSinceLastBackup === null
                    ? "Yedek yok"
                    : `${backupReminder.daysSinceLastBackup} gün`
                }
              />
            </div>
            <div
              className={
                backupReminder.tone === "warning"
                  ? "mt-4 rounded-md border border-[#f0d9a2] bg-[#fffaf0] px-4 py-3 text-sm text-[#745214]"
                  : "mt-4 rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-4 py-3 text-sm text-[#46534b]"
              }
            >
              {backupReminder.message}
            </div>
          </div>

          <form
            action="/settings/backup/reminder"
            method="post"
            className="w-full rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 lg:max-w-xs"
          >
            <label
              htmlFor="reminderInterval"
              className="text-sm font-semibold text-[#16201b]"
            >
              Hatırlatma aralığı
            </label>
            <select
              id="reminderInterval"
              name="reminderInterval"
              defaultValue={selectedReminderValue}
              className="mt-2 w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm text-[#16201b] outline-none transition focus:border-[#1f6f54] focus:ring-2 focus:ring-[#d8eadf]"
            >
              <option value="off">Kapalı</option>
              <option value="7">7 gün</option>
              <option value="15">15 gün</option>
              <option value="30">30 gün</option>
            </select>
            <button
              type="submit"
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
            >
              Ayarı Kaydet
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[#bfd8cc] bg-[#fbfffc] p-5 shadow-sm ring-1 ring-[#e2f1e7]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                <PackageCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-[#1f6f54]">
                  Önerilen yöntem
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#16201b]">Tam yedek</h2>
                <p className="mt-2 text-sm leading-6 text-[#647067]">
                  Veritabanı, upload klasörü ve yedek metadata dosyasını tek ZIP içinde indirir.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-[#46534b] md:grid-cols-3">
            <BackupFeature icon={DatabaseBackup} label="Veritabanı" value="database/dev.db" />
            <BackupFeature
              icon={FolderArchive}
              label="Yüklenen dosyalar"
              value={uploads.exists ? "Tam yedeğe dahil" : "Klasör boş olabilir"}
            />
            <BackupFeature icon={FileArchive} label="Yedek bilgisi" value="backup-info.json" />
          </div>
          <p className="mt-4 rounded-md border border-[#e5e9e5] bg-white px-3 py-2 text-xs leading-5 text-[#647067]">
            Gizli ayar dosyaları, node_modules ve build çıktıları tam yedeğe eklenmez. ZIP
            yalnızca uygulama verisini taşımak için hazırlanır.
          </p>

          {database.exists ? (
            <a
              href="/settings/backup/download-full"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
            >
              <Download className="h-4 w-4" />
              Tam Yedek İndir
            </a>
          ) : (
            <div className="mt-5 rounded-md border border-[#e0c4bf] bg-[#fff7f5] px-4 py-3 text-sm text-[#8b2f28]">
              Veritabanı dosyası bulunamadığı için tam yedek oluşturulamaz.
            </div>
          )}
        </article>

        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">Veritabanı yedeği</h2>
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                Sadece kayıtları içeren SQLite veritabanı dosyasını indirir. Upload dosyalarını
                içermez.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 text-sm text-[#46534b]">
            <InfoLine label="Veritabanı dosyası" value={database.fileName ?? "Bulunamadı"} />
            <InfoLine label="Dosya boyutu" value={formatFileSize(database.size)} />
            <InfoLine label="Durum" value={database.exists ? "Yedeklenebilir" : "Dosya yok"} />
          </div>

          {database.exists ? (
            <a
              href="/settings/backup/download-db"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#16201b] shadow-sm transition hover:bg-[#f1f4f1]"
            >
              <Download className="h-4 w-4" />
              Veritabanı Yedeğini İndir
            </a>
          ) : (
            <div className="mt-5 rounded-md border border-[#e0c4bf] bg-[#fff7f5] px-4 py-3 text-sm text-[#8b2f28]">
              Veritabanı dosyası bulunamadı. Uygulama ilk migration sonrasında dosyayı oluşturur.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
              <FolderArchive className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">Upload klasörü bilgisi</h2>
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                `storage/uploads/` klasörü tam yedeğe dahil edilir. Klasör boşsa ZIP yine
                oluşturulur.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 text-sm text-[#46534b]">
            <p className="text-xs font-medium text-[#647067]">Yerel upload arşivi</p>
            <p className="mt-1 font-semibold text-[#16201b]">
              {uploads.exists ? "Klasör hazır" : "Klasör henüz oluşmamış"}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#647067]">
              Tam dosya yolu ekranda gösterilmez; yüklenen dosyalar tam yedek ZIP dosyasına
              güvenli biçimde eklenir.
            </p>
          </div>
        </article>

        <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#16201b]">Yedekleme kontrol listesi</h2>
          <div className="mt-4 space-y-3">
            {checklist.map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-3 text-sm text-[#46534b]"
              >
                <input type="checkbox" className="h-4 w-4 accent-[#1f6f54]" />
                {item}
              </label>
            ))}
          </div>
        </article>
      </section>

      <RestoreValidationForm />

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fff4dc] text-[#765116]">
            <Archive className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Geri yükleme sonrası not</h2>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              İşlem sonrası server&apos;ı Ctrl+C ile durdurup `npm run dev` ile yeniden başlatın.
              Böylece SQLite bağlantısı yeni veritabanı dosyasını temiz şekilde okur.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function BackupFeature({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DatabaseBackup;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#dce2dc] bg-white px-3 py-3">
      <div className="flex items-center gap-2 text-[#14543f]">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-normal">{label}</p>
      </div>
      <p className="mt-2 font-semibold text-[#16201b]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#647067]">{label}</p>
      <p className="mt-1 font-semibold text-[#16201b]">{value}</p>
    </div>
  );
}
