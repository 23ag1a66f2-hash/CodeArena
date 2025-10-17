import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  googleId?: string;
  role: 'student' | 'admin';
  isEmailVerified: boolean;
  emailVerificationOTP?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
}

const userSchema = new mongoose.Schema<IUserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: [function(this: IUserDocument) {
      return !this.googleId; // Password is required only if not using Google OAuth
    }, 'Password is required for email registration'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false, // Don't include password in query results by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  profileImageUrl: String,
  googleId: String,
  role: {
    type: String,
    enum: {
      values: ['student', 'admin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'student',
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: String,
  emailVerificationExpires: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(this: IUserDocument, next: mongoose.CallbackWithoutResultAndOptionalError) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    if (!this.password) {
      return next(new Error('Password is required'));
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('[DEBUG] Error in password hashing:', error);
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) {
      throw new Error('No password set for this user');
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('[DEBUG] Error comparing passwords:', error);
    throw error;
  }
};

// Handle unique email error
userSchema.post('save', function(error: any, doc: any, next: any) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Email address is already registered'));
  } else {
    console.error('[DEBUG] Error in User model:', error);
    next(error);
  }
});

export const User = mongoose.model<IUserDocument>('User', userSchema); 