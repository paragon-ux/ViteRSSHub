# Non-Credentialed Routes Guide

This file is a practical guide for routes that are usually usable without operator credentials.

It is a product-level convenience guide, not an official RSSHub classification.

## Important caveat

RSSHub’s official docs provide route-specific config notes, but they explicitly say those config docs are incomplete. Individual route pages may also include labels such as:

- Self-host only
- Strict anti-crawler policy
- Support browser extension

Those labels are strong signals that a route is **not** truly non-credentialed or may be fragile even if it does not require a classic API key.

## Recommended meaning of “non-credentialed”

A route is a good non-credentialed candidate when it:

- works without account login
- does not require cookies, tokens, or app credentials
- is not marked self-host only
- is not clearly tied to strict anti-crawler restrictions
- does not depend on a browser-extension-only flow

## Good candidates

These are usually the safest categories:

- public blogs and news sites
- public YouTube user/channel routes that do not require special auth
- public forum pages
- public documentation pages
- public repositories / releases / changelogs
- public government or university pages
- public RSS-like site sections that RSSHub can scrape without login

## Caution candidates

These may work sometimes, but are fragile:

- public social media profiles
- routes marked strict anti-crawler policy
- routes marked support browser extension
- routes relying on third-party mirrors or alt-frontends
- Twitter/X through Nitter public user feeds

## Credentialed or operator-config routes

These generally require credentials or instance config:

- Mastodon app-credential routes
- Instagram routes with self-host / anti-crawler constraints
- cookie-based routes
- routes requiring API keys, tokens, or app secrets
- authenticated Twitter/X routes like home/latest or likes
- anything explicitly marked self-host only

## How to use this guide in AdaptRSS

Use this file as a product curation layer:

- show “Easy / No credentials expected”
- show “May need operator setup”
- show “Requires credentials or self-hosted config”

Do not treat this file as a permanent source of truth. Always check the route docs and route-specific config notes when adding or changing support.