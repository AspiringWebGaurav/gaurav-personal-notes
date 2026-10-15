import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const DEFAULT_GPHOST_API_KEY =
  process.env.GPHOST_API_KEY ||
  process.env.NEXT_PUBLIC_GPHOST_API_KEY ||
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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
 * GET /api/gphost/folders
 * Query params:
 *   - ?tree=true: Returns full folder hierarchy tree
 *   - ?path=GPN/1: Returns contents of folder (breadcrumbs, subfolders, files, totals)
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    const { searchParams } = req.nextUrl;
    const isTree = searchParams.get("tree") === "true";
    const folderPath = searchParams.get("path");

    let upstreamUrl = "https://gphost.eu.cc/api/v1/folders";
    if (isTree) {
      upstreamUrl += "?tree=true";
    } else if (folderPath !== null && folderPath !== undefined) {
      upstreamUrl += `?path=${encodeURIComponent(folderPath)}`;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "GPN-App/1.0",
      },
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      status: upstreamRes.status,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GPHost folder list error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/v1/folders
 * Body: { path: "GPN/1/2" }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    const body = await req.json();

    if (!body || !body.path || typeof body.path !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'path' field in request body." },
        { status: 400, headers: corsHeaders }
      );
    }

    const upstreamRes = await fetch("https://gphost.eu.cc/api/v1/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "GPN-App/1.0",
      },
      body: JSON.stringify({ path: body.path }),
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      status: upstreamRes.status,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GPHost folder create error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PATCH /api/v1/folders
 * Body:
 *   - Rename: { path: "GPN/1/2", newName: "2_renamed" }
 *   - Move: { path: "GPN/1/2", destinationParent: "GPN" | null }
 */
export async function PATCH(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    const body = await req.json();

    if (!body || !body.path) {
      return NextResponse.json(
        { success: false, error: "Missing 'path' field in request body." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Protection rule: Do not rename or modify protected base folder
    const normalized = body.path.toLowerCase().replace(/\\/g, "/");
    if (normalized === "gpn" || normalized === "gpn-dynamic-update/base") {
      return NextResponse.json(
        {
          success: false,
          error: "403 BASE_INSTALLER_PROTECTED: Protected installer folder cannot be modified or renamed.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const upstreamRes = await fetch("https://gphost.eu.cc/api/v1/folders", {
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
    console.error("GPHost folder patch error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/v1/folders?path=GPN/1/2&recursive=true
 */
export async function DELETE(req: NextRequest) {
  try {
    const apiKey = getApiKey(req);
    let folderPath = req.nextUrl.searchParams.get("path");
    let recursive = req.nextUrl.searchParams.get("recursive") !== "false";

    if (!folderPath) {
      try {
        const body = await req.json();
        if (body?.path) {
          folderPath = body.path;
          if (body.recursive !== undefined) recursive = Boolean(body.recursive);
        }
      } catch {}
    }

    if (!folderPath) {
      return NextResponse.json(
        { success: false, error: "Missing 'path' parameter for folder deletion." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Protection rule: Prevent deleting protected base installer folder
    const normalized = folderPath.toLowerCase().replace(/\\/g, "/");
    if (normalized === "gpn" || normalized === "gpn-dynamic-update/base") {
      return NextResponse.json(
        {
          success: false,
          error: "403 BASE_INSTALLER_PROTECTED: Protected installer folder cannot be deleted.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const upstreamUrl = `https://gphost.eu.cc/api/v1/folders?path=${encodeURIComponent(folderPath)}&recursive=${recursive}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "GPN-App/1.0",
      },
    });

    const data = await upstreamRes.json();
    return NextResponse.json(data, {
      status: upstreamRes.status,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GPHost folder delete error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
