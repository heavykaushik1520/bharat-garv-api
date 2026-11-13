import pool from '../config/db.js';
import {
  safeUnlinkPublicImage,
  safeUnlinkUploadedFile,
  safeUnlinkUploadedFiles,
  uploadedQuestionImagePublicPath,
} from '../middleware/uploadQuestionImage.js';
import {
  assertActiveProgram,
  assertActiveSection,
  countActiveQuestions,
  insertQuestionWithOptions,
  loadProgramTree,
  mapQuestion,
  mapSection,
  nextSortOrder,
  replaceQuestionOptions,
} from '../services/programContentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';

export const getAdminProgramTree = asyncHandler(async (req, res) => {
  const { programId } = req.validated.params;
  const tree = await loadProgramTree(programId, { includeCorrect: true });

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: tree,
  });
});

export const createAdminSection = asyncHandler(async (req, res) => {
  const { programId: programRef } = req.validated.params;
  const body = req.validated.body;
  const questionFiles = req.sectionQuestionFiles || new Map();
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];

  const program = await assertActiveProgram(programRef);
  const programId = program.id;

  if (!Array.isArray(body.questions) || body.questions.length < 1) {
    await safeUnlinkUploadedFiles(uploadedFiles);
    throw httpError('Each section must include at least one question', 400, [
      { field: 'questions', message: 'Each section must include at least one question' },
    ]);
  }

  for (let index = 0; index < body.questions.length; index += 1) {
    const question = body.questions[index];
    const file = questionFiles.get(index) || null;

    if (question.hasImage && !file) {
      await safeUnlinkUploadedFiles(uploadedFiles);
      throw httpError('Question image is required (max 2MB)', 400, [
        {
          field: `questions.${index}.image`,
          message: 'Upload an image up to 2MB (JPG, PNG, WEBP, or GIF)',
        },
      ]);
    }

    if (!question.hasImage && file) {
      await safeUnlinkUploadedFile(file);
      questionFiles.delete(index);
    }
  }

  const sortOrder = body.sortOrder || (await nextSortOrder('program_sections', 'program_id', programId));
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sectionResult] = await connection.query(
      `INSERT INTO program_sections
        (program_id, title_en, title_hi, title_mr, subtitle_en, subtitle_hi, subtitle_mr,
         youtube_url_en, youtube_url_hi, youtube_url_mr, sort_order, is_active)
       VALUES
        (:programId, :titleEn, :titleHi, :titleMr, :subtitleEn, :subtitleHi, :subtitleMr,
         :youtubeUrlEn, :youtubeUrlHi, :youtubeUrlMr, :sortOrder, 1)`,
      {
        programId,
        titleEn: body.titleEn,
        titleHi: body.titleHi,
        titleMr: body.titleMr,
        subtitleEn: body.subtitleEn,
        subtitleHi: body.subtitleHi,
        subtitleMr: body.subtitleMr,
        youtubeUrlEn: body.youtubeUrlEn,
        youtubeUrlHi: body.youtubeUrlHi,
        youtubeUrlMr: body.youtubeUrlMr,
        sortOrder,
      }
    );

    const sectionId = sectionResult.insertId;

    for (let index = 0; index < body.questions.length; index += 1) {
      const question = body.questions[index];
      const file = questionFiles.get(index) || null;
      const imageUrl = question.hasImage ? uploadedQuestionImagePublicPath(file) : null;

      await insertQuestionWithOptions(connection, {
        sectionId,
        question,
        imageUrl,
        sortOrder: question.sortOrder || index + 1,
      });
    }

    await connection.commit();

    const tree = await loadProgramTree(programRef, { includeCorrect: true });
    const hydrated = tree.sections.find((item) => item.id === sectionId);

    res.status(201).json({
      success: true,
      message: 'Section created successfully with questions',
      data: hydrated || mapSection({ id: sectionId, program_id: programId }, []),
    });
  } catch (error) {
    await connection.rollback();
    await safeUnlinkUploadedFiles(uploadedFiles);
    throw error;
  } finally {
    connection.release();
  }
});

