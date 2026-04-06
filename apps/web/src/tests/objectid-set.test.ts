
import mongoose from 'mongoose';

describe('ObjectId Set Behavior', () => {
    test('Set of ObjectIds should treat different instances as different', () => {
        const id1 = new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e0');
        const id2 = new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e0'); // Same value, new instance
        
        expect(id1).not.toBe(id2); // Different instances
        expect(id1.toString()).toBe(id2.toString()); // Same value
        
        const set = new Set([id1, id2]);
        // This confirms my suspicion: Set size will be 2, not 1
        expect(set.size).toBe(2);
    });
    
    test('Set of strings should treat same values as same', () => {
        const id1 = new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e0');
        const id2 = new mongoose.Types.ObjectId('5f43a1c0b7e4a7b7a8c8d8e0');
        
        const set = new Set([id1.toString(), id2.toString()]);
        expect(set.size).toBe(1);
    });
});
