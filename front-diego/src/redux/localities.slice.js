// src/redux/localities.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_LOCALITIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/localities/localities.php";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/* =========================
   LISTADO / FILTROS / PAGINACIÓN
   ========================= */

export const fetchLocalities = createAsyncThunk(
  "localities/fetchAll",
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const s = getState().localities;

      const limit = overrides.limit ?? s.pagination.limit ?? 20;
      const offset = overrides.offset ?? s.pagination.offset ?? 0;
      const q = overrides.q ?? s.filters.q ?? "";

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (q && q.trim()) params.set("q", q.trim());

      const { data } = await api.get(`?${params.toString()}`);

      const localities = Array.isArray(data?.localities) ? data.localities : [];
      const total = Number.isFinite(data?.total) ? Number(data.total) : localities.length;
      const lim = Number.isFinite(data?.limit) ? Number(data.limit) : limit;
      const off = Number.isFinite(data?.offset) ? Number(data.offset) : offset;

      return { localities, total, limit: lim, offset: off };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener el listado."
      );
    }
  }
);

export const fetchLocalityById = createAsyncThunk(
  "localities/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`?id=${id}`);
      return data?.locality ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener la localidad."
      );
    }
  }
);

export const createLocality = createAsyncThunk(
  "localities/create",
  async ({ name }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("", { name });
      return data?.locality; // {id,name,slug,...}
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo crear la localidad."
      );
    }
  }
);

export const updateLocality = createAsyncThunk(
  "localities/update",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`?id=${id}`, updates);
      return data?.locality ?? { id, ...updates };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo actualizar la localidad."
      );
    }
  }
);

// DELETE duro (el back borra el registro)
export const deleteLocality = createAsyncThunk(
  "localities/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`?id=${id}`);
      return id;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo eliminar la localidad."
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
  name: "localities",
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
    clearLocalityDetail(state) {
      state.detail = null;
      state.detailStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchLocalities.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchLocalities.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = a.payload.localities || [];
        s.total = a.payload.total ?? s.list.length;
        if (Number.isFinite(a.payload.limit)) s.pagination.limit = a.payload.limit;
        if (Number.isFinite(a.payload.offset)) s.pagination.offset = a.payload.offset;
      })
      .addCase(fetchLocalities.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // detail
      .addCase(fetchLocalityById.pending, (s) => {
        s.detailStatus = "loading";
        s.error = null;
      })
      .addCase(fetchLocalityById.fulfilled, (s, a) => {
        s.detailStatus = "succeeded";
        s.detail = a.payload;
      })
      .addCase(fetchLocalityById.rejected, (s, a) => {
        s.detailStatus = "failed";
        s.error = a.payload;
      })

      // create
      .addCase(createLocality.fulfilled, (s, a) => {
        const loc = a.payload;
        if (loc?.id) {
          s.list = [loc, ...s.list];
          s.total += 1;
        }
      })

      // update
      .addCase(updateLocality.fulfilled, (s, a) => {
        const loc = a.payload;
        if (!loc?.id) return;
        s.list = s.list.map((l) => (l.id === loc.id ? { ...l, ...loc } : l));
        if (s.detail?.id === loc.id) s.detail = { ...s.detail, ...loc };
      })

      // delete (duro)
      .addCase(deleteLocality.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((l) => l.id !== id);
        s.total = Math.max(0, s.total - 1);
        if (s.detail?.id === id) s.detail = null;
      });
  },
});

export const {
  setFilters,
  setPagination,
  setPage,
  clearLocalityDetail,
} = slice.actions;

export default slice.reducer;
