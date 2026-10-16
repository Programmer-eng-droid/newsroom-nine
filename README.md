# Newsroom Nine: put it online for free

This folder is the whole app. It is plain HTML, CSS and JavaScript, so it needs no server, no build step and no database.
It works online and offline, and people can install it on their phone or computer like an app (a "PWA").

## Option A: GitHub Pages (free)
1. Create a free account at github.com.
2. Click **New repository**. Name it `newsroom-nine`. Choose **Public**. Create it.
3. Click **uploading an existing file**. Open this folder on your computer, select EVERYTHING inside it
   (including the `cases` and `icons` folders) and drag it into the page. Click **Commit changes**.
   Tip: `.nojekyll` and `_headers` start with a dot or underscore and may be hidden. `.nojekyll` is optional, so skip it if you can't see it.
4. Go to **Settings → Pages**. Under "Branch" choose `main` and `/ (root)`, then **Save**.
5. Wait 1-3 minutes. Your link will be `https://YOURNAME.github.io/newsroom-nine/`.

## Option B: Cloudflare Pages (free, fast in Africa)
1. Create a free account at dash.cloudflare.com.
2. Go to **Workers & Pages → Create → Pages → Upload assets**.
3. Name the project, drag in this folder, and click **Deploy**.
4. Your link will be `https://yourproject.pages.dev`.

## Option C: Netlify (free, easiest drag and drop)
1. Go to app.netlify.com/drop and sign up.
2. Drag this whole folder onto the page. You get a link at once.

## After it is live
- Open the link on your phone using mobile data. Wait about 10 seconds, then switch on airplane mode and reload.
  The game should still open. That is the offline mode working.
- **Android (Chrome):** tap the **Install app** button in the game, or the browser menu → Install app.
- **iPhone (Safari):** tap Share → **Add to Home Screen**.
- **Computer (Chrome/Edge):** click the install icon in the address bar.

## Changing things later
- **Add a case:** copy `cases/flood-photo.json`, edit the text, save it under a new name, and add one line for it in `cases/index.json`.
- **Important:** open `sw.js` and change `newsroom-nine-v1` to `newsroom-nine-v2` (then v3, and so on) every time you change any file.
  This tells people's installed copies to update. Then upload the changed files again.
- On GitHub, the same upload page replaces old files with the new ones.

## Your own domain (optional)
Buy a domain from a registrar, then in your host's dashboard (Pages → Custom domains) add it and follow the DNS steps shown.
Free HTTPS is included on all three hosts. Installing and offline mode only work over HTTPS, which you get automatically.

## Privacy
The game stores the player's best score on their own device only. Nothing is sent anywhere.
If you add analytics later, tell players in a privacy note.
