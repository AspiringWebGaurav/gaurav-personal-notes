import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const DEFAULT_GPHOST_API_KEY =
  process.env.GPHOST_API_KEY ||
  process.env.NEXT_PUBLIC_GPHOST_API_KEY ||
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function extractIdentifier(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || trimmed;
    }
  } catch {}
  return trimmed;
}

export async function POST(req: NextRequest) {
  return handleDeleteRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleDeleteRequest(req);
}

async function handleDeleteRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let apiKey = DEFAULT_GPHOST_API_KEY;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const providedKey = authHeader.replace("Bearer ", "").trim();
      if (providedKey) apiKey = providedKey;
    }

    let payload: {
      fileId?: string;
      fileUrl?: string;
      rawUrl?: string;
      fileIds?: string[];
      urls?: string[];
    } = {};

    try {
      payload = await req.json();
    } catch {
      const searchParams = req.nextUrl.searchParams;
      const fileId = searchParams.get("fileId") || searchParams.get("id");
      const url = searchParams.get("url") || searchParams.get("fileUrl");
      if (fileId) payload.fileId = fileId;
      if (url) payload.fileUrl = url;
    }

    // Collect all unique target identifiers (fileId or shortcodes)
    const targets = new Set<string>();
    if (payload.fileId) targets.add(extractIdentifier(payload.fileId));
    if (payload.fileUrl) targets.add(extractIdentifier(payload.fileUrl));
    if (payload.rawUrl) targets.add(extractIdentifier(payload.rawUrl));
    if (Array.isArray(payload.fileIds)) {
      payload.fileIds.forEach((id) => id && targets.add(extractIdentifier(id)));
    }
    if (Array.isArray(payload.urls)) {
      payload.urls.forEach((u) => u && targets.add(extractIdentifier(u)));
    }

    const targetList = Array.from(targets).filter(Boolean);

    if (targetList.length === 0) {
      return NextResponse.json(
        { success: false, error: "No fileId or media URL provided for deletion." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Dispatch upstream GPHost deletion requests in parallel
    const deletionResults = await Promise.all(
      targetList.map(async (targetId) => {
        const attempts: Array<{ endpoint: string; status: number }> = [];

        // 1. DELETE /api/files/:id
        try {
          const res1 = await fetch(`https://gphost.eu.cc/api/files/${targetId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "x-api-key": apiKey,
            },
          });
          attempts.push({ endpoint: `/api/files/${targetId}`, status: res1.status });
        } catch {
          attempts.push({ endpoint: `/api/files/${targetId}`, status: 500 });
        }

        // 2. DELETE /api/v1/files/:id
        try {
          const res2 = await fetch(`https://gphost.eu.cc/api/v1/files/${targetId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          attempts.push({ endpoint: `/api/v1/files/${targetId}`, status: res2.status });
        } catch {
          attempts.push({ endpoint: `/api/v1/files/${targetId}`, status: 500 });
        }

        // 3. DELETE /api/files/delete with JSON body
        try {
          const res3 = await fetch(`https://gphost.eu.cc/api/files/delete`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ fileId: targetId }),
          });
          attempts.push({ endpoint: `/api/files/delete`, status: res3.status });
        } catch {
          attempts.push({ endpoint: `/api/files/delete`, status: 500 });
        }

        return {
          targetId,
          attempts,
          dispatched: true,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        message: "GPHost deletion request dispatched successfully.",
        targets: deletionResults,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Centralized GPHost delete error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
