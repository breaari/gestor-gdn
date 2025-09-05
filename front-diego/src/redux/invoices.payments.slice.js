// src/redux/invoice_payments.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_INVOICE_PAYMENTS_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/invoices_payments/invoice_payments.php";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// helper de querystring (omite null/undefined/"")
const qs = (obj = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

/* ================= Thunks ================= */

// LISTADO
export const fetchInvoicePayments = createAsyncThunk(
  "invoicePayments/fetchList",
  async (params, { getState, rejectWithValue }) => {
    try {
      const st = getState();
      const filters = st?.invoicePayments?.filters ?? {};
      const pagination = st?.invoicePayments?.pagination ?? {};

      const query = qs({
        // filtros del back
        invoice_id:
          filters.invoice_id !== "" ? Number(filters.invoice_id) : undefined,
        date_from: filters.date_from || undefined, // 'YYYY-MM-DD HH:mm:ss' o ISO válido
        date_to: filters.date_to || undefined,

        // paginación
        limit: pagination.limit,
        offset: pagination.offset,

        // overrides desde params
        ...(params || {}),
      });

      const { data } = await api.get(query);
      return {
        payments: Array.isArray(data?.payments) ? data.payments : [],
        total: Number(data?.total ?? 0),
        limit: Number(data?.limit ?? pagination.limit ?? 50),
        offset: Number(data?.offset ?? pagination.offset ?? 0),
      };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message ||
          "No se pudieron obtener los comprobantes de pago."
      );
    }
  }
);

// DETALLE
export const fetchInvoicePaymentById = createAsyncThunk(
  "invoicePayments/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`?id=${id}`);
      return data?.payment ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener el comprobante."
      );
    }
  }
);

// CREAR (JSON o multipart si mandás 'file')
export const createInvoicePayment = createAsyncThunk(
  "invoicePayments/create",
  async (payload, { rejectWithValue }) => {
    try {
      // payload esperado:
      // { invoice_id, paid_at, receipt_path? , file? (File) }
      const { file, ...rest } = payload ?? {};

      if (file instanceof File) {
        const form = new FormData();
        if (rest.invoice_id != null) form.append("invoice_id", String(rest.invoice_id));
        if (rest.paid_at != null) form.append("paid_at", String(rest.paid_at));
        if (rest.receipt_path) form.append("receipt_path", String(rest.receipt_path));
        form.append("receipt", file);

        const { data } = await api.post("", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data?.payment ?? null;
      }

      // JSON simple
      const { data } = await api.post("", rest);
      return data?.payment ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo crear el comprobante."
      );
    }
  }
);

// ACTUALIZAR (JSON)
export const updateInvoicePayment = createAsyncThunk(
  "invoicePayments/update",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      // El PUT del back no admite archivo, solo campos JSON
      const { data } = await api.put(`?id=${id}`, updates);
      const updated = data?.payment ? data.payment : { id, ...updates };
      return { id, updates: updated };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo actualizar el comprobante."
      );
    }
  }
);

// ELIMINAR (keep_file opcional)
export const deleteInvoicePayment = createAsyncThunk(
  "invoicePayments/delete",
  async ({ id, keep_file = 0 }, { rejectWithValue }) => {
    try {
      const { data } = await api.delete("", { params: { id, keep_file } });
      return { id, keep_file, message: data?.message ?? "Comprobante eliminado" };
    } catch (e) {
      const msg = e?.response?.data?.message;
      const det = e?.response?.data?.detail;
      return rejectWithValue([msg, det].filter(Boolean).join(" — ") || "No se pudo eliminar el comprobante.");
    }
  }
);

/* ================= State & Slice ================= */

const initialState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,

  selected: null,

  filters: {
    invoice_id: "",     // para listar pagos de una factura
    date_from: "",      // opcional
    date_to: "",        // opcional
  },

  pagination: {
    limit: 50,
    offset: 0,
  },
};

const invoicePaymentsSlice = createSlice({
  name: "invoicePayments",
  initialState,
  reducers: {
    setPaymentsFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.offset = 0;
    },
    clearPaymentsFilters(state) {
      state.filters = { invoice_id: "", date_from: "", date_to: "" };
      state.pagination.offset = 0;
    },
    setPaymentsPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setPaymentsPage(state, action) {
      const page = Math.max(1, parseInt(action.payload || 1, 10));
      state.pagination.offset = (page - 1) * state.pagination.limit;
    },
    selectPayment(state, action) {
      state.selected = action.payload || null;
    },
    clearInvoicePaymentsState(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchInvoicePayments.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchInvoicePayments.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload.payments;
        s.total = a.payload.total;
        s.pagination.limit = a.payload.limit;
        s.pagination.offset = a.payload.offset;
      })
      .addCase(fetchInvoicePayments.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // detail
      .addCase(fetchInvoicePaymentById.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchInvoicePaymentById.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.selected = a.payload;
        // sincronizar en listado si existe
        if (s.selected?.id) {
          s.items = s.items.map((it) =>
            it.id === s.selected.id ? s.selected : it
          );
        }
      })
      .addCase(fetchInvoicePaymentById.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // create
      .addCase(createInvoicePayment.fulfilled, (s, a) => {
        if (a.payload) {
          s.items = [a.payload, ...s.items];
          s.total += 1;
        }
      })

      // update
      .addCase(updateInvoicePayment.fulfilled, (s, a) => {
        const { id, updates } = a.payload;
        s.items = s.items.map((it) => (it.id === id ? { ...it, ...updates } : it));
        if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
      })

      // delete
      .addCase(deleteInvoicePayment.fulfilled, (s, a) => {
        const { id } = a.payload;
        s.items = s.items.filter((it) => it.id !== id);
        s.total = Math.max(0, (s.total ?? 0) - 1);
        if (s.selected?.id === id) s.selected = null;
      })
      .addCase(deleteInvoicePayment.rejected, (s, a) => {
        s.error = a.payload || "No se pudo eliminar el comprobante.";
      });
  },
});

export const {
  setPaymentsFilters,
  clearPaymentsFilters,
  setPaymentsPagination,
  setPaymentsPage,
  selectPayment,
  clearInvoicePaymentsState,
} = invoicePaymentsSlice.actions;

export default invoicePaymentsSlice.reducer;
