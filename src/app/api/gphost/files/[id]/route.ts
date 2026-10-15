import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const DEFAULT_GPHOST_API_KEY =
  process.env.GPHOST_API_KEY ||
  process.env.NEXT_PUBLIC_GPHOST_API_KEY ||
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

function getApiKey(req: NextRequest): string {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const key = authHeader.replace("Bearer ", "").trim();
    if (key) return key;
  }
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim()) return xApiKey.trim();
  return DEFAULT_GPHOST_API_KEY;
}

/**
 * PATCH /api/gphost/files/[id]
 * Body: { "folder": "GPN/1/2" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = getApiKey(req);
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing file ID." },
        { status: 400, headers: corsHeaders }
      );
    }

    const upstreamRes = await fetch(`https://gphost.eu.cc/api/v1/files/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "GPN-App/1.0",
      },
      body: JSON.stringify(body),
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      status: upstreamRes.status,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GPHost file patch error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
