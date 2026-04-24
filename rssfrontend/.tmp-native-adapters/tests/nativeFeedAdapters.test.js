import { buildUrlCandidates, parseAutodiscoveredFeeds, } from '../src/utils/feedAutodiscovery.js';
import { buildNativeFeedAdapterCandidates, detectNativeFeedAdapterPlatform, } from '../src/utils/nativeFeedAdapters.js';
import { pickPreferredXmlMedia } from '../src/utils/feedPreview.js';
import { toProxyUrl } from '../src/utils/proxyUrl.js';
import { getFeedIdentity } from '../src/utils/reader.js';
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nReceived: ${actual}`);
    }
}
function assertIncludes(items, expected, message) {
    assert(items.includes(expected), `${message}\nExpected to include: ${expected}`);
}
const YOUTUBE_HANDLE_HTML = `
<!doctype html>
<html>
  <head>
    <title>saibmusic - YouTube</title>
    <link
      rel="alternate"
      type="application/rss+xml"
      title="RSS"
      href="https://www.youtube.com/feeds/videos.xml?channel_id=UC66ZJMxR_fv8QXc8YZydCUA"
    />
  </head>
</html>
`;
const REDDIT_ROOT_HTML = `
<!doctype html>
<html>
  <head>
    <title>Reddit</title>
    <link
      rel="alternate"
      type="application/rss+xml"
      title="Reddit Upvoted - RSS"
      href="https://www.reddit.com/discover.rss"
    />
  </head>
