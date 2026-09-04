#!/usr/bin/env python3
import sys
import json
import yt_dlp


def extract(video_url):
    """Extract direct video URL using yt-dlp."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'no_config': True,
        'socket_timeout': 30,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

            if not info:
                return {"error": "No info extracted"}

            # Find best MP4 format
            formats = info.get('formats', [])
            mp4_formats = [f for f in formats if f.get('ext') == 'mp4' and f.get('vcodec') != 'none']

            # Sort by height (quality)
            mp4_formats.sort(key=lambda x: x.get('height', 0), reverse=True)

            # Default to 480p or best available
            best_format = None
            for f in mp4_formats:
                height = f.get('height', 0)
                if height <= 480:
                    best_format = f
                    break
            if not best_format and mp4_formats:
                best_format = mp4_formats[-1]  # Lowest quality as fallback

            return {
                "id": info.get('id'),
                "title": info.get('title'),
                "duration": info.get('duration'),
                "thumbnail": info.get('thumbnail'),
                "uploader": info.get('uploader'),
                "view_count": info.get('view_count'),
                "streamUrl": best_format.get('url') if best_format else None,
                "formats": [{
                    "format_id": f.get('format_id'),
                    "url": f.get('url'),
                    "ext": f.get('ext'),
                    "width": f.get('width'),
                    "height": f.get('height'),
                    "filesize": f.get('filesize'),
                } for f in mp4_formats[:5]],  # Top 5 formats
            }

    except yt_dlp.utils.DownloadError as e:
        return {"error": f"Download error: {str(e)}"}
    except Exception as e:
        return {"error": f"Extraction failed: {str(e)}"}


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else None
    if not url:
        print(json.dumps({"error": "URL required"}))
        sys.exit(1)

    result = extract(url)
    print(json.dumps(result))
