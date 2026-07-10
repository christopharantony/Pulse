import type { ObjectId } from 'mongodb';

export interface PasswordResetToken {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
