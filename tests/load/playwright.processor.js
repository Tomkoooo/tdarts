module.exports = {
  async authJourney(page) {
    const start = Date.now();
    await page.goto('http://127.0.0.1:3000/en/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    return Date.now() - start;
  },

  async tournamentJourney(page) {
    const start = Date.now();
    await page.goto('http://127.0.0.1:3000/en/tournaments/DEMO', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    return Date.now() - start;
  },

  async realtimeJourney(page) {
    const start = Date.now();
    await page.goto('http://127.0.0.1:3000/en/board/DEMO', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    return Date.now() - start;
  },
};
