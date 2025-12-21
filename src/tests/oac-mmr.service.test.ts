import { OacMmrService } from '../database/services/oac-mmr.service';

describe('OacMmrService', () => {
    describe('calculateVerifiedAverage', () => {
        it('should return 0 for empty history', () => {
            expect(OacMmrService.calculateVerifiedAverage([])).toBe(0);
        });

        it('should return 0 if no verified entries', () => {
            const history: any[] = [
                { verified: false, stats: { average: 50 } },
                { verified: false, stats: { average: 60 } }
            ];
            expect(OacMmrService.calculateVerifiedAverage(history)).toBe(0);
        });

        it('should calculate average of verified entries only', () => {
            const history: any[] = [
                { verified: true, stats: { average: 40 } },
                { verified: false, stats: { average: 100 } },
                { verified: true, stats: { average: 60 } }
            ];
            // (40 + 60) / 2 = 50
            expect(OacMmrService.calculateVerifiedAverage(history)).toBe(50);
        });
    });

    describe('calculateMMRChange', () => {
        const baseParams = {
            currentOacMmr: 800,
            totalParticipants: 16,
            currentAverage: 50,
            oneEightiesCount: 0,
            highestCheckout: 0,
            matchesWon: 2
        };

        it('should give 0 performance delta for new players but still award placement/bonuses', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 1, // Winner
                verifiedAverage: 0
            });
            // Performance: 0 (new player)
            // Placement: (8 - 1)*2 = 14
            // Total: 800 + 14 = 814
            expect(change).toBe(814);
        });

        it('should return current MMR (0 change) if 0 matches won', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 16,
                matchesWon: 0,
                verifiedAverage: 50
            });
            expect(change).toBe(800);
        });

        it('should increase MMR if playing above verified average', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 40 // Playing 10 points above avg
            });
            // Performance: (50-40)*2.5 = 25
            // Placement: 0
            // Total: 800 + 25 = 825
            expect(change).toBe(825);
        });

        it('should decrease MMR if playing below verified average', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 60 // Playing 10 points below avg
            });
            // Performance: (50-60)*2.5 = -25
            // Placement: 0
            // Total: 800 - 25 = 775
            expect(change).toBe(775);
        });

        it('should reward high placement', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 1, // Winner
                verifiedAverage: 50
            });
            // Performance: 0
            // Placement: (8 - 1)*2 = 14
            // Total: 800 + 14 = 814
            expect(change).toBe(814);
        });

        it('should penalize low placement', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 16, // Last
                verifiedAverage: 50
            });
            // Performance: 0
            // Placement: (8 - 16)*2 = -16
            // Total: 800 - 16 = 784
            expect(change).toBe(784);
        });

        it('should add bonuses for 180s and high checkouts', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                oneEightiesCount: 2, // 2 * 5 = 10
                highestCheckout: 120 // +5
            });
            // Performance: 0
            // Placement: 0
            // Bonuses: 10 + 5 = 15
            // Total: 800 + 15 = 815
            expect(change).toBe(815);
        });

        it('should add max bonus for ultra high checkout', () => {
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                oneEightiesCount: 0,
                highestCheckout: 160 // +15
            });
            expect(change).toBe(815);
        });

        it('should combine all factors', () => {
            const change = OacMmrService.calculateMMRChange({
                currentOacMmr: 1000,
                placement: 2,
                totalParticipants: 32,
                currentAverage: 65,
                verifiedAverage: 60,
                oneEightiesCount: 1,
                highestCheckout: 155,
                matchesWon: 5
            });
            // Performance: (65-60)*2.5 = 12.5
            // Placement: (32/2 - 2)*2 = (16-2)*2 = 28
            // Bonuses: 1*5 + 15 = 20
            // Total Change: 12.5 + 28 + 20 = 60.5
            // New MMR: 1000 + 60.5 = 1060.5 -> round to 1061
            expect(change).toBe(1061);
        });
    });
});
