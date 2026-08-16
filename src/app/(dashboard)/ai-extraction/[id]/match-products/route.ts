import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { parseCanonicalDraftJson } from "@/lib/ai-invoice-extraction-core";
import { matchProductsForDraft } from "@/lib/ai-matching-core";
import { createAuditLog } from "@/lib/audit-log-utils";
import { prisma } from "@/lib/prisma";
import { requireRequestLocalAuth } from "@/lib/security-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchProductsRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: MatchProductsRouteContext) {
  const authResponse = await requireRequestLocalAuth(request);

  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);
  const job = await prisma.aiExtractionJob.findFirst({
    where: {
      id,
      deletedAt: null,
      fileAttachment: { deletedAt: null },
    },
    select: {
      id: true,
      extractedJson: true,
      fileAttachment: { select: { originalFileName: true } },
    },
  });

  if (!job) {
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  if (!job.extractedJson?.trim()) {
    detailUrl.searchParams.set("error", "product-match-empty");
    return NextResponse.redirect(detailUrl);
  }

  let draft;

  try {
    draft = parseCanonicalDraftJson(job.extractedJson);
  } catch {
    detailUrl.searchParams.set("error", "product-match-json");
    return NextResponse.redirect(detailUrl);
  }

  const productMatches = await matchProductsForDraft(draft);
  const nextJson = JSON.stringify(
    {
      ...draft,
      matches: {
        ...draft.matches,
        products: productMatches,
      },
    },
    null,
    2,
  );

  await prisma.aiExtractionJob.update({
    where: { id: job.id },
    data: { extractedJson: nextJson },
    select: { id: true },
  });

  await createAuditLog({
    entityType: "AI_EXTRACTION",
    entityId: job.id,
    action: "UPDATE",
    title: "Urun eslestirme yapildi",
    description: `${job.fileAttachment.originalFileName} icin fatura kalemleri urunlerle eslestirildi.`,
    before: { extractedJson: job.extractedJson },
    after: { productMatches },
  });

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${job.id}`);
  detailUrl.searchParams.set("productsMatched", "1");
  return NextResponse.redirect(detailUrl);
}