export const updateAdminSection = asyncHandler(async (req, res) => {
  const { programId: programRef, sectionId } = req.validated.params;
  const body = req.validated.body;
  const sectionCurrent = await assertActiveSection(programRef, sectionId);
  const programId = sectionCurrent.program_id;

  await pool.query(
    `UPDATE program_sections
     SET title_en = :titleEn,
         title_hi = :titleHi,
         title_mr = :titleMr,
         subtitle_en = :subtitleEn,
         subtitle_hi = :subtitleHi,
         subtitle_mr = :subtitleMr,
         youtube_url_en = :youtubeUrlEn,
         youtube_url_hi = :youtubeUrlHi,
         youtube_url_mr = :youtubeUrlMr,
         sort_order = COALESCE(:sortOrder, sort_order)
     WHERE id = :sectionId AND program_id = :programId AND is_active = 1`,
    {
      programId,
      sectionId,
      titleEn: body.titleEn,
      titleHi: body.titleHi,
      titleMr: body.titleMr,
      subtitleEn: body.subtitleEn,
      subtitleHi: body.subtitleHi,
      subtitleMr: body.subtitleMr,
      youtubeUrlEn: body.youtubeUrlEn,
      youtubeUrlHi: body.youtubeUrlHi,
      youtubeUrlMr: body.youtubeUrlMr,
      sortOrder: body.sortOrder ?? null,
    }
  );

  const section = await assertActiveSection(programRef, sectionId);
  const tree = await loadProgramTree(programRef, { includeCorrect: true });
  const hydrated = tree.sections.find((item) => item.id === sectionId);

  res.json({
    success: true,
    message: 'Section updated successfully',
    data: hydrated || mapSection(section, []),
  });
});

