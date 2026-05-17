import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE = `${process.env.REACT_APP_BASE_URL}/api/tips`;

export const fetchTips = createAsyncThunk("tips/fetch", async (governorate, { rejectWithValue }) => {
  try {
    const url = governorate ? `${BASE}?governorate=${encodeURIComponent(governorate)}` : BASE;
    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || err.message);
  }
});

export const addTipAsync = createAsyncThunk("tips/add", async (data, { rejectWithValue }) => {
  try {
    const res = await axios.post(BASE, data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || err.message);
  }
});

export const updateTipAsync = createAsyncThunk("tips/update", async ({ id, content, type, governorate }, { rejectWithValue }) => {
  try {
    const res = await axios.put(`${BASE}/${id}`, { content, type, governorate });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data || err.message);
  }
});

export const deleteTipAsync = createAsyncThunk("tips/delete", async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${BASE}/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data || err.message);
  }
});

const initialState = {
  tips: [],
  status: "idle",
  addStatus: "idle",
  error: null,
};

const tipSlice = createSlice({
  name: "tips",
  initialState,
  reducers: {
    editTip: (state, action) => {
      const { index } = action.payload;
      if (state.tips[index]) state.tips[index].editing = true;
    },
    updateTipContent: (state, action) => {
      const { index, content } = action.payload;
      if (state.tips[index]) state.tips[index].content = content;
    },
    updateTipGovernorate: (state, action) => {
      const { index, governorate } = action.payload;
      if (state.tips[index]) state.tips[index].governorate = governorate;
    },
    saveTipEdit: (state, action) => {
      const { index } = action.payload;
      if (state.tips[index]) state.tips[index].editing = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTips.pending,    (state) => { state.status = "loading"; })
      .addCase(fetchTips.fulfilled,  (state, action) => {
        state.status = "succeeded";
        const data = Array.isArray(action.payload) ? action.payload : [];
        state.tips = data.map((tip) => ({ ...tip, editing: false }));
      })
      .addCase(fetchTips.rejected,   (state, action) => {
        state.status = "failed";
        state.error  = action.payload;
      })

      .addCase(addTipAsync.pending,   (state) => { state.addStatus = "loading"; })
      .addCase(addTipAsync.fulfilled, (state, action) => {
        state.addStatus = "succeeded";
        const tip = action.payload;
        if (tip && tip._id) state.tips.unshift({ ...tip, editing: false });
      })
      .addCase(addTipAsync.rejected,  (state, action) => {
        state.addStatus = "failed";
        state.error     = action.payload;
      })

      .addCase(updateTipAsync.fulfilled, (state, action) => {
        const updated = action.payload;
        const index   = state.tips.findIndex((t) => t._id === updated._id);
        if (index !== -1) state.tips[index] = { ...updated, editing: false };
      })

      .addCase(deleteTipAsync.fulfilled, (state, action) => {
        state.tips = state.tips.filter((t) => t._id !== action.payload);
      });
  },
});

export const { editTip, updateTipContent, updateTipGovernorate, saveTipEdit } = tipSlice.actions;
export default tipSlice.reducer;