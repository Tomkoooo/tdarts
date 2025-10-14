import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

    // Get system uptime
    const uptime = process.uptime();
    const uptimeString = formatUptime(uptime);

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsedMB / memoryTotalMB) * 100);

    // Get database info
    const db = mongoose.connection.db;
    const collections = await db?.listCollections().toArray();
    const collectionCount = collections?.length;
    
    // Get total document count across all collections
    let totalDocuments = 0;
    for (const collection of collections!) {
      try {
        const count = await db?.collection(collection.name).countDocuments();
        totalDocuments += count!;
      } catch (error) {
        console.error(`Error counting documents in ${collection.name}:`, error);
      }
    }

    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      uptime: uptimeString,
      memory: {
        used: `${memoryUsedMB} MB`,
        total: `${memoryTotalMB} MB`,
        percentage: memoryPercentage
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: collectionCount,
        documents: totalDocuments
      },
      features: {
        subscriptionEnabled: process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true',
        socketEnabled: !!process.env.NEXT_PUBLIC_ENABLE_SOCKET,
        leaguesEnabled: !!process.env.NEXT_PUBLIC_ENABLE_LEAGUES,
        detailedStatisticsEnabled: !!process.env.NEXT_PUBLIC_ENABLE_DETAILEDSTATISTICS
        
      },
      environment: {
        emailUsername: process.env.EMAIL_USER || 'N/A',
        nodeEnv: process.env.NODE_ENV || 'N/A',
        subscriptionEnabled: process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED || 'false',
        socketServerUrl: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'N/A'
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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days} nap ${hours} óra ${minutes} perc`;
  } else if (hours > 0) {
    return `${hours} óra ${minutes} perc`;
  } else {
    return `${minutes} perc`;
  }
}