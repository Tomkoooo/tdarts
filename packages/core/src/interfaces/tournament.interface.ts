import { Document, Types } from 'mongoose';
import type { EntryFeeCurrency } from '../lib/entry-fee-currency';
import { BillingInfo } from './club.interface';
import { StructuredLocation } from './location.interface';

// Plain types (API, DTO, etc.)
export interface TournamentPlayer {
  _id?: string;
  playerReference: string | PlayerDocument;
  status: 'applied' | 'confirmed' | 'checked-in' | 'eliminated' | 'winner';
  groupId?: string;
  groupOrdinalNumber?: number;
  groupStanding?: number;
  tournamentStanding?: number;
  finalPosition?: number;
  eliminatedIn?: string;
  finalStats?: {
    average: number;
    checkoutRate: number;
    legsWon: number;
    legsPlayed: number;
    matchesWon: number;
    matchesPlayed: number;
    highestCheckout: number;
    oneEighties: number;
  };
  /** Live group stage and, after finish, full tournament (group + knockout) match/leg totals. */
  stats: {
    matchesWon: number;
    matchesLost: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg?: number;
    oneEightiesCount: number;
    highestCheckout: number;
  };
  /** Set when a tournament is finished: group-stage-only snapshot (W/L, legs, averages). */
  groupStats?: {
    matchesWon: number;
    matchesLost: number;
    legsWon: number;
    legsLost: number;
    avg: number;
    firstNineAvg?: number;
    oneEightiesCount: number;
    highestCheckout: number;
  };
}

export interface TournamentGroup {
  _id: string;
  board: number;
  matches: string[];
}

export interface KnockoutRound {
  round: number;
  matches: {
    player1?: string | PlayerDocument;
    player2?: string | PlayerDocument;
    matchReference?: string | MatchDocument;
  }[];
}

export interface TournamentBoard {
  boardNumber: number;
  name?: string;
  currentMatch?: string | MatchDocument;
  nextMatch?: string | MatchDocument;
  status: 'idle' | 'waiting' | 'playing';
  isActive: boolean;
  scoliaSerialNumber?: string;
  scoliaAccessToken?: string;
}

export interface LegsConfig {
  /** Per-group legs-to-win, keyed by board number (e.g. { 1: 3, 2: 3 }). */
  groups?: Record<number, number>;
  /** Per-knockout-round legs-to-win, keyed by round number (e.g. { 1: 3, 2: 5, 3: 7 }). */
  knockout?: Record<number, number>;
}

export interface TournamentSettings {
  status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout';
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  maxPlayers: number;
  format: 'group' | 'knockout' | 'group_knockout';
  participationMode?: 'individual' | 'pair' | 'team';
  startingScore: number;
  tournamentPassword: string;
  knockoutMethod?: 'automatic' | 'manual';
  boardCount: number;
  entryFee: number;
  /** ISO 4217; defaults to HUF when missing (legacy documents). */
  entryFeeCurrency?: EntryFeeCurrency;
  location?: string;
  locationData?: StructuredLocation;
  type: 'amateur' | 'open';
  registrationDeadline: Date;
  coverImage?: string;
  /** Organizer-configured legs-to-win per group (by board number) and per knockout round. */
  legsConfig?: LegsConfig;
}

export interface PlayerDocument extends Omit<Document, 'toJSON' | '_id'> {
  _id: Types.ObjectId;
  name: string;
}

export interface MatchDocument extends Omit<Document, 'toJSON' | '_id'> {
  _id: Types.ObjectId;
}

export interface WaitingListPlayer {
  playerReference: string | PlayerDocument;
  addedAt: Date;
  addedBy?: string;
}

export interface NotificationSubscriber {
  userRef: string;
  email: string;
  subscribedAt: Date;
  notifiedAt?: Date;
}

export interface Tournament {
  _id?: string;
  tournamentId: string;
  clubId: string | Document;
  tournamentPlayers: TournamentPlayer[];
  waitingList?: WaitingListPlayer[];
  notificationSubscribers?: NotificationSubscriber[];
  groups: TournamentGroup[];
  knockout: KnockoutRound[];
  boards: TournamentBoard[];
  tournamentSettings: TournamentSettings;
  league?: string | Document;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
  isDeleted?: boolean;
  isArchived?: boolean;
  isCancelled?: boolean;
  isSandbox?: boolean;
  verified?: boolean;
  paymentStatus?: 'none' | 'pending' | 'paid';
  stripeSessionId?: string;
  invoiceId?: string;
  billingInfoSnapshot?: BillingInfo;
}

// Document types (Mongoose)
export interface TournamentPlayerDocument extends Omit<TournamentPlayer, '_id' | 'groupId' | 'playerReference'> {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  playerReference: Types.ObjectId;
}
export interface TournamentGroupDocument extends Omit<TournamentGroup, 'id'> {
  id: Types.ObjectId;
}
export interface TournamentBoardDocument {
  boardNumber: number;
  name?: string;
  currentMatch?: Types.ObjectId;
  nextMatch?: Types.ObjectId;
  status: 'idle' | 'waiting' | 'playing';
  isActive: boolean;
  scoliaSerialNumber?: string;
  scoliaAccessToken?: string;
}

export interface WaitingListPlayerDocument {
  playerReference: Types.ObjectId;
  addedAt: Date;
  addedBy?: Types.ObjectId;
}

export interface NotificationSubscriberDocument {
  userRef: Types.ObjectId;
  email: string;
  subscribedAt: Date;
  notifiedAt?: Date;
}

export interface TournamentDocument extends Omit<Document, 'toJSON'>, Omit<Tournament, '_id' | 'tournamentPlayers' | 'waitingList' | 'notificationSubscribers' | 'groups' | 'boards' | 'clubId' | 'league'> {
  _id: Types.ObjectId;
  tournamentPlayers: TournamentPlayerDocument[];
  waitingList?: WaitingListPlayerDocument[];
  notificationSubscribers?: NotificationSubscriberDocument[];
  groups: TournamentGroupDocument[];
  boards: TournamentBoardDocument[];
  clubId: Types.ObjectId;
  league?: Types.ObjectId;
  paymentStatus?: 'none' | 'pending' | 'paid';
  stripeSessionId?: string;
  invoiceId?: string;
  billingInfoSnapshot?: BillingInfo;
}

// Manual groups (API DTOs)
export interface ManualGroupsBoard {
  boardNumber: number;
  isUsed: boolean;
}

export interface ManualGroupsAvailablePlayer {
  _id: string;
  name: string;
}

export interface ManualGroupsContextResponse {
  boards: ManualGroupsBoard[];
  availablePlayers: ManualGroupsAvailablePlayer[];
}

export interface CreateManualGroupRequest {
  boardNumber: number;
  playerIds: string[];
}

export interface CreateManualGroupResponse {
  groupId: string;
  matchIds: string[];
}

// Bulk manual groups (API DTOs)
export interface ManualGroupCreateItem {
  boardNumber: number;
  playerIds: string[];
}

export interface CreateManualGroupsRequest {
  groups: ManualGroupCreateItem[];
}

export interface CreatedGroupInfo {
  boardNumber: number;
  groupId: string;
  matchIds: string[];
}

export interface CreateManualGroupsResponse {
  groups: CreatedGroupInfo[];
}
