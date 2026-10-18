const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (uri && uri.trim() !== '') {
      console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[Database] Connected to external MongoDB successfully.');
      return;
    }

    console.log('[Database] No MONGODB_URI specified. Initializing in-memory MongoDB server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    // Keep mongod process referenced in event loop on Windows
    if (mongod._instanceInfo?.instance?.mongodProcess) {
      mongod._instanceInfo.instance.mongodProcess.ref();
    }
    const memUri = mongod.getUri();
    
    await mongoose.connect(memUri);
    console.log(`[Database] Connected to in-memory MongoDB at: ${memUri}`);
  } catch (err) {
    console.error(`[Database Error] Failed to connect to primary MongoDB: ${err.message}`);
    // If external failed and we haven't tried in-memory yet
    if (!mongod) {
      try {
        console.log('[Database] Falling back to in-memory MongoDB for development/testing...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        await mongoose.connect(memUri);
        console.log(`[Database] Connected to fallback in-memory MongoDB at: ${memUri}`);
        return;
      } catch (innerErr) {
        console.error(`[Database Critical] In-memory fallback also failed: ${innerErr.message}`);
      }
    }
    process.exit(1);
  }
};

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
    console.log('[Database] MongoDB connection closed.');
  } catch (err) {
    console.error('[Database] Error closing MongoDB connection:', err);
  }
};

module.exports = { connectDB, closeDB };
