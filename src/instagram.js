import { setTimeout as delay } from "node:timers/promises";

const POST_LINK_SELECTOR = 'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]';
const REMOVE_SELECTOR = 'svg[aria-label="Remove"]';
const SAVE_SELECTOR = 'svg[aria-label="Save"]';

export async function collectSavedPostLinks(page, {
  maxRounds = 180,
  idleRoundsLimit = 12,
  scrollDelayMs = 1400
} = {}) {
  const links = new Set();
  let idleRounds = 0;

  for (let round = 0; round < maxRounds && idleRounds < idleRoundsLimit; round++) {
    const before = links.size;
    const found = await page.locator(POST_LINK_SELECTOR).evaluateAll(nodes =>
      nodes.map(node => node.href.split("?")[0])
    );

    for (const link of found) {
      if (/^https:\/\/www\.instagram\.com\/(p|reel|tv)\/[^/]+\/?$/.test(link)) {
        links.add(link);
      }
    }

    idleRounds = links.size === before ? idleRounds + 1 : 0;
    console.log(`Collection scan ${round + 1}: ${links.size} unique post links`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(scrollDelayMs);
  }

  return [...links];
}

export async function unsavePost(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

  const removeIcon = page.locator(REMOVE_SELECTOR).first();
  try {
    await removeIcon.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    return "SKIPPED: saved bookmark control not found";
  }

  const button = removeIcon.locator('xpath=ancestor::*[@role="button"][1]');
  if (await button.count() !== 1) return "SKIPPED: bookmark control is ambiguous";

  await button.click({ timeout: 10000 });
  await delay(1800);

  // Verify against the bookmark control on the opened post page.
  if (await page.locator(REMOVE_SELECTOR).count() > 0) {
    return "UNVERIFIED: Remove icon remains";
  }
  if (await page.locator(SAVE_SELECTOR).count() > 0) {
    return "VERIFIED: bookmark now shows Save";
  }
  return "UNVERIFIED: bookmark state could not be confirmed";
}
