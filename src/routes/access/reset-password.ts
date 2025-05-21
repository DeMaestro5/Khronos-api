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
      const { token, password } = req.body;

      // Find user by reset token and select necessary fields
      const user = await UserModel.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and clear reset token
      await UserModel.findByIdAndUpdate(
        user._id,
        {
          password: hashedPassword,
          resetPasswordToken: undefined,
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
