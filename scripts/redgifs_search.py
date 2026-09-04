#!/usr/bin/env python3
"""RedGifs API wrapper — search, trending, niches/tags."""
import sys
import json
import hashlib

try:
    import redgifs
    from redgifs import API, Order
    HAS_REDGIFS = True
except ImportError:
    HAS_REDGIFS = False
    API = None
    Order = None


def create_hash(site: str, video_id: str) -> str:
    return hashlib.sha256(f"{site}_{video_id}".encode()).hexdigest()[:16]


def format_gif(gif) -> dict:
    """Convert a RedGifs gif object to our standard clip format."""
    urls = gif.urls if hasattr(gif, 'urls') else {}
    preview = getattr(urls, 'preview', None) or getattr(urls, 'hd', None) or getattr(urls, 'sd', None)
    return {
        "clipId": gif.id,
        "title": getattr(gif, 'title', '') or '',
        "username": getattr(gif, 'userName', '') or '',
        "thumbnail": getattr(urls, 'thumbnail', None),
        "hdUrl": getattr(urls, 'hd', None),
        "sdUrl": getattr(urls, 'sd', None),
        "preview": preview,
        "duration": round(gif.duration) if hasattr(gif, 'duration') and gif.duration else None,
        "views": getattr(gif, 'views', None),
        "likes": getattr(gif, 'likes', None),
        "tags": getattr(gif, 'tags', []) or [],
        "verified": getattr(gif, 'verified', False),
        "site": "redgifs",
        "hash": create_hash("redgifs", gif.id),
    }


def search_redgifs(query: str, count: int = 30, page: int = 1) -> list:
    if not HAS_REDGIFS:
        return [{"error": "redgifs library not installed"}]
    try:
        api = API()
        api.login()
        result = api.search(query, order=Order.TRENDING, count=count, page=page)
        gifs = result.gifs if hasattr(result, 'gifs') else []
        return [format_gif(g) for g in gifs[:count]]
    except Exception as e:
        return [{"error": f"Search failed: {str(e)}"}]


def get_trending(count: int = 30) -> list:
    if not HAS_REDGIFS:
        return [{"error": "redgifs library not installed"}]
    try:
        api = API()
        api.login()
        result = api.search('trending', order=Order.TRENDING, count=count, page=1)
        gifs = result.gifs if hasattr(result, 'gifs') else []
        return [format_gif(g) for g in gifs[:count]]
    except Exception as e:
        return [{"error": f"Trending failed: {str(e)}"}]


def get_niches() -> list:
    """Return top-level niche categories from RedGifs."""
    # These are the known top-level niches on RedGifs
    # Grouped by their category hierarchy
    niches = [
        {"id": "trending", "name": "Trending", "icon": "fire"},
        {"id": "amateur", "name": "Amateur", "icon": "heart"},
        {"id": "blowjobs", "name": "Blowjobs", "icon": "lips"},
        {"id": "thick", "name": "Thick", "icon": "body"},
        {"id": "asian", "name": "Asian", "icon": "globe"},
        {"id": "ebony", "name": "Ebony", "icon": "globe"},
        {"id": "latina", "name": "Latina", "icon": "globe"},
        {"id": "teens", "name": "Teens", "icon": "sparkle"},
        {"id": "milf", "name": "Milf", "icon": "heart"},
        {"id": "anal", "name": "Anal", "icon": "fire"},
        {"id": "squirting", "name": "Squirting", "icon": "water"},
        {"id": "blowjob", "name": "Blowjob", "icon": "lips"},
        {"id": "creampie", "name": "Creampie", "icon": "fire"},
        {"id": "interracial", "name": "Interracial", "icon": "globe"},
        {"id": "orgasm", "name": "Orgasm", "icon": "sparkle"},
        {"id": "handjob", "name": "Handjob", "icon": "hand"},
        {"id": "pov", "name": "POV", "icon": "eye"},
        {"id": "small-tits", "name": "Small Tits", "icon": "body"},
        {"id": "big-tits", "name": "Big Tits", "icon": "body"},
        {"id": "natural", "name": "Natural", "icon": "leaf"},
        {"id": "brunette", "name": "Brunette", "icon": "hair"},
        {"id": "blonde", "name": "Blonde", "icon": "hair"},
        {"id": "couple", "name": "Couple", "icon": "heart"},
        {"id": "solo-female", "name": "Solo Female", "icon": "sparkle"},
        {"id": "toy", "name": "Toy", "icon": "bolt"},
        {"id": "sucking", "name": "Sucking", "icon": "lips"},
        {"id": "fucking", "name": "Fucking", "icon": "fire"},
        {"id": "tiktok", "name": "TikTok", "icon": "video"},
        {"id": "massage", "name": "Massage", "icon": "hand"},
        {"id": "feet", "name": "Feet", "icon": "body"},
        {"id": "bdsm", "name": "BDSM", "icon": "bolt"},
        {"id": "group", "name": "Group", "icon": "users"},
        {"id": "threesome", "name": "Threesome", "icon": "users"},
        {"id": "dildo", "name": "Dildo", "icon": "bolt"},
        {"id": "cum", "name": "Cum", "icon": "fire"},
        {"id": "masturbation", "name": "Masturbation", "icon": "hand"},
        {"id": "animation", "name": "Animation", "icon": "sparkle"},
        {"id": "cosplay", "name": "Cosplay", "icon": "sparkle"},
    ]
    return niches


def search_by_niche(niche: str, count: int = 30, page: int = 1) -> list:
    """Search RedGifs by niche/tag."""
    return search_redgifs(niche, count=count, page=page)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "search"
    query = sys.argv[2] if len(sys.argv) > 2 else "amateur"
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    page = int(sys.argv[4]) if len(sys.argv) > 4 else 1

    if action == "search":
        results = search_redgifs(query, count=count, page=page)
    elif action == "trending":
        results = get_trending(count=count)
    elif action == "niches":
        results = get_niches()
    elif action == "niche":
        results = search_by_niche(query, count=count, page=page)
    else:
        results = [{"error": f"Unknown action: {action}"}]

    print(json.dumps(results))
