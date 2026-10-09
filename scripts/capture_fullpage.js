const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });

  // Let's get page sections and heights
  const sectionsInfo = await page.evaluate(() => {
    const main = document.getElementById('home-view');
    if (!main) return [];
    return Array.from(main.children).map(child => ({
      tagName: child.tagName,
      id: child.id,
      className: child.className,
      rect: {
        top: child.getBoundingClientRect().top + window.scrollY,
        height: child.offsetHeight
      }
    }));
  });
  console.log('Home-view sections:', JSON.stringify(sectionsInfo, null, 2));

  // Let's also capture full page screenshot
  await page.screenshot({ path: 'C:/Users/shahr/.gemini/antigravity/brain/7f0650d3-89c4-43b5-a30c-589858743208/current_desktop_fullpage.png', fullPage: true });
  console.log('Full page captured');

  await browser.close();
})();
