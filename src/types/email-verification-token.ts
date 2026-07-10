import type { ObjectId } from 'mongodb';

export interface EmailVerificationToken {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
