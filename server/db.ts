import { MongoClient, Db, ReadPreferenceMode, WriteConcern } from 'mongodb';
import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import 'dotenv/config';


// Use the || operator to provide a hardcoded fallback for the MONGODB_URL.
const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://CodeArena:raghavmail@codearena.vl1ishe.mongodb.net/?retryWrites=true&w=majority&appName=CodeArena";

// --- MODIFICATION START ---
// The original 'if' block would have thrown an error when the fallback URL was used.
// This new check ensures that EITHER the environment variable OR the hardcoded string is present.
if (!MONGODB_URL) {
  throw new Error(
    'MONGODB_URL is not set. Please define it in your .env file or hardcode it in db.ts.'
  );
}
// --- MODIFICATION END ---


// MongoDB connection options
const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '30000'),
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'),
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '50'),
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '10'),
  retryWrites: true,
  retryReads: true,
  writeConcern: {
    w: parseInt(process.env.DB_WRITE_CONCERN_W || '1'),
    wtimeout: parseInt(process.env.DB_WRITE_CONCERN_TIMEOUT || '2500')
  },
  readPreference: (process.env.DB_READ_PREFERENCE || 'primary') as ReadPreferenceMode,
  monitorCommands: process.env.DB_MONITOR_COMMANDS === 'true',
};

class DatabaseConnection extends EventEmitter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<Db> | null = null;
  private static instance: DatabaseConnection;
  private mongooseConnection: typeof mongoose | null = null;

  private constructor() {
    super();
    this.connect = this.connect.bind(this);
    this.getDb = this.getDb.bind(this);
    this.close = this.close.bind(this);
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private async waitForConnection(): Promise<void> {
    if (!this.client || !this.db) {
      throw new Error('No connection available');
    }

    let attempts = 0;
    const maxAttempts = parseInt(process.env.DB_PING_ATTEMPTS || '5');
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      try {
        // Try to ping the database
        await this.db.command({ ping: 1 });
        return; // Connection is working
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error(`Failed to verify database connection after ${maxAttempts} attempts`);
        }
        await delay(1000); // Wait 1 second before retrying
      }
    }
  }

  async connect(): Promise<Db> {
    try {
      // If we're already connecting, return the existing promise
      if (this.isConnecting && this.connectionPromise) {
        return this.connectionPromise;
      }

      // If we already have a working connection, verify and return it
      if (this.client && this.db) {
        try {
          await this.waitForConnection();
          return this.db;
        } catch (error) {
          console.log('[DB] Existing connection failed, creating new connection...');
          await this.close();
        }
      }

      this.isConnecting = true;

      // Connect using Mongoose first
      console.log('[DB] Connecting to MongoDB with Mongoose...');
      console.log('[DB] Database URL:', MONGODB_URL.replace(/\/\/[^@]*@/, '//***:***@')); // Hide credentials in logs
      console.log("Connecting to MongoDB with URL:", MONGODB_URL);
      
      await mongoose.connect(MONGODB_URL, {
        serverSelectionTimeoutMS: MONGODB_OPTIONS.serverSelectionTimeoutMS,
        socketTimeoutMS: MONGODB_OPTIONS.socketTimeoutMS,
      });

      this.mongooseConnection = mongoose;
      console.log('[DB] Mongoose connection successful');

      // Set up Mongoose connection event handlers
      mongoose.connection.on('error', (error) => {
        console.error('[DB] Mongoose connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('[DB] Mongoose disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[DB] Mongoose reconnected');
      });

      // Now connect with MongoClient for raw operations
      this.connectionPromise = new Promise(async (resolve, reject) => {
        try {
          console.log('[DB] Initializing MongoDB client connection...');

          this.client = new MongoClient(MONGODB_URL, MONGODB_OPTIONS);

          // Connect to MongoDB
          await this.client.connect();
          console.log('[DB] Connected to MongoDB server');

          // Get database instance
          this.db = this.client.db();
          console.log('[DB] Database instance created');

          // Verify the connection works
          await this.waitForConnection();
          console.log('[DB] Connection verified and ready');

          // Set up error handling
          this.client.on('error', (error) => {
            console.error('[DB] MongoDB client error:', error);
            this.handleError(error);
          });

          this.client.on('timeout', () => {
            console.error('[DB] MongoDB operation timeout');
            this.handleError(new Error('Operation timeout'));
          });

          resolve(this.db);
        } catch (error) {
          console.error('[DB] Failed to connect to MongoDB:', error);
          this.isConnecting = false;
          this.connectionPromise = null;
          reject(error);
        }
      });

      const db = await this.connectionPromise;
      this.isConnecting = false;
      return db;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      console.error('[DB] Connection error:', error);
      throw new Error(
        `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        'Please check your MONGODB_URL environment variable and ensure the database is accessible.'
      );
    }
  }

  private async handleError(error: Error): Promise<void> {
    console.error('[DB] Handling MongoDB error:', error);

    // Close the existing connection
    await this.close();

    // Reset connection state
    this.isConnecting = false;
    this.connectionPromise = null;

    // Emit error event
    this.emit('error', error);
  }

  getDb(): Db {
    if (!this.db || !this.client) {
      throw new Error(
        'Database not connected. Call connectToMongoDB() first or check your MONGODB_URL configuration.'
      );
    }
    return this.db;
  }

  async close(): Promise<void> {
    try {
      if (this.mongooseConnection) {
        await this.mongooseConnection.disconnect();
        console.log('[DB] Mongoose connection closed');
        this.mongooseConnection = null;
      }

      if (this.client) {
        await this.client.close(true); // Force close
        this.client = null;
        this.db = null;
        this.isConnecting = false;
        this.connectionPromise = null;
        console.log('[DB] MongoDB connection closed');
      }
    } catch (error) {
      console.error('[DB] Error closing MongoDB connection:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.db) {
      return { status: 'disconnected', error: 'No database connection' };
    }

    try {
      const start = Date.now();
      await this.db.command({ ping: 1 });
      const latency = Date.now() - start;
      return { status: 'connected', latency };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance functions
export const connectToMongoDB = async (): Promise<Db> => {
  return DatabaseConnection.getInstance().connect();
};

export const getDb = (): Db => {
  try {
    const connection = DatabaseConnection.getInstance();
    const db = connection.getDb();

    // Test the connection in background
    db.command({ ping: 1 }).catch(async (error) => {
      console.error('[DB] Database ping failed:', error);
      // Try to reconnect
      try {
        await connection.connect();
      } catch (reconnectError) {
        console.error('[DB] Failed to reconnect:', reconnectError);
      }
    });

    return db;
  } catch (error) {
    console.error('[DB] Error getting database connection:', error);
    throw new Error(
      'Database connection error. Please check your configuration and try again.\n' +
      'Ensure MONGODB_URL is set correctly in your environment variables.'
    );
  }
};

export const closeMongoDB = async (): Promise<void> => {
  return DatabaseConnection.getInstance().close();
};

export const dbHealthCheck = async () => {
  return DatabaseConnection.getInstance().healthCheck();
};