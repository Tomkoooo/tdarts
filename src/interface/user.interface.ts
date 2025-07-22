import mongoose from 'mongoose';

export interface IUser {
    _id: string;
    username: string;
    name: string
    email: string;
    password: string;
    isVerified: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date | null;
    codes: {
        reset_password: string | null;
        verify_email: string | null;
        two_factor_auth: string | null;
    }
}

export interface UserDocument {
  _id: string | mongoose.Types.ObjectId;
  name: string;
  username: string;
  email: string;
  isVerified: boolean;
  // ...other fields as needed
}
