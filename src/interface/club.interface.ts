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
  // Player collection references (members can be guests or registered)
  members: { _id: string; name: string; username: string; userRef?: string }[];
  // User collection references (only registered users)
  admin: { _id: string; name: string; username: string }[];
  moderators: { _id: string; name: string; username: string }[];
  // Boards (inline, not references)
  boards: Array<{
    boardNumber: number;
    name?: string;
    currentMatch?: string;
    nextMatch?: string;
    status: 'idle' | 'waiting' | 'playing';
    isActive: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  // Tournaments (minimal info for list)
  tournaments?: { _id: string; code: string; name: string; status: 'pending' | 'active' | 'finished'; startDate?: string }[];
  leagues?: { _id: string; code: string; name: string; status: string; createdAt: Date }[];
}

export interface ClubDocument extends Document, Omit<Club, '_id' | 'members' | 'admin' | 'moderators' | 'tournaments' | 'leagues'> {
  _id: Types.ObjectId;
  members: Types.ObjectId[]; // Player ref
  admin: Types.ObjectId[]; // User ref
  moderators: Types.ObjectId[]; // User ref
  toJSON: () => Club;
}