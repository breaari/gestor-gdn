// src/redux/users.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_USERS_URL ?? "https://backgdn.universidadsiglo21online.com/diego/users/users.php";
const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const saveAuth = (u) => localStorage.setItem("user", JSON.stringify(u));
const clearAuth = () => localStorage.removeItem("user");

// 👉 centralizamos los filtros por defecto para reutilizar
export const DEFAULT_USER_FILTERS = {
  q: "",
  is_admin: null,   // null = todos, 1 = admin, 0 = no admin
  is_active: null,  // null = todos, 1 = activos, 0 = inactivos
  bank: "",
};

/* =========================
   LISTADO / FILTROS / PAGINACIÓN
   ========================= */

export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (overrides = {}, { getState, rejectWithValue }) => {
    try {
      const s = getState().users;

      const limit = overrides.limit ?? s.pagination.limit ?? 10;
      const offset = overrides.offset ?? s.pagination.offset ?? 0;

      // filtros del store con overrides
      const q = overrides.q ?? s.filters.q ?? "";
      const is_admin = overrides.is_admin ?? s.filters.is_admin; // null | 0 | 1
      const is_active = overrides.is_active ?? s.filters.is_active; // null | 0 | 1
      const bank = overrides.bank ?? s.filters.bank ?? "";

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (q && q.trim()) params.set("q", q.trim());
      if (bank && bank.trim()) params.set("bank", bank.trim());
      if (
        is_admin === 0 ||
        is_admin === 1 ||
        is_admin === "0" ||
        is_admin === "1"
      ) {
        params.set("is_admin", String(is_admin));
      }
      if (
        is_active === 0 ||
        is_active === 1 ||
        is_active === "0" ||
        is_active === "1"
      ) {
        params.set("is_active", String(is_active));
      }

      const { data } = await api.get(`?${params.toString()}`);

      // El back devuelve { users, total, limit, offset }
      const users = Array.isArray(data?.users) ? data.users : [];
      const total = Number.isFinite(data?.total) ? Number(data.total) : users.length;
      const lim = Number.isFinite(data?.limit) ? Number(data.limit) : limit;
      const off = Number.isFinite(data?.offset) ? Number(data.offset) : offset;

      return { users, total, limit: lim, offset: off };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener el listado."
      );
    }
  }
);

export const fetchUserById = createAsyncThunk(
  "users/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`?id=${id}`);
      return data?.user ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener el usuario."
      );
    }
  }
);

/* =========================
   AUTH (passwordless por CUIT/CUIL)
   ========================= */

export const loginByCuit = createAsyncThunk(
  "auth/loginByCuit",
  async ({ cuit_or_cuil }, { rejectWithValue }) => {
    try {
      const digits = String(cuit_or_cuil || "").replace(/\D+/g, "");
      if (!/^\d{11}$/.test(digits)) {
        return rejectWithValue("CUIT/CUIL inválido (11 dígitos).");
      }

      // Buscamos usuarios activos con q=digits
      const { data } = await api.get(
        `?limit=5&offset=0&q=${encodeURIComponent(digits)}&is_active=1`
      );
      const users = Array.isArray(data?.users) ? data.users : [];

      // match exacto de CUIT/CUIL
      const found = users.find(
        (u) => String(u.cuit_or_cuil || "").replace(/\D+/g, "") === digits
      );
      if (!found) return rejectWithValue("No encontramos un usuario activo con ese CUIT/CUIL.");

      saveAuth(found);
      return found;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo iniciar sesión."
      );
    }
  }
);

/* =========================
   REGISTRO (sin password)
   ========================= */

export const register = createAsyncThunk(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      // payload esperado: { email, cuit_or_cuil, company_name, fantasy_name, alias?, cbu_or_cvu?, bank?, is_active? }
      const { data } = await api.post("", payload);
      const user = data?.user;
      if (!user?.id) throw new Error(data?.message || "No se pudo crear la cuenta");
      saveAuth(user);
      return user;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || e.message || "Error registrando."
      );
    }
  }
);


/* =========================
   CRUD USUARIO
   ========================= */

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      await api.put(`?id=${id}`, updates);
      return { id, ...updates };
    } catch (e) {
      return rejectWithValue(e?.response?.data?.message || "No se pudo actualizar.");
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, { rejectWithValue }) => {
    try {
      // pedimos borrado físico; si querés soft, quitá &hard=1
      const { data } = await api.delete(`?id=${id}&hard=1`);
      if (!data?.ok || !(data.deleted > 0)) {
        throw new Error(data?.message || "El servidor no confirmó el borrado.");
      }
      return data.deleted; // id confirmado por el back
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || e.message || "No se pudo eliminar."
      );
    }
  }
);



