import { NextResponse } from 'next/server';

export interface MobileReleaseManifest {
  version: string;
  versionCode: number;
  packageId: string;
  pubDate: string;
  notes: string;
  apkUrl: string;
  size: number;
  sha256: string;
  isBigUpdate?: boolean;
  minSdkVersion: number;
  targetSdkVersion: number;
}

// In-memory / fallback active release manifest
let activeRelease: MobileReleaseManifest = {
  version: '0.0.5',
  versionCode: 6,
  packageId: 'com.gpn.mobile',
  pubDate: '2026-10-20T06:20:12.232Z',
  notes: "v0.0.5: Clean minimalistic system notification UI without patch notes",
  apkUrl: 'https://gphost.eu.cc/raw/2KuX0uDopFSZ',
  size: 438948,
  sha256: 'bc7b1aa89a95324b0c17915490436c9f29a33c7e83d8fb93661be006b1de7fe5',
  isBigUpdate: false,
  minSdkVersion: 26,
  targetSdkVersion: 35,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientVersion = searchParams.get('current_version') || '0.0.0';

  return NextResponse.json(
    {
      ...activeRelease,
      clientVersion,
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.GPHOST_API_KEY || process.env.ADMIN_KEY;

    if (expectedKey && (!authHeader || !authHeader.includes(expectedKey))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.version || !body.apkUrl) {
      return NextResponse.json({ error: 'Missing version or apkUrl' }, { status: 400 });
    }

    activeRelease = {
      version: String(body.version).replace(/^v/, ''),
      versionCode: Number(body.versionCode) || 2,
      packageId: body.packageId || 'com.gpn.mobile',
      pubDate: body.pubDate || new Date().toISOString(),
      notes: body.notes || `v${body.version} Android release update`,
      apkUrl: body.apkUrl,
      size: Number(body.size) || 0,
      sha256: body.sha256 || '',
      isBigUpdate: Boolean(body.isBigUpdate),
      minSdkVersion: Number(body.minSdkVersion) || 26,
      targetSdkVersion: Number(body.targetSdkVersion) || 35,
    };

    return NextResponse.json({ success: true, release: activeRelease }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
