import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { EnhancedToaster } from "@/components/ui/enhanced-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { MaintenanceModeProvider } from "@/contexts/MaintenanceModeContext";
import { GlobalMaintenanceEnforcer } from "@/components/GlobalMaintenanceEnforcer";
import { useEffect, useState } from 'react';
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Problems from "@/pages/problems";
import ProblemDetail from "@/pages/problem-detail";
import Contests from "@/pages/contests";
import Leaderboard from "@/pages/leaderboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminVersionHistory from "@/pages/AdminVersionHistory";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import AuthCallback from '@/pages/auth/AuthCallback';
import { useLocation } from 'wouter';
import { config } from '@/config';
import Courses from "@/pages/Courses";
import CourseModuleViewer from "@/pages/CourseModuleViewer";
import Assignments from "@/pages/Assignments";
import AssignmentSubmission from "@/pages/AssignmentSubmission";
import AdminAssignments from "@/pages/AdminAssignments";
import CreateAssignment from "@/pages/CreateAssignment";
import AdminProblems from "@/pages/admin/problems";
import AdminContests from "@/pages/admin/contests";
import AdminCourses from "@/pages/admin/courses";
import AdminLeaderboard from "@/pages/admin/leaderboard";
import { useAuth } from "@/hooks/useAuth";
import CourseDetail from "@/pages/admin/CourseDetail";
import EditCourse from "@/pages/admin/EditCourse";
import CreateModule from "@/pages/admin/CreateModule";
import ModuleDetail from "@/pages/admin/ModuleDetail";
import EditModule from "@/pages/admin/EditModule";
import { CourseWizard } from "@/components/courses/CourseWizard";
import EnrollmentPage from "@/pages/EnrollmentPage";
import ProblemSetEnrollmentPage from "@/pages/ProblemSetEnrollmentPage";
import ContestEnrollmentPage from "@/pages/ContestEnrollmentPage";
import AddStudentToCourse from "@/pages/admin/AddStudentToCourse";
import ManageCourseEnrollments from "@/pages/admin/ManageCourseEnrollments";
import { ProblemAnalytics } from "@/pages/ProblemAnalytics";
import { UserProblemAnalytics } from "@/pages/UserProblemAnalytics";
import { AssignmentAnalytics } from "@/pages/AssignmentAnalytics";
import AssignmentSubmissions from "@/pages/AssignmentSubmissions";
import { UserAssignmentAnalytics } from "@/pages/UserAssignmentAnalytics";
import { CourseAnalytics } from "@/pages/CourseAnalytics";
import ProblemSets from "@/pages/ProblemSets";
import ProblemSetDetail from "@/pages/ProblemSetDetail";
import ProblemInstanceManagement from "@/pages/admin/ProblemInstanceManagement";
import ProblemSetManagement from "@/pages/admin/ProblemSetManagement";
import AdminProblemSetDetail from "@/pages/admin/ProblemSetDetail";
import AddStudentToProblemSet from "@/pages/admin/AddStudentToProblemSet";

