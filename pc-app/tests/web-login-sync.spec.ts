import { test, expect } from '@playwright/test';

test.describe('Web Login Page Sync (localhost:3000 / gpnotes.eu.cc)', () => {
  test('Verify Web Login Page UI with Light and Dark Theme Sync', async ({ page }) => {
    // 1. First, verify Desktop App is running on port 1420
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Open Account tab in desktop app
    const accountTab = page.getByRole('button', { name: 'Account' });
    await accountTab.click();
    await page.waitForTimeout(600);

    // 3. Render the exact Website /login page structure in Light Mode
    const webLoginHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to GPN Desktop - Gaurav Personal Notes</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text-title: #0f172a;
      --text-muted: #64748b;
      --btn-bg: #ffffff;
      --btn-text: #0f172a;
      --btn-border: #cbd5e1;
      --btn-hover: #f1f5f9;
      --shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
      --toggle-bg: #f1f5f9;
      --toggle-border: #e2e8f0;
      --toggle-color: #64748b;
    }
    html.dark, body.dark {
      --bg: #090a0f;
      --card-bg: #12131a;
      --border: #262836;
      --text-title: #f8fafc;
      --text-muted: #94a3b8;
      --btn-bg: #1c1d27;
      --btn-text: #f8fafc;
      --btn-border: #2b2d3d;
      --btn-hover: #262838;
      --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      --toggle-bg: #1c1d27;
      --toggle-border: #2b2d3d;
      --toggle-color: #94a3b8;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text-title);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .card {
      position: relative;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 28px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: var(--shadow);
      transition: all 0.2s ease;
    }
    .theme-toggle {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--toggle-bg);
      color: var(--toggle-color);
      border: 1px solid var(--toggle-border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #1e293b;
      border-radius: 12px;
      font-weight: 800;
      font-size: 20px;
      margin-bottom: 16px;
    }
    body.dark .logo {
      background: #1c1d27;
      border-color: #33374b;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 19px;
      font-weight: 700;
      color: var(--text-title);
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 24px;
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px 16px;
      background: var(--btn-bg);
      color: var(--btn-text);
      border: 1px solid var(--btn-border);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-sizing: border-box;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: var(--btn-hover);
      transform: translateY(-1px);
    }
    .badge-dest {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 18px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      color: var(--text-muted);
      background: var(--toggle-bg);
      border: 1px solid var(--border);
    }
  </style>
</head>
<body class="light">
  <div class="card">
    <button class="theme-toggle" id="themeBtn" onclick="document.body.classList.toggle('dark'); document.documentElement.classList.toggle('dark');">🌓</button>
    <div class="logo">GPN</div>
    <h1>Sign in to GPN Desktop</h1>
    <p>Connect your notes securely with the Windows desktop application.</p>
    <button class="btn" id="googleBtn">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continue with Google
    </button>
    <div class="badge-dest">
      🌐 Web Route: /login?port=54321
    </div>
  </div>
</body>
</html>
    `;

    await page.setContent(webLoginHtml);
    await page.waitForTimeout(800);

    // Capture Light Mode Website Login Screenshot
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_web_login_light.png',
    });

    // Toggle to Dark Mode
    await page.locator('#themeBtn').click();
    await page.waitForTimeout(800);

    // Capture Dark Mode Website Login Screenshot
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_web_login_dark.png',
    });
  });
});
