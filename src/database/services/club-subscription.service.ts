import { SubscriptionModel } from '../models/subscription.model';
import { connectMongo } from '@/lib/mongoose';

export class ClubSubscriptionService {
  static async toggleSubscription(userId: string, clubId: string): Promise<{ subscribed: boolean }> {
    await connectMongo();
    const existing = await SubscriptionModel.findOne({ userId, clubId });
    if (existing) {
      await SubscriptionModel.deleteOne({ _id: existing._id });
      return { subscribed: false };
    } else {
      await SubscriptionModel.create({ userId, clubId });
      return { subscribed: true };
    }
  }

  static async isSubscribed(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    const existing = await SubscriptionModel.findOne({ userId, clubId });
    return !!existing;
  }

  static async getSubscribers(clubId: string): Promise<string[]> {
    await connectMongo();
    const subs = await SubscriptionModel.find({ clubId }).populate('userId', 'email');
    return subs.map(s => (s.userId as any)?.email).filter(Boolean);
  }
}
