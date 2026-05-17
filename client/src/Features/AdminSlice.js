// AdminSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ إنشاء instance من Axios لإرسال التوكن تلقائيًا
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL || `${process.env.REACT_APP_BASE_URL}`,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔥 ADMIN LOGIN
export const adminLogin = createAsyncThunk(
  "admin/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/admin/login", { email, password });
      
      // ✅ التحقق من وجود البيانات المطلوبة
      if (!res.data.success || !res.data.token || !res.data.user) {
        return rejectWithValue({ message: "Invalid response from server" });
      }
      
      // ✅ حفظ التوكن وبيانات المستخدم في localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("user", JSON.stringify(res.data.user)); // ✅ حفظ user كامل
        
      return {
        token: res.data.token,
        user: res.data.user,  // ✅ إرجاع user بشكل واضح
        success: true
      };
    } catch (err) {
      // التعامل مع الأخطاء بوضوح
      return rejectWithValue(err.response?.data || { message: "Login failed" });
    }
  }
);

// 🔥 GET ADMIN STATISTICS (إضافة new)
export const getAdminStatistics = createAsyncThunk(
  "admin/getStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/admin/reports/statistics");
      return res.data.stats;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch statistics");
    }
  }
);

// 🔥 GET ALL REPORTS (للداشبورد)
export const getAllReports = createAsyncThunk(
  "admin/getAllReports",
  async ({ status, category, governorate } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (category) params.append("category", category);
      if (governorate) params.append("governorate", governorate);
      
      const queryString = params.toString();
      const url = `/admin/reports${queryString ? `?${queryString}` : ""}`;
      const res = await axiosInstance.get(url);
      return res.data.reports;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch reports");
    }
  }
);

// 🔥 UPDATE REPORT STATUS
export const updateReportStatus = createAsyncThunk(
  "admin/updateReportStatus",
  async ({ reportId, status }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.put(`/admin/reports/${reportId}/status`, { status });
      return res.data.report;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update status");
    }
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    admin: null,
    token: localStorage.getItem("token") || null,
    loading: false,
    error: null,
    statistics: null,
    reports: [],
    filters: {
      status: "",
      category: "",
      governorate: "",
    },
  },
  reducers: {
    logout: (state) => {
      state.admin = null;
      state.token = null;
      state.loading = false;
      state.error = null;
      state.statistics = null;
      state.reports = [];
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("user");
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        status: "",
        category: "",
        governorate: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔹 ADMIN LOGIN
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
        state.admin = null;
        state.token = null;
      })
      
      // 🔹 GET STATISTICS
      .addCase(getAdminStatistics.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAdminStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(getAdminStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 🔹 GET ALL REPORTS
      .addCase(getAllReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(getAllReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 🔹 UPDATE REPORT STATUS
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        const updatedReport = action.payload;
        const index = state.reports.findIndex(r => r._id === updatedReport._id);
        if (index !== -1) {
          state.reports[index] = updatedReport;
        }
        // ✅ تحديث الإحصائيات بعد تغيير الحالة
        if (state.statistics) {
          // إعادة جلب الإحصائيات
          // يمكنك استدعاء getAdminStatistics مرة أخرى
        }
      });
  },
});

export const { logout, setFilters, clearFilters } = adminSlice.actions;

export default adminSlice.reducer;