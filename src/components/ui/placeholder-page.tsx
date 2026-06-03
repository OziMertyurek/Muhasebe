import { Plus } from "lucide-react";

type PlaceholderPageProps = {
  title: string;
  description: string;
  primaryAction: string;
};

export function PlaceholderPage({
  title,
  description,
  primaryAction,
}: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-[#dce2dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Modül</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#16201b]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">{description}</p>
        </div>
        <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]">
          <Plus className="h-4 w-4" />
          {primaryAction}
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-[#cfd8cf] bg-white p-8">
        <p className="text-sm font-semibold text-[#223028]">Bu sayfa ilk sürüm için hazır.</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647067]">
          Bir sonraki adımda bu alana liste, filtre ve manuel kayıt formları eklenecek.
        </p>
      </div>
    </section>
  );
}
