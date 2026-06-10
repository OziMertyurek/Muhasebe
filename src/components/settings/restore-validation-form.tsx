"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type BackupMetadata = {
  appName?: string;
  version?: string;
  mode?: string;
  database?: string;
  backupDate?: string;
  includes?: string[];
  note?: string;
};

type BackupValidationResult = {
  isValid: boolean;
  metadata: BackupMetadata | null;
  hasDatabase: boolean;
  hasUploads: boolean;
  uploadFileCount: number;
  totalSize: number;
  warnings: string[];
  errors: string[];
};

type RestoreResult = {
  success: boolean;
  metadata: BackupMetadata | null;
  restoredDatabase: boolean;
  restoredUploadFileCount: number;
  safetyBackupPath: string;
  warnings: string[];
  message: string;
};

const maxFileSize = 500 * 1024 * 1024;

function formatBackupDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RestoreValidationForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BackupValidationResult | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setResult(null);
    setRestoreResult(null);
    setMessage(null);
    setIsConfirmed(false);
  }

  function validateSelectedFile(file: File) {
    if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".zip")) {
      return "Sadece .zip uzantılı tam yedek dosyaları kullanılabilir.";
    }

    if (file.size > maxFileSize) {
      return "ZIP dosyası 500 MB sınırını aşıyor.";
    }

    return null;
  }

  async function handleValidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);
    setRestoreResult(null);
    setIsConfirmed(false);

    if (!selectedFile) {
      setMessage("Kontrol edilecek ZIP dosyasını seçin.");
      return;
    }

    const fileError = validateSelectedFile(selectedFile);

    if (fileError) {
      setMessage(fileError);
      return;
    }

    const formData = new FormData();
    formData.set("backupFile", selectedFile);
    setIsValidating(true);

    try {
      const response = await fetch("/settings/backup/validate-restore", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if ("isValid" in data) {
        setResult(data as BackupValidationResult);
      } else {
        setMessage(data.message ?? "Yedek dosyası kontrol edilemedi.");
      }
    } catch {
      setMessage("Yedek dosyası kontrol edilirken bir hata oluştu.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleRestore() {
    setMessage(null);
    setRestoreResult(null);

    if (!selectedFile || !result?.isValid) {
      setMessage("Geri yükleme için önce geçerli bir tam yedek kontrol edilmeli.");
      return;
    }

    if (!isConfirmed) {
      setMessage("Geri yükleme için onay kutusunu işaretleyin.");
      return;
    }

    const formData = new FormData();
    formData.set("backupFile", selectedFile);
    formData.set("confirmation", "understood");
    setIsRestoring(true);

    try {
      const response = await fetch("/settings/backup/restore", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok && "success" in data) {
        setRestoreResult(data as RestoreResult);
      } else {
        setMessage(data.message ?? "Geri yükleme işlemi tamamlanamadı.");
      }
    } catch {
      setMessage("Geri yükleme sırasında bir hata oluştu.");
    } finally {
      setIsRestoring(false);
    }
  }

  const statusTone = result?.isValid
    ? "border-[#bfd8cc] bg-[#f3faf6] text-[#14543f]"
    : result
      ? "border-[#e0c4bf] bg-[#fff7f5] text-[#8b2f28]"
      : "border-[#dce2dc] bg-white text-[#16201b]";
  const StatusIcon = result?.isValid ? CheckCircle2 : result ? XCircle : ShieldCheck;

  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#16201b]">
            Yedek kontrolü ve içeri aktarma
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#647067]">
            Eski bilgisayardan aldığınız tam yedek ZIP dosyasını buradan kontrol edebilir ve son
            onaydan sonra içeri aktarabilirsiniz. Restore işlemi mevcut local veritabanını ve
            upload dosyalarını değiştirir.
          </p>
        </div>
      </div>

      <form onSubmit={handleValidate} className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-sm font-medium text-[#16201b]">ZIP dosyası seç</span>
          <input
            name="backupFile"
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-md border border-[#cfd8cf] bg-white px-3 py-2 text-sm text-[#16201b] file:mr-4 file:rounded-md file:border-0 file:bg-[#e8f2ed] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#14543f] hover:file:bg-[#dcece4]"
          />
          <span className="mt-2 block text-xs text-[#647067]">Maksimum dosya boyutu 500 MB.</span>
        </label>

        <button
          type="submit"
          disabled={isValidating || isRestoring}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] disabled:opacity-60"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Yedeği Kontrol Et
        </button>
      </form>

      {message ? (
        <div className="mt-5 rounded-md border border-[#e0c4bf] bg-[#fff7f5] px-4 py-3 text-sm text-[#8b2f28]">
          {message}
        </div>
      ) : null}

      {result ? (
        <div className={`mt-5 rounded-lg border p-4 ${statusTone}`}>
          <div className="flex items-start gap-3">
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-semibold">
                {result.isValid ? "Yedek geçerli görünüyor" : "Yedek doğrulanamadı"}
              </h3>
              <p className="mt-1 text-sm">
                Bu aşamada sadece analiz yapılır. Geri yükleme için aşağıdaki son onay gerekir.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Uygulama adı" value={result.metadata?.appName ?? "-"} />
            <InfoItem label="Versiyon" value={result.metadata?.version ?? "-"} />
            <InfoItem label="Mod" value={result.metadata?.mode ?? "-"} />
            <InfoItem label="Veritabanı tipi" value={result.metadata?.database ?? "-"} />
            <InfoItem label="Yedek tarihi" value={formatBackupDate(result.metadata?.backupDate)} />
            <InfoItem label="Toplam ZIP boyutu" value={formatFileSize(result.totalSize)} />
            <InfoItem label="İçerikler" value={result.metadata?.includes?.join(", ") ?? "-"} />
            <InfoItem label="database/dev.db" value={result.hasDatabase ? "Var" : "Yok"} />
            <InfoItem label="uploads klasörü" value={result.hasUploads ? "Var" : "Yok"} />
            <InfoItem label="Upload dosya sayısı" value={String(result.uploadFileCount)} />
          </div>

          {result.metadata?.note ? (
            <p className="mt-4 rounded-md border border-current/20 bg-white/50 px-3 py-2 text-sm">
              {result.metadata.note}
            </p>
          ) : null}

          {result.warnings.length > 0 ? (
            <ResultList
              title="Uyarılar"
              items={result.warnings}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          ) : null}

          {result.errors.length > 0 ? (
            <ResultList
              title="Hatalar"
              items={result.errors}
              icon={<XCircle className="h-4 w-4" />}
            />
          ) : null}
        </div>
      ) : null}

      {result?.isValid ? (
        <div className="mt-5 rounded-lg border border-[#e2c171] bg-[#fff9e8] p-4 text-[#765116]">
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Yedeği içeri aktar / geri yükle
          </h3>
          <p className="mt-2 text-sm leading-6">
            Bu işlem mevcut local veritabanınızı ve upload dosyalarınızı seçtiğiniz yedekle
            değiştirecek. İşlemden önce mevcut sistem otomatik olarak yedeklenecek. Devam etmek
            istiyor musunuz?
          </p>
          <label className="mt-4 flex items-start gap-3 rounded-md border border-[#e2c171] bg-white/60 px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(event) => setIsConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1f6f54]"
            />
            <span>Bu işlemin mevcut verileri değiştireceğini anlıyorum.</span>
          </label>
          <button
            type="button"
            disabled={!isConfirmed || isRestoring}
            onClick={handleRestore}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-[#8b2f28] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#742820] disabled:opacity-60"
          >
            {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Geri Yükle
          </button>
        </div>
      ) : null}

      {restoreResult ? (
        <div className="mt-5 rounded-lg border border-[#bfd8cc] bg-[#f3faf6] p-4 text-[#14543f]">
          <h3 className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Geri yükleme tamamlandı
          </h3>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Restore başarılı mı?" value={restoreResult.success ? "Evet" : "Hayır"} />
            <InfoItem
              label="Yüklenen yedek tarihi"
              value={formatBackupDate(restoreResult.metadata?.backupDate)}
            />
            <InfoItem label="Yüklenen versiyon" value={restoreResult.metadata?.version ?? "-"} />
            <InfoItem
              label="Database geri yüklendi mi?"
              value={restoreResult.restoredDatabase ? "Evet" : "Hayır"}
            />
            <InfoItem
              label="Geri yüklenen upload dosyası"
              value={String(restoreResult.restoredUploadFileCount)}
            />
            <InfoItem
              label="Otomatik güvenlik yedeği"
              value={restoreResult.safetyBackupPath}
            />
          </div>
          {restoreResult.warnings.length > 0 ? (
            <ResultList
              title="Restore uyarıları"
              items={restoreResult.warnings}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          ) : null}
          <p className="mt-4 rounded-md border border-[#bfd8cc] bg-white/70 px-3 py-3 text-sm">
            {restoreResult.message} İşlem sonrası server&apos;ı Ctrl+C ile durdurup npm run dev ile
            yeniden başlatın.
          </p>
        </div>
      ) : null}

      <p className="mt-5 rounded-md border border-[#e5e9e5] bg-[#fbfcfa] px-4 py-3 text-sm text-[#647067]">
        Restore işleminde sadece `database/dev.db`, `uploads/` ve `backup-info.json` okunur.
        Gizli dosyalar, node_modules, .next ve Git dosyaları geri yüklenmez.
      </p>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-current/15 bg-white/50 px-3 py-2">
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

function ResultList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: ReactNode;
}) {
  return (
    <div className="mt-4 rounded-md border border-current/20 bg-white/50 px-3 py-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h4>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
