import { Request, Response, NextFunction } from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { BadRequestError } from '../../core/ApiError';
import { UserModel } from '../../database/model/User';
import schema from './schema';
import validator from '../../helpers/validator';
import bcrypt from 'bcrypt';

export default [
  validator(schema.resetPassword),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, password } = req.body;

      // Find user by reset code and select necessary fields
      const user = await UserModel.findOne({
        resetPasswordCode: code,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordCode +resetPasswordExpires');

      if (!user) {
        throw new BadRequestError('Invalid or expired reset code');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and clear reset code
      await UserModel.findByIdAndUpdate(
        user._id,
        {
          password: hashedPassword,
          resetPasswordCode: undefined,
          resetPasswordExpires: undefined,
        },
        { new: true },
      );

      new SuccessResponse('Password reset successful', {}).send(res);
    } catch (error) {
      next(error);
    }
  },
];
