import { connectMongo } from '@/lib/mongoose';
import { AnnouncementModel, AnnouncementDocument } from '../models/announcement.model';

export interface CreateAnnouncementData {
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  showButton?: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration?: number;
  expiresAt: Date;
}

export interface UpdateAnnouncementData {
  title?: string;
  description?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  isActive?: boolean;
  showButton?: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration?: number;
  expiresAt?: Date;
}

export class AnnouncementService {
  static async getActiveAnnouncements(): Promise<AnnouncementDocument[]> {
    await connectMongo();
    
    const now = new Date();
    return await AnnouncementModel.find({
      isActive: true,
      expiresAt: { $gt: now }
    }).sort({ createdAt: -1 });
  }

  static async getAllAnnouncements(): Promise<AnnouncementDocument[]> {
    await connectMongo();
    
    return await AnnouncementModel.find().sort({ createdAt: -1 });
  }

  static async getAnnouncementsForAdmin(page: number = 1, limit: number = 10, search?: string): Promise<{ announcements: AnnouncementDocument[]; total: number; page: number; totalPages: number }> {
    await connectMongo();
    
    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      AnnouncementModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AnnouncementModel.countDocuments(query)
    ]);
    
    return {
      announcements,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getAnnouncementById(id: string): Promise<AnnouncementDocument | null> {
    await connectMongo();
    
    return await AnnouncementModel.findById(id);
  }

  static async createAnnouncement(data: CreateAnnouncementData): Promise<AnnouncementDocument> {
    await connectMongo();
    
    const announcement = new AnnouncementModel({
      ...data,
      isActive: true
    });
    
    return await announcement.save();
  }

  static async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<AnnouncementDocument | null> {
    await connectMongo();
    
    return await AnnouncementModel.findByIdAndUpdate(
      id,
      { ...data },
      { new: true, runValidators: true }
    );
  }

  static async deleteAnnouncement(id: string): Promise<boolean> {
    await connectMongo();
    
    const result = await AnnouncementModel.findByIdAndDelete(id);
    return !!result;
  }

  static async toggleAnnouncement(id: string): Promise<AnnouncementDocument | null> {
    await connectMongo();
    
    const announcement = await AnnouncementModel.findById(id);
    if (!announcement) return null;
    
    announcement.isActive = !announcement.isActive;
    return await announcement.save();
  }

  static async getAnnouncementStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    byType: { [key: string]: number };
  }> {
    await connectMongo();
    
    const now = new Date();
    const [total, active, expired] = await Promise.all([
      AnnouncementModel.countDocuments(),
      AnnouncementModel.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
      AnnouncementModel.countDocuments({ expiresAt: { $lte: now } })
    ]);

    const byType = await AnnouncementModel.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats: { [key: string]: number } = {};
    byType.forEach(item => {
      typeStats[item._id] = item.count;
    });

    return {
      total,
      active,
      expired,
      byType: typeStats
    };
  }
}
