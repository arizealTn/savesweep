# SaveSweep

A tiny tool to clean up your Instagram Saved collection.

Because apparently, saving 800 posts for "later" means never seeing them
again.

## What it does

-   Collects links from your **Saved → All Posts** page.
-   Goes through them one by one.
-   Lets you pause, resume, or stop.
-   Keeps local progress so an interrupted run doesn't have to start
    from zero.

## Before you start

You'll need:

-   Node.js 20+
-   Brave (or another Chromium-based browser)
-   An Instagram account you're allowed to use

## Setup

Clone or download this repository, then open a terminal in the project
folder:

``` bash
npm install
```

Start Brave with remote debugging enabled. On Windows CMD:

``` cmd
start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222
```

Then start SaveSweep:

``` bash
npm start
```

A separate Instagram tab will open. Go to **Saved → All Posts**, return
to the terminal, and follow the prompts.

Type `UNSAVE ALL` only when you're ready to begin.

## Controls

  Key   What it does
  ----- -----------------------------
  `p`   Pause / resume
  `q`   Stop after the current post

If a progress file is found, choose `RESUME` to continue or `NEW` to
start a fresh collection.

## YouTube walkthrough

▶ **[Watch the setup and demo video](YOUR_YOUTUBE_VIDEO_LINK_HERE)**

## A few things to know

-   This is an unofficial personal-use tool. It is not affiliated with
    Instagram or Meta.
-   Use it only with your own account.
-   Instagram can change its website or limit automated actions. If you
    see a security warning or checkpoint, stop.
-   A "verified" result means the page showed the Save icon after the
    click. It does not guarantee Instagram saved that change on its
    servers. Check your Saved collection yourself.
-   `savesweep-progress.json` contains links from your Saved collection.
    Keep it private; don't upload it.

## That's it

No subscription. No premium tier. No mysterious dashboard.

Just a small tool for the saved-post graveyard.

## License

MIT
