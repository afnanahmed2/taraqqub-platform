import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ============================================================
// 🆕 دالة للحصول على الـ API URL ديناميكياً (جديد)
// ============================================================
//const getApiUrl = () => {
  //if (process.env.REACT_APP_API_URL) {
    //return process.env.REACT_APP_API_URL;}
  //const currentHost = window.location.hostname;
  //const currentPort = "3001";
  //return `http://${currentHost}:${currentPort}`;};

//const BASE = getApiUrl();

// ============================================================
// 🆕 دالة للحصول على الـ API URL بشكل صحيح (تصحيح)
// ============================================================
const getApiUrl = () => {
  // 1. إذا كنتِ قد وضعتِ الرابط في إعدادات البيئة (يفضل ذلك)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. إذا كنتِ ترفعين السيرفر والواجهة على نفس الخدمة أو تريدين رابطاً ثابتاً
  // استبدلي الرابط أدناه برابط السيرفر (Backend) الخاص بكِ على Render
  const productionServerUrl = "https://taraqqub-platform.onrender.com"; 

  // 3. التحقق إذا كان التشغيل محلياً (Localhost) أو على الإنترنت (Production)
  if (window.location.hostname === "localhost") {
    return "http://localhost:3001"; // في جهازك الشخصي
  } else {
    return productionServerUrl; // عند الرفع على Render
  }
};

const BASE = getApiUrl();
// ============================================================
// إرسال فيدباك مع البيانات الإضافية
// ============================================================
export const submitFeedback = createAsyncThunk(
  "feedback/submit",
  async (feedbackData, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE}/api/feedback`, feedbackData);
      return res.data.feedback;
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      return rejectWithValue(err.response?.data?.message || "Failed to submit");
    }
  }
);

// ============================================================
// جلب كل الفيدباك (أدمن)
// ============================================================
export const fetchAllFeedback = createAsyncThunk(
  "feedback/fetchAll",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().users?.user?.token || localStorage.getItem("token");
      
      if (!token) {
        return rejectWithValue("No admin token found. Please login as admin.");
      }

      const res = await axios.get(`${BASE}/admin/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.feedbacks;
    } catch (err) {
      console.error("Fetch error:", err.response?.data || err.message);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        return rejectWithValue("Access denied. Admin privileges required.");
      }
      
      if (err.code === 'ERR_NETWORK') {
        return rejectWithValue(`Cannot connect to server at ${BASE}. Make sure the server is running.`);
      }
      
      return rejectWithValue(err.response?.data?.message || "Failed to fetch feedback");
    }
  }
);

// ============================================================
// حذف فيدباك (أدمن)
// ============================================================
export const deleteFeedback = createAsyncThunk(
  "feedback/delete",
  async (id, { rejectWithValue, getState }) => {
    try {
      const token = getState().users?.user?.token || localStorage.getItem("token");
      
      if (!token) {
        return rejectWithValue("No admin token found.");
      }

      await axios.delete(`${BASE}/admin/feedback/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return id;
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
      return rejectWithValue(err.response?.data?.message || "Failed to delete");
    }
  }
);

// ============================================================
// 🆕 🤖 جلب تحليل AI (جديد)
// ============================================================
export const fetchAIAnalysis = createAsyncThunk(
  "feedback/fetchAIAnalysis",
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().users?.user?.token || localStorage.getItem("token");
      
      if (!token) {
        return rejectWithValue("No admin token found. Please login as admin.");
      }

      console.log("🤖 Fetching AI analysis...");
      
      const res = await axios.get(`${BASE}/admin/feedback/ai-analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success && res.data.analysis) {
        console.log("✅ AI analysis received:", res.data.analysis);
        return res.data.analysis;
      } else {
        return rejectWithValue(res.data.message || "No analysis available");
      }
    } catch (err) {
      console.error("AI Analysis error:", err.response?.data || err.message);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        return rejectWithValue("Access denied. Admin privileges required.");
      }
      
      if (err.code === 'ERR_NETWORK') {
        return rejectWithValue(`Cannot connect to server at ${BASE}. Make sure the server is running.`);
      }
      
      return rejectWithValue(err.response?.data?.message || "Failed to fetch AI analysis");
    }
  }
);

// ============================================================
// Feedback Slice
// ============================================================
const feedbackSlice = createSlice({
  name: "feedback",
  initialState: {
    feedbacks: [],
    loading: false,
    deleteLoading: null,
    error: null,
    submitSuccess: false,
    // 🆕 AI Analysis state (جديد)
    aiAnalysis: null,
    aiLoading: false,
    aiError: null,
  },
  reducers: {
    resetSubmitStatus: (state) => {
      state.submitSuccess = false;
      state.error = null;
    },
    // 🆕 reset AI Analysis state (جديد)
    resetAIAnalysis: (state) => {
      state.aiAnalysis = null;
      state.aiError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ── Submit ──────────────────────────────────────────
      .addCase(submitFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.submitSuccess = false;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.submitSuccess = true;
        if (action.payload) {
          state.feedbacks.unshift(action.payload);
        }
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        state.loading = false;
        state.submitSuccess = false;
        state.error = action.payload;
      })

      // ── Fetch All ────────────────────────────────────────
      .addCase(fetchAllFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbacks = action.payload || [];
      })
      .addCase(fetchAllFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Delete ───────────────────────────────────────────
      .addCase(deleteFeedback.pending, (state, action) => {
        state.deleteLoading = action.meta.arg;
        state.error = null;
      })
      .addCase(deleteFeedback.fulfilled, (state, action) => {
        state.deleteLoading = null;
        state.feedbacks = state.feedbacks.filter(f => f._id !== action.payload);
      })
      .addCase(deleteFeedback.rejected, (state, action) => {
        state.deleteLoading = null;
        state.error = action.payload;
      })

      // ── 🆕 AI Analysis ───────────────────────────────────
      .addCase(fetchAIAnalysis.pending, (state) => {
        state.aiLoading = true;
        state.aiError = null;
        state.aiAnalysis = null;
      })
      .addCase(fetchAIAnalysis.fulfilled, (state, action) => {
        state.aiLoading = false;
        state.aiAnalysis = action.payload;
      })
      .addCase(fetchAIAnalysis.rejected, (state, action) => {
        state.aiLoading = false;
        state.aiError = action.payload;
      });
  }
});

export const { resetSubmitStatus, resetAIAnalysis } = feedbackSlice.actions;
export default feedbackSlice.reducer;