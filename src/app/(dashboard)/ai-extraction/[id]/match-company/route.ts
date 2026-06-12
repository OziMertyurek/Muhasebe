import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit-log-utils";
import { matchCompanyFromExtractedJson } from "@/lib/company-matcher";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchCompanyRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: MatchCompanyRouteContext) {
  const { id } = await params;
  const detailUrl = new URL(`/ai-extraction/${id}`, request.url);
  const job = await prisma.aiExtractionJob.findUnique({
    where: { id },
    select: {
      id: true,
      extractedJson: true,
      fileAttachment: {
        select: {
          originalFileName: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.redirect(new URL("/ai-extraction?error=not-found", request.url));
  }

  if (!job.extractedJson?.trim()) {
    detailUrl.searchParams.set("error", "company-match-empty");
    return NextResponse.redirect(detailUrl);
  }

  const existingJson = parseJsonObject(job.extractedJson);

  if (!existingJson) {
    detailUrl.searchParams.set("error", "company-match-json");
    return NextResponse.redirect(detailUrl);
  }

  const companyMatch = await matchCompanyFromExtractedJson(job.extractedJson);
  const nextJson = JSON.stringify(
    {
      ...existingJson,
      companyMatch,
    },
    null,
    2,
  );

  await prisma.aiExtractionJob.update({
    where: { id: job.id },
    data: {
      extractedJson: nextJson,
    },
    select: { id: true },
  });

  await createAuditLog({
    entityType: "AI_EXTRACTION",
    entityId: job.id,
    action: "UPDATE",
    title: "Cari eşleştirme yapıldı",
    description: `${job.fileAttachment.originalFileName} için parser sonucundan cari eşleştirme yapıldı.`,
    before: {
      extractedJson: job.extractedJson,
    },
    after: {
      companyMatch,
    },
  });

  revalidatePath("/ai-extraction");
  revalidatePath(`/ai-extraction/${job.id}`);
  detailUrl.searchParams.set("companyMatched", "1");
  return NextResponse.redirect(detailUrl);
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
