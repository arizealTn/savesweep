import { chromium } from "playwright";
import readline from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { collectSavedPostLinks, unsavePost } from "./instagram.js";
import { CHECKPOINT_PATH, loadCheckpoint, saveCheckpoint } from "./checkpoint.js";

const CDP_ENDPOINT = process.env.SAVESWEEP_CDP || "http://127.0.0.1:9222";
const MIN_DELAY_MS = Number(process.env.SAVESWEEP_MIN_DELAY_MS || 7000);
const MAX_DELAY_MS = Number(process.env.SAVESWEEP_MAX_DELAY_MS || 11000);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = question => new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
let paused = false;
let stopRequested = false;

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}

async function waitForControl() {
  while (paused && !stopRequested) await delay(250);
}

function installProcessingControls() {
  console.log("\\nControls: enter p to pause/resume; enter q to stop after the current post.");
  rl.on("line", line => {
    const command = line.trim().toLowerCase();
    if (command === "p") {
      paused = !paused;
      console.log(paused ? "[PAUSED]" : "[RESUMED]");
    } else if (command === "q") {
      stopRequested = true;
      paused = false;
      console.log("[STOP REQUESTED] SaveSweep will stop after the current post.");
    }
  });
}

async function main() {
  let browser;
  let automationPage;

  try {
    browser = await chromium.connectOverCDP(CDP_ENDPOINT);
    const contexts = browser.contexts();
    const context = contexts[0];
    if (!context) throw new Error("No existing Brave browser context was found.");

    // Use a new tab. Do not navigate or take control of the user's existing tabs.
    automationPage = await context.newPage();
    await automationPage.goto("https://www.instagram.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    console.log("SaveSweep opened a dedicated Instagram tab.");
    console.log("Your other Brave tabs are not used by this script.");
    await ask("In the new SaveSweep tab, sign in if needed and open Saved > All Posts. Then press Enter here...");

    if (!automationPage.url().includes("instagram.com")) {
      throw new Error("The SaveSweep tab is not on Instagram.");
    }

    let links;
    let nextIndex = 0;
    let results = { verified: [], failed: [] };

    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      const choice = (await ask("Existing progress found. Type RESUME to continue, or NEW to collect again: ")).toUpperCase();
      if (choice === "RESUME") {
        links = checkpoint.links;
        nextIndex = checkpoint.nextIndex;
        results = checkpoint.results;
        console.log(`Resuming at ${nextIndex + 1} of ${links.length}.`);
      }
    }

    if (!links) {
      console.log("Collecting post links from the currently open Saved > All Posts page...");
      links = await collectSavedPostLinks(automationPage);
      if (!links.length) {
        throw new Error("No post links detected. Confirm that Saved > All Posts is open in the SaveSweep tab.");
      }

      console.log(`\\nCollected ${links.length} unique post links.`);
      console.log("This operation will attempt to remove saved bookmarks sequentially.");
      console.log("Use only on your own account. Instagram may rate-limit or change its interface.");
      const confirmation = (await ask('Type UNSAVE ALL to continue, or anything else to cancel: ')).toUpperCase();
      if (confirmation !== "UNSAVE ALL") {
        console.log("Cancelled. No posts were changed.");
        return;
      }
      saveCheckpoint({ links, nextIndex: 0, results });
    }

    installProcessingControls();

    for (let i = nextIndex; i < links.length; i++) {
      await waitForControl();
      if (stopRequested) break;

      console.log(`\\n[${i + 1}/${links.length}] ${links[i]}`);
      let outcome;
      try {
        outcome = await unsavePost(automationPage, links[i]);
      } catch (error) {
        outcome = `ERROR: ${error.message}`;
      }
      console.log(outcome);

      if (outcome.startsWith("VERIFIED")) results.verified.push(links[i]);
      else results.failed.push({ url: links[i], reason: outcome });

      saveCheckpoint({ links, nextIndex: i + 1, results });
      if (i < links.length - 1 && !stopRequested) {
        const waitMs = randomDelay();
        console.log(`Waiting ${(waitMs / 1000).toFixed(1)} seconds...`);
        await delay(waitMs);
      }
    }

    const saved = loadCheckpoint();
    console.log("\\n---------- SaveSweep summary ----------");
    console.log(`Collected links: ${links.length}`);
    console.log(`Verified in browser UI: ${results.verified.length}`);
    console.log(`Skipped / unverified / errors: ${results.failed.length}`);
    console.log(`Next index: ${saved?.nextIndex ?? 0}`);
    console.log(`Progress file: ${CHECKPOINT_PATH}`);
    console.log("Check Instagram Saved manually. A UI confirmation is not proof of server-side persistence.");
  } finally {
    if (automationPage) {
      try { await automationPage.close(); } catch {}
    }
    // Close the Playwright CDP connection; do not explicitly close the Brave process.
    if (browser) {
      try { await browser.close(); } catch {}
    }
    rl.close();
  }
}

main().catch(error => {
  console.error("\\nSaveSweep error:", error.message);
  process.exitCode = 1;
});
