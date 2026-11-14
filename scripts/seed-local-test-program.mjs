/**
 * Create one local test program with 1 section + 5 questions.
 * Same YouTube video for EN / HI / MR.
 */
import pool from '../src/config/db.js';
import { normalizeYoutubeUrl } from '../src/utils/youtube.js';

const YOUTUBE = normalizeYoutubeUrl(
  'https://youtu.be/3to_dkWo8G0?si=xchGEjn5f79Sfwm1'
);

const SLUG = 'mumbai-heritage-practice';
const QUESTIONS_TO_SERVE = null; // serve all 5

const QUESTIONS = [
  {
    en: 'Which city is this heritage practice program about?',
    hi: 'यह विरासत अभ्यास कार्यक्रम किस शहर के बारे में है?',
    mr: 'हा वारसा सराव कार्यक्रम कोणत्या शहराबद्दल आहे?',
    options: [
      { en: 'Mumbai', hi: 'मुंबई', mr: 'मुंबई', correct: true },
      { en: 'Delhi', hi: 'दिल्ली', mr: 'दिल्ली', correct: false },
      { en: 'Pune', hi: 'पुणे', mr: 'पुणे', correct: false },
      { en: 'Jaipur', hi: 'जयपुर', mr: 'जयपुर', correct: false },
    ],
  },
  {
    en: 'How many learning videos are used in this practice section?',
    hi: 'इस अभ्यास अनुभाग में कितने शिक्षण वीडियो उपयोग होते हैं?',
    mr: 'या सराव विभागात किती शिक्षण व्हिडिओ वापरले जातात?',
    options: [
      { en: 'One', hi: 'एक', mr: 'एक', correct: true },
      { en: 'Two', hi: 'दो', mr: 'दोन', correct: false },
      { en: 'Three', hi: 'तीन', mr: 'तीन', correct: false },
      { en: 'Four', hi: 'चार', mr: 'चार', correct: false },
    ],
  },
  {
    en: 'In which languages can students take the quiz?',
    hi: 'विद्यार्थी क्विज़ किन भाषाओं में दे सकते हैं?',
    mr: 'विद्यार्थी क्विझ कोणत्या भाषांमध्ये देऊ शकतात?',
    options: [
      { en: 'English, Hindi and Marathi', hi: 'अंग्रेज़ी, हिंदी और मराठी', mr: 'इंग्रजी, हिंदी आणि मराठी', correct: true },
      { en: 'Only English', hi: 'केवल अंग्रेज़ी', mr: 'फक्त इंग्रजी', correct: false },
      { en: 'Only Hindi', hi: 'केवल हिंदी', mr: 'फक्त हिंदी', correct: false },
      { en: 'Only Marathi', hi: 'केवल मराठी', mr: 'फक्त मराठी', correct: false },
    ],
  },
  {
    en: 'What should students do before answering the quiz?',
    hi: 'क्विज़ के उत्तर देने से पहले विद्यार्थियों को क्या करना चाहिए?',
    mr: 'क्विझची उत्तरे देण्यापूर्वी विद्यार्थ्यांनी काय करावे?',
    options: [
      { en: 'Watch the full section video', hi: 'पूरा अनुभाग वीडियो देखें', mr: 'पूर्ण विभाग व्हिडिओ पहा', correct: true },
      { en: 'Skip the video', hi: 'वीडियो छोड़ दें', mr: 'व्हिडिओ वगळा', correct: false },
      { en: 'Close the website', hi: 'वेबसाइट बंद करें', mr: 'वेबसाइट बंद करा', correct: false },
      { en: 'Change the school name', hi: 'स्कूल का नाम बदलें', mr: 'शाळेचे नाव बदला', correct: false },
    ],
  },
  {
    en: 'Bharat Garv encourages students to learn about?',
    hi: 'भारत गर्व विद्यार्थियों को किसके बारे में सीखने के लिए प्रोत्साहित करता है?',
    mr: 'भारत गर्व विद्यार्थ्यांना कशाबद्दल शिकण्यास प्रोत्साहित करते?',
    options: [
      { en: 'India’s heritage and culture', hi: 'भारत की विरासत और संस्कृति', mr: 'भारताचा वारसा आणि संस्कृती', correct: true },
      { en: 'Only mathematics formulas', hi: 'केवल गणित सूत्र', mr: 'फक्त गणित सूत्रे', correct: false },
      { en: 'Only sports scores', hi: 'केवल खेल स्कोर', mr: 'फक्त क्रीडा गुण', correct: false },
      { en: 'Only cooking recipes', hi: 'केवल खाना पकाने की रेसिपी', mr: 'फक्त स्वयंपाकाच्या पाककृती', correct: false },
    ],
  },
];

