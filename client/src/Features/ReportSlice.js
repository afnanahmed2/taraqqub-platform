import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../utils/axiosInstance";

// ============================================================
// 📊 REPORT SLICE - Complete with all actions
// ============================================================

// 1. جلب كافة التقارير (لوحة التحكم - أدمن) - مع دعم الـ limit الكبير
export const fetchAdminReports = createAsyncThunk(
  "reports/fetchAdminReports",
  async ({ limit = 10000 } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_SERVER_URL}/admin/reports?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.reports;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// 2. جلب الإحصائيات (للوحة التحكم - تحتاج توكن أدمن)
export const fetchReportStatistics = createAsyncThunk(
  "reports/fetchReportStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(`${process.env.REACT_APP_SERVER_URL}/admin/reports/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// 3. جلب الريبورتات المحلولة للعرض العام (لا تحتاج توكن)
export const fetchPublicResolvedReports = createAsyncThunk(
  "reports/fetchPublicResolvedReports",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${process.env.REACT_APP_SERVER_URL}/public/reports/resolved`);
      return response.data.reports;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// 4. جلب الإحصائيات العامة (لصفحة الرئيسية - لا تحتاج توكن)
export const fetchPublicStatistics = createAsyncThunk(
  "reports/fetchPublicStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${process.env.REACT_APP_SERVER_URL}/public/reports/statistics`);
      return response.data.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// 5. Admin Update Report Status (يدعم status, authority, priority, recommendation)
export const adminUpdateReportStatus = createAsyncThunk(
  "reports/adminUpdateReportStatus",
  async ({ id, status, authority, priority, recommendation }, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.put(
        `${process.env.REACT_APP_SERVER_URL}/admin/reports/${id}/status`,
        { 
          status, 
          assignedAuthority: authority, 
          priority, 
          recommendation
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // تحديث الإحصائيات بعد التحديث
      dispatch(fetchPublicStatistics());
      dispatch(fetchReportStatistics());
      
      return response.data.report;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

// 6. إنشاء تقرير جديد
export const createReport = createAsyncThunk(
  "reports/createReport",
  async (formData, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.post(
        `${process.env.REACT_APP_SERVER_URL}/createReport`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      
      dispatch(fetchPublicStatistics());
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to submit report";
      return rejectWithValue({ message });
    }
  }
);

// 7. جلب التقارير للمستخدم العادي
export const getReports = createAsyncThunk(
  "reports/getReports",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_SERVER_URL}/reports`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data.reports;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch reports";
      return rejectWithValue({ message });
    }
  }
);

// 8. حذف تقرير
export const deleteReport = createAsyncThunk(
  "reports/deleteReport",
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.delete(
        `${process.env.REACT_APP_SERVER_URL}/reports/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      dispatch(fetchPublicStatistics());
      dispatch(fetchReportStatistics());
      return id;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to delete";
      return rejectWithValue({ message });
    }
  }
);

// 9. تحديث حالة البلاغ (للمستخدم العادي)
export const updateReportStatus = createAsyncThunk(
  "reports/updateStatus",
  async ({ id, status }, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.put(
        `${process.env.REACT_APP_SERVER_URL}/reports/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      dispatch(fetchPublicStatistics());
      dispatch(fetchReportStatistics());
      return response.data.report;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to update";
      return rejectWithValue({ message });
    }
  }
);

/* -------------------- REPORT SLICE -------------------- */

export const reportSlice = createSlice({
  name: "reports",
  initialState: {
    reports: [],
    resolvedReports: [],
    message: null,
    statistics: null,
    publicStatistics: null,
    status: 'idle', 
    error: null,
  },
  reducers: {
    resetStatus: (state) => {
      state.status = 'idle';
      state.message = null;
      state.error = null;
    },
    clearPublicStatistics: (state) => {
      state.publicStatistics = null;
    },
    clearReports: (state) => {
      state.reports = [];
      state.resolvedReports = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // deleteReport
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.reports = state.reports.filter((r) => r._id !== action.payload);
      })
      
      // updateReportStatus
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        const index = state.reports.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) state.reports[index] = action.payload;
      })
      
      // createReport
      .addCase(createReport.pending, (state) => {
        state.status = "loading";
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.status = "success";
        state.message = action.payload.message;
        if (action.payload.report) state.reports.push(action.payload.report);
      })
      .addCase(createReport.rejected, (state, action) => {
        state.status = "rejected";
        state.error = action.payload?.message || action.error?.message;
      })
      
      // getReports
      .addCase(getReports.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getReports.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.reports = action.payload;
      })
      .addCase(getReports.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      
      // fetchAdminReports
      .addCase(fetchAdminReports.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAdminReports.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.reports = action.payload;
      })
      .addCase(fetchAdminReports.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchReportStatistics
      .addCase(fetchReportStatistics.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReportStatistics.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.statistics = action.payload;
      })
      .addCase(fetchReportStatistics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchPublicStatistics
      .addCase(fetchPublicStatistics.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPublicStatistics.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.publicStatistics = action.payload;
      })
      .addCase(fetchPublicStatistics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // adminUpdateReportStatus
      .addCase(adminUpdateReportStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(adminUpdateReportStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.reports.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) state.reports[index] = action.payload;
        if (action.payload.status === 'resolved') {
          const exists = state.resolvedReports.find(r => r._id === action.payload._id);
          if (!exists) state.resolvedReports.push(action.payload);
        } else {
          state.resolvedReports = state.resolvedReports.filter(r => r._id !== action.payload._id);
        }
      })
      .addCase(adminUpdateReportStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchPublicResolvedReports
      .addCase(fetchPublicResolvedReports.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPublicResolvedReports.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.resolvedReports = action.payload;
      })
      .addCase(fetchPublicResolvedReports.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { resetStatus, clearPublicStatistics, clearReports } = reportSlice.actions;
export default reportSlice.reducer;