-- Enforce: every active program section must keep at least one active question.
-- 1) Soft-deactivate legacy empty sections
-- 2) Add trigger so the last question of an active section cannot be removed

USE quiz_db;

UPDATE program_sections ps
SET is_active = 0
WHERE ps.is_active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM program_questions pq
    WHERE pq.section_id = ps.id
      AND pq.is_active = 1
  );

DROP TRIGGER IF EXISTS trg_program_questions_keep_one_active;

DELIMITER $$

CREATE TRIGGER trg_program_questions_keep_one_active
BEFORE UPDATE ON program_questions
FOR EACH ROW
BEGIN
  IF OLD.is_active = 1 AND NEW.is_active = 0 THEN
    IF (
      SELECT s.is_active
      FROM program_sections s
      WHERE s.id = OLD.section_id
      LIMIT 1
    ) = 1 THEN
      IF (
        SELECT COUNT(*)
        FROM program_questions q
        WHERE q.section_id = OLD.section_id
          AND q.is_active = 1
          AND q.id <> OLD.id
      ) = 0 THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Each active section must keep at least one question';
      END IF;
    END IF;
  END IF;
END$$

DELIMITER ;
