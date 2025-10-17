import { MongoClient } from 'mongodb';

const MONGODB_URL = "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/test";

async function debugModules() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Check all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Check coursemodules collection
    const moduleCount = await db.collection('coursemodules').countDocuments();
    console.log('Total modules in coursemodules collection:', moduleCount);
    
    // Check modules for course 1749881084938
    const courseId = 1749881084938;
    const modulesForCourse = await db.collection('coursemodules').find({ courseId: courseId }).toArray();
    console.log(`Modules for course ${courseId}:`, modulesForCourse.length);
    
    if (modulesForCourse.length > 0) {
      console.log('Sample module:', JSON.stringify(modulesForCourse[0], null, 2));
    }
    
    // Check all modules regardless of courseId
    const allModules = await db.collection('coursemodules').find({}).toArray();
    console.log('All modules in collection:', allModules.length);
    if (allModules.length > 0) {
      console.log('Sample module structure:', {
        id: allModules[0].id,
        courseId: allModules[0].courseId,
        title: allModules[0].title,
        order: allModules[0].order
      });
    }
    
    // Check course data
    const course = await db.collection('courses').findOne({ id: courseId });
    console.log('Course exists:', !!course);
    if (course) {
      console.log('Course structure:', {
        id: course.id,
        title: course.title,
        moduleCount: course.modules ? course.modules.length : 'no modules field'
      });
    }
    
    // Check courses collection
    const courseCount = await db.collection('courses').countDocuments();
    console.log('Total courses:', courseCount);
    
    // List all courses with their IDs
    const allCourses = await db.collection('courses').find({}, { projection: { id: 1, title: 1 } }).toArray();
    console.log('All courses:', allCourses);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugModules();