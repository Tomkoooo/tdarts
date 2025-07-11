import { NextResponse } from 'next/server';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError, handleError } from '@/middleware/errorHandle';

export async function POST(request: Request) {
  await connectToDatabase();
  try {
    const { email, password, name, username } = await request.json();
    if (!email || !password || !name) {
      throw new BadRequestError('Email, password, and name are required');
    }
    const userObject = { email, password, name, username };
    await AuthService.register(userObject);
    return NextResponse.json(
      { message: 'User registered'},
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}