import {
  createAdminAccount,
  findAdminById,
  loginAdmin,
  requestAdminPasswordReset,
  resetAdminPasswordWithToken,
} from '../services/adminAuthService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createAdmin = asyncHandler(async (req, res) => {
  const { email, password, name } = req.validated.body;
  const admin = await createAdminAccount({
    email,
    password,
    name,
    actorAdminId: req.admin?.id || null,
  });

  res.status(201).json({
    success: true,
    message: 'Admin created successfully',
    data: { admin },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const result = await loginAdmin({ email, password });

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: {
      token: result.token,
      admin: result.admin,
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  const admin = await findAdminById(req.admin.id);
  res.json({
    success: true,
    data: { admin },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await requestAdminPasswordReset(req.validated.body.email, req);
  res.json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await resetAdminPasswordWithToken(req.validated.body);
  res.json(result);
});
