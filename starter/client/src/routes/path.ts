const APP_ROOT = "/app";

export const PATHS = {
  // Public Routes
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",

  // Authenticated
  APP: {
    ROOT: `${APP_ROOT}`,
    DASHBOARD: `${APP_ROOT}/dashboard`,
    USERS: `${APP_ROOT}/users`,
    USER_DETAIL: `${APP_ROOT}/users/:slug`,
    ASSIGNMENTS: `${APP_ROOT}/assignments`,
    ASSIGNMENT_DETAIL: `${APP_ROOT}/assignments/:id`,
    PLANNER: `${APP_ROOT}/planner`,
    CALENDAR: `${APP_ROOT}/calendar`,
    PROGRESS: `${APP_ROOT}/progress`,
    ANNOUNCEMENTS: `${APP_ROOT}/announcements`,
    MESSAGES: `${APP_ROOT}/messages`,
    SETTINGS: `${APP_ROOT}/settings`,
    TEACHER: {
      CLASSES: `${APP_ROOT}/teacher/classes`,
      CLASS_DETAIL: `${APP_ROOT}/teacher/classes/:id`,
      ASSIGNMENTS: `${APP_ROOT}/teacher/assignments`,
      SUBMISSIONS: `${APP_ROOT}/teacher/submissions`,
      SUBMISSION_DETAIL: `${APP_ROOT}/teacher/submissions/:id`,
      PROGRESS: `${APP_ROOT}/teacher/progress`,
      ANNOUNCEMENTS: `${APP_ROOT}/teacher/announcements`,
    },
  },
};
