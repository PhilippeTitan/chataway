#!/usr/bin/env python3
"""Search XVideos using curl_cffi for TLS fingerprint impersonation."""
import sys
import json
import hashlib
import re

try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL = True
except ImportError:
    HAS_CURL = False

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False


def extract_video_id(url):
    match = re.search(r'/video[./]([a-zA-Z0-9]+)', url)
    if match:
        return match.group(1)
    parts = url.rstrip('/').split('/')
    return parts[-1] if parts else url


def create_hash(site, video_id):
    return hashlib.sha256(f"{site}_{video_id}".encode()).hexdigest()[:16]


def extract_thumbnail_url(item):
    """Try multiple selectors to find thumbnail."""
    # Try data-src first (lazy-loaded)
    img = item.select_one('img[data-src]')
    if img and img.get('data-src'):
        return img['data-src']
    # Try src
    img = item.select_one('img')
    if img and img.get('src') and 'http' in img['src']:
        return img['src']
    # Try background-image in a style attr
    thumb_div = item.select_one('.thumb img, .thumb-in img, img')
    if thumb_div:
        src = thumb_div.get('data-src') or thumb_div.get('src') or ''
        if 'http' in src:
            return src
    return None


def search_xvideos(keyword, page=1, sort="relevance"):
    if not HAS_CURL or not HAS_BS4:
        return [{"error": f"Missing deps: curl_cffi={HAS_CURL}, bs4={HAS_BS4}"}]

    url = f"https://www.xvideos.com/{keyword}"
    params = {"p": str(page)}
    if sort and sort != "relevance":
        params["sort"] = sort

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
    }

    try:
        resp = cffi_requests.get(url, params=params, headers=headers, impersonate="chrome", timeout=15)
        resp.raise_for_status()
    except Exception as e:
        return [{"error": f"Request failed: {str(e)}"}]

    soup = BeautifulSoup(resp.text, 'html.parser')
    videos = []

    # XVideos wraps each result in div.thumb-block or div.thumb-with-aff
    items = soup.select("div.thumb-block, div.thumb-with-aff, div.mozaique .thumb-block")

    if not items:
        # Try a broader selector
        items = soup.select("div[class*='thumb']")

    for item in items:
        # Find title and link
        title_tag = item.select_one("p.title a, a[href*='/video']")
        if not title_tag:
            continue

        href = title_tag.get("href", "")
        if not href or "/video" not in href:
            continue

        full_url = f"https://www.xvideos.com{href}" if href.startswith("/") else href
        video_id = extract_video_id(full_url)
        title = title_tag.get("title") or title_tag.get_text(strip=True)
        if not title:
            continue

        # Thumbnail
        thumbnail = extract_thumbnail_url(item)

        # Duration
        duration_tag = item.select_one("span.duration, span[x-t]")
        duration = duration_tag.get_text(strip=True) if duration_tag else None

        # Views
        views_tag = item.select_one("span.views, span:not(.duration)")
        views = views_tag.get_text(strip=True) if views_tag else None

        videos.append({
            "videoId": video_id,
            "title": title,
            "duration": duration,
            "views": views,
            "siteUrl": full_url,
            "site": "xvideos",
            "hash": create_hash("xvideos", video_id),
            "thumbnail": thumbnail,
        })

    return videos


if __name__ == "__main__":
    keyword = sys.argv[1] if len(sys.argv) > 1 else "amateur"
    page = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sort = sys.argv[3] if len(sys.argv) > 3 else "relevance"

    results = search_xvideos(keyword, page, sort)
    print(json.dumps(results))
