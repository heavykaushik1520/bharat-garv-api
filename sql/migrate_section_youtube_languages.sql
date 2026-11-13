-- Per-section YouTube URLs for English, Hindi, and Marathi.
-- Existing single youtube_url values are copied into all three columns.

USE quiz_db;

ALTER TABLE program_sections
  ADD COLUMN youtube_url_en VARCHAR(500) NULL AFTER subtitle_mr,
  ADD COLUMN youtube_url_hi VARCHAR(500) NULL AFTER youtube_url_en,
  ADD COLUMN youtube_url_mr VARCHAR(500) NULL AFTER youtube_url_hi;

UPDATE program_sections
SET
  youtube_url_en = COALESCE(NULLIF(TRIM(youtube_url_en), ''), youtube_url),
  youtube_url_hi = COALESCE(NULLIF(TRIM(youtube_url_hi), ''), youtube_url),
  youtube_url_mr = COALESCE(NULLIF(TRIM(youtube_url_mr), ''), youtube_url)
WHERE youtube_url IS NOT NULL
  AND CHAR_LENGTH(TRIM(youtube_url)) > 0;

ALTER TABLE program_sections
  MODIFY COLUMN youtube_url_en VARCHAR(500) NOT NULL,
  MODIFY COLUMN youtube_url_hi VARCHAR(500) NOT NULL,
  MODIFY COLUMN youtube_url_mr VARCHAR(500) NOT NULL;

ALTER TABLE program_sections
  DROP COLUMN youtube_url;
