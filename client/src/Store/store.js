import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "../Features/UserSlice";
import reportsReducer from "../Features/ReportSlice";
import tipReducer from "../Features/TipSlice";
import feedbackReducer from '../Features/FeedbackSlice';

export const store = configureStore({
  reducer: {
    users: usersReducer,
    reports: reportsReducer,
    tips: tipReducer, // ✅ هذا أهم سطر
    feedback: feedbackReducer,

  },
});