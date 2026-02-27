import { connectMongo } from '@/lib/mongoose';
import { AnnouncementModel, AnnouncementDocument } from '../models/announcement.model';

export interface CreateAnnouncementData {
  title: string;
  description: string;
  localized?: {
    hu?: { title?: string; description?: string; buttonText?: string };
    en?: { title?: string; description?: string; buttonText?: string };
    de?: { title?: string; description?: string; buttonText?: string };
  };
  localeVisibilityMode?: 'strict' | 'fallback_en';
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
  localized?: {
    hu?: { title?: string; description?: string; buttonText?: string };
    en?: { title?: string; description?: string; buttonText?: string };
    de?: { title?: string; description?: string; buttonText?: string };
  };
  localeVisibilityMode?: 'strict' | 'fallback_en';
  type?: 'info' | 'success' | 'warning' | 'error';
  isActive?: boolean;
  showButton?: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration?: number;
  expiresAt?: Date;
}

export class AnnouncementService {
  private static resolveLocaleFields(announcement: any, locale: 'hu' | 'en' | 'de') {
    const localized = announcement.localized || {};
    const mode = announcement.localeVisibilityMode || 'strict';
    const current = localized[locale] || {};
    const hasCurrent = Boolean(current.title || current.description || current.buttonText);
    const fallbackEn = localized.en || {};
    const hasFallbackEn = Boolean(fallbackEn.title || fallbackEn.description || fallbackEn.buttonText);

    if (!hasCurrent && mode === 'strict') {
      return null;
    }

    const resolved = hasCurrent ? current : (mode === 'fallback_en' ? fallbackEn : {});
    if (!hasCurrent && mode === 'fallback_en' && !hasFallbackEn) {
      return null;
    }

    return {
      ...announcement,
      title: resolved.title || announcement.title,
      description: resolved.description || announcement.description,
      buttonText: resolved.buttonText || announcement.buttonText,
    };
  }

  static async getActiveAnnouncements(locale: 'hu' | 'en' | 'de' = 'hu'): Promise<any[]> {
    await connectMongo();
    
    const now = new Date();
    const announcements = await AnnouncementModel.find({
      isActive: true,
      expiresAt: { $gt: now }
    }).sort({ createdAt: -1 }).lean();

    return announcements
      .map((announcement: any) => this.resolveLocaleFields(announcement, locale))
      .filter(Boolean);
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
        { description: { $regex: search, $options: 'i' } },
        { 'localized.hu.title': { $regex: search, $options: 'i' } },
        { 'localized.hu.description': { $regex: search, $options: 'i' } },
        { 'localized.en.title': { $regex: search, $options: 'i' } },
        { 'localized.en.description': { $regex: search, $options: 'i' } },
        { 'localized.de.title': { $regex: search, $options: 'i' } },
        { 'localized.de.description': { $regex: search, $options: 'i' } },
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
