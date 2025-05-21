import { Request, Response, NextFunction } from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { BadRequestError } from '../../core/ApiError';
import { UserModel } from '../../database/model/User';
import schema from './schema';
import validator from '../../helpers/validator';
import crypto from 'crypto';
import { sendEmail } from '../../helpers/email';

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

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with reset token
      await UserModel.findByIdAndUpdate(
        user._id,
        {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry,
        },
        { new: true },
      );

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send email
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset. Here is your reset token:</p>
          <p><strong>${resetToken}</strong></p>
          <p>Or click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This token will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      new SuccessResponse('Password reset email sent', {}).send(res);
    } catch (error) {
      next(error);
    }
  },
];