</html>
`;
function runNativeAdapterTests() {
    const youtubeDiscovery = parseAutodiscoveredFeeds({
        html: YOUTUBE_HANDLE_HTML,
        sourceUrl: 'https://www.youtube.com/@saibmusic/videos',
        contentType: 'text/html',
    });
    assertEqual(youtubeDiscovery.candidates[0]?.url, 'https://www.youtube.com/feeds/videos.xml?channel_id=UC66ZJMxR_fv8QXc8YZydCUA', 'YouTube handle pages should be discovered through standard RSS autodiscovery links.');
    assertEqual(buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://www.youtube.com/@saibmusic/videos',
    }).length, 0, 'YouTube pages that expose autodiscovery should not use a custom adapter fallback.');
    const redditRootDiscovery = parseAutodiscoveredFeeds({
        html: REDDIT_ROOT_HTML,
        sourceUrl: 'https://www.reddit.com/',
        contentType: 'text/html',
    });
    assertEqual(redditRootDiscovery.candidates[0]?.url, 'https://www.reddit.com/discover.rss', 'Reddit homepage URLs should prefer standard RSS autodiscovery.');
    assertEqual(buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://www.reddit.com/',
    })[0]?.url, 'https://www.reddit.com/discover.rss', 'Reddit root URLs should fall back to discover.rss when autodiscovery is absent.');
    const redditSubreddit = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://www.reddit.com/r/steam/new',
    });
    assertEqual(redditSubreddit[0]?.url, 'https://www.reddit.com/r/steam/new.rss', 'Reddit subreddit URLs should map to deterministic .rss feeds.');
    const redditUser = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://www.reddit.com/user/spez/submitted',
    });
    assertEqual(redditUser[0]?.url, 'https://www.reddit.com/user/spez/submitted.rss', 'Reddit user URLs should map to deterministic .rss feeds.');
    const mastodonProfile = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://mastodon.social/@user',
    });
    assertEqual(mastodonProfile[0]?.url, 'https://mastodon.social/@user.rss', 'Mastodon profile URLs should prefer the direct @user RSS path.');
    assertIncludes(mastodonProfile.map((candidate) => candidate.url), 'https://mastodon.social/users/user.rss', 'Mastodon profile URLs should also try the /users/<user>.rss fallback.');
    const tumblrBlog = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://example.tumblr.com/post/123/title',
    });
    assertEqual(tumblrBlog[0]?.url, 'https://example.tumblr.com/rss', 'Tumblr blog URLs should normalize to /rss on the blog subdomain.');
    const mediumUser = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://medium.com/@user',
    });
    assertEqual(mediumUser[0]?.url, 'https://medium.com/feed/@user', 'Medium profile URLs should normalize to /feed/@user.');
    const mediumPublication = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://medium.com/publication-name',
    });
    assertEqual(mediumPublication[0]?.url, 'https://medium.com/feed/publication-name', 'Medium publication URLs should normalize to /feed/<publication>.');
    const nitterProfile = buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://nitter.net/saibmusic',
    });
    assertEqual(nitterProfile[0]?.url, 'https://nitter.net/saibmusic/rss', 'Nitter profile URLs should normalize to /<handle>/rss.');
    assertEqual(detectNativeFeedAdapterPlatform('https://instagram.com/openai'), undefined, 'Unsupported platforms should not claim a native adapter match.');
    assertEqual(buildNativeFeedAdapterCandidates({
        sourceUrl: 'https://instagram.com/openai',
    }).length, 0, 'Unsupported platforms should not return unvalidated adapter candidates.');
    const normalizedUrlCandidates = buildUrlCandidates('reddit.com/r/steam');
    assertEqual(normalizedUrlCandidates[0], 'https://reddit.com/r/steam', 'URL-like input should try https first when protocol is missing.');
    assertIncludes(normalizedUrlCandidates, 'http://reddit.com/r/steam', 'URL-like input should keep an http fallback candidate when protocol is missing.');
    assertEqual(toProxyUrl('http://localhost:1200/nature/news'), `/local-rsshub-fetch?source=${encodeURIComponent('http://localhost:1200/nature/news')}`, 'Local RSSHub route URLs should be rewritten through the same-origin local fetch endpoint.');
    assertEqual(toProxyUrl('http://127.0.0.1:1200/youtube/user/%40Sora-GrandCross'), `/local-rsshub-fetch?source=${encodeURIComponent('http://127.0.0.1:1200/youtube/user/%40Sora-GrandCross')}`, 'Loopback YouTube route URLs should also use the same-origin local fetch endpoint.');
    assertEqual(getFeedIdentity({
        label: 'Sora-GrandCross',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC123',
        routeId: 'native:rss',
    }).title, 'Sora-Grand Cross', 'Native YouTube feeds should keep a real saved label instead of falling back to videos.xml.');
    assertEqual(getFeedIdentity({
        label: 'Reddit Upvoted - RSS',
        url: 'https://www.reddit.com/discover.rss',
        routeId: 'native:rss',
    }).title, 'Reddit Upvoted - RSS', 'Native Reddit root feeds should keep descriptive labels instead of collapsing to discover.');
    assertEqual(getFeedIdentity({
        label: 'user',
        url: 'https://mastodon.social/@user.rss',
        routeId: 'native:rss',
    }).title, 'user', 'Mastodon native feeds should keep the profile label instead of collapsing to rss.');
    assertEqual(getFeedIdentity({
        label: 'example',
        url: 'https://example.tumblr.com/rss',
        routeId: 'native:rss',
    }).title, 'example', 'Tumblr native feeds should keep the blog label instead of collapsing to rss.');
    assertEqual(getFeedIdentity({
        label: 'user',
        url: 'https://medium.com/feed/@user',
        routeId: 'native:rss',
    }).title, 'user', 'Medium native feeds should keep the profile label instead of collapsing to feed.');
    assertEqual(getFeedIdentity({
        label: 'saibmusic',
        url: 'https://nitter.net/saibmusic/rss',
        routeId: 'native:rss',
    }).title, 'saibmusic', 'Nitter native feeds should keep the profile label instead of collapsing to rss.');
    assertEqual(getFeedIdentity({
        label: 'Channel with user handle',
        url: 'http://localhost:1200/youtube/user/%40Sora-GrandCross',
        routeId: 'youtube-user-route',
    }).title, 'Sora-Grand Cross', 'Route YouTube handle feeds should still derive the channel handle from the route URL.');
    assertEqual(getFeedIdentity({
        label: 'Channel with id',
        url: 'http://localhost:1200/youtube/channel/my-channel-id',
        routeId: 'youtube-channel-route',
    }).title, 'my-channel-id', 'Route YouTube channel feeds should still derive the channel identifier from the route URL.');
    assertEqual(pickPreferredXmlMedia([
        {
            selector: 'media:content',
            url: 'https://www.youtube.com/watch?v=123',
            type: 'video/mp4',
        },
        {
            selector: 'media:thumbnail',
            url: 'https://i.ytimg.com/vi/123/hqdefault.jpg',
        },
    ], { preferImages: true }).url, 'https://i.ytimg.com/vi/123/hqdefault.jpg', 'XML image selection should prefer thumbnails over non-image media content.');
    console.log('Validated native adapter, proxy, reader, and XML media scenarios successfully.');
}
runNativeAdapterTests();
