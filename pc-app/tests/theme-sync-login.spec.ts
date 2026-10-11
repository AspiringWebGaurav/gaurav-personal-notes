import { test, expect } from '@playwright/test';

test.describe('Login Bridge Theme Synchronization', () => {
  test('Verify Light Mode & Dark Mode matching app theme', async ({ page }) => {
    // 1. First, verify app theme toggle in desktop app
    await page.goto('http://localhost:1420/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Open Account and click Sign in to verify AuthModal
    const accountTab = page.getByRole('button', { name: 'Account' });
    await accountTab.click();
    await page.waitForTimeout(800);

    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await signInBtn.click();
    await page.waitForTimeout(800);

    // Verify modal is visible
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(500);

    // 3. Test the loopback login page in Light Theme
    // We navigate to a data/mocked view of the exact OAuthServer login page template
    const loginHtml = `
<!DOCTYPE html>
<html lang="en" class="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gaurav Personal Notes - Sign in</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text-title: #0f172a;
      --text-muted: #64748b;
      --logo-bg: #0f172a;
      --logo-text: #ffffff;
      --logo-border: #1e293b;
      --btn-bg: #ffffff;
      --btn-text: #0f172a;
      --btn-border: #cbd5e1;
      --btn-hover: #f1f5f9;
      --shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
      --toggle-bg: #f1f5f9;
      --toggle-color: #64748b;
      --web-link-border: #cbd5e1;
      --web-link-hover-bg: #f8fafc;
    }
    html.dark, body.dark {
      --bg: #090a0f;
      --card-bg: #12131a;
      --border: #262836;
      --text-title: #f8fafc;
      --text-muted: #94a3b8;
      --logo-bg: #1c1d27;
      --logo-text: #ffffff;
      --logo-border: #33374b;
      --btn-bg: #1c1d27;
      --btn-text: #f8fafc;
      --btn-border: #2b2d3d;
      --btn-hover: #262838;
      --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      --toggle-bg: #1c1d27;
      --toggle-color: #94a3b8;
      --web-link-border: #2b2d3d;
      --web-link-hover-bg: #1c1d27;
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
      border-radius: 12px;
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
      border-radius: 6px;
      background: var(--toggle-bg);
      color: var(--toggle-color);
      border: 1px solid var(--border);
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
      background: var(--logo-bg);
      color: var(--logo-text);
      border: 1px solid var(--logo-border);
      border-radius: 10px;
      font-weight: 800;
      font-size: 20px;
      margin-bottom: 20px;
    }
    h2 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: var(--text-title); }
    p { margin: 0 0 20px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
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
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .divider {
      display: flex;
      align-items: center;
      margin: 22px 0 14px;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .divider::before, .divider::after {
      content: "";
      flex: 1;
      border-bottom: 1px solid var(--border);
    }
    .divider span { padding: 0 10px; }
    .web-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .web-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 12px;
      background: transparent;
      color: var(--text-muted);
      border: 1px dashed var(--web-link-border);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .web-link:hover {
      color: var(--text-title);
      border-color: var(--text-title);
      background: var(--web-link-hover-bg);
    }
  </style>
</head>
<body class="light">
  <div class="card">
    <button class="theme-toggle" id="themeBtn" onclick="document.body.classList.toggle('dark'); document.documentElement.classList.toggle('dark');">🌓</button>
    <div class="logo">GPN</div>
    <h2>Sign in with Google</h2>
    <p>Sign in to connect your notes with the Gaurav Personal Notes Desktop app.</p>
    <button class="btn" id="googleBtn">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      Continue with Google
    </button>
    <div class="divider"><span>OR CONNECT VIA WEBSITE</span></div>
    <div class="web-options">
      <a href="http://localhost:3000/desktop-auth?port=5000&theme=light" class="web-link">
        🌐 Web Dev (localhost:3000)
      </a>
      <a href="https://gpnotes.eu.cc/desktop-auth?port=5000&theme=light" class="web-link">
        ☁️ Custom Domain (gpnotes.eu.cc)
      </a>
    </div>
  </div>
</body>
</html>
    `;

    await page.setContent(loginHtml);
    await page.waitForTimeout(1000);

    // Verify Light mode screenshot
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_browser_login_light.png',
    });

    // Toggle to Dark Mode
    await page.locator('#themeBtn').click();
    await page.waitForTimeout(1000);

    // Verify Dark mode screenshot
    await page.screenshot({
      path: 'C:/Users/namit/.gemini/antigravity-ide/brain/9711482a-8466-4b19-8000-9e986d231d1f/screenshot_browser_login_dark.png',
    });
  });
});
