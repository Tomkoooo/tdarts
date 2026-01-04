import { Types, Document } from 'mongoose';

export interface BillingInfo {
  type: 'individual' | 'company';
  name: string;
  taxId?: string;
  country: string;
  city: string;
  zip: string;
  address: string;
  email: string;
}

export interface Club {
  _id: string;
  name: string;
  description: string;
  location: string;
  address?: string; // Optional detailed address
  logo?: string; // Optional club logo URL
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
  subscriptionModel?: 'free' | 'basic' | 'pro' | 'enterprise';
  featureFlags?: {
    liveMatchFollowing: boolean;
    advancedStatistics: boolean;
    premiumTournaments: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  verified: boolean;
  billingInfo?: BillingInfo;
  // Tournaments (minimal info for list)
  tournaments?: { 
    _id: string; 
    tournamentId: string; 
    tournamentSettings: {
      name: string;
      startDate: string;
      location?: string;
      type?: 'amateur' | 'open';
      entryFee?: number;
      maxPlayers?: number;
      registrationDeadline?: string;
      status: 'pending' | 'finished' | 'group-stage' | 'knockout';
      description?: string;
      knockoutMethod?: 'automatic' | 'manual';
    };
    tournamentPlayers?: Array<{
      _id: string;
      name: string;
      status: 'registered' | 'checked-in' | 'eliminated' | 'winner';
      checkInTime?: Date;
    }>;
  }[];
  leagues?: { _id: string; name: string; isActive: boolean; totalPlayers: number; totalTournaments: number; createdAt: Date }[];
}

export interface ClubDocument extends Document, Omit<Club, '_id' | 'members' | 'admin' | 'moderators' | 'tournaments' | 'leagues'> {
  _id: Types.ObjectId;
  members: Types.ObjectId[]; // Player ref
  admin: Types.ObjectId[]; // User ref
  moderators: Types.ObjectId[]; // User ref
  toJSON: () => Club;
}