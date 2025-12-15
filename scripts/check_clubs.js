
const { connectMongo } = require('../src/lib/mongoose.ts');
const { ClubModel } = require('../src/database/models/club.model.ts');

async function checkVerifiedClubs() {
    try {
        await connectMongo();
        const clubs = await ClubModel.find({ verified: true }).select('name verified isActive');
        console.log('Verified Clubs Found:', clubs);
        
        const allClubs = await ClubModel.find({}).select('name verified isActive');
        console.log('Total Clubs:', allClubs.length);
        console.log('All Clubs:', allClubs.map(c => `${c.name} (verified: ${c.verified})`));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkVerifiedClubs();
