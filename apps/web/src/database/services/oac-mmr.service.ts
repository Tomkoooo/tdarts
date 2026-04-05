import { TournamentHistory } from "@/interface/player.interface";

/**
 * OAC MMR (National Matchmaking Rating) Service
 *
 * K-factor ELO model where placement is the primary driver and
 * performance (avg vs self / vs field / first-nine) is a secondary modifier.
 *
 * Formula:
 *   MMR_Change = PlacementDelta + PerformanceBonus + SpecialBonus
 *
 * PlacementDelta  = K * (ActualScore - ExpectedScore)
 *   ActualScore   = percentile finish  (winner = 1, last = 0)
 *   ExpectedScore = 0.5  (mid-field baseline)
 *
 * PerformanceBonus (clamped +-8):
 *   vs self   = clamp((playerAvg - verifiedAvg) * 0.5, -5, +5)
 *   vs field  = clamp((playerAvg - tournamentAvg) * 0.3, -3, +3)
 *   first-nine = clamp((firstNineAvg - 55) * 0.15, -2, +2)
 *
 * SpecialBonus (clamped +5):
 *   180s           +1.5 each
 *   checkout 100+  +2
 *   checkout 150+  +3
 *
 * Total clamped to +-25 per tournament.
 */
export class OacMmrService {
    public static readonly BASE_OAC_MMR = 800;

    private static readonly K_FACTOR = 20;
    private static readonly EXPECTED_SCORE = 0.5;

    private static readonly SELF_AVG_WEIGHT = 0.5;
    private static readonly SELF_AVG_CLAMP = 5;
    private static readonly FIELD_AVG_WEIGHT = 0.3;
    private static readonly FIELD_AVG_CLAMP = 3;
    private static readonly FIRST_NINE_WEIGHT = 0.15;
    private static readonly FIRST_NINE_BASELINE = 55;
    private static readonly FIRST_NINE_CLAMP = 2;
    private static readonly PERFORMANCE_TOTAL_CLAMP = 8;

    private static readonly BONUS_PER_180 = 1.5;
    private static readonly BONUS_CHECKOUT_100 = 2;
    private static readonly BONUS_CHECKOUT_150 = 3;
    private static readonly SPECIAL_TOTAL_CLAMP = 5;

    private static readonly MAX_DELTA_PER_TOURNAMENT = 25;

    private static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    static calculateVerifiedAverage(history: TournamentHistory[]): number {
        const verifiedEntries = history.filter(h => h.verified && h.stats?.average > 0);
        if (verifiedEntries.length === 0) return 0;

        const sum = verifiedEntries.reduce((acc, entry) => acc + entry.stats.average, 0);
        return sum / verifiedEntries.length;
    }

    static calculateMMRChange(params: {
        currentOacMmr: number;
        placement: number;
        totalParticipants: number;
        currentAverage: number;
        verifiedAverage: number;
        tournamentAverage?: number;
        firstNineAvg?: number;
        oneEightiesCount: number;
        highestCheckout: number;
        matchesWon: number;
    }): number {
        const {
            currentOacMmr,
            placement,
            totalParticipants,
            currentAverage,
            verifiedAverage,
            tournamentAverage = 0,
            firstNineAvg = 0,
            oneEightiesCount,
            highestCheckout
        } = params;

        // 1) PLACEMENT (primary K-factor ELO component)
        const safeParticipants = Math.max(totalParticipants, 1);
        const safePlacement = this.clamp(placement, 1, safeParticipants);
        const actualScore = safeParticipants > 1
            ? 1 - (safePlacement - 1) / (safeParticipants - 1)
            : this.EXPECTED_SCORE;
        const placementDelta = this.K_FACTOR * (actualScore - this.EXPECTED_SCORE);

        // 2) PERFORMANCE (secondary soft modifier, each sub-component clamped)
        const selfPerf = verifiedAverage > 0
            ? this.clamp((currentAverage - verifiedAverage) * this.SELF_AVG_WEIGHT, -this.SELF_AVG_CLAMP, this.SELF_AVG_CLAMP)
            : 0;
        const fieldPerf = tournamentAverage > 0
            ? this.clamp((currentAverage - tournamentAverage) * this.FIELD_AVG_WEIGHT, -this.FIELD_AVG_CLAMP, this.FIELD_AVG_CLAMP)
            : 0;
        const firstNinePerf = firstNineAvg > 0
            ? this.clamp((firstNineAvg - this.FIRST_NINE_BASELINE) * this.FIRST_NINE_WEIGHT, -this.FIRST_NINE_CLAMP, this.FIRST_NINE_CLAMP)
            : 0;
        const performanceBonus = this.clamp(
            selfPerf + fieldPerf + firstNinePerf,
            -this.PERFORMANCE_TOTAL_CLAMP,
            this.PERFORMANCE_TOTAL_CLAMP
        );

        // 3) SPECIAL BONUSES (small recognition, clamped)
        let specialRaw = 0;
        specialRaw += oneEightiesCount * this.BONUS_PER_180;
        if (highestCheckout >= 150 && highestCheckout <= 170) {
            specialRaw += this.BONUS_CHECKOUT_150;
        } else if (highestCheckout >= 100 && highestCheckout < 150) {
            specialRaw += this.BONUS_CHECKOUT_100;
        }
        const specialBonus = Math.min(specialRaw, this.SPECIAL_TOTAL_CLAMP);

        // 4) TOTAL (clamped per tournament)
        const rawChange = placementDelta + performanceBonus + specialBonus;
        const totalChange = this.clamp(rawChange, -this.MAX_DELTA_PER_TOURNAMENT, this.MAX_DELTA_PER_TOURNAMENT);

        console.log(`OAC MMR Calc [${currentOacMmr}]:
            Placement: actual=${actualScore.toFixed(3)}, K*(a-e)=${placementDelta.toFixed(2)}
            Performance: self=${selfPerf.toFixed(2)}, field=${fieldPerf.toFixed(2)}, f9=${firstNinePerf.toFixed(2)} => ${performanceBonus.toFixed(2)}
            Special: ${specialBonus.toFixed(1)}
            Raw: ${rawChange.toFixed(2)}, Clamped: ${totalChange.toFixed(2)}
        `);

        return Math.max(0, Math.round(currentOacMmr + totalChange));
    }
}
