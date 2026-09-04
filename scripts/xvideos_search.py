#!/usr/bin/env python3
import sys
import json
import hashlib
import re

try:
    from xvideos import XVideos
except ImportError:
    # Fallback: manual scraping if xvideos-py not available
    XVideos = None

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


def extract_video_id(url):
    """Extract video ID from XVideos URL."""
    # Match patterns like /video12345678/slug or /video.abc123/slug
    match = re.search(r'/video[./]([a-zA-Z0-9]+)', url)
    if match:
        return match.group(1)
    return url.split('/')[-2] if '/' in url else url


def create_hash(site, video_id):
    """Create dedup hash."""
    return hashlib.sha256(f"{site}_{video_id}".encode()).hexdigest()[:16]


def search_with_library(keyword, page=1, sort="relevance"):
    """Search using xvideos-py library."""
    xv = XVideos()
    results = xv.search(page=page, k=keyword, sort=sort)

    videos = []
    for v in results.get('videos', []):
        video_id = extract_video_id(v.url)
        videos.append({
            "videoId": video_id,
            "title": v.title,
            "duration": v.duration if hasattr(v, 'duration') else None,
            "views": v.views if hasattr(v, 'views') else None,
            "siteUrl": v.url,
            "site": "xvideos",
            "hash": create_hash("xvideos", video_id),
            "thumbnail": None,
        })
    return videos


def search_with_scraper(keyword, page=1, sort="relevance"):
    """Fallback: scrape XVideos search page directly."""
    if not HAS_REQUESTS:
        return []

    url = f"https://www.xvideos.com/?k={keyword}&p={page}&sort={sort}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    videos = []

    # XVideos search results are in div.thumb-under
    for item in soup.select("div.thumb-under"):
        title_tag = item.select_one("p.title a")
        duration_tag = item.select_one("span.duration")
        views_tag = item.select_one("span.views")

        if not title_tag:
            continue

        href = title_tag.get("href", "")
        full_url = f"https://www.xvideos.com{href}" if href.startswith("/") else href
        video_id = extract_video_id(full_url)

        videos.append({
            "videoId": video_id,
            "title": title_tag.get("title") or title_tag.text.strip(),
            "duration": duration_tag.text.strip() if duration_tag else None,
            "views": views_tag.text.strip() if views_tag else None,
            "siteUrl": full_url,
            "site": "xvideos",
            "hash": create_hash("xvideos", video_id),
            "thumbnail": None,
        })

    return videos


def search(keyword, page=1, sort="relevance"):
    """Main search function - tries library first, falls back to scraper."""
    try:
        if XVideos is not None:
            return search_with_library(keyword, page, sort)
    except Exception as e:
        print(json.dumps({"library_error": str(e)}), file=sys.stderr)

    # Fallback to manual scraper
    return search_with_scraper(keyword, page, sort)


if __name__ == "__main__":
    keyword = sys.argv[1] if len(sys.argv) > 1 else "amateur"
    page = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sort = sys.argv[3] if len(sys.argv) > 3 else "relevance"

    results = search(keyword, page, sort)
    print(json.dumps(results))
