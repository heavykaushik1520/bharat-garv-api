-- Seed test questions for section 1 (Intro)
-- Equivalent of scripts/seed-test-questions.mjs
USE quiz_db;

SET @section_id := 1;
SET @sort := (
  SELECT COALESCE(MAX(sort_order), 0)
  FROM program_questions
  WHERE section_id = @section_id
);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which fort is associated with Chhatrapati Shivaji Maharaj near Mumbai?', 'मुंबई के पास छत्रपति शिवाजी महाराज से जुड़ा कौन सा किला है?', 'मुंबईजवळ छत्रपती शिवाजी महाराजांशी संबंधित कोणता किल्ला आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Raigad Fort', 'रायगढ़ किला', 'रायगड किल्ला', 1, 1),
  (@qid, 'Red Fort', 'लाल किला', 'लाल किल्ला', 0, 2),
  (@qid, 'Golconda Fort', 'गोलकोंडा किला', 'गोलकोंडा किल्ला', 0, 3),
  (@qid, 'Agra Fort', 'आगरा किला', 'आगरा किल्ला', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Mumbai was formerly known as?', 'मुंबई पहले किस नाम से जानी जाती थी?', 'मुंबई पूर्वी कोणत्या नावाने ओळखली जात होती?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Bombay', 'बॉम्बे', 'बॉम्बे', 1, 1),
  (@qid, 'Madras', 'मद्रास', 'मद्रास', 0, 2),
  (@qid, 'Calcutta', 'कलकत्ता', 'कलकत्ता', 0, 3),
  (@qid, 'Poona', 'पूना', 'पुणे', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Gateway of India was built to commemorate the visit of which monarch?', 'गेटवे ऑफ इंडिया किस शासक की यात्रा की स्मृति में बना?', 'गेटवे ऑफ इंडिया कोणत्या राज्यकर्त्याच्या भेटीच्या स्मरणार्थ बांधले गेले?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'King George V', 'किंग जॉर्ज पंचम', 'किंग जॉर्ज पाचवा', 1, 1),
  (@qid, 'Queen Victoria', 'क्वीन विक्टोरिया', 'क्वीन व्हिक्टोरिया', 0, 2),
  (@qid, 'Emperor Akbar', 'सम्राट अकबर', 'सम्राट अकबर', 0, 3),
  (@qid, 'King Edward VII', 'किंग एडवर्ड सप्तम', 'किंग एडवर्ड सातवा', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Elephanta Caves are dedicated mainly to which deity?', 'एलिफेंटा गुफाएँ मुख्य रूप से किस देवता को समर्पित हैं?', 'एलिफंटा लेणी मुख्यतः कोणत्या देवतेला वाहिलेली आहेत?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Lord Shiva', 'भगवान शिव', 'भगवान शिव', 1, 1),
  (@qid, 'Lord Vishnu', 'भगवान विष्णु', 'भगवान विष्णू', 0, 2),
  (@qid, 'Lord Brahma', 'भगवान ब्रह्मा', 'भगवान ब्रह्मा', 0, 3),
  (@qid, 'Lord Ganesha', 'भगवान गणेश', 'भगवान गणेश', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which museum in Mumbai is famous for its Gothic architecture?', 'मुंबई का कौन सा संग्रहालय अपने गॉथिक वास्तुकला के लिए प्रसिद्ध है?', 'मुंबईतील कोणते संग्रहालय गॉथिक वास्तुकलेसाठी प्रसिद्ध आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya', 'छत्रपति शिवाजी महाराज वस्तु संग्रहालय', 'छत्रपती शिवाजी महाराज वस्तुसंग्रहालय', 1, 1),
  (@qid, 'National Museum Delhi', 'राष्ट्रीय संग्रहालय दिल्ली', 'राष्ट्रीय संग्रहालय दिल्ली', 0, 2),
  (@qid, 'Salar Jung Museum', 'सालारजंग संग्रहालय', 'सालारजंग संग्रहालय', 0, 3),
  (@qid, 'Indian Museum Kolkata', 'इंडियन म्यूजियम कोलकाता', 'इंडियन म्युझियम कोलकाता', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'What is the official language of Maharashtra?', 'महाराष्ट्र की आधिकारिक भाषा कौन सी है?', 'महाराष्ट्राची अधिकृत भाषा कोणती आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Marathi', 'मराठी', 'मराठी', 1, 1),
  (@qid, 'Gujarati', 'गुजराती', 'गुजराती', 0, 2),
  (@qid, 'Kannada', 'कन्नड़', 'कन्नड', 0, 3),
  (@qid, 'Punjabi', 'पंजाबी', 'पंजाबी', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'CST railway station in Mumbai is also known as?', 'मुंबई के CST रेलवे स्टेशन को और किस नाम से जाना जाता है?', 'मुंबईतील CST रेल्वे स्थानकाला आणखी कोणत्या नावाने ओळखले जाते?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Chhatrapati Shivaji Terminus', 'छत्रपति शिवाजी टर्मिनस', 'छत्रपती शिवाजी टर्मिनस', 1, 1),
  (@qid, 'Victoria Terminus only', 'केवल विक्टोरिया टर्मिनस', 'फक्त व्हिक्टोरिया टर्मिनस', 0, 2),
  (@qid, 'Churchgate Central', 'चर्चगेट सेंट्रल', 'चर्चगेट सेंट्रल', 0, 3),
  (@qid, 'Bandra Terminus', 'बांद्रा टर्मिनस', 'बांद्रा टर्मिनस', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which sea borders Mumbai?', 'मुंबई किस समुद्र के किनारे बसी है?', 'मुंबई कोणत्या समुद्राच्या किनारी वसलेली आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Arabian Sea', 'अरब सागर', 'अरबी समुद्र', 1, 1),
  (@qid, 'Bay of Bengal', 'बंगाल की खाड़ी', 'बंगालचा उपसागर', 0, 2),
  (@qid, 'Indian Ocean only inland', 'केवल भीतरी हिंद महासागर', 'फक्त आतील हिंदी महासागर', 0, 3),
  (@qid, 'Caspian Sea', 'कैस्पियन सागर', 'कॅस्पियन समुद्र', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Kanheri Caves are located in which national park area of Mumbai?', 'कन्हेरी गुफाएँ मुंबई के किस राष्ट्रीय उद्यान क्षेत्र में हैं?', 'कन्हेरी लेणी मुंबईतील कोणत्या राष्ट्रीय उद्यान क्षेत्रात आहेत?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Sanjay Gandhi National Park', 'संजय गांधी राष्ट्रीय उद्यान', 'संजय गांधी राष्ट्रीय उद्यान', 1, 1),
  (@qid, 'Gir National Park', 'गिर राष्ट्रीय उद्यान', 'गिर राष्ट्रीय उद्यान', 0, 2),
  (@qid, 'Ranthambore', 'रणथंभौर', 'रणथंबोर', 0, 3),
  (@qid, 'Kaziranga', 'काजीरंगा', 'काझीरंगा', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which dance form is strongly associated with Maharashtra?', 'कौन सा नृत्य महाराष्ट्र से गहराई से जुड़ा है?', 'कोणता नृत्य महाराष्ट्राशी घट्ट संबंधित आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Lavani', 'लावणी', 'लावणी', 1, 1),
  (@qid, 'Bharatanatyam', 'भरतनाट्यम', 'भरतनाट्यम', 0, 2),
  (@qid, 'Kathakali', 'कथकली', 'कथकली', 0, 3),
  (@qid, 'Odissi', 'ओडिसी', 'ओडिसी', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Haji Ali Dargah is built on what kind of location?', 'हाजी अली दरगाह किस प्रकार के स्थान पर बनी है?', 'हाजी अली दर्गा कोणत्या प्रकारच्या ठिकाणी बांधलेला आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'An islet in the sea', 'समुद्र में एक छोटे द्वीप पर', 'समुद्रातील एका छोट्या बेटावर', 1, 1),
  (@qid, 'A mountain peak', 'पर्वत शिखर पर', 'पर्वत शिखरावर', 0, 2),
  (@qid, 'A desert oasis', 'रेगिस्तानी नखलिस्तान में', 'वाळवंटी नवासमध्ये', 0, 3),
  (@qid, 'A forest clearing', 'जंगल की सफाई में', 'जंगलातील मोकळ्या जागेत', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which local train line is part of Mumbai’s suburban network?', 'कौन सी लोकल ट्रेन लाइन मुंबई उपनगरीय नेटवर्क का हिस्सा है?', 'कोणती लोकल ट्रेन लाईन मुंबई उपनगरीय नेटवर्कचा भाग आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Western Line', 'वेस्टर्न लाइन', 'वेस्टर्न लाईन', 1, 1),
  (@qid, 'Darjeeling Himalayan', 'दार्जिलिंग हिमालयन', 'दार्जिलिंग हिमालयन', 0, 2),
  (@qid, 'Nilgiri Mountain', 'नीलगिरी माउंटेन', 'नीलगिरी माउंटन', 0, 3),
  (@qid, 'Konkan only long-distance', 'केवल लंबी दूरी कोंकण', 'फक्त लांब पल्ल्याची कोकण', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Bandra-Worli Sea Link connects which two areas?', 'बांद्रा-वर्ली सी लिंक किन दो क्षेत्रों को जोड़ता है?', 'बांद्रा-वरळी सी लिंक कोणत्या दोन भागांना जोडतो?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Bandra and Worli', 'बांद्रा और वर्ली', 'बांद्रा आणि वरळी', 1, 1),
  (@qid, 'Colaba and Fort', 'कोलाबा और फोर्ट', 'कोलाबा आणि फोर्ट', 0, 2),
  (@qid, 'Andheri and Goregaon', 'अंधेरी और गोरेगांव', 'अंधेरी आणि गोरेगाव', 0, 3),
  (@qid, 'Thane and Kalyan', 'ठाणे और कल्याण', 'ठाणे आणि कल्याण', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which festival is famously celebrated with huge immersion processions in Mumbai?', 'मुंबई में विशाल विसर्जन जुलूसों के साथ कौन सा त्योहार प्रसिद्ध है?', 'मुंबईत मोठ्या विसर्जन मिरवणुकींसाठी कोणता सण प्रसिद्ध आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Ganesh Chaturthi', 'गणेश चतुर्थी', 'गणेश चतुर्थी', 1, 1),
  (@qid, 'Pongal', 'पोंगल', 'पोंगल', 0, 2),
  (@qid, 'Baisakhi', 'बैसाखी', 'बैसाखी', 0, 3),
  (@qid, 'Onam', 'ओणम', 'ओणम', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Marine Drive in Mumbai is popularly called?', 'मुंबई की मरीन ड्राइव को लोकप्रिय रूप से क्या कहा जाता है?', 'मुंबईतील मरीन ड्राइव्हला लोकप्रियपणे काय म्हणतात?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Queen''s Necklace', 'क्वीन्स नेकलेस', 'क्वीन्स नेकलेस', 1, 1),
  (@qid, 'King''s Crown', 'किंग्स क्राउन', 'किंग्स क्राउन', 0, 2),
  (@qid, 'Golden Arc', 'गोल्डन आर्क', 'गोल्डन आर्क', 0, 3),
  (@qid, 'Silver Crescent', 'सिल्वर क्रिसेंट', 'सिल्व्हर क्रिसेंट', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which heritage site near Mumbai is a UNESCO World Heritage Site?', 'मुंबई के पास कौन सा विरासत स्थल यूनेस्को विश्व धरोहर है?', 'मुंबईजवळील कोणते वारसा स्थळ युनेस्को जागतिक वारसा आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Elephanta Caves', 'एलिफेंटा गुफाएँ', 'एलिफंटा लेणी', 1, 1),
  (@qid, 'Charminar', 'चारमीनार', 'चारमिनार', 0, 2),
  (@qid, 'India Gate Delhi', 'इंडिया गेट दिल्ली', 'इंडिया गेट दिल्ली', 0, 3),
  (@qid, 'Mysore Palace', 'मैसूर पैलेस', 'म्हैसूर पॅलेस', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'What does “Bharat Garv” literally relate to in spirit?', '“भारत गर्व” भावनात्मक रूप से किससे जुड़ा है?', '“भारत गर्व” भावनेने कशाशी संबंधित आहे?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Pride in India’s heritage', 'भारत की विरासत पर गर्व', 'भारताच्या वारशाचा गर्व', 1, 1),
  (@qid, 'Only sports championships', 'केवल खेल प्रतियोगिताएँ', 'फक्त क्रीडा स्पर्धा', 0, 2),
  (@qid, 'Only technology parks', 'केवल प्रौद्योगिकी पार्क', 'फक्त तंत्रज्ञान उद्याने', 0, 3),
  (@qid, 'Only film awards', 'केवल फिल्म पुरस्कार', 'फक्त चित्रपट पुरस्कार', 0, 4);

SET @sort := @sort + 1;
INSERT INTO program_questions
  (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
VALUES
  (@section_id, 'Which island group includes Elephanta?', 'एलिफेंटा किस द्वीप समूह में आता है?', 'एलिफंटा कोणत्या बेट समूहात येते?', 0, NULL, @sort, 1);
SET @qid := LAST_INSERT_ID();
INSERT INTO program_question_options
  (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
VALUES
  (@qid, 'Mumbai Harbour islands', 'मुंबई बंदरगाह के द्वीप', 'मुंबई बंदराची बेटे', 1, 1),
  (@qid, 'Andaman only', 'केवल अंडमान', 'फक्त अंदमान', 0, 2),
  (@qid, 'Lakshadweep only', 'केवल लक्षद्वीप', 'फक्त लक्षद्वीप', 0, 3),
  (@qid, 'Nicobar only', 'केवल निकोबार', 'फक्त निकोबार', 0, 4);

UPDATE program_sections
SET questions_to_serve = 10
WHERE id = @section_id;

DELETE aq FROM program_section_assignment_questions aq
INNER JOIN program_section_question_assignments a ON a.id = aq.assignment_id
WHERE a.section_id = @section_id;

DELETE FROM program_section_question_assignments
WHERE section_id = @section_id;
