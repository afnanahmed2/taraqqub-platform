import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// -------------- LOGIN ----------------
export const login = createAsyncThunk(
  "users/login",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/login`, userData);
      const safeUser = {
        id: response.data.user._id,
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || "",
        role: response.data.user.role || response.data.role || "citizen",
        createdAt: response.data.user.createdAt || null
      };
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(safeUser));
      return { user: safeUser, message: response.data.message };
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Login failed" });
    }
  }
);

// -------------- ADMIN LOGIN ----------------
export const adminLogin = createAsyncThunk(
  "users/adminLogin",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/admin/login`, userData);
      const safeUser = {
        id: response.data.user._id,
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || "",
        role: "admin",
        createdAt: response.data.user.createdAt || null
      };
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(safeUser));
      return { 
        user: safeUser,
        message: response.data.message 
      };
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Admin login failed" });
    }
  }
);

// -------------- REGISTER ----------------
export const registerUser = createAsyncThunk(
  "users/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/registerUser`, userData);
      const safeUser = {
        id: response.data.user._id,
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || "",
        role: "citizen",
        createdAt: response.data.user.createdAt || new Date().toISOString()
      };
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(safeUser));
      return { user: safeUser, message: response.data.message };
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Register failed" });
    }
  }
);

// -------------- LOGOUT ----------------
//export const logout = createAsyncThunk("users/logout", async () => {
  //localStorage.removeItem("user");
  //localStorage.removeItem("token");
  //return "Logged out successfully";
//});

//Logout
export const logout = createAsyncThunk("users/logout", async()=>{
  const response = await axios.post(`${process.env.REACT_APP_SERVER_URL}/logout`)
  const msg  = response.data.msg
  console.log(msg)
})

// -------------- UPDATE PROFILE ----------------
// ✅ التعديل: إزالة تخزين token لأن السيرفر لا يرسله
export const updateUserProfile = createAsyncThunk(
  "users/updateProfile",
  async ({ userId, name, email, phone }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_SERVER_URL}/api/user/${userId}`,
        { name, email, phone }
      );

      const updatedUser = response.data.user;
     
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const safeUser = {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || currentUser.phone || "",
        role: updatedUser.role || currentUser.role || "citizen",
        createdAt: updatedUser.createdAt || currentUser.createdAt || null
      };
      
      localStorage.setItem("user", JSON.stringify(safeUser));
      
      // ✅ التعديل: تم إزالة localStorage.setItem("token", ...) لأن السيرفر لا يرسل token جديد
      // localStorage.setItem("token", response.data.token); // تم التعليق
     
      return { user: safeUser, message: response.data.message || "Profile updated successfully" };
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Failed to update profile" });
    }
  }
);

// -------------- CHANGE PASSWORD ----------------
export const changePassword = createAsyncThunk(
  "users/changePassword",
  async ({ userId, currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_SERVER_URL}/api/user/${userId}/password`,
        { currentPassword, newPassword }
      );
     
      return { message: response.data.message };
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Failed to change password" });
    }
  }
);

// -------------- GET USER STATS ----------------
export const getUserStats = createAsyncThunk(
  "users/getUserStats",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/user/${userId}/stats`);
      return response.data.stats;
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Failed to get stats" });
    }
  }
);

// -------------- GET USER REPORTS ----------------
export const getUserReports = createAsyncThunk(
  "users/getUserReports",
  async ({ userId, limit = 5 }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/api/user/${userId}/reports?limit=${limit}`);
      return response.data.reports;
    } catch (error) {
      return rejectWithValue({ message: error.response?.data?.message || "Failed to get reports" });
    }
  }
);

// -------------- SLICE ----------------
const userFromStorage = localStorage.getItem("user")
  ? JSON.parse(localStorage.getItem("user"))
  : null;

const userSlice = createSlice({
  name: "users",
  initialState: {
    user: userFromStorage || null,
    isLogin: !!userFromStorage,
    status: null,
    message: null,
    userStats: {
      totalReports: 0,
      resolvedReports: 0,
      pendingReports: 0,
      inProgressReports: 0
    },
    recentReports: [],
    loading: false,
  },
  reducers: {
    clearMessage: (state) => {
      state.message = null;
      state.status = null;
    },
    setUserFromStorage: (state) => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        state.user = JSON.parse(storedUser);
        state.isLogin = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.message = null;
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isLogin = true;
        state.message = action.payload.message;
        state.status = "success";
        state.loading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.user = null;
        state.isLogin = false;
        state.message = action.payload?.message || "Login failed";
        state.status = "rejected";
        state.loading = false;
      })
     
      // ADMIN LOGIN
      .addCase(adminLogin.pending, (state) => {
        state.status = "loading";
        state.message = null;
        state.loading = true;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isLogin = true;
        state.message = action.payload.message;
        state.status = "success";
        state.loading = false;
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.user = null;
        state.isLogin = false;
        state.message = action.payload?.message || "Admin login failed";
        state.status = "rejected";
        state.loading = false;
      })
     
      // REGISTER
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.message = null;
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isLogin = true;
        state.message = action.payload.message;
        state.status = "success";
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.user = null;
        state.isLogin = false;
        state.message = action.payload?.message || "Register failed";
        state.status = "rejected";
        state.loading = false;
      })
     
      // LOGOUT
      .addCase(logout.pending, (state) => {
        state.status = "loading";
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state, action) => {
        state.user = null;
        state.isLogin = false;
        state.message = action.payload;
        state.status = "success";
        state.loading = false;
      })
     
      // UPDATE PROFILE
      .addCase(updateUserProfile.pending, (state) => {
        state.status = "loading";
        state.message = null;
        state.loading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.message = action.payload.message;
        state.status = "success";
        state.loading = false;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.message = action.payload?.message || "Failed to update profile";
        state.status = "rejected";
        state.loading = false;
      })
     
      // CHANGE PASSWORD
      .addCase(changePassword.pending, (state) => {
        state.status = "loading";
        state.message = null;
        state.loading = true;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.message = action.payload.message;
        state.status = "success";
        state.loading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.message = action.payload?.message || "Failed to change password";
        state.status = "rejected";
        state.loading = false;
      })
     
      // GET USER STATS
      .addCase(getUserStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserStats.fulfilled, (state, action) => {
        state.userStats = action.payload;
        state.loading = false;
      })
      .addCase(getUserStats.rejected, (state) => {
        state.loading = false;
      })
     
      // GET USER REPORTS
      .addCase(getUserReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserReports.fulfilled, (state, action) => {
        state.recentReports = action.payload;
        state.loading = false;
      })
      .addCase(getUserReports.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { clearMessage, setUserFromStorage } = userSlice.actions;
export default userSlice.reducer;