import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function debugUsers() {
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('All users:');
    const users = await db.collection('users').find({}).limit(5).toArray();
    users.forEach(user => {
      console.log('User:', {
        _id: user._id,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    });
    
    console.log('\nAll enrollments:');
    const enrollments = await db.collection('problemSetEnrollments').find({}).toArray();
    enrollments.forEach(enrollment => {
      console.log('Enrollment:', {
        id: enrollment.id,
        userId: enrollment.userId,
        problemSetId: enrollment.problemSetId
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugUsers();