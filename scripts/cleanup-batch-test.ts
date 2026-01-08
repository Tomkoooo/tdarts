import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/lib/mongoose';
import { ClubModel } from '../src/database/models/club.model';
import { UserModel } from '../src/database/models/user.model';
import { LeagueModel } from '../src/database/models/league.model';

// Load env
dotenv.config();

async function run() {
    try {
        await connectMongo();
        console.log('Connected to MongoDB');

        // We want to delete clubs that were created by the script
        // They have description starting with "Hivatalos klub:"
        const clubsToDelete = await ClubModel.find({ description: /^Hivatalos klub:/ });
        console.log(`Found ${clubsToDelete.length} clubs to delete.`);

        for (const club of clubsToDelete) {
            console.log(`Deleting club: ${club.name}`);
            
            // Delete OAC Leagues for this club
            const deletedLeagues = await LeagueModel.deleteMany({ club: club._id, name: 'OAC National League 2026' });
            console.log(`  Deleted ${deletedLeagues.deletedCount} leagues.`);

            // Delete users created for this club
            // These are the admins of these clubs
            if (club.admin && club.admin.length > 0) {
                for (const adminId of club.admin) {
                    const user = await UserModel.findById(adminId);
                    if (user && user.email) {
                        // Double check this is a "script-created" user (e.g. no lastLogin, etc)
                        if (!user.lastLogin) {
                            await UserModel.findByIdAndDelete(adminId);
                            console.log(`  Deleted user: ${user.email}`);
                        }
                    }
                }
            }

            // Finally delete the club
            await ClubModel.findByIdAndDelete(club._id);
        }

        console.log('\nCleanup completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

run();
