// Script to seed the database with sample course data
import { connectToMongoDB } from './db.ts';

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    const db = await connectToMongoDB();
    
    // Clear existing data
    await db.collection('courses').deleteMany({});
    await db.collection('coursemodules').deleteMany({});
    
    console.log('Adding sample courses...');
    
    // Insert sample courses
    const courses = [
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
    
    await db.collection('courses').insertMany(courses);
    
    // Insert sample modules for each course
    const modules = [
      // JavaScript course modules
      {
        id: 1,
        courseId: 1,
        title: "Variables and Data Types",
        content: "Learn about JavaScript variables, numbers, strings, and booleans.",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        courseId: 1,
        title: "Functions and Scope",
        content: "Understanding JavaScript functions, parameters, and variable scope.",
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // React course modules
      {
        id: 3,
        courseId: 2,
        title: "Components and JSX",
        content: "Introduction to React components and JSX syntax.",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        courseId: 2,
        title: "State and Props",
        content: "Managing component state and passing data with props.",
        order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Node.js course modules
      {
        id: 5,
        courseId: 3,
        title: "Setting up Express",
        content: "Creating your first Express.js server.",
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await db.collection('coursemodules').insertMany(modules);
    
    console.log('Database seeded successfully!');
    console.log(`Added ${courses.length} courses and ${modules.length} modules`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();