import mongoose, { Types } from 'mongoose';
import { ClubDocument } from '@/interface/club.interface';

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
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    admin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'clubs', timestamps: true }
);

clubSchema.pre('save', async function (next) {
  // Ensure name does not contain spaces
  const nameRegex = /^[^\s]+$/;
  if (!nameRegex.test(this.name)) {
    return next(new Error('Club name cannot contain spaces'));
  }

  // Validate contact email format if provided
  if (this.contact?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contact.email)) {
      return next(new Error('Invalid contact email format'));
    }
  }

  // Validate website URL format if provided
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
  // Convert ObjectId arrays to string arrays for API response
  club.members = club.members.map((id: Types.ObjectId) => id.toString());
  club.admin = club.admin.map((id: Types.ObjectId) => id.toString());
  club.moderators = club.moderators.map((id: Types.ObjectId) => id.toString());
  return club;
};

// Export the Club model, reusing it if already defined
export const ClubModel =
  mongoose.models.Club || mongoose.model<ClubDocument>('Club', clubSchema);