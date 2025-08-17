import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    
    // Get database stats
    const dbStats = await mongoose.connection.db?.stats();
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal + memUsage.external;
    const usedMem = memUsage.heapUsed + memUsage.external;
    const memPercentage = Math.round((usedMem / totalMem) * 100);

    // Calculate uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

    // Format memory usage
    const formatBytes = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      uptime: uptimeString,
      memory: {
        used: formatBytes(usedMem),
        total: formatBytes(totalMem),
        percentage: memPercentage
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        collections: dbStats?.collections,
        documents: dbStats?.objects
      },
      features: {
        subscriptionEnabled: process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true',
        socketEnabled: !!process.env.NEXT_PUBLIC_SOCKET_SERVER_URL
      }
    };

    return NextResponse.json(systemInfo);

  } catch (error) {
    console.error('Error fetching system info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system information' },
      { status: 500 }
    );
  }
}
