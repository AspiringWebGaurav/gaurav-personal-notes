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
  minSdkVersion: number;
  targetSdkVersion: number;
}

// In-memory / fallback active release manifest
let activeRelease: MobileReleaseManifest = {
  version: '0.0.2',
  versionCode: 3,
  packageId: 'com.gpn.mobile',
  pubDate: '2026-10-19T06:02:25.962Z',
  notes: "v0.0.2: Smooth adaptive pacing download progress bar and pure light theme restarting overlay",
  apkUrl: 'https://gphost.eu.cc/raw/Fibpy0Du5lWN',
  size: 431637,
  sha256: 'a766ff9f4ed607c02490260a5ef298f231f2415ee6198f60f70bfb3f38dd142f',
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
