import { sendContactFormToAdmin } from '../services/contactService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const submitContactMessage = asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  await sendContactFormToAdmin(payload);

  res.status(200).json({
    success: true,
    message: 'Your message has been sent. We will get back to you soon.',
  });
});
