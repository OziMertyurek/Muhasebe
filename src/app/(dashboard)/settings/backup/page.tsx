import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  DatabaseBackup,
  Download,
  FolderArchive,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import {
  formatFileSize,
  getDatabaseBackupInfo,
  getUploadsBackupInfo,
} from "@/lib/backup-utils";
import { RestoreValidationForm } from "@/components/settings/restore-validation-form";

const checklist = [
  "Tam yedeği indir",
  "ZIP dosyasını harici diske veya güvenli bulut depolamaya koy",
  "Yedek tarihini not al",
  "Önemli işlemlerden önce yeni yedek al",
];

export default function BackupSettingsPage() {
  const database = getDatabaseBackupInfo();
  const uploads = getUploadsBackupInfo();

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
          Local SQLite veritabanı ve yüklenen dosyalar GitHub&apos;a gitmez. Bu yüzden düzenli
          olarak tam yedek alınmalıdır.
        </p>
      </section>

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

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[#bfd8cc] bg-white p-5 shadow-sm">
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

          <div className="mt-5 space-y-2 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] p-4 text-sm text-[#46534b]">
            <InfoLine label="ZIP içeriği" value="database/dev.db, uploads/, backup-info.json" />
            <InfoLine
              label="Upload klasörü"
              value={uploads.exists ? "Tam yedeğe dahil edilir" : "Boş klasör olarak ele alınır"}
            />
            <InfoLine label="Gizli dosyalar" value=".env ve .env.local dahil edilmez" />
          </div>

          {database.exists ? (
            <Link
              href="/settings/backup/download-full"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
            >
              <Download className="h-4 w-4" />
              Tam Yedek İndir
            </Link>
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
            <Link
              href="/settings/backup/download-db"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#16201b] shadow-sm transition hover:bg-[#f1f4f1]"
            >
              <Download className="h-4 w-4" />
              Veritabanı Yedeğini İndir
            </Link>
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
            <p className="text-xs font-medium text-[#647067]">Klasör yolu</p>
            <p className="mt-1 break-all font-semibold text-[#16201b]">{uploads.uploadsPath}</p>
            <p className="mt-3 text-sm text-[#647067]">
              Durum: {uploads.exists ? "Klasör mevcut" : "Klasör henüz oluşmamış"}
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#647067]">{label}</p>
      <p className="mt-1 font-semibold text-[#16201b]">{value}</p>
    </div>
  );
}
