# Source Icon Replacement Trail

This app currently centralizes placeholder/source icon rendering in one place so real icons can be swapped in without hunting through the UI.

## Primary Replacement Point

Edit `src/App.tsx`:

- `SourceIcon()` maps source kinds to the current placeholder Lucide icons.
- `SourceAvatar()` wraps those icons in the source-colored square/avatar treatment.
- `ReaderItemMedia()` decides whether a post row uses a real post image or falls back to the source avatar.

Start by replacing the internals of `SourceIcon()` with real image/SVG components.

## Suggested Asset Path

Put brand/source icons here:

```text
public/source-icons/
```

Suggested filenames:

```text
youtube.svg
twitter.svg
reddit.svg
mastodon.svg
newsletter.svg
podcast.svg
audio.svg
rss.svg
```

Then update `SourceIcon()` to render:

```tsx
<img src="/source-icons/youtube.svg" alt="" width={size} height={size} />
```

## Styling Hooks

Edit `src/styles.css`:

- `.reader-source-avatar`
- `.reader-source-avatar--youtube`
- `.reader-source-avatar--twitter`
- `.reader-source-avatar--reddit`
- `.reader-feed-nav-icon`
- `.reader-feed-nav-icon--youtube`
- `.reader-feed-nav-icon--twitter`
- `.reader-feed-nav-icon--reddit`
- `.reader-item-media--source`

These are the classes controlling the placeholder icon color/background and feed-list icon presentation.

## UI Surfaces To Check

After replacing icons, verify:

- Left sidebar `Feeds` list
- Library feed rows
- Reader post rows when no post image is available
- Reader detail panel source header
- Add feed route cards

## Current Placeholder Behavior

Real post images render first when available. If a post image is missing or fails to load, the UI falls back to `SourceAvatar()`.

For generic RSS social posts, the fallback is intentionally social-looking instead of a generic RSS tile, but it is still a placeholder until real source icons are added.
