
import { TournamentService } from '../database/services/tournament.service';

describe('MDL Knockout Generation', () => {
    // Helper to create mock players
    const createPlayer = (id: string, groupId: string, standing: number) => ({
        playerReference: id,
        groupId,
        groupStanding: standing
    });

    // Helper to create mock groups map
    const createGroupsMap = (numGroups: number, playersPerGroup: number) => {
        const groups = new Map();
        const groupIds = [];
        for (let i = 1; i <= numGroups; i++) {
            const groupId = `group${i}`;
            groupIds.push(groupId);
            const players = [];
            for (let j = 1; j <= playersPerGroup; j++) {
                players.push(createPlayer(`p${i}_${j}`, groupId, j));
            }
            groups.set(groupId, players);
        }
        return { groups, groupIds };
    };

    // Access private method via any cast
    const generateMDL = (groups: Map<any, any>, groupIds: string[], qualifiers: number) => {
        return (TournamentService as any).generateMDLKnockoutRounds(groups, groupIds, qualifiers);
    };

    // --- 2 GROUPS ---
    
    test('2 Groups, 2 Qualifiers (4-es tábla)', () => {
        const { groups, groupIds } = createGroupsMap(2, 4);
        const result = generateMDL(groups, groupIds, 2);
        const matches = result[0].matches;
        expect(matches).toHaveLength(2);
        
        // 1/1 - 2/2
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p2_2');
        // 2/1 - 1/2
        expect(matches[1].player1).toBe('p2_1'); expect(matches[1].player2).toBe('p1_2');
    });

    test('2 Groups, 3 Qualifiers (8-as tábla)', () => {
        const { groups, groupIds } = createGroupsMap(2, 4);
        const result = generateMDL(groups, groupIds, 3);
        const matches = result[0].matches;
        expect(matches).toHaveLength(4);
        
        // 1/1 - X
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBeUndefined();
        // 2/2 - 1/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p1_3');
        // 2/1 - X
        expect(matches[2].player1).toBe('p2_1'); expect(matches[2].player2).toBeUndefined();
        // 1/2 - 2/3
        expect(matches[3].player1).toBe('p1_2'); expect(matches[3].player2).toBe('p2_3');
    });

    test('2 Groups, 4 Qualifiers (8-as tábla)', () => {
        const { groups, groupIds } = createGroupsMap(2, 4);
        const result = generateMDL(groups, groupIds, 4);
        const matches = result[0].matches;
        expect(matches).toHaveLength(4);
        
        // 1/1 - 2/4
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p2_4');
        // 2/2 - 1/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p1_3');
        // 2/1 - 1/4
        expect(matches[2].player1).toBe('p2_1'); expect(matches[2].player2).toBe('p1_4');
        // 1/2 - 2/3
        expect(matches[3].player1).toBe('p1_2'); expect(matches[3].player2).toBe('p2_3');
    });

    // --- 4 GROUPS ---

    test('4 Groups, 2 Qualifiers (8-as tábla)', () => {
        const { groups, groupIds } = createGroupsMap(4, 4);
        const result = generateMDL(groups, groupIds, 2);
        const matches = result[0].matches;
        expect(matches).toHaveLength(4);
        
        // 1/1 - 2/2
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p2_2');
        // 4/1 - 3/2
        expect(matches[1].player1).toBe('p4_1'); expect(matches[1].player2).toBe('p3_2');
        // 2/1 - 1/2
        expect(matches[2].player1).toBe('p2_1'); expect(matches[2].player2).toBe('p1_2');
        // 3/1 - 4/2
        expect(matches[3].player1).toBe('p3_1'); expect(matches[3].player2).toBe('p4_2');
    });

    test('4 Groups, 3 Qualifiers (16-os tábla)', () => {
        const { groups, groupIds } = createGroupsMap(4, 4);
        const result = generateMDL(groups, groupIds, 3);
        const matches = result[0].matches;
        expect(matches).toHaveLength(8);
        
        // 1/1 - X
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBeUndefined();
        // 2/2 - 3/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p3_3');
        // 4/1 - X
        expect(matches[2].player1).toBe('p4_1'); expect(matches[2].player2).toBeUndefined();
        // 3/2 - 2/3
        expect(matches[3].player1).toBe('p3_2'); expect(matches[3].player2).toBe('p2_3');
        // 2/1 - X
        expect(matches[4].player1).toBe('p2_1'); expect(matches[4].player2).toBeUndefined();
        // 1/2 - 4/3
        expect(matches[5].player1).toBe('p1_2'); expect(matches[5].player2).toBe('p4_3');
        // 3/1 - X
        expect(matches[6].player1).toBe('p3_1'); expect(matches[6].player2).toBeUndefined();
        // 4/2 - 1/3
        expect(matches[7].player1).toBe('p4_2'); expect(matches[7].player2).toBe('p1_3');
    });

    test('4 Groups, 4 Qualifiers (16-os tábla)', () => {
        const { groups, groupIds } = createGroupsMap(4, 4);
        const result = generateMDL(groups, groupIds, 4);
        const matches = result[0].matches;
        expect(matches).toHaveLength(8);
        
        // 1/1 - 4/4
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p4_4');
        // 2/2 - 3/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p3_3');
        // 4/1 - 1/4
        expect(matches[2].player1).toBe('p4_1'); expect(matches[2].player2).toBe('p1_4');
        // 3/2 - 2/3
        expect(matches[3].player1).toBe('p3_2'); expect(matches[3].player2).toBe('p2_3');
        // 2/1 - 3/4
        expect(matches[4].player1).toBe('p2_1'); expect(matches[4].player2).toBe('p3_4');
        // 1/2 - 4/3
        expect(matches[5].player1).toBe('p1_2'); expect(matches[5].player2).toBe('p4_3');
        // 3/1 - 2/4
        expect(matches[6].player1).toBe('p3_1'); expect(matches[6].player2).toBe('p2_4');
        // 4/2 - 1/3
        expect(matches[7].player1).toBe('p4_2'); expect(matches[7].player2).toBe('p1_3');
    });

    // --- 8 GROUPS ---

    test('8 Groups, 2 Qualifiers (16-os tábla)', () => {
        const { groups, groupIds } = createGroupsMap(8, 4);
        const result = generateMDL(groups, groupIds, 2);
        const matches = result[0].matches;
        expect(matches).toHaveLength(8);
        
        // 1/1 - 2/2
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p2_2');
        // 8/1 - 7/2
        expect(matches[1].player1).toBe('p8_1'); expect(matches[1].player2).toBe('p7_2');
        // 4/1 - 3/2
        expect(matches[2].player1).toBe('p4_1'); expect(matches[2].player2).toBe('p3_2');
        // 5/1 - 6/2
        expect(matches[3].player1).toBe('p5_1'); expect(matches[3].player2).toBe('p6_2');
        // 2/1 - 1/2
        expect(matches[4].player1).toBe('p2_1'); expect(matches[4].player2).toBe('p1_2');
        // 7/1 - 8/2
        expect(matches[5].player1).toBe('p7_1'); expect(matches[5].player2).toBe('p8_2');
        // 3/1 - 4/2
        expect(matches[6].player1).toBe('p3_1'); expect(matches[6].player2).toBe('p4_2');
        // 6/1 - 5/2
        expect(matches[7].player1).toBe('p6_1'); expect(matches[7].player2).toBe('p5_2');
    });

    test('8 Groups, 3 Qualifiers (32-es tábla)', () => {
        const { groups, groupIds } = createGroupsMap(8, 4);
        const result = generateMDL(groups, groupIds, 3);
        const matches = result[0].matches;
        expect(matches).toHaveLength(16);
        
        // 1/1 - X
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBeUndefined();
        // 2/2 - 3/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p3_3');
        // 8/1 - X
        expect(matches[2].player1).toBe('p8_1'); expect(matches[2].player2).toBeUndefined();
        // 7/2 - 6/3
        expect(matches[3].player1).toBe('p7_2'); expect(matches[3].player2).toBe('p6_3');
        // 4/1 - X
        expect(matches[4].player1).toBe('p4_1'); expect(matches[4].player2).toBeUndefined();
        // 3/2 - 2/3
        expect(matches[5].player1).toBe('p3_2'); expect(matches[5].player2).toBe('p2_3');
        // 5/1 - X
        expect(matches[6].player1).toBe('p5_1'); expect(matches[6].player2).toBeUndefined();
        // 6/2 - 7/3
        expect(matches[7].player1).toBe('p6_2'); expect(matches[7].player2).toBe('p7_3');
        // 2/1 - X
        expect(matches[8].player1).toBe('p2_1'); expect(matches[8].player2).toBeUndefined();
        // 1/2 - 4/3
        expect(matches[9].player1).toBe('p1_2'); expect(matches[9].player2).toBe('p4_3');
        // 7/1 - X
        expect(matches[10].player1).toBe('p7_1'); expect(matches[10].player2).toBeUndefined();
        // 8/2 - 5/3
        expect(matches[11].player1).toBe('p8_2'); expect(matches[11].player2).toBe('p5_3');
        // 3/1 - X
        expect(matches[12].player1).toBe('p3_1'); expect(matches[12].player2).toBeUndefined();
        // 4/2 - 1/3
        expect(matches[13].player1).toBe('p4_2'); expect(matches[13].player2).toBe('p1_3');
        // 6/1 - X
        expect(matches[14].player1).toBe('p6_1'); expect(matches[14].player2).toBeUndefined();
        // 5/2 - 8/3
        expect(matches[15].player1).toBe('p5_2'); expect(matches[15].player2).toBe('p8_3');
    });

    test('8 Groups, 4 Qualifiers (32-es tábla)', () => {
        const { groups, groupIds } = createGroupsMap(8, 4);
        const result = generateMDL(groups, groupIds, 4);
        const matches = result[0].matches;
        expect(matches).toHaveLength(16);
        
        // 1/1 - 4/4
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p4_4');
        // 2/2 - 3/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p3_3');
        // 8/1 - 5/4
        expect(matches[2].player1).toBe('p8_1'); expect(matches[2].player2).toBe('p5_4');
        // 7/2 - 6/3
        expect(matches[3].player1).toBe('p7_2'); expect(matches[3].player2).toBe('p6_3');
        // 4/1 - 1/4
        expect(matches[4].player1).toBe('p4_1'); expect(matches[4].player2).toBe('p1_4');
        // 3/2 - 2/3
        expect(matches[5].player1).toBe('p3_2'); expect(matches[5].player2).toBe('p2_3');
        // 5/1 - 8/4
        expect(matches[6].player1).toBe('p5_1'); expect(matches[6].player2).toBe('p8_4');
        // 6/2 - 7/3
        expect(matches[7].player1).toBe('p6_2'); expect(matches[7].player2).toBe('p7_3');
        // 2/1 - 3/4
        expect(matches[8].player1).toBe('p2_1'); expect(matches[8].player2).toBe('p3_4');
        // 1/2 - 4/3
        expect(matches[9].player1).toBe('p1_2'); expect(matches[9].player2).toBe('p4_3');
        // 7/1 - 6/4
        expect(matches[10].player1).toBe('p7_1'); expect(matches[10].player2).toBe('p6_4');
        // 8/2 - 5/3
        expect(matches[11].player1).toBe('p8_2'); expect(matches[11].player2).toBe('p5_3');
        // 3/1 - 2/4
        expect(matches[12].player1).toBe('p3_1'); expect(matches[12].player2).toBe('p2_4');
        // 4/2 - 1/3
        expect(matches[13].player1).toBe('p4_2'); expect(matches[13].player2).toBe('p1_3');
        // 6/1 - 7/4
        expect(matches[14].player1).toBe('p6_1'); expect(matches[14].player2).toBe('p7_4');
        // 5/2 - 8/3
        expect(matches[15].player1).toBe('p5_2'); expect(matches[15].player2).toBe('p8_3');
    });

    // --- 16 GROUPS ---

    test('16 Groups, 2 Qualifiers (32-es tábla)', () => {
        const { groups, groupIds } = createGroupsMap(16, 4);
        const result = generateMDL(groups, groupIds, 2);
        const matches = result[0].matches;
        expect(matches).toHaveLength(16);
        
        // 1/1 - 2/2
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBe('p2_2');
        // 16/1 - 15/2
        expect(matches[1].player1).toBe('p16_1'); expect(matches[1].player2).toBe('p15_2');
        // 8/1 - 7/2
        expect(matches[2].player1).toBe('p8_1'); expect(matches[2].player2).toBe('p7_2');
        // 9/1 - 10/2
        expect(matches[3].player1).toBe('p9_1'); expect(matches[3].player2).toBe('p10_2');
        // 4/1 - 3/2
        expect(matches[4].player1).toBe('p4_1'); expect(matches[4].player2).toBe('p3_2');
        // 13/1 - 14/2
        expect(matches[5].player1).toBe('p13_1'); expect(matches[5].player2).toBe('p14_2');
        // 5/1 - 6/2
        expect(matches[6].player1).toBe('p5_1'); expect(matches[6].player2).toBe('p6_2');
        // 12/1 - 11/2
        expect(matches[7].player1).toBe('p12_1'); expect(matches[7].player2).toBe('p11_2');
        // 2/1 - 1/2
        expect(matches[8].player1).toBe('p2_1'); expect(matches[8].player2).toBe('p1_2');
        // 15/1 - 16/2
        expect(matches[9].player1).toBe('p15_1'); expect(matches[9].player2).toBe('p16_2');
        // 7/1 - 8/2
        expect(matches[10].player1).toBe('p7_1'); expect(matches[10].player2).toBe('p8_2');
        // 10/1 - 9/2
        expect(matches[11].player1).toBe('p10_1'); expect(matches[11].player2).toBe('p9_2');
        // 3/1 - 4/2
        expect(matches[12].player1).toBe('p3_1'); expect(matches[12].player2).toBe('p4_2');
        // 14/1 - 13/2
        expect(matches[13].player1).toBe('p14_1'); expect(matches[13].player2).toBe('p13_2');
        // 6/1 - 5/2
        expect(matches[14].player1).toBe('p6_1'); expect(matches[14].player2).toBe('p5_2');
        // 11/1 - 12/2
        expect(matches[15].player1).toBe('p11_1'); expect(matches[15].player2).toBe('p12_2');
    });

    test('16 Groups, 3 Qualifiers (64-es tábla)', () => {
        const { groups, groupIds } = createGroupsMap(16, 4);
        const result = generateMDL(groups, groupIds, 3);
        const matches = result[0].matches;
        expect(matches).toHaveLength(32);
        
        // 1/1 - X
        expect(matches[0].player1).toBe('p1_1'); expect(matches[0].player2).toBeUndefined();
        // 2/2 - 3/3
        expect(matches[1].player1).toBe('p2_2'); expect(matches[1].player2).toBe('p3_3');
        // 16/1 - X
        expect(matches[2].player1).toBe('p16_1'); expect(matches[2].player2).toBeUndefined();
        // 15/2 - 14/3
        expect(matches[3].player1).toBe('p15_2'); expect(matches[3].player2).toBe('p14_3');
        // 8/1 - X
        expect(matches[4].player1).toBe('p8_1'); expect(matches[4].player2).toBeUndefined();
        // 7/2 - 6/3
        expect(matches[5].player1).toBe('p7_2'); expect(matches[5].player2).toBe('p6_3');
        // 9/1 - X
        expect(matches[6].player1).toBe('p9_1'); expect(matches[6].player2).toBeUndefined();
        // 10/2 - 11/3
        expect(matches[7].player1).toBe('p10_2'); expect(matches[7].player2).toBe('p11_3');
        // 4/1 - X
        expect(matches[8].player1).toBe('p4_1'); expect(matches[8].player2).toBeUndefined();
        // 3/2 - 2/3
        expect(matches[9].player1).toBe('p3_2'); expect(matches[9].player2).toBe('p2_3');
        // 13/1 - X
        expect(matches[10].player1).toBe('p13_1'); expect(matches[10].player2).toBeUndefined();
        // 14/2 - 15/3
        expect(matches[11].player1).toBe('p14_2'); expect(matches[11].player2).toBe('p15_3');
        // 5/1 - X
        expect(matches[12].player1).toBe('p5_1'); expect(matches[12].player2).toBeUndefined();
        // 6/2 - 7/3
        expect(matches[13].player1).toBe('p6_2'); expect(matches[13].player2).toBe('p7_3');
        // 12/1 - X
        expect(matches[14].player1).toBe('p12_1'); expect(matches[14].player2).toBeUndefined();
        // 11/2 - 10/3
        expect(matches[15].player1).toBe('p11_2'); expect(matches[15].player2).toBe('p10_3');
        // 2/1 - X
        expect(matches[16].player1).toBe('p2_1'); expect(matches[16].player2).toBeUndefined();
        // 1/2 - 4/3
        expect(matches[17].player1).toBe('p1_2'); expect(matches[17].player2).toBe('p4_3');
        // 15/1 - X
        expect(matches[18].player1).toBe('p15_1'); expect(matches[18].player2).toBeUndefined();
        // 16/2 - 13/3
        expect(matches[19].player1).toBe('p16_2'); expect(matches[19].player2).toBe('p13_3');
        // 7/1 - X
        expect(matches[20].player1).toBe('p7_1'); expect(matches[20].player2).toBeUndefined();
        // 8/2 - 12/3
        expect(matches[21].player1).toBe('p8_2'); expect(matches[21].player2).toBe('p12_3');
        // 10/1 - X
        expect(matches[22].player1).toBe('p10_1'); expect(matches[22].player2).toBeUndefined();
        // 9/2 - 5/3
        expect(matches[23].player1).toBe('p9_2'); expect(matches[23].player2).toBe('p5_3');
        // 3/1 - X
        expect(matches[24].player1).toBe('p3_1'); expect(matches[24].player2).toBeUndefined();
        // 4/2 - 1/3
        expect(matches[25].player1).toBe('p4_2'); expect(matches[25].player2).toBe('p1_3');
        // 14/1 - X
        expect(matches[26].player1).toBe('p14_1'); expect(matches[26].player2).toBeUndefined();
        // 13/2 - 16/3
        expect(matches[27].player1).toBe('p13_2'); expect(matches[27].player2).toBe('p16_3');
        // 6/1 - X
        expect(matches[28].player1).toBe('p6_1'); expect(matches[28].player2).toBeUndefined();
        // 5/2 - 9/3
        expect(matches[29].player1).toBe('p5_2'); expect(matches[29].player2).toBe('p9_3');
        // 11/1 - X
        expect(matches[30].player1).toBe('p11_1'); expect(matches[30].player2).toBeUndefined();
        // 12/2 - 8/3
        expect(matches[31].player1).toBe('p12_2'); expect(matches[31].player2).toBe('p8_3');
    });
    
    test('Invalid Configuration throws error', () => {
        const { groups, groupIds } = createGroupsMap(3, 4); // 3 groups not supported
        expect(() => generateMDL(groups, groupIds, 2)).toThrow();
    });
});
