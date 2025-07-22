import mongoose, { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';
import { TournamentModel } from './tournament.model';

const clubSchema = new mongoose.Schema<ClubDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    contact: {
      email: { type: String, default: null },
      phone: { type: String, default: null },
      website: { type: String, default: null },
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    boards: [{
      boardNumber: { type: Number, required: true },
      name: { type: String },
      description: { type: String },
      isActive: { type: Boolean, default: true },
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'clubs', timestamps: true }
);

clubSchema.pre('save', async function (next) {
  const nameRegex = /^[^\s]+$/;
  if (!nameRegex.test(this.name)) {
    return next(new Error('Club name cannot contain spaces'));
  }

  if (this.contact?.email) {
    const emailRegex = /^[^\s@]+@[^ s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contact.email)) {
      return next(new Error('Invalid contact email format'));
    }
  }

  if (this.contact?.website) {
    const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
    if (!urlRegex.test(this.contact.website)) {
      return next(new Error('Invalid website URL format'));
    }
  }

  //reindex the boardNumbers from 1
  this.boards = this.boards.map((board, index) => ({
    ...board,
    boardNumber: index + 1,
  }));

  this.updatedAt = new Date();
  next();
});

clubSchema.methods.toJSON = function () {
  const club = this.toObject();
  club.members = club.members.map((id: Types.ObjectId) => id.toString());
  club.admin = club.admin.map((id: Types.ObjectId) => id.toString());
  club.moderators = club.moderators.map((id: Types.ObjectId) => id.toString());
  return club;
};

// Virtual for tournaments belonging to the club
clubSchema.virtual('tournaments', {
  ref: 'Tournament',
  localField: '_id',
  foreignField: 'clubId',
  justOne: false,
  options: { select: '_id name code status startDate' },
});

// Enable virtuals for toJSON and toObject
clubSchema.set('toObject', { virtuals: true });
clubSchema.set('toJSON', { virtuals: true });

export const ClubModel =
  mongoose.models.Club || mongoose.model<ClubDocument>('Club', clubSchema);