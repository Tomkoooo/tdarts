#!/usr/bin/env node

const { MongoClient } = require('mongodb');

// Configuration - update these with your actual database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tdarts_v2';

async function fixDatabaseIndexes() {
  let client;
  
  try {
    console.log('🔧 Fixing database indexes...');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const tournamentsCollection = db.collection('tournaments');
    
    // List all indexes
    console.log('📋 Current indexes on tournaments collection:');
    const indexes = await tournamentsCollection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Check if the problematic code_1 index exists
    const codeIndex = indexes.find(index => index.name === 'code_1');
    
    if (codeIndex) {
      console.log('⚠️  Found problematic code_1 index, attempting to drop it...');
      
      try {
        await tournamentsCollection.dropIndex('code_1');
        console.log('✅ Successfully dropped code_1 index');
      } catch (error) {
        console.log('❌ Failed to drop code_1 index:', error.message);
        console.log('💡 You may need to drop it manually from MongoDB Compass or mongo shell');
      }
    } else {
      console.log('✅ No problematic code_1 index found');
    }
    
    // Check for any other problematic indexes
    const problematicIndexes = indexes.filter(index => 
      index.name.includes('code') || 
      index.name.includes('null') ||
      (index.key && Object.keys(index.key).some(key => key === 'code'))
    );
    
    if (problematicIndexes.length > 0) {
      console.log('⚠️  Found other potentially problematic indexes:');
      problematicIndexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      
      // Try to drop them
      for (const index of problematicIndexes) {
        if (index.name !== 'code_1') { // Already handled above
          try {
            await tournamentsCollection.dropIndex(index.name);
            console.log(`✅ Successfully dropped ${index.name} index`);
          } catch (error) {
            console.log(`❌ Failed to drop ${index.name} index:`, error.message);
          }
        }
      }
    }
    
    // Verify tournamentId index exists
    const tournamentIdIndex = indexes.find(index => index.name === 'tournamentId_1');
    if (!tournamentIdIndex) {
      console.log('⚠️  No tournamentId_1 index found, creating it...');
      try {
        await tournamentsCollection.createIndex({ tournamentId: 1 }, { unique: true });
        console.log('✅ Created tournamentId_1 index');
      } catch (error) {
        console.log('❌ Failed to create tournamentId_1 index:', error.message);
      }
    } else {
      console.log('✅ tournamentId_1 index already exists');
    }
    
    // List final indexes
    console.log('\n📋 Final indexes on tournaments collection:');
    const finalIndexes = await tournamentsCollection.indexes();
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 Database index fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing database indexes:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the fix
fixDatabaseIndexes(); 