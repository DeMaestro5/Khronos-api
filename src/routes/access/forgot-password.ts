import { Request, Response, NextFunction } from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { BadRequestError } from '../../core/ApiError';
import { UserModel } from '../../database/model/User';
import schema from './schema';
import validator from '../../helpers/validator';
import { sendEmail } from '../../helpers/email';

// Generate a 5-letter alphanumeric code
const generateResetCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default [
  validator(schema.forgotPassword),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      // Find user by email and select necessary fields
      const user = await UserModel.findOne({ email }).select('+email');
      if (!user) {
        throw new BadRequestError('User not found');
      }

      // Generate 5-letter reset code
      const resetCode = generateResetCode();
      const resetCodeExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with reset code
      await UserModel.findByIdAndUpdate(
        user._id,
        {
          resetPasswordCode: resetCode,
          resetPasswordExpires: resetCodeExpiry,
        },
        { new: true },
      );

      // Send email
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Password Reset Request</h1>
            <p>You requested a password reset. Here is your reset code:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="color: #007bff; font-size: 36px; letter-spacing: 8px; margin: 0;">${resetCode}</h2>
            </div>
            <p><strong>Enter this code in the password reset form on our website.</strong></p>
            <p style="color: #666;">This code will expire in 1 hour.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      new SuccessResponse('Password reset email sent', {}).send(res);
    } catch (error) {
      next(error);
    }
  },
];
