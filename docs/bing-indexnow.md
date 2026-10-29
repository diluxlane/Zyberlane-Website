# Bing Webmaster and IndexNow

## Current state

The repository has a canonical-generated sitemap at `https://zyberlane.com/sitemap.xml` and a wildcard robots rule that permits Bingbot while excluding `/admin/`. No real `BingSiteAuth.xml`, verification meta tag, CNAME token or prior IndexNow integration was found. The XML file in `tests/technical-seo.cjs` is a temporary fixture, not a verification token. Do not copy it into the site.

The owner can [import an already verified Google Search Console property](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b) into Bing Webmaster Tools, or add `https://zyberlane.com` manually and use the token or DNS record Bing actually supplies. After the approved production publication, submit the existing [sitemap](https://zyberlane.com/sitemap.xml) in Bing Webmaster Tools. An older five-URL sitemap was observed on production on 2026-10-29 because publication of the later phases is deferred.

## IndexNow mechanism

The root UTF-8 key file is `b20686997240e72f9251a1f771cdcfb1.txt` and must become available at `https://zyberlane.com/b20686997240e72f9251a1f771cdcfb1.txt` after production publication. It contains exactly the 32-character generated key. This public ownership proof is not a password. `scripts/build.cjs` already copies root text files into `dist/`; the build does not send notifications.

`scripts/indexnow.cjs` reads the current generated sitemap as the allowed set for added/updated URLs. Provide only URLs actually added or materially changed in the approved release; do not submit every sitemap URL merely because a build ran. It deduplicates them and rejects foreign, preview, private, query and noncanonical URLs. It checks the live production key and each URL before a POST to `https://api.indexnow.org/indexnow`. The payload uses host `zyberlane.com` and the production keyLocation.

Run the dry run after reviewing the production release:

```sh
node scripts/build.cjs
node scripts/indexnow.cjs --dry-run --url https://zyberlane.com/services/web-development/
```

Only after the owner has published that build and the key and selected pages are live, explicitly submit:

```sh
node scripts/indexnow.cjs --submit --production-release --url https://zyberlane.com/services/web-development/
```

The live checks require HTTP 200 for every added/updated URL and exact key-file content. Current production has returned 404 for Phase 3/4 routes, so a submission for those URLs cannot pass until they are published. Vercel builds never invoke this script.

For a genuinely removed URL, first remove it from the production sitemap and publish its 404/410 state. Then use `--deleted` with `--url` and the same dry-run or submit flags. The script requires the URL to be absent from the current sitemap and to return 404 or 410 on production; it does not generate a 410 response or mark a live URL deleted.

IndexNow reports changes to participating engines; [Bing's guidance](https://www.bing.com/indexnow/getstarted) says it does not guarantee crawling or indexing. Check receipt in Bing Webmaster Tools after a real submission. A 200/202 API response is receipt/acceptance, not a ranking result.

## Sources

- [Bing add and verify site](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [Bing sitemaps](https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed)
- [IndexNow protocol](https://www.indexnow.org/documentation)
- [Bing IndexNow setup](https://www.bing.com/indexnow/getstarted)
