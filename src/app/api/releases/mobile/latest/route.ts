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
  version: '0.0.9',
  versionCode: 10,
  packageId: 'com.gpn.mobile',
  pubDate: '2026-10-20T11:25:37.302Z',
  notes: "v0.0.9: Resilient centralized update engine with direct verified binary stream and smart sync",
  apkUrl: 'https://gphost.eu.cc/raw/rMM0_10DlplE',
  size: 521020,
  sha256: '7227667d0b78e1896c04511b75c0fed304e0891c7bb8dc6f7001702f6d4a8ca6',
  isBigUpdate: false,
  minSdkVersion: 26,
  targetSdkVersion: 35,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientVersion = searchParams.get('current_version') || '0.0.0';

  try {
    const res = await fetch(
      `https://gphost.eu.cc/api/v1/releases/gpn-mobile/latest?target=android-arm64&current_version=${encodeURIComponent(
        clientVersion
      )}&_t=${Date.now()}`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const gphostData = await res.json();
      const rawVer = (gphostData.version || '').replace(/^v/, '');
      const downloadUrl =
        gphostData.apkUrl ||
        gphostData.downloadUrl ||
        gphostData.url ||
        gphostData.platforms?.['android-arm64']?.url ||
        gphostData.platforms?.['windows-x86_64']?.url ||
        (gphostData.platforms ? (Object.values(gphostData.platforms)[0] as any)?.url : '') ||
        'https://gphost.eu.cc/raw/oIbe0NglZiBC';

      return NextResponse.json(
        {
          version: rawVer,
          versionCode: 11,
          packageId: 'com.gpn.mobile',
          pubDate: gphostData.pub_date || new Date().toISOString(),
          notes: gphostData.notes || 'Gaurav Personal Notes mobile release update',
          apkUrl: downloadUrl,
          downloadUrl,
          url: downloadUrl,
          clientVersion,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          },
        }
      );
    }
  } catch (err) {
    console.warn('[ReleaseAPI] GPHost forward notice:', err);
  }

  return NextResponse.json(
    {
      ...activeRelease,
      clientVersion,
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
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
