-- Allow longer observation-style question headlines (EN / HI / MR).
-- Safe on existing data: only widens VARCHAR columns.

USE quiz_db;

ALTER TABLE program_questions
  MODIFY COLUMN headline_en VARCHAR(1000) NOT NULL,
  MODIFY COLUMN headline_hi VARCHAR(1000) NOT NULL,
  MODIFY COLUMN headline_mr VARCHAR(1000) NOT NULL;
