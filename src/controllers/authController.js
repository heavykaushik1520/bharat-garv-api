import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signAccessToken } from '../utils/jwt.js';
import { mapPublicUser, PUBLIC_USER_SELECT } from '../utils/userMapper.js';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

/** Used when email is unknown so bcrypt still runs (harder to time-attack) */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('__dummy_password__', BCRYPT_ROUNDS);

function httpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

function issueAuthResponse(user, message, status = 200) {
  const token = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  return {
    status,
    body: {
      success: true,
      message,
      data: {
        token,
        user,
      },
    },
  };
}

export const signup = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    phone,
    firstName,
    lastName,
    schoolId,
    standard,
    division,
    rollNumber,
    preferredLanguage,
  } = req.validated.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [schools] = await connection.query(
      `SELECT id, name
       FROM schools
       WHERE id = :schoolId AND is_active = 1
       LIMIT 1`,
      { schoolId }
    );

    if (!schools.length) {
      throw httpError('Selected school is invalid or inactive', 400, [
        { field: 'schoolId', message: 'Selected school is invalid or inactive' },
      ]);
    }

    const encryptedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [result] = await connection.query(
      `INSERT INTO users (
         email,
         password,
         encrypted_password,
         phone,
         first_name,
         last_name,
         school_id,
         standard,
         division,
         roll_number,
         preferred_language
       ) VALUES (
         :email,
         :password,
         :encryptedPassword,
         :phone,
         :firstName,
         :lastName,
         :schoolId,
         :standard,
         :division,
         :rollNumber,
         :preferredLanguage
       )`,
      {
        email,
        password,
        encryptedPassword,
        phone,
        firstName,
        lastName,
        schoolId,
        standard,
        division,
        rollNumber,
        preferredLanguage,
      }
    );

    const [rows] = await connection.query(
      `SELECT ${PUBLIC_USER_SELECT}
       FROM users u
       INNER JOIN schools s ON s.id = u.school_id
       WHERE u.id = :id
       LIMIT 1`,
      { id: result.insertId }
    );

    await connection.commit();

    const user = mapPublicUser(rows[0]);
    const auth = issueAuthResponse(user, 'Account created successfully', 201);
    res.status(auth.status).json(auth.body);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;

  const [rows] = await pool.query(
    `SELECT
       ${PUBLIC_USER_SELECT},
       u.encrypted_password
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.email = :email
     LIMIT 1`,
    { email }
  );

  const row = rows[0];
  const hash = row?.encrypted_password || DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!row || !passwordMatches) {
    throw httpError('Invalid email or password', 401, [
      { field: 'email', message: 'Invalid email or password' },
      { field: 'password', message: 'Invalid email or password' },
    ]);
  }

  if (!row.is_active) {
    throw httpError('Your account is deactivated. Contact support.', 403, [
      { field: 'email', message: 'Your account is deactivated' },
    ]);
  }

  const user = mapPublicUser(row);
  const auth = issueAuthResponse(user, 'Signed in successfully');
  res.status(auth.status).json(auth.body);
});

export const me = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

async function fetchPublicUserById(connectionOrPool, id) {
  const [rows] = await connectionOrPool.query(
    `SELECT ${PUBLIC_USER_SELECT}
     FROM users u
     INNER JOIN schools s ON s.id = u.school_id
     WHERE u.id = :id
     LIMIT 1`,
    { id }
  );
  return rows[0] ? mapPublicUser(rows[0]) : null;
}

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    email,
    phone,
    firstName,
    lastName,
    schoolId,
    standard,
    division,
    rollNumber,
    preferredLanguage,
  } = req.validated.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [schools] = await connection.query(
      `SELECT id
       FROM schools
       WHERE id = :schoolId AND is_active = 1
       LIMIT 1`,
      { schoolId }
    );

    if (!schools.length) {
      throw httpError('Selected school is invalid or inactive', 400, [
        { field: 'schoolId', message: 'Selected school is invalid or inactive' },
      ]);
    }

    const [emailClash] = await connection.query(
      `SELECT id
       FROM users
       WHERE email = :email AND id <> :userId
       LIMIT 1`,
      { email, userId }
    );
    if (emailClash.length) {
      throw httpError('An account with this email already exists', 409, [
        { field: 'email', message: 'An account with this email already exists' },
      ]);
    }

    const [phoneClash] = await connection.query(
      `SELECT id
       FROM users
       WHERE phone = :phone AND id <> :userId
       LIMIT 1`,
      { phone, userId }
    );
    if (phoneClash.length) {
      throw httpError('An account with this phone number already exists', 409, [
        { field: 'phone', message: 'An account with this phone number already exists' },
      ]);
    }

    const [rollClash] = await connection.query(
      `SELECT id
       FROM users
       WHERE school_id = :schoolId
         AND standard = :standard
         AND division = :division
         AND roll_number = :rollNumber
         AND id <> :userId
       LIMIT 1`,
      { schoolId, standard, division, rollNumber, userId }
    );
    if (rollClash.length) {
      throw httpError(
        'A student with this school, standard, division and roll number already exists',
        409,
        [
          {
            field: 'rollNumber',
            message:
              'A student with this school, standard, division and roll number already exists',
          },
        ]
      );
    }

    await connection.query(
      `UPDATE users
       SET email = :email,
           phone = :phone,
           first_name = :firstName,
           last_name = :lastName,
           school_id = :schoolId,
           standard = :standard,
           division = :division,
           roll_number = :rollNumber,
           preferred_language = :preferredLanguage
       WHERE id = :userId AND is_active = 1`,
      {
        email,
        phone,
        firstName,
        lastName,
        schoolId,
        standard,
        division,
        rollNumber,
        preferredLanguage,
        userId,
      }
    );

    const user = await fetchPublicUserById(connection, userId);
    if (!user) {
      throw httpError('Account not found or deactivated', 404);
    }

    await connection.commit();

    // Re-issue token when email changes so session claims stay accurate
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const updateLanguage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { preferredLanguage } = req.validated.body;

  const [result] = await pool.query(
    `UPDATE users
     SET preferred_language = :preferredLanguage
     WHERE id = :userId AND is_active = 1`,
    { preferredLanguage, userId }
  );

  if (!result.affectedRows) {
    throw httpError('Account not found or deactivated', 404);
  }

  const user = await fetchPublicUserById(pool, userId);
  if (!user) {
    throw httpError('Account not found or deactivated', 404);
  }

  res.json({
    success: true,
    message: 'Language updated successfully',
    data: { user },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.validated.body;

  const [rows] = await pool.query(
    `SELECT id, encrypted_password, is_active
     FROM users
     WHERE id = :userId
     LIMIT 1`,
    { userId }
  );

  if (!rows.length || !rows[0].is_active) {
    throw httpError('Account not found or deactivated', 404);
  }

  const matches = await bcrypt.compare(currentPassword, rows[0].encrypted_password);
  if (!matches) {
    throw httpError('Current password is incorrect', 400, [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }

  const encryptedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await pool.query(
    `UPDATE users
     SET password = :password,
         encrypted_password = :encryptedPassword
     WHERE id = :userId AND is_active = 1`,
    {
      password: newPassword,
      encryptedPassword,
      userId,
    }
  );

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});
