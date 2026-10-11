import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DEFAULT_GPHOST_API_KEY =
  process.env.GPHOST_API_KEY ||
  process.env.NEXT_PUBLIC_GPHOST_API_KEY ||
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
};

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      provider: "GPHost",
      directUploadUrl: "https://gphost.eu.cc/api/v1/upload",
      proxyUploadUrl: "/api/gphost/upload",
      defaultApiKey: DEFAULT_GPHOST_API_KEY,
      maxDirectSizeMb: 100,
      supportedMediaTypes: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ],
      vercelHobbyOptimized: true,
    },
    { headers: corsHeaders }
  );
}
