/**
 * Migration Script: Add MMR to existing players
 * 
 * This script adds the MMR field to all existing players who don't have it yet.
 * Default MMR is 800 (base rating).
 * 
 * Run with: npx ts-node scripts/migrate-add-mmr-to-players.ts
 */

import mongoose from 'mongoose';
import { PlayerModel } from '../src/database/models/player.model';
import { connectMongo } from '../src/lib/mongoose';

async function migrateMMR() {
    try {
        console.log('🚀 Starting MMR migration...');
        
        await connectMongo();
        console.log('✅ Connected to MongoDB');

        // Find all players without MMR field
        const playersWithoutMMR = await PlayerModel.find({
            $or: [
                { 'stats.mmr': { $exists: false } },
                { 'stats.mmr': null }
            ]
        });

        console.log(`📊 Found ${playersWithoutMMR.length} players without MMR`);

        if (playersWithoutMMR.length === 0) {
            console.log('✅ All players already have MMR field');
            process.exit(0);
        }

        // Update each player
        let updated = 0;
        let errors = 0;

        for (const player of playersWithoutMMR) {
            try {
                // Initialize MMR to 800 (base rating)
                if (!player.stats) {
                    player.stats = {
                        tournamentsPlayed: 0,
                        matchesPlayed: 0,
                        legsWon: 0,
                        legsLost: 0,
                        oneEightiesCount: 0,
                        highestCheckout: 0,
                        avg: 0,
                        averagePosition: 0,
                        bestPosition: 999,
                        totalMatchesWon: 0,
                        totalMatchesLost: 0,
                        totalLegsWon: 0,
                        totalLegsLost: 0,
                        total180s: 0,
                        mmr: 800
                    };
                } else {
                    player.stats.mmr = 800;
                }

                await player.save();
                updated++;
                
                if (updated % 10 === 0) {
                    console.log(`⏳ Progress: ${updated}/${playersWithoutMMR.length} players updated`);
                }
            } catch (error) {
                console.error(`❌ Error updating player ${player._id}:`, error);
                errors++;
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`✅ Successfully updated: ${updated} players`);
        console.log(`❌ Errors: ${errors} players`);
        console.log(`📊 Total processed: ${playersWithoutMMR.length} players`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateMMR();
