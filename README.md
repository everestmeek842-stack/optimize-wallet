# Nexus AI browser & memory

A private, responsive Telegram-style AI workspace with:

- Gemini API chat, with optional native Google Search grounding.
- OpenRouter API chat, with free web-search context from the built-in mini browser.
- Durable local conversation history and user-controlled memory cards.
- Export/restore backups that intentionally exclude API keys.
- A mobile-friendly browser panel which opens sites externally when embedding is blocked.

## Run it locally

This is a zero-build static web app. Open `index.html` in a local static server, for example VS Code Live Server, or deploy the folder to Netlify, Vercel, GitHub Pages, or Cloudflare Pages.

## Add it to Telegram

1. Deploy this folder to an HTTPS URL.
2. Create or open your bot in `@BotFather` and configure a **Menu Button** or **Main Mini App** with that HTTPS URL.
3. Open it from the bot. The page detects Telegram automatically, calls `ready()` / `expand()`, and otherwise behaves as a normal web app.

The BotFather token must never be placed in this frontend. If you later add bot messages or account-level cloud memory, create a server backend and validate Telegram `initData` there before reading or writing user data.

## Connect AI

1. Open **Connect AI**.
2. Enter your Gemini API key and/or OpenRouter API key.
3. Choose whether to remember those keys on the current device.
4. Keep **Use web** enabled for web-aware responses.

Keys are never committed in the source. They live only in the current browser session unless you explicitly enable “Remember keys on this device.” For a multi-user or public production app, add a server-side proxy and store provider keys in deployment environment variables instead of in browsers.

## Memory

Use **Save to memory** on a chat message, add a note in Memory vault, or save open research. The memory vault is included as context in future AI requests. Your browser storage can be cleared by the browser or device, so export a backup for important information.

## Browser limitations

The mini browser searches using DuckDuckGo’s free instant-answer API. It opens full links in the normal browser because many websites prevent being embedded inside another app. Gemini web grounding can provide broader live results when your Gemini project has that feature enabled.
