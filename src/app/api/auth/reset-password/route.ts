import { NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(1, 'Reset code is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().optional(), // Optional for direct API calls
}).refine((data) => {
  // Only validate matching if confirmPassword is provided
  if (data.confirmPassword) {
    return data.newPassword === data.confirmPassword;
  }
  return true; // Skip validation if confirmPassword not provided
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Resetting password for:', body);
    const { email, code, newPassword } = resetPasswordSchema.parse(body);
    console.log('Resetting password for:', email, 'with code:', code);
    await AuthService.resetPassword(email, code, newPassword);
    return NextResponse.json({ message: 'Password reset successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset password' }, { status: error.status || 400 });
  }
}