export const deleteAdminSection = asyncHandler(async (req, res) => {
  const { programId: programRef, sectionId } = req.validated.params;
  const sectionCurrent = await assertActiveSection(programRef, sectionId);
  const programId = sectionCurrent.program_id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Deactivate section first so DB trigger allows clearing its questions.
    await connection.query(
      `UPDATE program_sections
       SET is_active = 0
       WHERE id = :sectionId AND program_id = :programId`,
      { sectionId, programId }
    );

    await connection.query(
      `UPDATE program_questions
       SET is_active = 0
       WHERE section_id = :sectionId AND is_active = 1`,
      { sectionId }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.json({
    success: true,
    message: 'Section deleted successfully',
    data: { id: sectionId, deleted: true },
  });
});

export const createAdminQuestion = asyncHandler(async (req, res) => {
  const { programId, sectionId } = req.validated.params;
  const body = req.validated.body;
  await assertActiveSection(programId, sectionId);

  let imageUrl = null;
  if (body.hasImage) {
    imageUrl = uploadedQuestionImagePublicPath(req.file);
    if (!imageUrl) {
      throw httpError('Question image is required (max 2MB)', 400, [
        { field: 'image', message: 'Upload an image up to 2MB (JPG, PNG, WEBP, or GIF)' },
      ]);
    }
  } else if (req.file) {
    await safeUnlinkUploadedFile(req.file);
  }

  const sortOrder =
    body.sortOrder || (await nextSortOrder('program_questions', 'section_id', sectionId));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO program_questions
        (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
       VALUES
        (:sectionId, :headlineEn, :headlineHi, :headlineMr, :hasImage, :imageUrl, :sortOrder, 1)`,
      {
        sectionId,
        headlineEn: body.headlineEn,
        headlineHi: body.headlineHi,
        headlineMr: body.headlineMr,
        hasImage: body.hasImage ? 1 : 0,
        imageUrl,
        sortOrder,
      }
    );

    await replaceQuestionOptions(connection, result.insertId, body.options);
    await connection.commit();

    const tree = await loadProgramTree(programId, { includeCorrect: true });
    const section = tree.sections.find((item) => item.id === sectionId);
    const question = section?.questions.find((item) => item.id === result.insertId);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question,
    });
  } catch (error) {
    await connection.rollback();
    await safeUnlinkUploadedFile(req.file);
    throw error;
  } finally {
    connection.release();
  }
});

export const updateAdminQuestion = asyncHandler(async (req, res) => {
  const { programId, sectionId, questionId } = req.validated.params;
  const body = req.validated.body;
  await assertActiveSection(programId, sectionId);

  const connection = await pool.getConnection();
  let previousImageUrl = null;
  let nextImageUrl = null;
  let uploadedPath = uploadedQuestionImagePublicPath(req.file);

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id, has_image, image_url
       FROM program_questions
       WHERE id = :questionId AND section_id = :sectionId AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { questionId, sectionId }
    );

    if (!existing.length) {
      throw httpError('Question not found', 404);
    }

    previousImageUrl = existing[0].image_url || null;

    if (body.hasImage) {
      if (uploadedPath) {
        nextImageUrl = uploadedPath;
      } else if (body.keepExistingImage && previousImageUrl) {
        nextImageUrl = previousImageUrl;
      } else {
        throw httpError('Question image is required (max 2MB)', 400, [
          { field: 'image', message: 'Upload an image up to 2MB, or keep the existing image' },
        ]);
      }
    } else {
      nextImageUrl = null;
      if (req.file) {
        await safeUnlinkUploadedFile(req.file);
        uploadedPath = null;
      }
    }

    await connection.query(
      `UPDATE program_questions
       SET headline_en = :headlineEn,
           headline_hi = :headlineHi,
           headline_mr = :headlineMr,
           has_image = :hasImage,
           image_url = :imageUrl,
           sort_order = COALESCE(:sortOrder, sort_order)
       WHERE id = :questionId AND section_id = :sectionId AND is_active = 1`,
      {
        questionId,
        sectionId,
        headlineEn: body.headlineEn,
        headlineHi: body.headlineHi,
        headlineMr: body.headlineMr,
        hasImage: body.hasImage ? 1 : 0,
        imageUrl: nextImageUrl,
        sortOrder: body.sortOrder ?? null,
      }
    );

    await replaceQuestionOptions(connection, questionId, body.options);
    await connection.commit();

    if (previousImageUrl && previousImageUrl !== nextImageUrl) {
      await safeUnlinkPublicImage(previousImageUrl);
    }

    const tree = await loadProgramTree(programId, { includeCorrect: true });
    const section = tree.sections.find((item) => item.id === sectionId);
    const question = section?.questions.find((item) => item.id === questionId);

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: question || mapQuestion({ id: questionId }, [], { includeCorrect: true }),
    });
  } catch (error) {
    await connection.rollback();
    await safeUnlinkUploadedFile(req.file);
    throw error;
  } finally {
    connection.release();
  }
});

export const deleteAdminQuestion = asyncHandler(async (req, res) => {
  const { programId, sectionId, questionId } = req.validated.params;
  await assertActiveSection(programId, sectionId);

  const connection = await pool.getConnection();
  let imageUrlToRemove = null;

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id, image_url
       FROM program_questions
       WHERE id = :questionId AND section_id = :sectionId AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { questionId, sectionId }
    );

    if (!existing.length) {
      throw httpError('Question not found', 404);
    }

    const activeCount = await countActiveQuestions(sectionId, connection);
    if (activeCount <= 1) {
      throw httpError('Each section must keep at least one question', 400, [
        {
          field: 'questions',
          message: 'Add another question before deleting this one, or delete the whole section',
        },
      ]);
    }

    imageUrlToRemove = existing[0].image_url || null;

    await connection.query(
      `UPDATE program_questions
       SET is_active = 0,
           has_image = 0,
           image_url = NULL
       WHERE id = :questionId AND section_id = :sectionId`,
      { questionId, sectionId }
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (imageUrlToRemove) {
    await safeUnlinkPublicImage(imageUrlToRemove);
  }

  res.json({
    success: true,
    message: 'Question deleted successfully',
    data: { id: questionId, deleted: true },
  });
});
