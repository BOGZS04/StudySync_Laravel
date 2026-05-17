/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PATHS } from "./path";
import { ProtectedRoute, GuestRoute, RoleRoute } from "./guards";
import RootLayout from "./RootLayout";

// Lazy Loading
const Login = React.lazy(() => import("../pages/auth/Login"));
const Register = React.lazy(() => import("../pages/auth/Register"));
const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const Users = React.lazy(() => import("../pages/users/Users"));
const ViewUserDetail = React.lazy(() => import("../pages/users/components/ViewUserDetail"));
const StudentAssignments = React.lazy(() => import("../pages/student/Assignments"));
const StudentAssignmentDetail = React.lazy(() => import("../pages/student/AssignmentDetail"));
const Planner = React.lazy(() => import("../pages/student/Planner"));
const Calendar = React.lazy(() => import("../pages/student/Calendar"));
const StudentProgress = React.lazy(() => import("../pages/student/Progress"));
const StudentAnnouncements = React.lazy(() => import("../pages/student/Announcements"));
const Messages = React.lazy(() => import("../pages/shared/Messages"));
const Settings = React.lazy(() => import("../pages/shared/Settings"));
const TeacherClasses = React.lazy(() => import("../pages/teacher/Classes"));
const TeacherClassDetail = React.lazy(() => import("../pages/teacher/ClassDetail"));
const TeacherAssignments = React.lazy(() => import("../pages/teacher/AssignmentManager"));
const TeacherSubmissions = React.lazy(() => import("../pages/teacher/Submissions"));
const TeacherSubmissionReview = React.lazy(() => import("../pages/teacher/SubmissionReview"));
const TeacherProgress = React.lazy(() => import("../pages/teacher/ClassProgress"));
const TeacherAnnouncements = React.lazy(() => import("../pages/teacher/Announcements"));

export const Routes = createBrowserRouter([
  {
    // Root layout — provides AuthProvider to all child routes
    element: <RootLayout />,
    children: [

      // Guest Only (redirects to dashboard if already logged in)
      {
        element: <GuestRoute />,
        children: [
          {
            path: PATHS.HOME,
            element: <Navigate to={PATHS.LOGIN} replace />,
          },
          {
            path: PATHS.LOGIN,
            element: <Login />,
          },
          {
            path: PATHS.REGISTER,
            element: <Register />,
          },
        ],
      },

      // Authenticated (redirects to login if not logged in)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: PATHS.APP.ROOT,
            children: [
              {
                index: true,
                element: <Navigate to={PATHS.APP.DASHBOARD} replace />,
              },
              {
                path: PATHS.APP.DASHBOARD,
                element: <Dashboard />,
              },
              {
                path: PATHS.APP.MESSAGES,
                element: (
                  <RoleRoute allowedRoles={["student", "teacher"]} />
                ),
                children: [
                  {
                    index: true,
                    element: <Messages />,
                  },
                ],
              },
              {
                path: PATHS.APP.SETTINGS,
                element: (
                  <RoleRoute allowedRoles={["admin", "student", "teacher"]} />
                ),
                children: [
                  {
                    index: true,
                    element: <Settings />,
                  },
                ],
              },

              // Student Only
              {
                element: <RoleRoute allowedRoles={['student']} />,
                children: [
                  {
                    path: PATHS.APP.ASSIGNMENTS,
                    element: <StudentAssignments />,
                  },
                  {
                    path: PATHS.APP.ASSIGNMENT_DETAIL,
                    element: <StudentAssignmentDetail />,
                  },
                  {
                    path: PATHS.APP.PLANNER,
                    element: <Planner />,
                  },
                  {
                    path: PATHS.APP.CALENDAR,
                    element: <Calendar />,
                  },
                  {
                    path: PATHS.APP.PROGRESS,
                    element: <StudentProgress />,
                  },
                  {
                    path: PATHS.APP.ANNOUNCEMENTS,
                    element: <StudentAnnouncements />,
                  },
                ],
              },

              // Teacher Only
              {
                element: <RoleRoute allowedRoles={['teacher']} />,
                children: [
                  {
                    path: PATHS.APP.TEACHER.CLASSES,
                    element: <TeacherClasses />,
                  },
                  {
                    path: PATHS.APP.TEACHER.CLASS_DETAIL,
                    element: <TeacherClassDetail />,
                  },
                  {
                    path: PATHS.APP.TEACHER.ASSIGNMENTS,
                    element: <TeacherAssignments />,
                  },
                  {
                    path: PATHS.APP.TEACHER.SUBMISSIONS,
                    element: <TeacherSubmissions />,
                  },
                  {
                    path: PATHS.APP.TEACHER.SUBMISSION_DETAIL,
                    element: <TeacherSubmissionReview />,
                  },
                  {
                    path: PATHS.APP.TEACHER.PROGRESS,
                    element: <TeacherProgress />,
                  },
                  {
                    path: PATHS.APP.TEACHER.ANNOUNCEMENTS,
                    element: <TeacherAnnouncements />,
                  },
                ],
              },

              // Admin Only
              {
                element: <RoleRoute allowedRoles={['admin']} />,
                children: [
                  {
                    path: PATHS.APP.USERS,
                    element: <Users />,
                  },
                  {
                    path: PATHS.APP.USER_DETAIL,
                    element: <ViewUserDetail />,
                  },
                ],
              },
            ],
          },
        ],
      },

    ],
  },
]);
