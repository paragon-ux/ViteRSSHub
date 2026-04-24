const RESERVED_MEDIUM_SEGMENTS = new Set([
    '',
    'about',
    'feed',
    'followers',
    'following',
    'me',
    'membership',
    'notifications',
    'plans',
    'search',
    'signin',
    'tag',
    'topics',
]);
const RESERVED_TUMBLR_SEGMENTS = new Set([
    '',
    'blog',
    'dashboard',
    'explore',
    'following',
    'login',
    'register',
    'search',
    'settings',
]);
function normalizeHost(hostname) {
    return hostname.toLowerCase().replace(/^www\./i, '');
}
function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
function normalizePathSegments(pathname) {
    return pathname.split('/').filter(Boolean);
}
function normalizePageUrl(sourceUrl) {
    const parsed = new URL(sourceUrl);
    parsed.hash = '';
    return parsed.toString();
}
function normalizeHttpsUrl(sourceUrl) {
    const parsed = new URL(sourceUrl);
    parsed.protocol = 'https:';
    parsed.hash = '';
    return parsed;
}
function stripTrailingRss(value) {
    return value.replace(/\.rss$/i, '');
}
function makeCandidate(options) {
    return {
        url: options.feedUrl,
        title: options.title,
        type: 'RSS',
        sourceUrl: options.sourceUrl,
        homeUrl: options.homeUrl,
        siteTitle: options.siteTitle,
        platform: options.platform,
        platformLabel: getNativeFeedAdapterPlatformLabel(options.platform),
    };
}
function isYoutubeHost(hostname) {
    const normalized = normalizeHost(hostname).replace(/^m\./i, '');
    return normalized === 'youtube.com';
}
function isRedditHost(hostname) {
    const normalized = normalizeHost(hostname);
    return normalized === 'reddit.com' || normalized === 'old.reddit.com';
}
function isMediumHost(hostname) {
    return normalizeHost(hostname) === 'medium.com';
}
function isTumblrHost(hostname) {
    return normalizeHost(hostname).endsWith('.tumblr.com') || normalizeHost(hostname) === 'tumblr.com';
}
function isNitterHost(hostname) {
    return normalizeHost(hostname).includes('nitter');
}
function getTumblrBlogName(url) {
    const normalizedHost = normalizeHost(url.hostname);
    if (normalizedHost.endsWith('.tumblr.com') && normalizedHost !== 'tumblr.com') {
        const [blog] = normalizedHost.split('.');
        return blog && !RESERVED_TUMBLR_SEGMENTS.has(blog) ? blog : undefined;
    }
    if (normalizedHost === 'tumblr.com') {
        const [blog] = normalizePathSegments(url.pathname);
        return blog && !RESERVED_TUMBLR_SEGMENTS.has(blog.toLowerCase()) ? blog : undefined;
    }
    return undefined;
}
function matchesRedditAdapterPath(pathname) {
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';
    const segments = normalizePathSegments(normalizedPath);
    if (normalizedPath === '/' || normalizedPath === '') {
        return true;
    }
    if (segments[0] === 'r' && segments[1]) {
        if (segments.length === 2) {
            return true;
        }
        return segments.length === 3 && ['new', 'hot'].includes(segments[2].toLowerCase());
    }
    if (segments[0] === 'user' && segments[1]) {
        if (segments.length === 2) {
            return true;
        }
        return segments.length === 3 && segments[2].toLowerCase() === 'submitted';
    }
    return false;
}
function buildRedditCandidates(url) {
    if (!isRedditHost(url.hostname)) {
        return [];
    }
    const normalizedUrl = normalizeHttpsUrl(url.toString());
    normalizedUrl.hostname = 'www.reddit.com';
    const sourceUrl = normalizePageUrl(normalizedUrl.toString());
    const pathname = stripTrailingRss(normalizedUrl.pathname.replace(/\/+$/, ''));
    const segments = normalizePathSegments(pathname);
    if (pathname === '' || pathname === '/') {
        return [
            makeCandidate({
                platform: 'reddit',
                sourceUrl,
                homeUrl: 'https://www.reddit.com/',
                feedUrl: 'https://www.reddit.com/discover.rss',
                title: 'Reddit discover',
            }),
        ];
    }
    if (segments[0] === 'r' && segments[1]) {
        const subreddit = safeDecode(segments[1]);
        const sortSegment = segments[2]?.toLowerCase();
        const suffix = sortSegment === 'new' || sortSegment === 'hot' ? `/${sortSegment}` : '';
        if (segments.length > (suffix ? 3 : 2)) {
            return [];
        }
        return [
            makeCandidate({
                platform: 'reddit',
                sourceUrl,
                homeUrl: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}${suffix}`,
                feedUrl: `https://www.reddit.com/r/${encodeURIComponent(subreddit)}${suffix}.rss`,
                title: `r/${subreddit}`,
            }),
        ];
    }
    if (segments[0] === 'user' && segments[1]) {
        const username = safeDecode(segments[1]);
        const section = segments[2]?.toLowerCase();
        const suffix = section === 'submitted' ? '/submitted' : '';
        if (segments.length > (suffix ? 3 : 2)) {
            return [];
        }
        return [
            makeCandidate({
                platform: 'reddit',
                sourceUrl,
                homeUrl: `https://www.reddit.com/user/${encodeURIComponent(username)}${suffix}`,
                feedUrl: `https://www.reddit.com/user/${encodeURIComponent(username)}${suffix}.rss`,
                title: `u/${username}`,
            }),
        ];
    }
    return [];
}
function buildMastodonCandidates(url) {
    const normalizedHost = normalizeHost(url.hostname);
    if (isYoutubeHost(normalizedHost) ||
        isRedditHost(normalizedHost) ||
        isMediumHost(normalizedHost) ||
        isTumblrHost(normalizedHost) ||
        isNitterHost(normalizedHost)) {
        return [];
    }
    const normalizedUrl = normalizeHttpsUrl(url.toString());
    const sourceUrl = normalizePageUrl(normalizedUrl.toString());
    const pathname = normalizedUrl.pathname.replace(/\/+$/, '');
    const candidates = [];
    const handleMatch = pathname.match(/^\/@([^/]+)$/i);
    if (handleMatch) {
        const username = safeDecode(handleMatch[1]);
        candidates.push(makeCandidate({
            platform: 'mastodon',
            sourceUrl,
            homeUrl: sourceUrl,
            feedUrl: `${normalizedUrl.origin}/@${username}.rss`,
            title: `@${username}`,
        }), makeCandidate({
            platform: 'mastodon',
            sourceUrl,
            homeUrl: sourceUrl,
            feedUrl: `${normalizedUrl.origin}/users/${username}.rss`,
            title: `@${username}`,
        }));
    }
    const usersMatch = pathname.match(/^\/users\/([^/]+)$/i);
    if (usersMatch) {
        const username = safeDecode(usersMatch[1]);
        candidates.push(makeCandidate({
            platform: 'mastodon',
            sourceUrl,
            homeUrl: sourceUrl,
            feedUrl: `${normalizedUrl.origin}/users/${username}.rss`,
            title: `@${username}`,
        }), makeCandidate({
            platform: 'mastodon',
            sourceUrl,
            homeUrl: sourceUrl,
            feedUrl: `${normalizedUrl.origin}/@${username}.rss`,
            title: `@${username}`,
        }));
    }
    return Array.from(new Map(candidates.map((candidate) => [candidate.url, candidate])).values());
}
function buildTumblrCandidates(url) {
    if (!isTumblrHost(url.hostname)) {
        return [];
    }
    const blog = getTumblrBlogName(url);
    if (!blog) {
        return [];
    }
    const normalizedBlog = safeDecode(blog);
    const normalizedUrl = normalizeHttpsUrl(url.toString());
    const sourceUrl = normalizePageUrl(normalizedUrl.toString());
    const homeUrl = `https://${normalizedBlog}.tumblr.com/`;
    return [
        makeCandidate({
            platform: 'tumblr',
            sourceUrl,
            homeUrl,
            feedUrl: `https://${normalizedBlog}.tumblr.com/rss`,
            title: normalizedBlog,
        }),
    ];
}
function buildMediumCandidates(url) {
    if (!isMediumHost(url.hostname)) {
        return [];
    }
    const normalizedUrl = normalizeHttpsUrl(url.toString());
    normalizedUrl.hostname = 'medium.com';
    const sourceUrl = normalizePageUrl(normalizedUrl.toString());
    const segments = normalizePathSegments(normalizedUrl.pathname);
    const firstSegment = segments[0];
    if (!firstSegment) {
        return [];
    }
    if (firstSegment.startsWith('@')) {
        const handle = safeDecode(firstSegment);
        return [
            makeCandidate({
                platform: 'medium',
                sourceUrl,
                homeUrl: `https://medium.com/${handle}`,
                feedUrl: `https://medium.com/feed/${handle}`,
                title: handle,
            }),
        ];
    }
    if (segments.length !== 1 || RESERVED_MEDIUM_SEGMENTS.has(firstSegment.toLowerCase())) {
        return [];
    }
    const publication = safeDecode(firstSegment);
    return [
        makeCandidate({
            platform: 'medium',
            sourceUrl,
            homeUrl: `https://medium.com/${publication}`,
            feedUrl: `https://medium.com/feed/${publication}`,
            title: publication,
        }),
    ];
}
function buildNitterCandidates(url) {
    if (!isNitterHost(url.hostname)) {
        return [];
    }
    const normalizedUrl = normalizeHttpsUrl(url.toString());
    const sourceUrl = normalizePageUrl(normalizedUrl.toString());
    const segments = normalizePathSegments(normalizedUrl.pathname);
    if (!segments.length) {
        return [];
    }
    const handle = safeDecode(segments[0]).replace(/^@/, '');
    if (!handle) {
        return [];
    }
    if (segments.length > 2 || (segments[1] && segments[1].toLowerCase() !== 'rss')) {
        return [];
    }
    return [
        makeCandidate({
            platform: 'nitter',
            sourceUrl,
            homeUrl: `${normalizedUrl.origin}/${handle}`,
            feedUrl: `${normalizedUrl.origin}/${handle}/rss`,
            title: `@${handle}`,
        }),
    ];
}
export function getNativeFeedAdapterPlatformLabel(platform) {
    if (platform === 'reddit') {
        return 'Reddit';
    }
    if (platform === 'mastodon') {
        return 'Mastodon';
    }
    if (platform === 'tumblr') {
        return 'Tumblr';
    }
    if (platform === 'medium') {
        return 'Medium';
    }
    return 'Nitter';
}
export function detectNativeFeedAdapterPlatform(sourceUrl) {
    try {
        const parsed = new URL(sourceUrl);
        const normalizedHost = normalizeHost(parsed.hostname);
        if (isYoutubeHost(normalizedHost)) {
            return undefined;
        }
        if (isRedditHost(normalizedHost) && matchesRedditAdapterPath(parsed.pathname)) {
            return 'reddit';
        }
        if (isNitterHost(normalizedHost)) {
            return 'nitter';
        }
        if (isMediumHost(normalizedHost)) {
            return 'medium';
        }
        if (isTumblrHost(normalizedHost)) {
            return 'tumblr';
        }
        const pathname = parsed.pathname.replace(/\/+$/, '');
        if (/^\/@[^/]+$/i.test(pathname) || /^\/users\/[^/]+$/i.test(pathname)) {
            return 'mastodon';
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
export function buildNativeFeedAdapterCandidates(options) {
    const parsed = new URL(options.sourceUrl);
    const platform = detectNativeFeedAdapterPlatform(parsed.toString());
    if (!platform) {
        return [];
    }
    if (platform === 'reddit') {
        return buildRedditCandidates(parsed);
    }
    if (platform === 'mastodon') {
        return buildMastodonCandidates(parsed);
    }
    if (platform === 'tumblr') {
        return buildTumblrCandidates(parsed);
    }
    if (platform === 'medium') {
        return buildMediumCandidates(parsed);
    }
    return buildNitterCandidates(parsed);
}
