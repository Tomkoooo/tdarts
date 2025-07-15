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
  members: { _id: string; name: string; username: string }[];
  admin: string[];
  moderators: string[];
  tournamentPlayers: { name: string }[]; // Unregistered players for tournaments
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tournaments?: { _id: string; code: string; name: string; status: string; createdAt: Date }[];
  leagues?: { _id: string; code: string; name: string; status: string; createdAt: Date }[];
}

export interface ClubDocument extends Document, Omit<Club, '_id' | 'members' | 'admin' | 'moderators' | 'tournamentPlayers' | 'tournaments' | 'leagues'> {
  _id: Types.ObjectId;
  members: Types.ObjectId[];
  admin: Types.ObjectId[];
  moderators: Types.ObjectId[];
  tournamentPlayers: { name: string }[];
  toJSON: () => Club;
}