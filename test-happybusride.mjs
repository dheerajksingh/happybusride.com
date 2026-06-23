import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];

function log(section, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ section, status, detail });
  console.log(`${icon} [${section}] ${detail}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/hbr-${name}.png`, fullPage: false });
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// ── 1. Landing page ───────────────────────────────────────────
try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  const title = await page.title();
  await screenshot(page, '01-landing');
  log('Landing', 'PASS', `Title: "${title}"`);
} catch (e) {
  log('Landing', 'FAIL', e.message);
}

// ── 2. Admin login ────────────────────────────────────────────
try {
  await page.goto(`${BASE}/operator-login`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.fill('input[type="email"]', 'admin@demo.com');
  await page.fill('input[type="password"]', 'Admin1234!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin**', { timeout: 8000 });
  await screenshot(page, '02-admin-dashboard');
  log('Admin Login', 'PASS', `Redirected to: ${page.url()}`);
} catch (e) {
  log('Admin Login', 'FAIL', e.message);
}

// ── 3. Admin: Extra Luggage Pricing page ─────────────────────
try {
  await page.goto(`${BASE}/admin/pricing/extra-luggage`, { waitUntil: 'networkidle', timeout: 10000 });
  const h1 = await page.locator('h1').first().textContent();
  await screenshot(page, '03-admin-extra-luggage');
  log('Extra Luggage Pricing', 'PASS', `Heading: "${h1?.trim()}"`);
} catch (e) {
  log('Extra Luggage Pricing', 'FAIL', e.message);
}

// ── 4. Admin: Shuttle Pricing page ───────────────────────────
try {
  await page.goto(`${BASE}/admin/pricing/shuttle`, { waitUntil: 'networkidle', timeout: 10000 });
  const h1 = await page.locator('h1').first().textContent();
  await screenshot(page, '04-admin-shuttle-pricing');
  log('Shuttle Pricing', 'PASS', `Heading: "${h1?.trim()}"`);
} catch (e) {
  log('Shuttle Pricing', 'FAIL', e.message);
}

// ── 5. Admin: Shuttle Operators page ─────────────────────────
try {
  await page.goto(`${BASE}/admin/shuttle-operators`, { waitUntil: 'networkidle', timeout: 10000 });
  const h1 = await page.locator('h1').first().textContent();
  await screenshot(page, '05-admin-shuttle-ops');
  log('Shuttle Operators', 'PASS', `Heading: "${h1?.trim()}"`);
} catch (e) {
  log('Shuttle Operators', 'FAIL', e.message);
}

// ── 6. Admin: Earnings page ───────────────────────────────────
try {
  await page.goto(`${BASE}/admin/earnings`, { waitUntil: 'networkidle', timeout: 10000 });
  const h1 = await page.locator('h1').first().textContent();
  await screenshot(page, '06-admin-earnings');
  log('Admin Earnings', 'PASS', `Heading: "${h1?.trim()}"`);
} catch (e) {
  log('Admin Earnings', 'FAIL', e.message);
}

// ── 7. Agent login ────────────────────────────────────────────
try {
  await page.goto(`${BASE}/agent/login`, { waitUntil: 'networkidle', timeout: 10000 });
  // check if agent demo creds work — try operator creds as fallback
  const emailInput = await page.locator('input[type="email"]').first();
  await emailInput.fill('admin@demo.com'); // admin to check agent pages exist
  await screenshot(page, '07-agent-login');
  log('Agent Login Page', 'PASS', 'Page loaded');
} catch (e) {
  log('Agent Login Page', 'FAIL', e.message);
}

// ── 8. Passenger: Search page ─────────────────────────────────
try {
  // Get city IDs first
  const citiesRes = await page.evaluate(async () => {
    const r = await fetch('/api/cities');
    return r.json();
  });
  // /api/cities returns a raw array (not { cities: [...] })
  const cities = Array.isArray(citiesRes) ? citiesRes : (citiesRes.cities ?? []);
  if (cities.length >= 2) {
    const from = cities[0].id, to = cities[1].id;
    const fromName = cities[0].name, toName = cities[1].name;
    const date = new Date(); date.setDate(date.getDate() + 3);
    const dateStr = date.toISOString().slice(0, 10);
    await page.goto(`${BASE}/search?from=${from}&to=${to}&date=${dateStr}&fromName=${fromName}&toName=${toName}`, { waitUntil: 'networkidle', timeout: 12000 });
    await screenshot(page, '08-search-results');
    const tabs = await page.locator('button').filter({ hasText: /Direct|Connecting/i }).count();
    log('Search + Connecting Tab', tabs >= 2 ? 'PASS' : 'WARN', `Tab count: ${tabs}, cities: ${fromName}→${toName}`);
  } else {
    log('Search', 'WARN', 'No cities in DB to search');
  }
} catch (e) {
  log('Search', 'FAIL', e.message);
}

// ── 9. Passenger OTP login ────────────────────────────────────
try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 10000 });
  await page.fill('input[type="tel"], input[name="phone"]', '9999900001');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await screenshot(page, '09-otp-verify');
  const url = page.url();
  log('Passenger OTP Flow', url.includes('verify') ? 'PASS' : 'WARN', `URL: ${url}`);
} catch (e) {
  log('Passenger OTP', 'FAIL', e.message);
}