const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  const [existing] = await connection.query(
    `SELECT id FROM programs WHERE slug = :slug LIMIT 1`,
    { slug: SLUG }
  );
  if (existing.length) {
    throw new Error(`Program with slug "${SLUG}" already exists (id=${existing[0].id}).`);
  }

  const [programResult] = await connection.query(
    `INSERT INTO programs
      (slug, heading_en, heading_hi, heading_mr, is_active)
     VALUES
      (:slug, :headingEn, :headingHi, :headingMr, 1)`,
    {
      slug: SLUG,
      headingEn: 'Mumbai Heritage Practice',
      headingHi: 'मुंबई विरासत अभ्यास',
      headingMr: 'मुंबई वारसा सराव',
    }
  );
  const programId = programResult.insertId;

  const [sectionResult] = await connection.query(
    `INSERT INTO program_sections
      (program_id, title_en, title_hi, title_mr, subtitle_en, subtitle_hi, subtitle_mr,
       youtube_url_en, youtube_url_hi, youtube_url_mr, sort_order, questions_to_serve, is_active)
     VALUES
      (:programId, :titleEn, :titleHi, :titleMr, :subtitleEn, :subtitleHi, :subtitleMr,
       :youtube, :youtube, :youtube, 1, :questionsToServe, 1)`,
    {
      programId,
      titleEn: 'Heritage Watch & Quiz',
      titleHi: 'विरासत देखें और क्विज़ दें',
      titleMr: 'वारसा पहा आणि क्विझ द्या',
      subtitleEn: 'Watch the video fully, then answer 5 practice questions.',
      subtitleHi: 'पूरा वीडियो देखें, फिर 5 अभ्यास प्रश्नों के उत्तर दें।',
      subtitleMr: 'पूर्ण व्हिडिओ पहा, नंतर ५ सराव प्रश्नांची उत्तरे द्या.',
      youtube: YOUTUBE,
      questionsToServe: QUESTIONS_TO_SERVE,
    }
  );
  const sectionId = sectionResult.insertId;

  for (let index = 0; index < QUESTIONS.length; index += 1) {
    const item = QUESTIONS[index];
    const [questionResult] = await connection.query(
      `INSERT INTO program_questions
        (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
       VALUES
        (:sectionId, :en, :hi, :mr, 0, NULL, :sortOrder, 1)`,
      {
        sectionId,
        en: item.en,
        hi: item.hi,
        mr: item.mr,
        sortOrder: index + 1,
      }
    );
    const questionId = questionResult.insertId;

    for (let optIndex = 0; optIndex < item.options.length; optIndex += 1) {
      const option = item.options[optIndex];
      await connection.query(
        `INSERT INTO program_question_options
          (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
         VALUES
          (:questionId, :en, :hi, :mr, :isCorrect, :sortOrder)`,
        {
          questionId,
          en: option.en,
          hi: option.hi,
          mr: option.mr,
          isCorrect: option.correct ? 1 : 0,
          sortOrder: optIndex + 1,
        }
      );
    }
  }

  await connection.commit();

  console.log('Created program:');
  console.log(`  id=${programId}`);
  console.log(`  slug=${SLUG}`);
  console.log(`  sectionId=${sectionId}`);
  console.log(`  questions=5`);
  console.log(`  youtube=${YOUTUBE}`);
  console.log(`  path=/competition → Participate → Mumbai Heritage Practice`);
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
