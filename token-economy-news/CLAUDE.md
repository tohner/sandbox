# Token Economy News

Static news tracker for token economy topics (stablecoins, tokenization, CBDCs, tokenomics, AI and tokens, regulation).

## Files

- `index.html`: whole UI. Inline CSS and JS, no build step, no framework, no external assets.
- `fetch-feeds.mjs`: fetches RSS feeds, filters token/crypto items, writes `articles.json`. Node 18+, no dependencies.
- `articles.json`: generated. Do not hand-edit. Regenerate with the script.

## Commands

```bash
node fetch-feeds.mjs                 # refresh articles.json from RSS
python3 -m http.server 8000          # serve folder; index.html needs http, not file://
```

Open http://localhost:8000/index.html after serving.

## Rules

- Keep it a single static page. No frameworks, bundlers, or npm deps unless the user asks.
- `index.html` must keep working without `articles.json`. Sample data in the `ARTICLES` array is the fallback.
- Escape all feed text before inserting into HTML. Use the existing `esc()` helper.
- Feed sources live in the `FEEDS` array in `fetch-feeds.mjs`. Add sources there, not in the page.
- Topic and sentiment are keyword heuristics. Label them that way in UI text. Do not present them as analysis.
- Scripts must not call paid APIs or require keys. Do not commit secrets.
- Respect feed terms. Keep the `User-Agent` header and fetch at a low rate (manual runs or cron, not tight loops).

## Verify before saying done

1. JS syntax: `node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.split('<script>')[1].split('</script>')[0])"`
2. Run `node fetch-feeds.mjs` and confirm item count > 0.
3. Load the served page and check the status line reads "Live feed updated" and cards render.

## Known gaps

- No scheduled refresh. Re-run the script manually.
- Feed parsing is regex-based. Malformed or unusual RSS may drop items silently.
- Sentiment is a keyword count, not a model.