// ── 10. Shuttle register page ─────────────────────────────────
try {
  await page.goto(`${BASE}/shuttle/register`, { waitUntil: 'networkidle', timeout: 10000 });
  const h1 = await page.locator('h1').first().textContent().catch(() => '(no h1)');
  await screenshot(page, '10-shuttle-register');
  log('Shuttle Register', 'PASS', `Heading: "${h1?.trim()}"`);
} catch (e) {
  log('Shuttle Register', 'FAIL', e.message);
}

// ── 11. Bulk booking page (agent) ─────────────────────────────
try {
  await page.goto(`${BASE}/agent/bulk-booking`, { waitUntil: 'networkidle', timeout: 10000 });
  // Will redirect to login if not authed — that's fine, just check it renders
  await screenshot(page, '11-bulk-booking');
  log('Bulk Booking Page', 'PASS', `URL: ${page.url()}`);
} catch (e) {
  log('Bulk Booking', 'FAIL', e.message);
}

// ── 12. Connecting booking page ───────────────────────────────
try {
  await page.goto(`${BASE}/connecting-booking`, { waitUntil: 'networkidle', timeout: 10000 });
  await screenshot(page, '12-connecting-booking');
  log('Connecting Booking', 'PASS', `URL: ${page.url()}`);
} catch (e) {
  log('Connecting Booking', 'FAIL', e.message);
}

// ── 13. API: extra-luggage pricing ────────────────────────────
try {
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/pricing/extra-luggage?excessKg=10&distanceKm=200');
    return { status: r.status, body: await r.json() };
  });
  log('API: Extra Luggage Pricing', res.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(res.body));
} catch (e) {
  log('API: Extra Luggage', 'FAIL', e.message);
}

// ── 14. API: shuttle pricing ──────────────────────────────────
try {
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/pricing/shuttle?distanceKm=15&vehicleType=SEATER_8');
    return { status: r.status, body: await r.json() };
  });
  log('API: Shuttle Pricing', res.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(res.body));
} catch (e) {
  log('API: Shuttle Pricing', 'FAIL', e.message);
}

// ── 15. API: connecting search ────────────────────────────────
try {
  const citiesRes = await page.evaluate(async () => {
    const r = await fetch('/api/cities');
    return r.json();
  });
  // /api/cities returns a raw array (not { cities: [...] })
  const cities = Array.isArray(citiesRes) ? citiesRes : (citiesRes.cities ?? []);
  if (cities.length >= 2) {
    const date = new Date(); date.setDate(date.getDate() + 3);
    const dateStr = date.toISOString().slice(0, 10);
    const res = await page.evaluate(async ([from, to, d]) => {
      const r = await fetch(`/api/search/connecting?from=${from}&to=${to}&date=${d}`);
      return { status: r.status, body: await r.json() };
    }, [cities[0].id, cities[cities.length - 1].id, dateStr]);
    log('API: Connecting Search', res.status === 200 ? 'PASS' : 'FAIL', `Options: ${res.body.options?.length ?? 0}`);
  } else {
    log('API: Connecting Search', 'WARN', 'No cities');
  }
} catch (e) {
  log('API: Connecting Search', 'FAIL', e.message);
}

await browser.close();

console.log('\n─────────────────────────────────');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const warned = results.filter(r => r.status === 'WARN').length;
console.log(`Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed | ⚠️  ${warned} warned`);
if (failed > 0) {
  console.log('\nFailed:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.section}: ${r.detail}`));
}
