import mongoose, { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';

const clubSchema = new mongoose.Schema<ClubDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, default: null },
    logo: { type: String, default: null },
    contact: {
      email: { type: String, default: null },
      phone: { type: String, default: null },
      website: { type: String, default: null },
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tournamentPlayers: [{
      name: { type: String, required: true },
      // Add other fields if necessary
    }],
    subscriptionModel: { 
      type: String, 
      enum: ['free', 'basic', 'pro', 'enterprise'], 
      default: 'free' 
    },
    featureFlags: {
      liveMatchFollowing: { type: Boolean, default: false },
      advancedStatistics: { type: Boolean, default: false },
      premiumTournaments: { type: Boolean, default: false },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    billingInfo: {
      type: { type: String, enum: ['individual', 'company'], default: null },
      name: { type: String, default: null },
      taxId: { type: String, default: null },
      country: { type: String, default: 'hu' },
      city: { type: String, default: null },
      zip: { type: String, default: null },
      address: { type: String, default: null },
      email: { type: String, default: null },
    },
    country: { type: String, default: 'hu' },
    landingPage: {
      primaryColor: { type: String },
      secondaryColor: { type: String },
      backgroundColor: { type: String },
      foregroundColor: { type: String },
      cardColor: { type: String },
      cardForegroundColor: { type: String },
      logo: { type: String }, // URL or Media ID
      coverImage: { type: String },
      aboutText: { type: String },
      aboutImages: [{ type: String }],
      gallery: [{ type: String }],
      template: { type: String, enum: ['classic', 'modern'], default: 'classic' },
      showMembers: { type: Boolean, default: true },
      showTournaments: { type: Boolean, default: true },
      seo: {
        title: { type: String, maxlength: 100 },
        description: { type: String, maxlength: 200 },
        keywords: { type: String, maxlength: 500 },
      },
    },
  },
  { collection: 'clubs', timestamps: true }
);

clubSchema.pre('save', async function (next) {
  if (this.contact?.email) {
    // Allow all valid email formats (not just gmail or .com)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

  this.updatedAt = new Date();
  next();
});

clubSchema.methods.toJSON = function () {
  const club = this.toObject();
  club.members = club.members?.map((_id: Types.ObjectId) => _id.toString()) || [];
  club.admin = club.admin?.map((_id: Types.ObjectId) => _id.toString()) || [];
  club.moderators = club.moderators?.map((_id: Types.ObjectId) => _id.toString()) || [];
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