const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // 1. Desktop Test (1280x900)
  const pageDesktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await pageDesktop.goto('http://localhost:8080/', { waitUntil: 'networkidle' });

  // Scroll to FAQ
  const faqSection = await pageDesktop.$('#faq-section');
  if (faqSection) {
    await faqSection.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.screenshot({
      path: 'C:/Users/shahr/.gemini/antigravity/brain/7f0650d3-89c4-43b5-a30c-589858743208/verified_desktop_faq.png'
    });
    console.log('Captured desktop FAQ screenshot');
  }

  // Scroll to Footer
  const footerSection = await pageDesktop.$('footer.footer');
  if (footerSection) {
    await footerSection.scrollIntoViewIfNeeded();
    await pageDesktop.waitForTimeout(500);
    await pageDesktop.screenshot({
      path: 'C:/Users/shahr/.gemini/antigravity/brain/7f0650d3-89c4-43b5-a30c-589858743208/verified_desktop_footer.png'
    });
    console.log('Captured desktop footer screenshot');
  }

  // 2. Mobile Test (440x956)
  const pageMobile = await browser.newPage({ viewport: { width: 440, height: 956 } });
  await pageMobile.goto('http://localhost:8080/', { waitUntil: 'networkidle' });

  const mobileFaq = await pageMobile.$('#faq-section');
  if (mobileFaq) {
    await mobileFaq.scrollIntoViewIfNeeded();
    await pageMobile.waitForTimeout(500);
    await pageMobile.screenshot({
      path: 'C:/Users/shahr/.gemini/antigravity/brain/7f0650d3-89c4-43b5-a30c-589858743208/verified_mobile_faq.png'
    });
    console.log('Captured mobile FAQ screenshot');
  }

  const mobileFooter = await pageMobile.$('footer.footer');
  if (mobileFooter) {
    await mobileFooter.scrollIntoViewIfNeeded();
    await pageMobile.waitForTimeout(500);
    await pageMobile.screenshot({
      path: 'C:/Users/shahr/.gemini/antigravity/brain/7f0650d3-89c4-43b5-a30c-589858743208/verified_mobile_footer.png'
    });
    console.log('Captured mobile footer screenshot');
  }

  await browser.close();
  console.log('All verification captures complete');
})();
