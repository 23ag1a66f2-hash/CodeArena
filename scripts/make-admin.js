const { MongoClient } = require('mongodb');

async function makeAdmin(email) {
  const uri = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('meritcurve');
    const users = db.collection('users');

    const result = await users.updateOne(
      { email: email },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.log('No user found with that email');
    } else if (result.modifiedCount === 0) {
      console.log('User was already an admin');
    } else {
      console.log('Successfully made user an admin');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Please provide an email address');
  process.exit(1);
}

makeAdmin(email); 