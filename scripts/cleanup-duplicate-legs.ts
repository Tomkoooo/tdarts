import dotenv from 'dotenv';
dotenv.config();
import { connectMongo } from "@/lib/mongoose";
import { MatchModel } from "@/database/models/match.model";
import { MatchService } from "@/database/services/match.service";

async function cleanupDuplicateLegs() {
    console.log("Connecting to MongoDB...");
    await connectMongo();
    console.log("Connected.");

    const matches = await MatchModel.find({ "legs.0": { $exists: true } });
    console.log(`Found ${matches.length} matches with legs. Checking for duplicates...`);

    let fixedCount = 0;

    for (const match of matches) {
        const seenLegNumbers = new Set();
        const uniqueLegs: any[] = [];
        let hasDuplicate = false;

        // Sort legs by creation time or just keep original order but filter
        // Assuming original order is chronological
        for (const leg of match.legs || []) {
            if (seenLegNumbers.has(leg.legNumber)) {
                hasDuplicate = true;
                console.log(`Duplicate leg found in match ${match._id}: Leg ${leg.legNumber}`);
            } else {
                seenLegNumbers.add(leg.legNumber);
                uniqueLegs.push(leg);
            }
        }

        if (hasDuplicate) {
            console.log(`Fixing match ${match._id}...`);
            // Update legs
            match.legs = uniqueLegs;

            // Recalculate match stats (legsWon etc will need detailed recalc which we can skip for now or emulate)
            // But we MUST update legsWon/legsLost based on the unique legs
            let p1Won = 0;
            let p2Won = 0;
            
            uniqueLegs.forEach((leg: any) => {
                if (leg.winnerId?.toString() === match.player1.playerId?.toString()) {
                    p1Won++;
                } else if (leg.winnerId?.toString() === match.player2.playerId?.toString()) {
                    p2Won++;
                }
            });

            match.player1.legsWon = p1Won;
            match.player2.legsLost = p2Won; // Reciprocal
            match.player2.legsWon = p2Won;
            match.player1.legsLost = p1Won;

            // Recalculate derived stats (averages) using the method from MatchService (implied logic)
            // Ideally we'd reuse MatchService logic but it's bound to "finishLeg".
            // We can just save, and rely on the fact that existing averages might be slightly off 
            // OR we can try to re-run the averaging logic here.
            
            // Let's implement basic averaging here for correctness
            let p1TotalScore = 0;
            let p1TotalDarts = 0;
            let p2TotalScore = 0;
            let p2TotalDarts = 0;

            const calculateLegDarts = (throws: any[], playerNum: 1 | 2, leg: any): number => {
                if (!throws || throws.length === 0) return 0;
                const storedDarts = playerNum === 1 ? leg.player1TotalDarts : leg.player2TotalDarts;
                if (storedDarts !== undefined && storedDarts !== null) return storedDarts;
                if (throws[0] && typeof throws[0] === 'object' && 'darts' in throws[0]) {
                    return throws.reduce((sum: number, t: any) => sum + (t.darts || 3), 0);
                }
                return throws.length * 3;
            };

            for (const leg of uniqueLegs) {
                 if (leg.player1Score) p1TotalScore += leg.player1Score;
                 if (leg.player1Throws) p1TotalDarts += calculateLegDarts(leg.player1Throws, 1, leg);
                 
                 if (leg.player2Score) p2TotalScore += leg.player2Score;
                 if (leg.player2Throws) p2TotalDarts += calculateLegDarts(leg.player2Throws, 2, leg);
            }

            match.player1.average = p1TotalDarts > 0 ? Math.round((p1TotalScore / p1TotalDarts) * 3 * 100) / 100 : 0;
            match.player2.average = p2TotalDarts > 0 ? Math.round((p2TotalScore / p2TotalDarts) * 3 * 100) / 100 : 0;

            await match.save();
            fixedCount++;
            console.log(`Match ${match._id} fixed.`);
        }
    }

    console.log(`Done. Fixed ${fixedCount} matches.`);
    process.exit(0);
}

cleanupDuplicateLegs().catch(console.error);
