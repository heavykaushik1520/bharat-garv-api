import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reuse the BANK from seed-test-questions.mjs by evaluating the const block via dynamic import pattern:
// simplest: duplicate import by reading and eval is messy — instead import by spawning the data.
// We'll import BANK by temporarily exporting it. For now parse from the mjs via Function.

const source = readFileSync(path.join(__dirname, 'seed-test-questions.mjs'), 'utf8');
const match = source.match(/const BANK = (\[[\s\S]*?\n\]);/);
if (!match) {
  throw new Error('Could not find BANK in seed-test-questions.mjs');
}

const BANK = new Function(`return ${match[1]}`)();
const SECTION_ID = 1;
const QUESTIONS_TO_SERVE = 10;

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");

let sql = `-- Seed test questions for section ${SECTION_ID} (Intro)
-- Equivalent of scripts/seed-test-questions.mjs
USE quiz_db;

SET @section_id := ${SECTION_ID};
SET @sort := (
  SELECT COALESCE(MAX(sort_order), 0)
  FROM program_questions
  WHERE section_id = @section_id
);

`;

for (const item of BANK) {
  sql += `SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, '${esc(item.en)}', '${esc(item.hi)}', '${esc(item.mr)}', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
${item.options
  .map(
    (o, i) =>
      `  (@qid, '${esc(o.en)}', '${esc(o.hi)}', '${esc(o.mr)}', ${o.correct ? 1 : 0}, ${i + 1})`
  )
  .join(',\n')};
`;
  sql += '\n';
}

sql += `UPDATE program_sections
SET questions_to_serve = ${QUESTIONS_TO_SERVE}
WHERE id = @section_id;

DELETE aq FROM program_section_assignment_questions aq
INNER JOIN program_section_question_assignments a ON a.id = aq.assignment_id
WHERE a.section_id = @section_id;

DELETE FROM program_section_question_assignments
WHERE section_id = @section_id;
`;

const out = path.join(__dirname, '../sql/seed_test_questions.sql');
writeFileSync(out, sql, 'utf8');
console.log(`Wrote ${out}`);