import AdminUsers from "@/pages/admin/AdminUsers";
import StudentCourseView from "@/pages/StudentCourseView";
import ContestManagement from "@/pages/ContestManagement";
import ContestDetailsPage from "@/pages/contest-details";
import ContestProblemsPage from "@/pages/contest-problems";
import ContestLeaderboardPage from "@/pages/contest-leaderboard";
import ContestResultsPage from "@/pages/contest-results";

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Public route wrapper
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (isAuthenticated) {
      return <Redirect to="/dashboard" />;
    }
    return <>{children}</>;
  };

  // Admin route wrapper
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated || user?.role !== 'admin') {
      return <Redirect to="/dashboard" />;
    }
    return <>{children}</>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/auth-callback">
        <AuthCallback />
      </Route>
      <Route path="/login">
        <PublicRoute><LoginPage /></PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute><RegisterPage /></PublicRoute>
      </Route>
      <Route path="/forgot-password">
        <ForgotPassword />
      </Route>
      <Route path="/reset-password">
        <PublicRoute><ResetPassword /></PublicRoute>
      </Route>
      <Route path="/enroll/:courseId">
        <EnrollmentPage />
      </Route>
      <Route path="/enroll-problem-set/:problemSetId">
        <ProblemSetEnrollmentPage />
      </Route>
      <Route path="/contest-enrollment/:contestId">
        <ContestEnrollmentPage />
      </Route>
      <Route path="/">
        <PublicRoute><Landing /></PublicRoute>
      </Route>

      {/* Full-screen routes without sidebar */}
      {isAuthenticated && (
        <>
          <Route path="/problems/:id">
            <ProblemDetail />
          </Route>
          <Route path="/courses/:courseId/modules/:moduleId">
            <CourseModuleViewer />
          </Route>
          <Route path="/contests/:contestId/problems/:problemId">
            <ContestProblemsPage />
          </Route>
          <Route path="/contests/:contestId/problems">
            <ContestProblemsPage />
          </Route>
        </>
      )}

      {/* Protected routes wrapped in Layout */}
      {isAuthenticated ? (
        <Layout>
          <Switch>
            <Route path="/" component={() => <Redirect to="/dashboard" />} />
            <Route path="/dashboard">
              <Dashboard />
            </Route>
            <Route path="/assignments">
              <ProblemSets />
            </Route>
            <Route path="/problem-sets/:id">
              <ProblemSetDetail />
            </Route>
            <Route path="/contests">
              {user?.role === 'admin' ? <AdminContests /> : <Contests />}
            </Route>
            <Route path="/contests/:contestId">
              <ContestDetailsPage />
            </Route>
            <Route path="/contests/:contestId/details">
              <ContestDetailsPage />
            </Route>
            <Route path="/contests/:contestId/leaderboard">
              <ContestLeaderboardPage />
            </Route>
            <Route path="/contests/:contestId/results">
              <ContestResultsPage />
            </Route>
            <Route path="/courses">
              {user?.role === 'admin' ? <AdminCourses /> : <Courses />}
            </Route>
            <Route path="/courses/:courseId">
              {user?.role === 'admin' ? (
                <AdminRoute>
                  <CourseDetail />
                </AdminRoute>
              ) : (
                <StudentCourseView />
              )}
            </Route>

            <Route path="/assignments/:id">
              <AssignmentSubmission />
            </Route>
            <Route path="/admin/assignments">
              <AdminRoute>
                <AdminAssignments />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/create">
              <AdminRoute>
                <CreateAssignment />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/:id/edit">
              <AdminRoute>
                <CreateAssignment />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/:assignmentId/analytics">
              <AdminRoute>
                <AssignmentAnalytics />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/:assignmentId/submissions">
              <AdminRoute>
                <AssignmentSubmissions />
              </AdminRoute>
            </Route>
            <Route path="/leaderboard">
              {user?.role === 'admin' ? <AdminLeaderboard /> : <Leaderboard />}
            </Route>
            <Route path="/admin/courses">
              <AdminRoute>
                <AdminCourses />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/wizard">
              <AdminRoute>
                <CourseWizard />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/:courseId">
              <AdminRoute>
                <CourseDetail />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/:courseId/edit">
              <AdminRoute>
                <EditCourse />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/:courseId/modules/create">
              <AdminRoute>
                <CreateModule />
              </AdminRoute>
            </Route>
            <Route path="/admin/modules/:moduleId">
              <AdminRoute>
                <ModuleDetail />
              </AdminRoute>
            </Route>
            <Route path="/admin/modules/:moduleId/edit">
              <AdminRoute>
                <EditModule />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/:courseId/enrollments/create">
              <AdminRoute>
                <AddStudentToCourse />
              </AdminRoute>
            </Route>
            <Route path="/admin/courses/:courseId/enrollments">
              <AdminRoute>
                <ManageCourseEnrollments />
              </AdminRoute>
            </Route>
            <Route path="/admin/problems">
              <AdminRoute>
                <AdminProblems />
              </AdminRoute>
            </Route>
            <Route path="/admin/problems/:problemId/analytics">
              <AdminRoute>
                <ProblemAnalytics />
              </AdminRoute>
            </Route>
            <Route path="/admin/problems/:problemId/users/:userId/analytics">
              <AdminRoute>
                <UserProblemAnalytics />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/:assignmentId/analytics">
              <AdminRoute>
                <AssignmentAnalytics />
              </AdminRoute>
            </Route>
            <Route path="/admin/assignments/:assignmentId/users/:userId/analytics">
              <AdminRoute>
                <UserAssignmentAnalytics />
              </AdminRoute>
            </Route>
            {/* <Route path="/admin/courses/:courseId/analytics">
              <AdminRoute>
                <CourseAnalytics />
              </AdminRoute>
            </Route> */}


            <Route path="/admin/problem-sets">
              <AdminRoute>
                <ProblemSetManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/problem-sets/:problemSetId">
              <AdminRoute>
                <AdminProblemSetDetail />
              </AdminRoute>
            </Route>
            <Route path="/admin/problem-sets/:problemSetId/problems">
              <AdminRoute>
                <ProblemInstanceManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/problem-sets/:problemSetId/enrollments/create">
              <AdminRoute>
                <AddStudentToProblemSet />
              </AdminRoute>
            </Route>
            <Route path="/admin/contests/:contestId/problems">
              <AdminRoute>
                <ProblemInstanceManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/users">
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            </Route>
            <Route path="/admin/contest-management">
              <AdminRoute>
                <ContestManagement />
              </AdminRoute>
            </Route>
            <Route path="/admin/version-history">
              <AdminRoute>
                <AdminVersionHistory />
              </AdminRoute>
            </Route>
            <Route path="/admin">
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </Route>
            <Route path="/profile">
              <Profile />
            </Route>
            <Route path="/settings">
              <Settings />
            </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Layout>
      ) : (
        <Redirect to="/login" />
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="codearena-ui-theme">
        <MaintenanceModeProvider>
          <GlobalMaintenanceEnforcer>
            <TooltipProvider>
              <AppContent />
              <EnhancedToaster />
            </TooltipProvider>
          </GlobalMaintenanceEnforcer>
        </MaintenanceModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;