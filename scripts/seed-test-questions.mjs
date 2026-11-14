/**
 * Seed extra MCQs into section "Intro" for random-serve testing.
 * Sets questions_to_serve = 10 and clears prior assignments for that section.
 */
import pool from '../src/config/db.js';

const SECTION_ID = 1;
const QUESTIONS_TO_SERVE = 10;

const BANK = [
  {
    en: 'Which fort is associated with Chhatrapati Shivaji Maharaj near Mumbai?',
    hi: 'मुंबई के पास छत्रपति शिवाजी महाराज से जुड़ा कौन सा किला है?',
    mr: 'मुंबईजवळ छत्रपती शिवाजी महाराजांशी संबंधित कोणता किल्ला आहे?',
    options: [
      { en: 'Raigad Fort', hi: 'रायगढ़ किला', mr: 'रायगड किल्ला', correct: true },
      { en: 'Red Fort', hi: 'लाल किला', mr: 'लाल किल्ला', correct: false },
      { en: 'Golconda Fort', hi: 'गोलकोंडा किला', mr: 'गोलकोंडा किल्ला', correct: false },
      { en: 'Agra Fort', hi: 'आगरा किला', mr: 'आगरा किल्ला', correct: false },
    ],
  },
  {
    en: 'Mumbai was formerly known as?',
    hi: 'मुंबई पहले किस नाम से जानी जाती थी?',
    mr: 'मुंबई पूर्वी कोणत्या नावाने ओळखली जात होती?',
    options: [
      { en: 'Bombay', hi: 'बॉम्बे', mr: 'बॉम्बे', correct: true },
      { en: 'Madras', hi: 'मद्रास', mr: 'मद्रास', correct: false },
      { en: 'Calcutta', hi: 'कलकत्ता', mr: 'कलकत्ता', correct: false },
      { en: 'Poona', hi: 'पूना', mr: 'पुणे', correct: false },
    ],
  },
  {
    en: 'Gateway of India was built to commemorate the visit of which monarch?',
    hi: 'गेटवे ऑफ इंडिया किस शासक की यात्रा की स्मृति में बना?',
    mr: 'गेटवे ऑफ इंडिया कोणत्या राज्यकर्त्याच्या भेटीच्या स्मरणार्थ बांधले गेले?',
    options: [
      { en: 'King George V', hi: 'किंग जॉर्ज पंचम', mr: 'किंग जॉर्ज पाचवा', correct: true },
      { en: 'Queen Victoria', hi: 'क्वीन विक्टोरिया', mr: 'क्वीन व्हिक्टोरिया', correct: false },
      { en: 'Emperor Akbar', hi: 'सम्राट अकबर', mr: 'सम्राट अकबर', correct: false },
      { en: 'King Edward VII', hi: 'किंग एडवर्ड सप्तम', mr: 'किंग एडवर्ड सातवा', correct: false },
    ],
  },
  {
    en: 'Elephanta Caves are dedicated mainly to which deity?',
    hi: 'एलिफेंटा गुफाएँ मुख्य रूप से किस देवता को समर्पित हैं?',
    mr: 'एलिफंटा लेणी मुख्यतः कोणत्या देवतेला वाहिलेली आहेत?',
    options: [
      { en: 'Lord Shiva', hi: 'भगवान शिव', mr: 'भगवान शिव', correct: true },
      { en: 'Lord Vishnu', hi: 'भगवान विष्णु', mr: 'भगवान विष्णू', correct: false },
      { en: 'Lord Brahma', hi: 'भगवान ब्रह्मा', mr: 'भगवान ब्रह्मा', correct: false },
      { en: 'Lord Ganesha', hi: 'भगवान गणेश', mr: 'भगवान गणेश', correct: false },
    ],
  },
  {
    en: 'Which museum in Mumbai is famous for its Gothic architecture?',
    hi: 'मुंबई का कौन सा संग्रहालय अपने गॉथिक वास्तुकला के लिए प्रसिद्ध है?',
    mr: 'मुंबईतील कोणते संग्रहालय गॉथिक वास्तुकलेसाठी प्रसिद्ध आहे?',
    options: [
      { en: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya', hi: 'छत्रपति शिवाजी महाराज वस्तु संग्रहालय', mr: 'छत्रपती शिवाजी महाराज वस्तुसंग्रहालय', correct: true },
      { en: 'National Museum Delhi', hi: 'राष्ट्रीय संग्रहालय दिल्ली', mr: 'राष्ट्रीय संग्रहालय दिल्ली', correct: false },
      { en: 'Salar Jung Museum', hi: 'सालारजंग संग्रहालय', mr: 'सालारजंग संग्रहालय', correct: false },
      { en: 'Indian Museum Kolkata', hi: 'इंडियन म्यूजियम कोलकाता', mr: 'इंडियन म्युझियम कोलकाता', correct: false },
    ],
  },
  {
    en: 'What is the official language of Maharashtra?',
    hi: 'महाराष्ट्र की आधिकारिक भाषा कौन सी है?',
    mr: 'महाराष्ट्राची अधिकृत भाषा कोणती आहे?',
    options: [
      { en: 'Marathi', hi: 'मराठी', mr: 'मराठी', correct: true },
      { en: 'Gujarati', hi: 'गुजराती', mr: 'गुजराती', correct: false },
      { en: 'Kannada', hi: 'कन्नड़', mr: 'कन्नड', correct: false },
      { en: 'Punjabi', hi: 'पंजाबी', mr: 'पंजाबी', correct: false },
    ],
  },
  {
    en: 'CST railway station in Mumbai is also known as?',
    hi: 'मुंबई के CST रेलवे स्टेशन को और किस नाम से जाना जाता है?',
    mr: 'मुंबईतील CST रेल्वे स्थानकाला आणखी कोणत्या नावाने ओळखले जाते?',
    options: [
      { en: 'Chhatrapati Shivaji Terminus', hi: 'छत्रपति शिवाजी टर्मिनस', mr: 'छत्रपती शिवाजी टर्मिनस', correct: true },
      { en: 'Victoria Terminus only', hi: 'केवल विक्टोरिया टर्मिनस', mr: 'फक्त व्हिक्टोरिया टर्मिनस', correct: false },
      { en: 'Churchgate Central', hi: 'चर्चगेट सेंट्रल', mr: 'चर्चगेट सेंट्रल', correct: false },
      { en: 'Bandra Terminus', hi: 'बांद्रा टर्मिनस', mr: 'बांद्रा टर्मिनस', correct: false },
    ],
  },
  {
    en: 'Which sea borders Mumbai?',
    hi: 'मुंबई किस समुद्र के किनारे बसी है?',
    mr: 'मुंबई कोणत्या समुद्राच्या किनारी वसलेली आहे?',
    options: [
      { en: 'Arabian Sea', hi: 'अरब सागर', mr: 'अरबी समुद्र', correct: true },
      { en: 'Bay of Bengal', hi: 'बंगाल की खाड़ी', mr: 'बंगालचा उपसागर', correct: false },
      { en: 'Indian Ocean only inland', hi: 'केवल भीतरी हिंद महासागर', mr: 'फक्त आतील हिंदी महासागर', correct: false },
      { en: 'Caspian Sea', hi: 'कैस्पियन सागर', mr: 'कॅस्पियन समुद्र', correct: false },
    ],
  },
  {
    en: 'Kanheri Caves are located in which national park area of Mumbai?',
    hi: 'कन्हेरी गुफाएँ मुंबई के किस राष्ट्रीय उद्यान क्षेत्र में हैं?',
    mr: 'कन्हेरी लेणी मुंबईतील कोणत्या राष्ट्रीय उद्यान क्षेत्रात आहेत?',
    options: [
      { en: 'Sanjay Gandhi National Park', hi: 'संजय गांधी राष्ट्रीय उद्यान', mr: 'संजय गांधी राष्ट्रीय उद्यान', correct: true },
      { en: 'Gir National Park', hi: 'गिर राष्ट्रीय उद्यान', mr: 'गिर राष्ट्रीय उद्यान', correct: false },
      { en: 'Ranthambore', hi: 'रणथंभौर', mr: 'रणथंबोर', correct: false },
      { en: 'Kaziranga', hi: 'काजीरंगा', mr: 'काझीरंगा', correct: false },
    ],
  },
  {
    en: 'Which dance form is strongly associated with Maharashtra?',
    hi: 'कौन सा नृत्य महाराष्ट्र से गहराई से जुड़ा है?',
    mr: 'कोणता नृत्य महाराष्ट्राशी घट्ट संबंधित आहे?',
    options: [
      { en: 'Lavani', hi: 'लावणी', mr: 'लावणी', correct: true },
      { en: 'Bharatanatyam', hi: 'भरतनाट्यम', mr: 'भरतनाट्यम', correct: false },
      { en: 'Kathakali', hi: 'कथकली', mr: 'कथकली', correct: false },
      { en: 'Odissi', hi: 'ओडिसी', mr: 'ओडिसी', correct: false },
    ],
  },
  {
    en: 'Haji Ali Dargah is built on what kind of location?',
    hi: 'हाजी अली दरगाह किस प्रकार के स्थान पर बनी है?',
    mr: 'हाजी अली दर्गा कोणत्या प्रकारच्या ठिकाणी बांधलेला आहे?',
    options: [
      { en: 'An islet in the sea', hi: 'समुद्र में एक छोटे द्वीप पर', mr: 'समुद्रातील एका छोट्या बेटावर', correct: true },
      { en: 'A mountain peak', hi: 'पर्वत शिखर पर', mr: 'पर्वत शिखरावर', correct: false },
      { en: 'A desert oasis', hi: 'रेगिस्तानी नखलिस्तान में', mr: 'वाळवंटी नवासमध्ये', correct: false },
      { en: 'A forest clearing', hi: 'जंगल की सफाई में', mr: 'जंगलातील मोकळ्या जागेत', correct: false },
    ],
  },
  {
    en: 'Which local train line is part of Mumbai’s suburban network?',
    hi: 'कौन सी लोकल ट्रेन लाइन मुंबई उपनगरीय नेटवर्क का हिस्सा है?',
    mr: 'कोणती लोकल ट्रेन लाईन मुंबई उपनगरीय नेटवर्कचा भाग आहे?',
    options: [
      { en: 'Western Line', hi: 'वेस्टर्न लाइन', mr: 'वेस्टर्न लाईन', correct: true },
      { en: 'Darjeeling Himalayan', hi: 'दार्जिलिंग हिमालयन', mr: 'दार्जिलिंग हिमालयन', correct: false },
      { en: 'Nilgiri Mountain', hi: 'नीलगिरी माउंटेन', mr: 'नीलगिरी माउंटन', correct: false },
      { en: 'Konkan only long-distance', hi: 'केवल लंबी दूरी कोंकण', mr: 'फक्त लांब पल्ल्याची कोकण', correct: false },
    ],
  },
  {
    en: 'Bandra-Worli Sea Link connects which two areas?',
    hi: 'बांद्रा-वर्ली सी लिंक किन दो क्षेत्रों को जोड़ता है?',
    mr: 'बांद्रा-वरळी सी लिंक कोणत्या दोन भागांना जोडतो?',
    options: [
      { en: 'Bandra and Worli', hi: 'बांद्रा और वर्ली', mr: 'बांद्रा आणि वरळी', correct: true },
      { en: 'Colaba and Fort', hi: 'कोलाबा और फोर्ट', mr: 'कोलाबा आणि फोर्ट', correct: false },
      { en: 'Andheri and Goregaon', hi: 'अंधेरी और गोरेगांव', mr: 'अंधेरी आणि गोरेगाव', correct: false },
      { en: 'Thane and Kalyan', hi: 'ठाणे और कल्याण', mr: 'ठाणे आणि कल्याण', correct: false },
    ],
  },
  {
    en: 'Which festival is famously celebrated with huge immersion processions in Mumbai?',
    hi: 'मुंबई में विशाल विसर्जन जुलूसों के साथ कौन सा त्योहार प्रसिद्ध है?',
    mr: 'मुंबईत मोठ्या विसर्जन मिरवणुकींसाठी कोणता सण प्रसिद्ध आहे?',
    options: [
      { en: 'Ganesh Chaturthi', hi: 'गणेश चतुर्थी', mr: 'गणेश चतुर्थी', correct: true },
      { en: 'Pongal', hi: 'पोंगल', mr: 'पोंगल', correct: false },
      { en: 'Baisakhi', hi: 'बैसाखी', mr: 'बैसाखी', correct: false },
      { en: 'Onam', hi: 'ओणम', mr: 'ओणम', correct: false },
    ],
  },
  {
    en: 'Marine Drive in Mumbai is popularly called?',
    hi: 'मुंबई की मरीन ड्राइव को लोकप्रिय रूप से क्या कहा जाता है?',
    mr: 'मुंबईतील मरीन ड्राइव्हला लोकप्रियपणे काय म्हणतात?',
    options: [
      { en: "Queen's Necklace", hi: 'क्वीन्स नेकलेस', mr: 'क्वीन्स नेकलेस', correct: true },
      { en: "King's Crown", hi: 'किंग्स क्राउन', mr: 'किंग्स क्राउन', correct: false },
      { en: 'Golden Arc', hi: 'गोल्डन आर्क', mr: 'गोल्डन आर्क', correct: false },
      { en: 'Silver Crescent', hi: 'सिल्वर क्रिसेंट', mr: 'सिल्व्हर क्रिसेंट', correct: false },
    ],
  },
  {
    en: 'Which heritage site near Mumbai is a UNESCO World Heritage Site?',
    hi: 'मुंबई के पास कौन सा विरासत स्थल यूनेस्को विश्व धरोहर है?',
    mr: 'मुंबईजवळील कोणते वारसा स्थळ युनेस्को जागतिक वारसा आहे?',
    options: [
      { en: 'Elephanta Caves', hi: 'एलिफेंटा गुफाएँ', mr: 'एलिफंटा लेणी', correct: true },
      { en: 'Charminar', hi: 'चारमीनार', mr: 'चारमिनार', correct: false },
      { en: 'India Gate Delhi', hi: 'इंडिया गेट दिल्ली', mr: 'इंडिया गेट दिल्ली', correct: false },
      { en: 'Mysore Palace', hi: 'मैसूर पैलेस', mr: 'म्हैसूर पॅलेस', correct: false },
    ],
  },
  {
    en: 'What does “Bharat Garv” literally relate to in spirit?',
    hi: '“भारत गर्व” भावनात्मक रूप से किससे जुड़ा है?',
    mr: '“भारत गर्व” भावनेने कशाशी संबंधित आहे?',
    options: [
      { en: 'Pride in India’s heritage', hi: 'भारत की विरासत पर गर्व', mr: 'भारताच्या वारशाचा गर्व', correct: true },
      { en: 'Only sports championships', hi: 'केवल खेल प्रतियोगिताएँ', mr: 'फक्त क्रीडा स्पर्धा', correct: false },
      { en: 'Only technology parks', hi: 'केवल प्रौद्योगिकी पार्क', mr: 'फक्त तंत्रज्ञान उद्याने', correct: false },
      { en: 'Only film awards', hi: 'केवल फिल्म पुरस्कार', mr: 'फक्त चित्रपट पुरस्कार', correct: false },
    ],
  },
  {
    en: 'Which island group includes Elephanta?',
    hi: 'एलिफेंटा किस द्वीप समूह में आता है?',
    mr: 'एलिफंटा कोणत्या बेट समूहात येते?',
    options: [
      { en: 'Mumbai Harbour islands', hi: 'मुंबई बंदरगाह के द्वीप', mr: 'मुंबई बंदराची बेटे', correct: true },
      { en: 'Andaman only', hi: 'केवल अंडमान', mr: 'फक्त अंदमान', correct: false },
      { en: 'Lakshadweep only', hi: 'केवल लक्षद्वीप', mr: 'फक्त लक्षद्वीप', correct: false },
      { en: 'Nicobar only', hi: 'केवल निकोबार', mr: 'फक्त निकोबार', correct: false },
    ],
  },
];

const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  const [sections] = await connection.query(
    `SELECT id, title_en FROM program_sections WHERE id = :id AND is_active = 1 LIMIT 1`,
    { id: SECTION_ID }
  );
  if (!sections.length) {
    throw new Error(`Section ${SECTION_ID} not found`);
  }

  const [maxRows] = await connection.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_sort
     FROM program_questions
     WHERE section_id = :sectionId`,
    { sectionId: SECTION_ID }
  );
  let sortOrder = Number(maxRows[0].max_sort || 0);

  let inserted = 0;
  for (const item of BANK) {
    sortOrder += 1;
    const [result] = await connection.query(
      `INSERT INTO program_questions
        (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
       VALUES
        (:sectionId, :en, :hi, :mr, 0, NULL, :sortOrder, 1)`,
      {
        sectionId: SECTION_ID,
        en: item.en,
        hi: item.hi,
        mr: item.mr,
        sortOrder,
      }
    );

    const questionId = result.insertId;
    for (let index = 0; index < item.options.length; index += 1) {
      const option = item.options[index];
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
          sortOrder: index + 1,
        }
      );
    }
    inserted += 1;
  }

  await connection.query(
    `UPDATE program_sections
     SET questions_to_serve = :serve
     WHERE id = :sectionId`,
    { sectionId: SECTION_ID, serve: QUESTIONS_TO_SERVE }
  );

  // Clear old assignments so new tests get a fresh random 10 from the expanded bank.
  await connection.query(
    `DELETE aq FROM program_section_assignment_questions aq
     INNER JOIN program_section_question_assignments a ON a.id = aq.assignment_id
     WHERE a.section_id = :sectionId`,
    { sectionId: SECTION_ID }
  );
  await connection.query(
    `DELETE FROM program_section_question_assignments WHERE section_id = :sectionId`,
    { sectionId: SECTION_ID }
  );

  const [countRows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM program_questions
     WHERE section_id = :sectionId AND is_active = 1`,
    { sectionId: SECTION_ID }
  );

  await connection.commit();

  console.log(
    `Seeded ${inserted} questions into section "${sections[0].title_en}" (id=${SECTION_ID}).`
  );
  console.log(
    `Bank size now: ${countRows[0].total}. questions_to_serve=${QUESTIONS_TO_SERVE}. Assignments cleared.`
  );
} catch (error) {
  await connection.rollback();
  console.error(error);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
