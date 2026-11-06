// Fetch RSS feeds, keep token-economy items, write articles.json.
// Usage: node fetch-feeds.mjs      (Node 18+, no dependencies)

import { writeFile } from "node:fs/promises";

const FEEDS = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
];

const TOPIC_RULES = [
  { topic: "Stablecoins", re: /stablecoin|usdc|usdt|tether|tokenized (treasur|fund|money)/i },
  { topic: "Regulation", re: /regulat|sec\b|mica|law|lawsuit|compliance|bill\b|ban\b/i },
  { topic: "CBDC", re: /cbdc|central bank digital|digital (euro|yuan|dollar)/i },
  { topic: "AI & Tokens", re: /\bai\b|agent|artificial intelligence/i },
  { topic: "Tokenomics", re: /token(omics)?|unlock|buyback|burn|staking|airdrop|fees?\b/i },
];

// Only keep items that look like token-economy news.
const KEEP_RE = /token|stablecoin|defi|crypto|cbdc|tokeniz|web3|blockchain|on-chain/i;

const decode = (s = "") =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
   .replace(/<[^>]+>/g, "")
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#8217;/g, "'")
   .replace(/&#8220;|&#8221;/g, '"').replace(/&nbsp;/g, " ")
   .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

const classify = text => (TOPIC_RULES.find(r => r.re.test(text)) || { topic: "General" }).topic;

// Crude sentiment from keywords. Placeholder, not analysis.
const sentimentOf = text => {
  const pos = (text.match(/surge|rally|record|high|gain|growth|adopt|launch|approve|win/gi) || []).length;
  const neg = (text.match(/drop|fall|hack|exploit|lawsuit|ban|crash|plunge|loss|fraud|sell-off/gi) || []).length;
  return Math.max(-1, Math.min(1, (pos - neg) / 3));
};

async function fetchFeed({ source, url }) {
  const res = await fetch(url, { headers: { "User-Agent": "token-economy-news/1.0" } });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map(block => {
    const title = tag(block, "title");
    const link = tag(block, "link") || (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "";
    const desc = tag(block, "description");
    const pub = tag(block, "pubDate") || tag(block, "dc:date") || tag(block, "published");
    const d = new Date(pub);
    return {
      date: isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10),
      title, url: link, source, desc,
    };
  }).filter(a => a.title && a.url && KEEP_RE.test(a.title + " " + a.desc));
}

const all = [];
for (const feed of FEEDS) {
  try {
    const items = await fetchFeed(feed);
    console.log(`${feed.source}: ${items.length} matching items`);
    all.push(...items);
  } catch (err) {
    console.warn(`skip ${feed.source}: ${err.message}`);
  }
}

const seen = new Set();
const articles = all
  .filter(a => (seen.has(a.url) ? false : seen.add(a.url)))
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 60)
  .map(a => {
    const text = a.title + " " + a.desc;
    return {
      date: a.date,
      title: a.title,
      url: a.url,
      source: a.source,
      topic: classify(text),
      sentiment: Number(sentimentOf(text).toFixed(1)),
      impact: Math.min(5, 2 + (/fed|sec|bank|regulat|central bank/i.test(text) ? 2 : 0)),
      summary: a.desc.slice(0, 280),
    };
  });

await writeFile(new URL("./articles.json", import.meta.url), JSON.stringify({ updated: new Date().toISOString(), articles }, null, 2));
console.log(`wrote articles.json: ${articles.length} items`);
