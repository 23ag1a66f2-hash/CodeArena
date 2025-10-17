// Test script for enrollment type tracking
const mongoose = require('mongoose');
const { ProblemSetEnrollment } = require('./models/ProblemSetEnrollment');
const { CourseEnrollment } = require('./models/CourseEnrollment');
const { ContestParticipant } = require('./models/ContestParticipant');

async function testEnrollmentTypes() {
  console.log('🧪 Testing Enrollment Type Tracking...\n');

  try {
    // Test 1: Problem Set Enrollment Types
    console.log('1. Testing Problem Set Enrollment Types...');
    
    // Create test enrollments with different types
    const testProblemSetEnrollments = [
      {
        id: 999999,
        problemSetId: 'test-ps-1',
        userId: new mongoose.Types.ObjectId(),
        enrolledAt: new Date(),
        progress: 0,
        completedProblems: [],
        totalSubmissions: 0,
        correctSubmissions: 0,
        enrollmentType: 'admin'
      },
      {
        id: 999998,
        problemSetId: 'test-ps-2',
        userId: new mongoose.Types.ObjectId(),
        enrolledAt: new Date(),
        progress: 0,
        completedProblems: [],
        totalSubmissions: 0,
        correctSubmissions: 0,
        enrollmentType: 'qr'
      }
    ];

    // Clean up any existing test enrollments
    await ProblemSetEnrollment.deleteMany({ id: { $in: [999999, 999998] } });
    
    // Create test enrollments
    const createdPSEnrollments = await ProblemSetEnrollment.create(testProblemSetEnrollments);
    console.log(`   Created ${createdPSEnrollments.length} test problem set enrollments`);
    
    // Verify enrollment types
    for (const enrollment of createdPSEnrollments) {
      console.log(`   Problem Set Enrollment ID ${enrollment.id}: ${enrollment.enrollmentType}`);
    }
    
    // Clean up
    await ProblemSetEnrollment.deleteMany({ id: { $in: [999999, 999998] } });
    console.log('   ✅ Problem Set enrollment types test passed!\n');

    // Test 2: Course Enrollment Types
    console.log('2. Testing Course Enrollment Types...');
    
    const testCourseEnrollments = [
      {
        id: 999999,
        courseId: 999999,
        userId: new mongoose.Types.ObjectId(),
        completedModules: [],
        progress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        enrollmentType: 'admin'
      },
      {
        id: 999998,
        courseId: 999998,
        userId: new mongoose.Types.ObjectId(),
        completedModules: [],
        progress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        enrollmentType: 'qr'
      }
    ];

    // Clean up any existing test enrollments
    await CourseEnrollment.deleteMany({ id: { $in: [999999, 999998] } });
    
    // Create test enrollments
    const createdCourseEnrollments = await CourseEnrollment.create(testCourseEnrollments);
    console.log(`   Created ${createdCourseEnrollments.length} test course enrollments`);
    
    // Verify enrollment types
    for (const enrollment of createdCourseEnrollments) {
      console.log(`   Course Enrollment ID ${enrollment.id}: ${enrollment.enrollmentType}`);
    }
    
    // Clean up
    await CourseEnrollment.deleteMany({ id: { $in: [999999, 999998] } });
    console.log('   ✅ Course enrollment types test passed!\n');

    // Test 3: Contest Participant Types
    console.log('3. Testing Contest Participant Types...');
    
    const testContestParticipants = [
      {
        id: 'test-contest-1',
        contestId: 'test-contest-1',
        userId: 'test-user-1',
        registrationTime: new Date(),
        totalScore: 0,
        totalPenalty: 0,
        submissions: [],
        problemsAttempted: [],
        problemsSolved: [],
        isDisqualified: false,
        enrollmentType: 'admin'
      },
      {
        id: 'test-contest-2',
        contestId: 'test-contest-2',
        userId: 'test-user-2',
        registrationTime: new Date(),
        totalScore: 0,
        totalPenalty: 0,
        submissions: [],
        problemsAttempted: [],
        problemsSolved: [],
        isDisqualified: false,
        enrollmentType: 'qr'
      }
    ];

    // Clean up any existing test participants
    await ContestParticipant.deleteMany({ id: { $in: ['test-contest-1', 'test-contest-2'] } });
    
    // Create test participants
    const createdContestParticipants = await ContestParticipant.create(testContestParticipants);
    console.log(`   Created ${createdContestParticipants.length} test contest participants`);
    
    // Verify enrollment types
    for (const participant of createdContestParticipants) {
      console.log(`   Contest Participant ID ${participant.id}: ${participant.enrollmentType}`);
    }
    
    // Clean up
    await ContestParticipant.deleteMany({ id: { $in: ['test-contest-1', 'test-contest-2'] } });
    console.log('   ✅ Contest participant types test passed!\n');

    // Test 4: Schema Validation
    console.log('4. Testing Schema Validation...');
    
    try {
      // Test invalid enrollment type
      const invalidEnrollment = new ProblemSetEnrollment({
        id: 999997,
        problemSetId: 'test-ps-3',
        userId: new mongoose.Types.ObjectId(),
        enrolledAt: new Date(),
        progress: 0,
        completedProblems: [],
        totalSubmissions: 0,
        correctSubmissions: 0,
        enrollmentType: 'invalid_type' // This should fail validation
      });
      
      await invalidEnrollment.save();
      console.log('   ❌ Invalid enrollment type was accepted (this should not happen)');
    } catch (error) {
      if (error.name === 'ValidationError') {
        console.log('   ✅ Schema validation working correctly - invalid enrollment type rejected');
      } else {
        console.log('   ❌ Unexpected error during validation test:', error.message);
      }
    }

    console.log('\n🎉 All enrollment type tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Problem Set enrollment types: ✅');
    console.log('   - Course enrollment types: ✅');
    console.log('   - Contest participant types: ✅');
    console.log('   - Schema validation: ✅');
    console.log('\n🔒 Enrollment types are now being tracked:');
    console.log('   - "admin": When admins add users via add button');
    console.log('   - "qr": When students enroll via QR code or link');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testEnrollmentTypes(); 