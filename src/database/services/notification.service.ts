import { ClubSubscriptionService } from './club-subscription.service';
import { sendEmail } from '@/lib/mailer';
import { ClubModel } from '../models/club.model';

export class NotificationService {
  static async notifySubscribers(clubId: string, type: 'post' | 'gallery', itemData: { title: string, id: string }) {
    try {
      const club = await ClubModel.findById(clubId);
      if (!club) return;

      const emails = await ClubSubscriptionService.getSubscribers(clubId);
      if (emails.length === 0) return;

      const baseUrl = process.env.NEXTAUTH_URL || 'https://tdarts.hu';
      const link = `${baseUrl}/clubs/${club._id}?${type === 'post' ? 'postId' : 'galleryId'}=${itemData.id}`;
      
      const subject = `Új ${type === 'post' ? 'hír' : 'galéria'} érkezett: ${club.name}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #df0f04ff;">Értesítés tDarts klubról!</h2>
          <p>A(z) <strong>${club.name}</strong> új tartalmat tett közzé:</p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${itemData.title}</h3>
            <p style="color: #6b7280; font-size: 0.9em;">Kattints az alábbi gombra a megtekintéshez.</p>
            <a href="${link}" style="display: inline-block; background: #df0f04ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Megnyitás most</a>
          </div>
          <p style="color: #9ca3af; font-size: 0.8em;">Ezt az értesítést azért kaptad, mert feliratkoztál a klub híreire.</p>
        </div>
      `;

      await sendEmail({
        to: emails,
        subject,
        text: `Új ${type === 'post' ? 'hír' : 'galéria'} a(z) ${club.name} klubtól: ${itemData.title}. Link: ${link}`,
        html
      });
      
      console.log(`Notifications sent to ${emails.length} subscribers for club ${clubId}`);
    } catch (error) {
      console.error('Failed to notify subscribers:', error);
    }
  }
}
