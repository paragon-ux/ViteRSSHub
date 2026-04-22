# RSSHub Frontend

A modern React + Vite frontend for browsing RSSHub routes, building feed URLs, previewing output, saving feeds locally, and managing operator-level RSSHub config hints.

## What it does

- search RSSHub routes with autocomplete
- filter routes by category
- inspect route details and required path params
- build feed URLs against your RSSHub instance
- preview feed output using debug JSON
- save feeds locally in the browser
- export saved feeds as OPML
- show route-specific config hints
- generate copyable `.env` snippets for RSSHub instance config

## Twitter/X source behavior

Twitter/X routes are split into two categories:

### Public routes supported through Nitter

When:

```env
TWITTER_SOURCE=nitter

the frontend maps supported public Twitter/X routes to Nitter RSS URLs instead of RSSHub’s built-in /twitter/... routes.

Currently supported:

public user timeline
public keyword/search feed

Examples of generated Nitter URLs:

https://nitter.poast.org/elonmusk/rss
https://nitter.poast.org/search/rss?f=tweets&q=OpenAI

### Routes that still require official authenticated Twitter/X config

These are not good Nitter fallback candidates and remain dependent on RSSHub’s official Twitter/X route handling:

home_latest
likes
bookmarks
trends
list-based routes
other authenticated or unsupported Twitter/X routes

If one of these routes is selected while TWITTER_SOURCE=nitter, the builder will show a warning and disable feed generation.

## Related config keys

The Config panel can expose these keys for Twitter/X:

TWITTER_SOURCE=nitter
NITTER_BASE_URL=https://nitter.poast.org

NITTER_BASE_URL can point to a public Nitter instance or to your own self-hosted one.

## Important note

Public Nitter instances can be unstable or rate-limited. The frontend treats them as the default public-source option, but operators should be able to override the base URL.

## Local setup

This frontend is designed to work with your local RSSHub instance running on:

```txt
http://localhost:1200

The Vite dev server runs on:

http://localhost:5173

## **Prerequisites**

* Node.js 18+  
* npm  
* RSSHub already running with Docker Compose on port `1200`

## **Install**

npm install

## **Start the frontend**

npm run dev

Then open:

http://127.0.0.1:5173