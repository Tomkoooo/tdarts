import { Types, Document } from 'mongoose';
import { StructuredLocation } from './location.interface';

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
  __v?: number;
  name: string;
  description: string;
  location: string;
  structuredLocation?: StructuredLocation;
  address?: string;
  logo?: string;
  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };
  members: { _id: string; name: string; username: string; userRef?: string }[];
  membersCount?: number;
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
  country: string;
  tournamentPlayers?: Array<{ name: string }>;
  billingInfo?: BillingInfo;
  landingPage?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor?: string;
    foregroundColor?: string;
    cardColor?: string;
    cardForegroundColor?: string;
    logo?: string;
    coverImage?: string;
    aboutText?: string;
    aboutImages?: string[];
    gallery?: string[];
    template: 'classic' | 'modern';
    showMembers: boolean;
    showTournaments: boolean;
    seo?: {
      title?: string;
      description?: string;
      keywords?: string;
    };
  };
  tournaments?: {
    _id: string;
    tournamentId: string;
    tournamentSettings: {
      name: string;
      startDate: string;
      location?: string;
      type?: 'amateur' | 'open';
      entryFee?: number;
      entryFeeCurrency?: string;
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

export interface ClubDocument extends Omit<Document, 'toJSON'>, Omit<Club, '_id' | 'members' | 'admin' | 'moderators' | 'tournaments' | 'leagues'> {
  _id: Types.ObjectId;
  members: Types.ObjectId[];
  admin: Types.ObjectId[];
  moderators: Types.ObjectId[];
  tournamentPlayers: Array<{ name: string }>;
}
