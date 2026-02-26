/**
 * Migration Script: Add Country to existing documents
 * 
 * This script adds the country field to all existing Clubs, Users, and Players who don't have it yet.
 * Default country is 'hu'.
 * 
 * Run with: npx ts-node -r dotenv/config scripts/migrate-add-country.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongo } from '../src/lib/mongoose';
import { ClubModel } from '../src/database/models/club.model';
import { UserModel } from '../src/database/models/user.model';
import { PlayerModel } from '../src/database/models/player.model';

async function migrateCountry() {
    try {
        console.log('🚀 Starting Country migration...');
        
        await connectMongo();
        console.log('✅ Connected to MongoDB');

        // 1. Update Clubs
        const clubResult = await ClubModel.updateMany(
            { country: { $exists: false } },
            { $set: { country: 'hu' } }
        );
        console.log(`📊 Updated ${clubResult.modifiedCount} clubs`);

        // 2. Update Users
        const userResult = await UserModel.updateMany(
            { country: { $exists: false } },
            { $set: { country: 'hu' } }
        );
        console.log(`📊 Updated ${userResult.modifiedCount} users`);

        // 3. Update Players
        const playerResult = await PlayerModel.updateMany(
            { country: { $exists: false } },
            { $set: { country: 'hu' } }
        );
        console.log(`📊 Updated ${playerResult.modifiedCount} players`);

        console.log('\n=== Migration Complete ===');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateCountry();
