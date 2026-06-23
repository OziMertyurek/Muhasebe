"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, PlayCircle, X } from "lucide-react";

type TourStep = {
  title: string;
  body: string;
  selector?: string;
};

const tourSteps: TourStep[] = [
  {
    title: "Dashboard",
    body: "Burasi genel durum ekraniniz. Alacak, borc, son hareketler ve yaklasan vadeleri buradan takip edebilirsiniz.",
    selector: '[data-tour="dashboard-summary"]',
  },
  {
    title: "Sidebar",
    body: "Sol menuden cariler, faturalar, giderler, raporlar ve ayarlara ulasabilirsiniz.",
    selector: '[data-tour="sidebar"]',
  },
  {
    title: "Cariler",
    body: "Musteri ve tedarikcilerinizi Cariler ekranindan ekleyip takip edebilirsiniz.",
    selector: '[data-tour="companies"]',
  },
  {
    title: "Faturalar",
    body: "Satis ve alis faturalarinizi buradan kaydedebilir, odeme durumlarini izleyebilirsiniz.",
    selector: '[data-tour="invoices"]',
  },
  {
    title: "AI Fatura Okuma",
    body: "Fatura dosyalarini yukleyerek bilgileri otomatik cikarmayi deneyebilirsiniz. Kaydetmeden once mutlaka kontrol edin.",
    selector: '[data-tour="ai-extraction"]',
  },
  {
    title: "Backup / Yedekleme",
    body: "Duzenli olarak Tam Yedek Indir kullanin. Yedek dosyasini guvenli yerde saklayin.",
    selector: '[data-tour="backup"]',
  },
  {
    title: "System Status / Destek",
    body: "Sorun yasarsaniz sistem durumunu kontrol edebilir ve guvenli hata raporu disa aktarabilirsiniz.",
    selector: '[data-tour="system-status"]',
  },
  {
    title: "Yardim Merkezi",
    body: "Daha detayli anlatimlar icin Yardim Merkezi'ni kullanabilirsiniz.",
    selector: '[data-tour="help"]',
  },
];

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function GuidedTourButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  const activeStep = tourSteps[activeIndex];
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === tourSteps.length - 1;


  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updateHighlight() {
      if (!activeStep.selector) {
        setHighlightRect(null);
        return;
      }

      const target = document.querySelector<HTMLElement>(activeStep.selector);

      if (!target) {
        setHighlightRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setHighlightRect({
        top: Math.max(rect.top - 8, 12),
        left: Math.max(rect.left - 8, 12),
        width: rect.width + 16,
        height: rect.height + 16,
      });
    }

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight, true);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight, true);
    };
  }, [activeStep.selector, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const popoverStyle = useMemo(() => {
    if (!highlightRect) {
      return undefined;
    }

    const popoverWidth = 360;
    const top =
      highlightRect.top + highlightRect.height + 18 < window.innerHeight - 210
        ? highlightRect.top + highlightRect.height + 18
        : Math.max(24, highlightRect.top - 230);
    const left = Math.min(
      Math.max(16, highlightRect.left),
      Math.max(16, window.innerWidth - popoverWidth - 16),
    );

    return {
      left,
      top,
      width: popoverWidth,
    };
  }, [highlightRect]);

  function openTour() {
    setActiveIndex(0);
    setIsOpen(true);
  }

  function closeTour(markCompleted: boolean) {
    if (markCompleted) {
      localStorage.setItem("muhasebe-tour-completed", "true");
      setHasCompleted(true);
    }

    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openTour}
        className={
          className ??
          "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#46534b] shadow-sm transition hover:border-[#8ea99b] hover:text-[#16201b]"
        }
      >
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        {compact
          ? "Turu Baslat"
          : hasCompleted
            ? "Baslangic Turunu Tekrar Ac"
            : "Baslangic Turunu Baslat"}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guided-tour-title"
        >
          <div className="absolute inset-0 bg-[#16201b]/35" />

          {highlightRect ? (
            <div
              className="pointer-events-none fixed rounded-xl border border-white/80 bg-white/10 shadow-[0_0_0_9999px_rgba(22,32,27,0.35),0_18px_50px_rgba(22,32,27,0.25)]"
              style={highlightRect}
            />
          ) : null}

          <div
            className={
              popoverStyle
                ? "fixed rounded-xl border border-[#dce2dc] bg-white p-5 shadow-2xl"
                : "fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#dce2dc] bg-white p-5 shadow-2xl"
            }
            style={popoverStyle}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-[#607167]">
                  Baslangic Turu
                </p>
                <h2
                  id="guided-tour-title"
                  className="mt-1 text-lg font-semibold text-[#16201b]"
                >
                  {activeStep.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeTour(false)}
                aria-label="Turu kapat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#607167] transition hover:bg-[#f1f4f1] hover:text-[#16201b]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#46534b]">{activeStep.body}</p>

            <div className="mt-5 flex items-center gap-2">
              {tourSteps.map((step, index) => (
                <span
                  key={step.title}
                  className={
                    index === activeIndex
                      ? "h-2 flex-1 rounded-full bg-[#1f6f54]"
                      : "h-2 flex-1 rounded-full bg-[#dce2dc]"
                  }
                />
              ))}
            </div>

            <p className="mt-3 text-xs font-medium text-[#607167]">
              Adim {activeIndex + 1} / {tourSteps.length}
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => closeTour(false)}
                className="inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-[#607167] transition hover:bg-[#f1f4f1] hover:text-[#16201b]"
              >
                Turu atla
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                  disabled={isFirstStep}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#46534b] transition hover:border-[#8ea99b] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Geri
                </button>
                {isLastStep ? (
                  <button
                    type="button"
                    onClick={() => closeTour(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Bitir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) => Math.min(tourSteps.length - 1, current + 1))
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47]"
                  >
                    Ileri
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
