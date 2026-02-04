import { NextResponse } from 'next/server';
import { ProfileService } from '@/database/services/profile.service';
import { AuthService } from '@/database/services/auth.service';
import { z } from 'zod';
import { cookies } from 'next/headers';

const updateProfileSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  username: z.string().min(1, 'Username is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
  confirmPassword: z.string().optional(),
  profilePicture: z.string().nullable().optional(),
  publicConsent: z.boolean().optional(),
}).refine((data) => {
  if (data.password && !data.confirmPassword) {
    return false;
  }
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);
    
    // Remove confirmPassword from updates object
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...updates } = validatedData;

    const updatedUser = await ProfileService.updateProfile(user._id.toString(), updates);
    return NextResponse.json(
      { message: 'Profile updated successfully', user: { email: updatedUser.email, name: updatedUser.name, username: updatedUser.username } },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: error.status || 400 });
  }
}