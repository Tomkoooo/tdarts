import { Types, Document } from 'mongoose';

export interface Club {
  _id: string;
  name: string;
  description: string;
  location: string;
  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };
  members: string[];
  admin: string[];
  moderators: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ClubDocument extends Document, Omit<Club, '_id' | 'members' | 'admin' | 'moderators'> {
    _id: Types.ObjectId;  // Ez a sor hiányzott
  members: Types.ObjectId[];
  admin: Types.ObjectId[];
  moderators: Types.ObjectId[];
  toJSON: () => Club;
}