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

        it('should award placement for new player (no verified avg)', () => {
            // Winner, no verified avg => placement only
            // actualScore = 1.0, placementDelta = 20*(1.0-0.5) = +10
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 1,
                verifiedAverage: 0
            });
            expect(change).toBe(810);
        });

        it('should penalize last place even with 0 matches won', () => {
            // placement 16/16 => actualScore=0, placementDelta = 20*(0-0.5) = -10
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 16,
                matchesWon: 0,
                verifiedAverage: 50
            });
            expect(change).toBe(790);
        });

        it('should increase MMR when playing above verified average', () => {
            // placement 8/16 => actualScore = 1 - 7/15 ≈ 0.533, placementDelta ≈ +0.67
            // selfPerf = clamp((50-40)*0.5, -5, 5) = +5
            // performanceBonus = 5
            // total ≈ 5.67 => round(800 + 5.67) = 806
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 40
            });
            expect(change).toBe(806);
        });

        it('should decrease MMR when playing below verified average', () => {
            // placement 8/16 => placementDelta ≈ +0.67
            // selfPerf = clamp((50-60)*0.5, -5, 5) = -5
            // performanceBonus = -5
            // total ≈ -4.33 => round(800 - 4.33) = 796
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 60
            });
            expect(change).toBe(796);
        });

        it('should reward first place', () => {
            // actualScore = 1.0, placementDelta = +10, no performance delta
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 1,
                verifiedAverage: 50
            });
            expect(change).toBe(810);
        });

        it('should penalize last place', () => {
            // actualScore = 0, placementDelta = -10, no performance delta
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 16,
                verifiedAverage: 50
            });
            expect(change).toBe(790);
        });

        it('should add clamped bonuses for 180s and high checkouts', () => {
            // placement 8/16 => placementDelta ≈ +0.67
            // specialRaw = 2*1.5 + 2 = 5, clamped to 5
            // total ≈ 5.67 => 806
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                oneEightiesCount: 2,
                highestCheckout: 120
            });
            expect(change).toBe(806);
        });

        it('should give smaller bonus for ultra high checkout', () => {
            // placement 8/16 => placementDelta ≈ +0.67
            // specialRaw = 3, clamped to 3
            // total ≈ 3.67 => 804
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                oneEightiesCount: 0,
                highestCheckout: 160
            });
            expect(change).toBe(804);
        });

        it('should combine all factors', () => {
            // placement 2/32 => actualScore = 1-1/31 ≈ 0.968, placementDelta = 20*0.468 ≈ +9.35
            // selfPerf = clamp((65-60)*0.5, -5, 5) = +2.5
            // performanceBonus = 2.5
            // specialRaw = 1*1.5 + 3 = 4.5, clamped to 4.5
            // total ≈ 16.35 => round(1000 + 16.35) = 1016
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
            expect(change).toBe(1016);
        });

        it('winner with bad average still gains MMR (placement dominates)', () => {
            // placement 1/16 => placementDelta = +10
            // selfPerf = clamp((35-50)*0.5, -5, 5) = -5
            // fieldPerf = clamp((35-48)*0.3, -3, 3) = -3
            // performanceBonus = clamp(-8, -8, 8) = -8
            // total = 10 - 8 = +2 => 802
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                currentAverage: 35,
                placement: 1,
                verifiedAverage: 50,
                tournamentAverage: 48
            });
            expect(change).toBe(802);
        });

        it('last place with good average still loses MMR (placement dominates)', () => {
            // placement 16/16 => placementDelta = -10
            // selfPerf = clamp((60-50)*0.5, -5, 5) = +5
            // fieldPerf = clamp((60-48)*0.3, -3, 3) = +3
            // performanceBonus = clamp(8, -8, 8) = +8
            // total = -10 + 8 = -2 => 798
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                currentAverage: 60,
                placement: 16,
                verifiedAverage: 50,
                tournamentAverage: 48
            });
            expect(change).toBe(798);
        });

        it('first-nine average provides performance bonus', () => {
            // placement 8/16 => placementDelta ≈ +0.67
            // selfPerf = 0, fieldPerf = 0
            // firstNinePerf = clamp((70-55)*0.15, -2, 2) = clamp(2.25, -2, 2) = +2
            // performanceBonus = 2
            // total ≈ 2.67 => 803
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                firstNineAvg: 70
            });
            expect(change).toBe(803);
        });

        it('poor first-nine average provides penalty', () => {
            // placement 8/16 => placementDelta ≈ +0.67
            // firstNinePerf = clamp((35-55)*0.15, -2, 2) = clamp(-3, -2, 2) = -2
            // performanceBonus = -2
            // total ≈ -1.33 => 799
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 8,
                verifiedAverage: 50,
                firstNineAvg: 35
            });
            expect(change).toBe(799);
        });

        it('total change is clamped to +-25', () => {
            // Extreme scenario: winner with everything maxed
            // placement 1/32 => actualScore=1.0, placementDelta = +10
            // selfPerf = clamp((80-40)*0.5, -5, 5) = +5
            // fieldPerf = clamp((80-45)*0.3, -3, 3) = +3
            // firstNinePerf = clamp((80-55)*0.15, -2, 2) = +2
            // performanceBonus = clamp(10, -8, 8) = +8
            // specialRaw = 5*1.5 + 3 = 10.5, clamped to 5
            // raw = 10 + 8 + 5 = 23, within +-25 clamp
            const change = OacMmrService.calculateMMRChange({
                currentOacMmr: 800,
                placement: 1,
                totalParticipants: 32,
                currentAverage: 80,
                verifiedAverage: 40,
                tournamentAverage: 45,
                firstNineAvg: 80,
                oneEightiesCount: 5,
                highestCheckout: 160,
                matchesWon: 6
            });
            expect(change).toBe(823);
        });

        it('should not go below 0 MMR', () => {
            const change = OacMmrService.calculateMMRChange({
                currentOacMmr: 5,
                placement: 16,
                totalParticipants: 16,
                currentAverage: 20,
                verifiedAverage: 50,
                tournamentAverage: 48,
                firstNineAvg: 20,
                oneEightiesCount: 0,
                highestCheckout: 0,
                matchesWon: 0
            });
            expect(change).toBe(0);
        });

        it('single participant tournament gives neutral placement', () => {
            // 1 participant: actualScore = 0.5, placementDelta = 0
            const change = OacMmrService.calculateMMRChange({
                ...baseParams,
                placement: 1,
                totalParticipants: 1,
                verifiedAverage: 50
            });
            expect(change).toBe(800);
        });
    });
});
