const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
];

export function extractYoutubeVideoId(url = '') {
  const value = String(url || '').trim();
  if (!value) return null;

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizeYoutubeUrl(url = '') {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedUrl(url = '') {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}
