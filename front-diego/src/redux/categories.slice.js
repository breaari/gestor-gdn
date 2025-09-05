// src/redux/categories.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_CATEGORIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/categories/categories.php";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* =========================
   LISTADO / FILTROS / PAGINACIÓN
   ========================= */

export const fetchCategories = createAsyncThunk(
  "categories/fetchAll",
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const s = getState().categories;

      const limit = overrides.limit ?? s.pagination.limit ?? 20;
      const offset = overrides.offset ?? s.pagination.offset ?? 0;
      const q = overrides.q ?? s.filters.q ?? "";

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (q && q.trim()) params.set("q", q.trim());

      const { data } = await api.get(`?${params.toString()}`);

      const categories = Array.isArray(data?.categories) ? data.categories : [];
      const total = Number.isFinite(data?.total) ? Number(data.total) : categories.length;
      const lim = Number.isFinite(data?.limit) ? Number(data.limit) : limit;
      const off = Number.isFinite(data?.offset) ? Number(data.offset) : offset;

      return { categories, total, limit: lim, offset: off };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener el listado."
      );
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  "categories/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`?id=${id}`);
      return data?.category ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener la categoría."
      );
    }
  }
);

export const createCategory = createAsyncThunk(
  "categories/create",
  async ({ name }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("", { name });
      return data?.category; // {id,name,slug,...}
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo crear la categoría."
      );
    }
  }
);

export const updateCategory = createAsyncThunk(
  "categories/update",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`?id=${id}`, updates);
      return data?.category ?? { id, ...updates };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo actualizar la categoría."
      );
    }
  }
);

// DELETE duro (el back borra el registro)
export const deleteCategory = createAsyncThunk(
  "categories/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`?id=${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo eliminar la categoría."
      );
    }
  }
);

/* =========================
   STATE
   ========================= */

const initialState = {
  list: [],
  total: 0,
  detail: null,

  filters: {
    q: "",
  },
  pagination: {
    limit: 20,
    offset: 0,
  },

  status: "idle",        // list
  detailStatus: "idle",  // detail
  error: null,
};

const slice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    setFilters(state, action) {
      const { q } = action.payload || {};
      if (typeof q === "string") state.filters.q = q;
      state.pagination.offset = 0; // reset página
    },
    setPagination(state, action) {
      const { limit, offset } = action.payload || {};
      if (Number.isFinite(limit) && limit > 0) state.pagination.limit = limit;
      if (Number.isFinite(offset) && offset >= 0) state.pagination.offset = offset;
    },
    setPage(state, action) {
      const page = Number(action.payload) || 1;
      const limit = state.pagination.limit || 20;
      state.pagination.offset = (page - 1) * limit;
    },
    clearCategoryDetail(state) {
      state.detail = null;
      state.detailStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchCategories.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchCategories.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = a.payload.categories || [];
        s.total = a.payload.total ?? s.list.length;
        if (Number.isFinite(a.payload.limit)) s.pagination.limit = a.payload.limit;
        if (Number.isFinite(a.payload.offset)) s.pagination.offset = a.payload.offset;
      })
      .addCase(fetchCategories.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // detail
      .addCase(fetchCategoryById.pending, (s) => {
        s.detailStatus = "loading";
        s.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (s, a) => {
        s.detailStatus = "succeeded";
        s.detail = a.payload;
      })
      .addCase(fetchCategoryById.rejected, (s, a) => {
        s.detailStatus = "failed";
        s.error = a.payload;
      })

      // create
      .addCase(createCategory.fulfilled, (s, a) => {
        const cat = a.payload;
        if (cat?.id) {
          s.list = [cat, ...s.list];
          s.total += 1;
        }
      })

      // update
      .addCase(updateCategory.fulfilled, (s, a) => {
        const cat = a.payload;
        if (!cat?.id) return;
        s.list = s.list.map((c) => (c.id === cat.id ? { ...c, ...cat } : c));
        if (s.detail?.id === cat.id) s.detail = { ...s.detail, ...cat };
      })

      // delete (duro)
      .addCase(deleteCategory.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((c) => c.id !== id);
        s.total = Math.max(0, s.total - 1);
        if (s.detail?.id === id) s.detail = null;
      });
  },
});

export const {
  setFilters,
  setPagination,
  setPage,
  clearCategoryDetail,
} = slice.actions;

export default slice.reducer;