export const createUser = createAsyncThunk(
  "users/create",
  async (payload, { rejectWithValue }) => {
    try {
      // POST JSON al mismo endpoint que ya usa 'register'
      const { data } = await api.post("", payload);
      const user = data?.user;
      if (!user?.id) throw new Error(data?.message || "Respuesta inválida del servidor.");
      return user;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || e.message || "Error creando usuario."
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

  filters: { ...DEFAULT_USER_FILTERS },
  pagination: {
    limit: 10,
    offset: 0,
  },

  authUser: null,

  status: "idle",
  detailStatus: "idle",
  authStatus: "idle",
  error: null,
  message: null,
};

const slice = createSlice({
  name: "users",
  initialState,
  reducers: {
    logout(state) {
      clearAuth();
      state.authUser = null;
      state.authStatus = "idle";
      state.error = null;
      state.message = null;
    },
    clearAuthMessages(state) {
      state.error = null;
      state.message = null;
    },
    hydrateAuth(state, action) {
      state.authUser = action.payload || null;
    },

    setFilters(state, action) {
      const { q, is_admin, is_active, bank } = action.payload || {};
      if (typeof q === "string") state.filters.q = q;
      if (is_admin === null || is_admin === 0 || is_admin === 1)
        state.filters.is_admin = is_admin;
      if (is_active === null || is_active === 0 || is_active === 1)
        state.filters.is_active = is_active;
      if (typeof bank === "string") state.filters.bank = bank;
      state.pagination.offset = 0; // reset página
    },
     // ✅ nuevo
    resetFilters(state) {
      state.filters = { ...DEFAULT_USER_FILTERS };
      state.pagination.offset = 0; // volvemos a la primera página
    },
    setPagination(state, action) {
      const { limit, offset } = action.payload || {};
      if (Number.isFinite(limit) && limit > 0) state.pagination.limit = limit;
      if (Number.isFinite(offset) && offset >= 0) state.pagination.offset = offset;
    },
    setPage(state, action) {
      const page = Number(action.payload) || 1;
      const limit = state.pagination.limit || 10;
      state.pagination.offset = (page - 1) * limit;
    },
    
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchUsers.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchUsers.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = a.payload.users || [];
        s.total = a.payload.total ?? s.list.length;
        if (Number.isFinite(a.payload.limit)) s.pagination.limit = a.payload.limit;
        if (Number.isFinite(a.payload.offset)) s.pagination.offset = a.payload.offset;
      })
      .addCase(fetchUsers.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })
      .addCase(createUser.fulfilled, (s, a) => {
  const u = a.payload;
  // prepend para que se vea primero; ajustá si querés al final
  s.list = [u, ...s.list];
  s.total = (s.total ?? 0) + 1;
})
.addCase(createUser.rejected, (s, a) => {
  // opcional: podés setear s.error = a.payload;
})

      // detail
      .addCase(fetchUserById.pending, (s) => {
        s.detailStatus = "loading";
        s.error = null;
      })
      .addCase(fetchUserById.fulfilled, (s, a) => {
        s.detailStatus = "succeeded";
        s.detail = a.payload;
      })
      .addCase(fetchUserById.rejected, (s, a) => {
        s.detailStatus = "failed";
        s.error = a.payload;
      })

      // auth (passwordless)
      .addCase(loginByCuit.pending, (s) => {
        s.authStatus = "loading";
        s.error = null;
        s.message = null;
      })
      .addCase(loginByCuit.fulfilled, (s, a) => {
        s.authStatus = "succeeded";
        s.authUser = a.payload;
      })
      .addCase(loginByCuit.rejected, (s, a) => {
        s.authStatus = "failed";
        s.error = a.payload;
      })

      // register
      .addCase(register.pending, (s) => {
        s.authStatus = "loading";
        s.error = null;
        s.message = null;
      })
      .addCase(register.fulfilled, (s, a) => {
        s.authStatus = "succeeded";
        s.authUser = a.payload;
      })
      .addCase(register.rejected, (s, a) => {
        s.authStatus = "failed";
        s.error = a.payload;
      })

      // update/delete
      .addCase(updateUser.fulfilled, (s, a) => {
        const upd = a.payload;
        s.list = s.list.map((u) => (u.id === upd.id ? { ...u, ...upd } : u));
        if (s.detail?.id === upd.id) s.detail = { ...s.detail, ...upd };
        if (s.authUser?.id === upd.id) {
          s.authUser = { ...s.authUser, ...upd };
          saveAuth(s.authUser);
        }
      })
      .addCase(deleteUser.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((u) => u.id !== id);
        if (s.detail?.id === id) s.detail = null;
        if (s.authUser?.id === id) {
          s.authUser = null;
          clearAuth();
        }
      });
      
  },
});

export const {
  logout,
  clearAuthMessages,
  hydrateAuth,
  setFilters,
  setPagination,
  setPage,
  resetFilters
} = slice.actions;

export default slice.reducer;
