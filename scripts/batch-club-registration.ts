import dotenv from 'dotenv';
dotenv.config();

import { connectMongo } from '../src/lib/mongoose';
import { ClubModel } from '../src/database/models/club.model';
import { UserModel } from '../src/database/models/user.model';
import { LeagueModel } from '../src/database/models/league.model';
import { MailerService } from '../src/database/services/mailer.service';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

const ENABLE_EMAILS = true
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu';

function generateRandomPassword(length = 10) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let retVal = '';
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

function normalizeName(name: string): string {
    return name.toLowerCase()
        .replace(/sportegyesület|sport egyesület|egyesület|se\.|se|darts|club|klub|dc/g, '')
        .replace(/[^a-z0-9áéíóöőúüű]/g, '')
        .trim();
}

async function run() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: npx tsx scripts/batch-club-registration.ts <path-to-file>');
        process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    try {
        await connectMongo();
        console.log('Connected to MongoDB');

        // Parse file using xlsx
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Identify columns (assuming first row might be header)
        let startIndex = 0;
        if (data.length > 0) {
            const firstRow = data[0].map((cell: any) => String(cell).toLowerCase());
            if (firstRow.includes('egyesület') || firstRow.includes('email') || firstRow.includes('e-mail')) {
                startIndex = 1;
                console.log('Detected header row.');
            }
        }

        const processedClubs = new Set<string>();

        for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 2) continue;

            const clubName = String(row[0]).trim();
            const email = String(row[1]).trim().toLowerCase();

            if (!clubName || !email || !email.includes('@')) {
                console.log(`Skipping invalid row [${i}]: ${clubName}, ${email}`);
                continue;
            }

            if (processedClubs.has(clubName)) {
                console.log(`Skipping duplicate club in list: ${clubName}`);
                continue;
            }
            processedClubs.add(clubName);

            console.log(`\n--- [${i + 1}/${data.length}] Processing: ${clubName} (${email}) ---`);

            // 1. Search for existing club
            const normalizedInput = normalizeName(clubName);
            let club = await ClubModel.findOne({ name: { $regex: new RegExp(`^${clubName}$`, 'i') } });
            
            if (!club && normalizedInput.length > 3) {
                // Try fuzzy match with normalized name
                const allClubs = await ClubModel.find({ isActive: true });
                club = allClubs.find(c => normalizeName(c.name) === normalizedInput) || null;
                if (club) console.log(`Fuzzy match found: ${club.name} for ${clubName}`);
            }
            if (club) {
                console.log(`Found existing club: ${club.name}`);
                
                // Verify club
                if (!club.verified) {
                    club.verified = true;
                    await club.save();
                    console.log('Club verified.');
                }

                // Add OAC League if not exists
                await ensureOACLeague(club);

                // Send Email if enabled
                if (ENABLE_EMAILS) {
                    try {
                        await MailerService.sendClubVerificationEmail(email, {
                            clubName: club.name,
                            clubUrl: `${BASE_URL}/myclub`
                        });
                        console.log('Verification email sent.');
                    } catch (emailError) {
                        console.error(`Failed to send verification email to ${email}:`, emailError);
                        // Don't crash the whole script
                    }
                } else {
                    console.log('Email sending disabled (test mode).');
                }
            } else {
                console.log(`Club not found. Creating new account and club...`);

                // 2. Create User
                const password = generateRandomPassword();
                const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);
                
                let user = await UserModel.findOne({ email });
                if (!user) {
                    user = await UserModel.create({
                        email,
                        name: clubName,
                        username,
                        password, // Plan to use raw password here, UserModel should hash it on save if implemented
                        isVerified: true
                    });
                    console.log(`User created: ${email}`);
                } else {
                    console.log(`User already exists with email: ${email}. Using existing user as admin.`);
                }

                // 3. Create Club
                club = await ClubModel.create({
                    name: clubName,
                    description: `Hivatalos klub: ${clubName}`,
                    location: 'Magyarország',
                    contact: { email },
                    admin: [user._id],
                    verified: true,
                    isActive: true
                });
                console.log(`Club created: ${clubName}`);

                // 4. Create OAC League
                await ensureOACLeague(club, user._id);

                // 5. Send Email if enabled
                if (ENABLE_EMAILS) {
                    try {
                        await MailerService.sendClubRegistrationEmail(email, {
                            clubName: clubName,
                            password: password,
                            loginUrl: `${BASE_URL}/auth/login`,
                            clubUrl: `${BASE_URL}/myclub`,
                            profileUrl: `${BASE_URL}/profile`,
                            howItWorksUrl: `${BASE_URL}/how-it-works`
                        });
                        console.log('Registration email sent.');
                    } catch (emailError) {
                        console.error(`Failed to send registration email to ${email}:`, emailError);
                        console.log(`PASSWORD for ${email}: ${password}`);
                        // Don't crash the whole script
                    }
                } else {
                    console.log(`Email sending disabled (test mode). User password: ${password}`);
                }
            }
        }

        console.log('\nBatch processing completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during processing:', error);
        process.exit(1);
    }
}

async function ensureOACLeague(club: any, creatorId?: any) {
    const oacLeagueName = club.name.split(' ')[0] + ' ' + club.name.split(' ')[1] + ' OAC 2026'; // Customize as needed
    
    // Check if league exists for this club
    const existingLeague = await LeagueModel.findOne({ club: club._id, name: oacLeagueName });
    
    if (!existingLeague) {
        const adminId = creatorId || (club.admin && club.admin[0]);
        if (!adminId) {
            console.error(`Cannot create league for club ${club.name}: No admin found.`);
            return;
        }

        await LeagueModel.create({
            name: oacLeagueName,
            description: 'Hivatalos 2026 OAC Liga.',
            club: club._id,
            createdBy: adminId,
            verified: true,
            isActive: true,
            pointSystemType: 'remiz_christmas'
        });
        console.log(`OAC League created for club: ${club.name}`);
    } else {
        console.log(`OAC League already exists for club: ${club.name}`);
    }
}

run();
