import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Set maximum duration for serverless execution
export const maxDuration = 15;

const DEFAULT_GPHOST_API_KEY =
  process.env.GPHOST_API_KEY ||
  process.env.NEXT_PUBLIC_GPHOST_API_KEY ||
  "";

// CORS headers to enable access from website, mobile web, and pc-app (desktop localhost)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: "online",
      provider: "GPHost CDN",
      directUploadUrl: "https://gphost.eu.cc/api/v1/upload",
      clientDirectUploadRecommended: true,
      message:
        "Direct client-to-GPHost upload is recommended to preserve free Vercel Hobby limits.",
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let apiKey = DEFAULT_GPHOST_API_KEY;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const providedKey = authHeader.replace("Bearer ", "").trim();
      if (providedKey) apiKey = providedKey;
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "No file provided in form-data ('file' field required)." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Protection for Vercel Hobby Quota limits (4.5MB payload maximum)
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File exceeds Vercel 4.5MB serverless limit. Please use direct GPHost CDN upload which supports files up to 100MB+.",
          directUploadUrl: "https://gphost.eu.cc/api/v1/upload",
        },
        { status: 413, headers: corsHeaders }
      );
    }

    const filename =
      formData.get("filename")?.toString() ||
      (file instanceof File ? file.name : `media_${Date.now()}`);

    const gphostFormData = new FormData();
    gphostFormData.append("file", file, filename);

    const upstreamResponse = await fetch("https://gphost.eu.cc/api/v1/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: gphostFormData,
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `GPHost CDN upstream error (${upstreamResponse.status}): ${errorText}`,
        },
        { status: upstreamResponse.status, headers: corsHeaders }
      );
    }

    const data = await upstreamResponse.json();
    const rawUrl = data.rawUrl || data.downloadUrl?.replace("/f/", "/raw/") || "";

    return NextResponse.json(
      {
        success: true,
        fileId: data.fileId,
        filename: data.filename || filename,
        rawUrl,
        downloadUrl: data.downloadUrl || rawUrl,
        mimeType: data.mimeType || file.type || "application/octet-stream",
        byteSize: data.byteSize || file.size,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Centralized GPHost upload error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: corsHeaders }
    );
  }
}
