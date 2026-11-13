import {
  getClassWiseParticipation,
  getDashboardAnalytics,
  getSchoolWiseParticipation,
  getToppers,
  assertProgramExists,
} from '../services/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAdminAnalyticsDashboard = asyncHandler(async (req, res) => {
  const {
    programId,
    topLimit,
    schoolPage,
    schoolLimit,
    schoolSearch,
    schoolSort,
  } = req.validated.query;

  const data = await getDashboardAnalytics({
    programId: programId ?? null,
    topLimit,
    schoolPage,
    schoolLimit,
    schoolSearch,
    schoolSort,
  });

  res.json({
    success: true,
    message: 'Analytics loaded successfully',
    data,
  });
});

export const getAdminAnalyticsSchools = asyncHandler(async (req, res) => {
  const { programId, search, page, limit, sort } = req.validated.query;
  await assertProgramExists(programId ?? null);

  const schoolWise = await getSchoolWiseParticipation({
    programId: programId ?? null,
    search,
    page,
    limit,
    sort,
  });

  res.json({
    success: true,
    data: schoolWise.items,
    pagination: schoolWise.pagination,
  });
});

export const getAdminAnalyticsClasses = asyncHandler(async (req, res) => {
  const { programId } = req.validated.query;
  await assertProgramExists(programId ?? null);

  const classWise = await getClassWiseParticipation(programId ?? null);

  res.json({
    success: true,
    data: classWise,
  });
});

export const getAdminAnalyticsToppers = asyncHandler(async (req, res) => {
  const { programId, limit } = req.validated.query;
  await assertProgramExists(programId ?? null);

  const toppers = await getToppers({
    programId: programId ?? null,
    limit,
  });

  res.json({
    success: true,
    data: toppers,
  });
});
