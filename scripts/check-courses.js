
const { MongoClient } = require('mongodb');

async function checkCoursesCollection() {
  const uri = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('meritcurve');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check if courses collection exists
    const coursesCollection = db.collection('courses');
    const courseCount = await coursesCollection.countDocuments();
    console.log(`Courses collection has ${courseCount} documents`);
    
    if (courseCount === 0) {
      console.log('No courses found, creating sample courses...');
      
      const sampleCourses = [
        {
          id: 1,
          title: "Introduction to JavaScript",
          description: "Learn the fundamentals of JavaScript programming",
          level: "beginner",
          tags: ["javascript", "programming", "web"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          title: "React Development",
          description: "Build modern web applications with React",
          level: "intermediate", 
          tags: ["react", "javascript", "frontend"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          title: "Node.js Backend",
          description: "Server-side development with Node.js",
          level: "intermediate",
          tags: ["nodejs", "backend", "api"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await coursesCollection.insertMany(sampleCourses);
      console.log('Sample courses created successfully!');
    } else {
      console.log('Courses already exist:');
      const courses = await coursesCollection.find({}).toArray();
      courses.forEach(course => {
        console.log(`- ${course.title} (ID: ${course.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCoursesCollection();
