# BookmarkIQ Extension Icons

You need to add the following icon files to this directory:

- `icon16.png` — 16×16 pixels (toolbar icon)
- `icon48.png` — 48×48 pixels (extensions page)
- `icon128.png` — 128×128 pixels (Chrome Web Store)

## How to Create Icons

### Option 1: Emoji-based icons (Quickest)
1. Go to [https://favicon.io/emoji-favicons/](https://favicon.io/emoji-favicons/)
2. Search for "bookmark" or "books" emoji (📑 or 📚)
3. Download the pack — it includes all sizes
4. Rename `favicon-16x16.png` → `icon16.png`
5. Rename `favicon-32x32.png` or resize to 48px → `icon48.png`
6. Use `android-chrome-192x192.png` resized to 128px → `icon128.png`

### Option 2: Custom design
1. Go to [https://www.canva.com/](https://www.canva.com/)
2. Create a 128×128 design with a bookmark/brain icon
3. Export as PNG at 128px, 48px, and 16px

### Option 3: Use a simple text-based icon generator
```bash
# If you have ImageMagick installed:
magick -size 128x128 xc:"#6C3AED" -gravity center -pointsize 80 -fill white -annotate 0 "📑" icon128.png
magick icon128.png -resize 48x48 icon48.png
magick icon128.png -resize 16x16 icon16.png
```

### Recommended Style
- Dark purple/indigo background (#6C3AED or #4F46E5)
- White bookmark or brain icon
- Rounded corners (optional)
- Keep it simple — it needs to be recognizable at 16px
