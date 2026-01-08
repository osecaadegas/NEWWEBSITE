# Stream Highlights - Portrait Video Update

## Summary
Stream highlights now optimized for **portrait videos** (9:16 ratio like TikTok/Instagram Reels).

## Changes Made

### 1. Display Updates
- **Card width**: 150px (was 200px) → 130px tablet → 120px mobile
- **Video height**: 267px for 9:16 portrait ratio
- **Hover autoplay**: Videos play on hover, pause on leave
- **Thumbnail overlay**: Shows thumbnail until hover

### 2. Admin Upload System
✅ Already integrated in AdminPanel at `/admin` → 🎬 Stream Highlights tab

**Features:**
- Upload portrait videos with direct URL
- Add thumbnails, duration, descriptions
- Toggle active/inactive
- Edit/delete highlights
- View count tracking

### 3. Database Updates
- Table: `stream_highlights` (already exists)
- New migration: `add_highlight_orientation.sql`
- Added `orientation` column (portrait/landscape)

## How to Upload

1. **Go to Admin Panel**: `/admin`
2. **Click**: 🎬 Stream Highlights tab
3. **Click**: ➕ Upload New Highlight
4. **Fill form**:
   - Title: "Epic Big Win! 🤑"
   - Video URL: Direct link to `.mp4` file
   - Thumbnail URL: (optional)
   - Duration: "0:30"
   - Active: ✓ checked
5. **Save**: Uploads immediately

## Video Hosting
Upload videos to:
- Supabase Storage (recommended)
- Streamable.com
- Cloudinary
- Direct CDN links

## Video Specs
- **Format**: Portrait (9:16)
- **Resolution**: 1080x1920 or 720x1280
- **File type**: MP4, WebM
- **Size**: < 50MB recommended
- **Duration**: 15-60 seconds ideal

## Files Created
```
src/components/Admin/HighlightUpload.jsx       - Standalone upload component
src/components/Admin/HighlightUpload.css       - Upload UI styles
migrations/add_highlight_orientation.sql        - DB migration
DOCs/STREAM_HIGHLIGHTS_GUIDE.md                - Full documentation
```

## Files Updated
```
src/components/StreamHighlights/StreamHighlights.jsx  - Portrait display
src/components/StreamHighlights/StreamHighlights.css  - Narrower cards, portrait ratio
```

## Next Steps

1. **Run Migration** (optional - adds orientation column):
```sql
-- In Supabase SQL Editor
ALTER TABLE stream_highlights 
ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait';
```

2. **Upload Videos**:
   - Log in as admin
   - Go to Stream Highlights tab
   - Upload your portrait videos

3. **Test**:
   - Check homepage for portrait display
   - Hover over cards to see autoplay
   - Verify mobile responsive

## Live Now
✅ Deployed: https://www.osecaadegas.pt
✅ Cards now 150px wide (portrait optimized)
✅ 9:16 aspect ratio (267px height)
✅ Hover to preview
✅ Admin upload ready

---

**Date**: January 8, 2026
**Status**: ✅ Complete & Deployed
