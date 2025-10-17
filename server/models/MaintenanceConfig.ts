import mongoose, { Document, Schema } from 'mongoose';

export interface IMaintenanceConfig extends Document {
  isMaintenanceMode: boolean;
  maintenanceFrom: string;
  maintenanceTo: string;
  isMaintenanceActive: boolean;
  isPreMaintenanceWarning: boolean;
  lastUpdated: Date;
  updatedBy: string; // Admin user ID who made the change
}

const MaintenanceConfigSchema = new Schema<IMaintenanceConfig>({
  isMaintenanceMode: {
    type: Boolean,
    default: false,
    required: true
  },
  maintenanceFrom: {
    type: String,
    default: '',
    required: false
  },
  maintenanceTo: {
    type: String,
    default: '',
    required: false
  },
  isMaintenanceActive: {
    type: Boolean,
    default: false,
    required: true
  },
  isPreMaintenanceWarning: {
    type: Boolean,
    default: false,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one maintenance config document exists
MaintenanceConfigSchema.index({}, { unique: true });

export const MaintenanceConfig = mongoose.model<IMaintenanceConfig>('MaintenanceConfig', MaintenanceConfigSchema);
