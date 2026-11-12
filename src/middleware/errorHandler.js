import fs from 'fs/promises';
import multer from 'multer';

async function cleanupRequestUpload(req) {
  if (!req?.file?.path) return;
  try {
    await fs.unlink(req.file.path);
  } catch {
    // Ignore missing upload files
  }
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}

export async function errorHandler(error, req, res, _next) {
  await cleanupRequestUpload(req);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Image must be 2MB or smaller',
        errors: [{ field: 'image', message: 'Image must be 2MB or smaller' }],
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use field name "image".',
        errors: [{ field: 'image', message: 'Unexpected file field. Use field name "image".' }],
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Image upload failed',
      errors: [{ field: 'image', message: error.message || 'Image upload failed' }],
    });
  }

  if (error?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => {
        const path = issue.path.filter(
          (part) => part !== 'body' && part !== 'query' && part !== 'params'
        );
        return {
          field: path.join('.') || 'form',
          message: issue.message,
        };
      }),
    });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    const message = String(error.sqlMessage || '');
    let field = 'record';
    let friendly = 'A record with these details already exists';

    if (message.includes('uq_users_email')) {
      field = 'email';
      friendly = 'An account with this email already exists';
    } else if (message.includes('uq_users_phone')) {
      field = 'phone';
      friendly = 'An account with this phone number already exists';
    } else if (message.includes('uq_users_school_std_div_roll')) {
      field = 'rollNumber';
      friendly =
        'A student with this school, standard, division and roll number already exists';
    } else if (message.includes('uq_schools_name')) {
      field = 'name';
      friendly = 'A school with this name already exists';
    } else if (message.includes('uq_programs_slug')) {
      field = 'slug';
      friendly = 'A program with this URL slug already exists';
    }

    return res.status(409).json({
      success: false,
      message: friendly,
      errors: [{ field, message: friendly }],
    });
  }

  if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Selected school is invalid',
      errors: [{ field: 'schoolId', message: 'Selected school is invalid' }],
    });
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'This school cannot be removed because students are linked to it',
      errors: [{ field: 'id', message: 'School is in use' }],
    });
  }

  if (!error?.statusCode) {
    console.error('[api-error]', error);
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : 'Internal server error',
    ...(Array.isArray(error.errors) && error.errors.length
      ? { errors: error.errors }
      : {}),
  });
}
