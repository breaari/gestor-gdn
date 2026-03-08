// // src/redux/invoices.slice.js
// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// const baseURL =
//   import.meta.env.VITE_API_INVOICES_URL ??
//   "https://backgdn.universidadsiglo21online.com/diego/invoices/invoices.php";

// const api = axios.create({
//   baseURL,
//   withCredentials: true,
  
// });

// // querystring helper
// const qs = (obj = {}) => {
//   const p = new URLSearchParams();
//   for (const [k, v] of Object.entries(obj)) {
//     if (v === undefined || v === null) continue;
//     if (typeof v === "string" && v.trim() === "") continue;
//     p.append(k, String(v));
//   }
//   const s = p.toString();
//   return s ? `?${s}` : "";
// };

// /* ================= Thunks ================= */

// // LISTADO (respetando los filtros que soporta el back)
// export const fetchInvoices = createAsyncThunk(
//   "invoices/fetchList",
//   async (params, { getState, rejectWithValue }) => {
//     try {
//       const st = getState();
//       const user = st?.users?.authUser;
//       const isAdmin = !!user?.is_administrator;

//       const filters = st?.invoices?.filters ?? {};
//       const pagination = st?.invoices?.pagination ?? {};

//       const queryBase = {
//         // Si no es admin, limitar por proveedor
//         ...(!isAdmin && user?.id ? { supplier_id: user.id } : {}),

//         // Filtros soportados por tu back
//         company_name: filters.company_name || undefined,
//         category_id: filters.category_id || undefined,
//         locality_id: filters.locality_id || undefined,
//         payment_status: filters.payment_status || undefined, // 'Pendiente' | 'Pagado'
//         is_valid:
//           filters.is_valid === 0 || filters.is_valid === 1
//             ? filters.is_valid
//             : undefined,
//         month: filters.month ? Number(filters.month) : undefined, // 1..12
//         date_from: filters.date_from || undefined, // 'YYYY-MM-DD HH:mm:ss' (tu back usa strtotime)
//         date_to: filters.date_to || undefined,
//         q: filters.q || undefined, // busca en archive_path

//         // paginación
//         limit: pagination.limit,
//         offset: pagination.offset,
//       };

//       // Overrides del caller
//       const overrides = { ...(params || {}) };
//       if (isAdmin) {
//         delete queryBase.supplier_id;
//         delete overrides.supplier_id;
//       }

//       const query = qs({ ...queryBase, ...overrides });

//       const { data } = await api.get(query);
//       return {
//         invoices: Array.isArray(data?.invoices) ? data.invoices : [],
//         total: Number(data?.total ?? 0),
//         limit: Number(data?.limit ?? pagination.limit ?? 50),
//         offset: Number(data?.offset ?? pagination.offset ?? 0),
//       };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo obtener las facturas."
//       );
//     }
//   }
// );

// // DETALLE (opcional incluir pagos)
// export const fetchInvoiceById = createAsyncThunk(
//   "invoices/fetchById",
//   async ({ id, includePayments = false }, { rejectWithValue }) => {
//     try {
//       const query = qs({
//         id,
//         ...(includePayments ? { include_payments: 1 } : {}),
//       });
//       const { data } = await api.get(query);
//       return {
//         invoice: data?.invoice ?? null,
//         payments: Array.isArray(data?.payments) ? data.payments : [],
//       };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo obtener la factura."
//       );
//     }
//   }
// );

// // CREAR (el back requiere archive_path)
// export const createInvoice = createAsyncThunk(
//   "invoices/create",
//   async (payload, { getState, rejectWithValue }) => {
//     try {
//       const st = getState();
//       const supplier_id = payload?.supplier_id ?? st?.users?.authUser?.id;
//       const body = { ...payload, supplier_id };
//       const { data } = await api.post("", body);
//       return data?.invoice ?? null;
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo crear la factura."
//       );
//     }
//   }
// );

// // ACTUALIZAR
// export const updateInvoice = createAsyncThunk(
//   "invoices/update",
//   async ({ id, updates }, { rejectWithValue }) => {
//     try {
//       const { data } = await api.put(`?id=${id}`, updates);
//       const updated = data?.invoice ? data.invoice : { id, ...updates };
//       return { id, updates: updated };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo actualizar la factura."
//       );
//     }
//   }
// );

// // src/redux/invoices.slice.js
// export const deleteInvoice = createAsyncThunk(
//   "invoices/delete",
//   async (payload, { rejectWithValue }) => {
//     try {
//       const { id, reason, hard } =
//         typeof payload === "object" ? payload : { id: payload };

//       // 👉 mandamos los query params con axios (evita .../invoices.php/?id=...)
//       const { data } = await api.delete("", {
//         params: {
//           id,
//           ...(hard ? { hard: 1 } : { reason }),
//         },
//       });

//       if (hard) {
//         return { id, hard: true }; // back responde { message, id }
//       }

//       const updated = data?.invoice
//         ? data.invoice
//         : { id, is_valid: 0, invalid_reason: reason || "Invalidada" };

//       return { id, updates: updated, hard: false };
//     } catch (e) {
//      const msg   = e?.response?.data?.message;
//       const det   = e?.response?.data?.detail;
//       const human = [msg, det].filter(Boolean).join(" — ");
//       console.error("DELETE /invoices hard failed:", e?.response?.data ?? e);
//       return rejectWithValue(human || "No se pudo eliminar la factura.");
//     }
//   }
// );



// // VALIDAR (volver a válida)
// export const validateInvoice = createAsyncThunk(
//   "invoices/validate",
//   async (id, { rejectWithValue }) => {
//     try {
//       const { data } = await api.put(`?id=${id}`, {
//         is_valid: 1,
//         invalid_reason: null,
//         invalidated_at: null,
//       });
//       const updated = data?.invoice
//         ? data.invoice
//         : { id, is_valid: 1, invalid_reason: null, invalidated_at: null };
//       return { id, updates: updated };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo validar la factura."
//       );
//     }
//   }
// );

// // TOGGLE estado de pago
// export const toggleInvoiceStatus = createAsyncThunk(
//   "invoices/toggleStatus",
//   async ({ id, currentStatus }, { rejectWithValue }) => {
//     try {
//       const next = currentStatus === "Pagado" ? "Pendiente" : "Pagado";
//       const { data } = await api.put(`?id=${id}`, { payment_status: next });
//       const updated = data?.invoice
//         ? data.invoice
//         : { id, payment_status: next };
//       return { id, updates: updated };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo cambiar el estado."
//       );
//     }
//   }
// );

// // AGREGAR COMPROBANTE (invoices_payment)
// export const addInvoicePayment = createAsyncThunk(
//   "invoices/addPayment",
//   async (
//     { invoice_id, receipt_path = null, paid_at, mark_as_paid = 0 },
//     { rejectWithValue }
//   ) => {
//     try {
//       const { data } = await api.post(`?action=add_payment`, {
//         invoice_id,
//         receipt_path,
//         paid_at, // el back usa strtotime: 'YYYY-MM-DD HH:mm:ss' o ISO válido
//         mark_as_paid, // 0 | 1
//       });
//       return {
//         payment: data?.payment ?? null,
//         // si el back marcó como Pagado, no siempre vuelve la invoice; el front lo deduce igual
//         markAsPaid: mark_as_paid === 1,
//       };
//     } catch (e) {
//       return rejectWithValue(
//         e?.response?.data?.message || "No se pudo registrar el comprobante."
//       );
//     }
//   }
// );

// /* ================= State & Slice ================= */

// const initialState = {
//   items: [],
//   total: 0,
//   status: "idle",
//   error: null,

//   selected: null,
//   selectedPayments: [],

//   // Filtros soportados por el back
//   filters: {
//     company_name: "",
//     category_id: "",
//     locality_id: "",
//     payment_status: "", // 'Pagado' | 'Pendiente' | ''
//     is_valid: "", // '' | 0 | 1
//     month: "", // 1..12 | ''
//     date_from: "", // opcional
//     date_to: "", // opcional
//     q: "", // busca en archive_path
//   },

//   pagination: {
//     limit: 50,
//     offset: 0,
//   },
// };

// const invoicesSlice = createSlice({
//   name: "invoices",
//   initialState,
//   reducers: {
//     setFilters(state, action) {
//       state.filters = { ...state.filters, ...action.payload };
//       state.pagination.offset = 0;
//     },
//     clearFilters(state) {
//       state.filters = {
//         category_id: "",
//         locality_id: "",
//         payment_status: "",
//         is_valid: "",
//         month: "",
//         date_from: "",
//         date_to: "",
//         q: "",
//       };
//       state.pagination.offset = 0;
//     },
//     setPagination(state, action) {
//       state.pagination = { ...state.pagination, ...action.payload };
//     },
//     setPage(state, action) {
//       const page = Math.max(1, parseInt(action.payload || 1, 10));
//       state.pagination.offset = (page - 1) * state.pagination.limit;
//     },
//     selectInvoice(state, action) {
//       state.selected = action.payload || null;
//       state.selectedPayments = []; // limpio pagos cuando cambio de selección
//     },
//     clearInvoicesState(state) {
//       Object.assign(state, initialState);
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // list
//       .addCase(fetchInvoices.pending, (s) => {
//         s.status = "loading";
//         s.error = null;
//       })
//       .addCase(fetchInvoices.fulfilled, (s, a) => {
//         s.status = "succeeded";
//         s.items = a.payload.invoices;
//         s.total = a.payload.total;
//         s.pagination.limit = a.payload.limit;
//         s.pagination.offset = a.payload.offset;
//       })
//       .addCase(fetchInvoices.rejected, (s, a) => {
//         s.status = "failed";
//         s.error = a.payload;
//       })

//       // detail
//       .addCase(fetchInvoiceById.pending, (s) => {
//         s.status = "loading";
//         s.error = null;
//       })
//       .addCase(fetchInvoiceById.fulfilled, (s, a) => {
//         s.status = "succeeded";
//         s.selected = a.payload.invoice;
//         s.selectedPayments = a.payload.payments ?? [];
//         // sincronizo en el listado si ya existe
//         if (s.selected?.id) {
//           s.items = s.items.map((it) =>
//             it.id === s.selected.id ? s.selected : it
//           );
//         }
//       })
//       .addCase(fetchInvoiceById.rejected, (s, a) => {
//         s.status = "failed";
//         s.error = a.payload;
//       })

//       // create
//       .addCase(createInvoice.fulfilled, (s, a) => {
//         if (a.payload) {
//           s.items = [a.payload, ...s.items];
//           s.total += 1;
//         }
//       })

//       // update
//       .addCase(updateInvoice.fulfilled, (s, a) => {
//         const { id, updates } = a.payload;
//         s.items = s.items.map((it) =>
//           it.id === id ? { ...it, ...updates } : it
//         );
//         if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
//       })

      
//       .addCase(deleteInvoice.fulfilled, (s, a) => {
//   const { id, updates, hard } = a.payload;
//   if (hard) {
//     s.items = s.items.filter((it) => it.id !== id);
//     s.total = Math.max(0, (s.total ?? 0) - 1);
//     if (s.selected?.id === id) s.selected = null;
//   } else {
//     s.items = s.items.map((it) => (it.id === id ? { ...it, ...updates } : it));
//     if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
//   }
// })
// .addCase(deleteInvoice.rejected, (s, a) => {
//   s.error = a.payload || "No se pudo eliminar la factura.";
// })


//       // validate
//       .addCase(validateInvoice.fulfilled, (s, a) => {
//         const { id, updates } = a.payload;
//         s.items = s.items.map((it) =>
//           it.id === id ? { ...it, ...updates } : it
//         );
//         if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
//       })

//       // toggle status
//       .addCase(toggleInvoiceStatus.fulfilled, (s, a) => {
//         const { id, updates } = a.payload;
//         s.items = s.items.map((it) =>
//           it.id === id ? { ...it, ...updates } : it
//         );
//         if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
//       })

//       // add payment
//       .addCase(addInvoicePayment.fulfilled, (s, a) => {
//         const { payment, markAsPaid } = a.payload;
//         if (payment) {
//           // si estoy en el detalle de esa factura, agrego el pago
//           if (s.selected?.id === payment.invoice_id) {
//             s.selectedPayments = [payment, ...s.selectedPayments];
//             if (markAsPaid) {
//               s.selected = { ...s.selected, payment_status: "Pagado" };
//             }
//           }
//           // sincronizo el listado si hace falta
//           s.items = s.items.map((it) =>
//             it.id === payment.invoice_id
//               ? { ...it, ...(markAsPaid ? { payment_status: "Pagado" } : {}) }
//               : it
//           );
//         }
//       });
//   },
// });

// export const {
//   setFilters,
//   clearFilters,
//   setPagination,
//   setPage,
//   selectInvoice,
//   clearInvoicesState,
// } = invoicesSlice.actions;

// export default invoicesSlice.reducer;


// src/redux/invoices.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_INVOICES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/invoices/invoices.php";

// ⚠️ No seteamos Content-Type global (rompe FormData/multipart)
const api = axios.create({
  baseURL,
  withCredentials: true,
});

// helper JSON headers
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

// querystring helper
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

// LISTADO (respetando los filtros que soporta el back)
export const fetchInvoices = createAsyncThunk(
  "invoices/fetchList",
  async (params, { getState, rejectWithValue }) => {
    try {
      const st = getState();
      const user = st?.users?.authUser;
      const isAdmin = !!user?.is_administrator;

      const filters = st?.invoices?.filters ?? {};
      const pagination = st?.invoices?.pagination ?? {};

      const queryBase = {
        // Si no es admin, limitar por proveedor
        ...(!isAdmin && user?.id ? { supplier_id: user.id } : {}),

        // Filtros soportados por tu back
        company_name: filters.company_name || undefined,
        category_id: filters.category_id || undefined,
        locality_id: filters.locality_id || undefined,
        payment_status: filters.payment_status || undefined, // 'Pendiente' | 'Pagado'
        is_valid:
          filters.is_valid === 0 || filters.is_valid === 1
            ? filters.is_valid
            : undefined,
        month: filters.month ? Number(filters.month) : undefined, // 1..12
        date_from: filters.date_from || undefined, // 'YYYY-MM-DD HH:mm:ss'
        date_to: filters.date_to || undefined,
        q: filters.q || undefined, // busca en archive_path

        // paginación
        limit: pagination.limit,
        offset: pagination.offset,
      };

      // Overrides del caller
      const overrides = { ...(params || {}) };
      if (isAdmin) {
        delete queryBase.supplier_id;
        delete overrides.supplier_id;
      }

      const query = qs({ ...queryBase, ...overrides });

      const { data } = await api.get(query);
      return {
        invoices: Array.isArray(data?.invoices) ? data.invoices : [],
        total: Number(data?.total ?? 0),
        limit: Number(data?.limit ?? pagination.limit ?? 50),
        offset: Number(data?.offset ?? pagination.offset ?? 0),
      };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener las facturas."
      );
    }
  }
);

// DETALLE (opcional incluir pagos)
export const fetchInvoiceById = createAsyncThunk(
  "invoices/fetchById",
  async ({ id, includePayments = false }, { rejectWithValue }) => {
    try {
      const query = qs({
        id,
        ...(includePayments ? { include_payments: 1 } : {}),
      });
      const { data } = await api.get(query);
      return {
        invoice: data?.invoice ?? null,
        payments: Array.isArray(data?.payments) ? data.payments : [],
      };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo obtener la factura."
      );
    }
  }
);

// CREAR (el back requiere archive_path)
export const createInvoice = createAsyncThunk(
  "invoices/create",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const st = getState();
      const supplier_id = payload?.supplier_id ?? st?.users?.authUser?.id;
      const body = { ...payload, supplier_id };
      const { data } = await api.post("", body, JSON_HEADERS);
      return data?.invoice ?? null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo crear la factura."
      );
    }
  }
);

// ACTUALIZAR
export const updateInvoice = createAsyncThunk(
  "invoices/update",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`?id=${id}`, updates, JSON_HEADERS);
      const updated = data?.invoice ? data.invoice : { id, ...updates };
      return { id, updates: updated };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo actualizar la factura."
      );
    }
  }
);

// ELIMINAR
export const deleteInvoice = createAsyncThunk(
  "invoices/delete",
  async (payload, { rejectWithValue }) => {
    try {
      const { id, reason, hard } =
        typeof payload === "object" ? payload : { id: payload };

      // Pasamos params por axios
      const { data } = await api.delete("", {
        params: { id, ...(hard ? { hard: 1 } : { reason }) },
      });

      if (hard) {
        return { id, hard: true }; // back responde { message, id }
      }

      const updated = data?.invoice
        ? data.invoice
        : { id, is_valid: 0, invalid_reason: reason || "Invalidada" };

      return { id, updates: updated, hard: false };
    } catch (e) {
      const msg = e?.response?.data?.message;
      const det = e?.response?.data?.detail;
      const human = [msg, det].filter(Boolean).join(" — ");
      console.error("DELETE /invoices hard failed:", e?.response?.data ?? e);
      return rejectWithValue(human || "No se pudo eliminar la factura.");
    }
  }
);

// VALIDAR (volver a válida)
export const validateInvoice = createAsyncThunk(
  "invoices/validate",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `?id=${id}`,
        { is_valid: 1, invalid_reason: null, invalidated_at: null },
        JSON_HEADERS
      );
      const updated = data?.invoice
        ? data.invoice
        : { id, is_valid: 1, invalid_reason: null, invalidated_at: null };
      return { id, updates: updated };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo validar la factura."
      );
    }
  }
);

// TOGGLE estado de pago
export const toggleInvoiceStatus = createAsyncThunk(
  "invoices/toggleStatus",
  async ({ id, currentStatus }, { rejectWithValue }) => {
    try {
      const next = currentStatus === "Pagado" ? "Pendiente" : "Pagado";
      const { data } = await api.put(
        `?id=${id}`,
        { payment_status: next },
        JSON_HEADERS
      );
      const updated = data?.invoice
        ? data.invoice
        : { id, payment_status: next };
      return { id, updates: updated };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo cambiar el estado."
      );
    }
  }
);

// AGREGAR COMPROBANTE (invoices_payment) vía JSON (sin archivo)
export const addInvoicePayment = createAsyncThunk(
  "invoices/addPayment",
  async (
    { invoice_id, receipt_path = null, paid_at, mark_as_paid = 0 },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(
        `?action=add_payment`,
        { invoice_id, receipt_path, paid_at, mark_as_paid },
        JSON_HEADERS
      );
      return {
        payment: data?.payment ?? null,
        markAsPaid: mark_as_paid === 1,
      };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || "No se pudo registrar el comprobante."
      );
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
  selectedPayments: [],

  // Filtros soportados por el back
  filters: {
    company_name: "",
    category_id: "",
    locality_id: "",
    payment_status: "", // 'Pagado' | 'Pendiente' | ''
    is_valid: "", // '' | 0 | 1
    month: "", // 1..12 | ''
    date_from: "", // opcional
    date_to: "", // opcional
    q: "", // busca en archive_path
  },

  pagination: {
    limit: 50,
    offset: 0,
  },
};

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.offset = 0;
    },
    clearFilters(state) {
      state.filters = {
        company_name: "",
        category_id: "",
        locality_id: "",
        payment_status: "",
        is_valid: "",
        month: "",
        date_from: "",
        date_to: "",
        q: "",
      };
      state.pagination.offset = 0;
    },
    setPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setPage(state, action) {
      const page = Math.max(1, parseInt(action.payload || 1, 10));
      state.pagination.offset = (page - 1) * state.pagination.limit;
    },
    selectInvoice(state, action) {
      state.selected = action.payload || null;
      state.selectedPayments = []; // limpio pagos cuando cambio de selección
    },
    clearInvoicesState(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchInvoices.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload.invoices;
        s.total = a.payload.total;
        s.pagination.limit = a.payload.limit;
        s.pagination.offset = a.payload.offset;
      })
      .addCase(fetchInvoices.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // detail
      .addCase(fetchInvoiceById.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.selected = a.payload.invoice;
        s.selectedPayments = a.payload.payments ?? [];
        // sincronizo en el listado si ya existe
        if (s.selected?.id) {
          s.items = s.items.map((it) =>
            it.id === s.selected.id ? s.selected : it
          );
        }
      })
      .addCase(fetchInvoiceById.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
      })

      // create
      .addCase(createInvoice.fulfilled, (s, a) => {
        if (a.payload) {
          s.items = [a.payload, ...s.items];
          s.total += 1;
        }
      })

      // update
      .addCase(updateInvoice.fulfilled, (s, a) => {
        const { id, updates } = a.payload;
        s.items = s.items.map((it) =>
          it.id === id ? { ...it, ...updates } : it
        );
        if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
      })

      // delete
      .addCase(deleteInvoice.fulfilled, (s, a) => {
        const { id, updates, hard } = a.payload;
        if (hard) {
          s.items = s.items.filter((it) => it.id !== id);
          s.total = Math.max(0, (s.total ?? 0) - 1);
          if (s.selected?.id === id) s.selected = null;
        } else {
          s.items = s.items.map((it) =>
            it.id === id ? { ...it, ...updates } : it
          );
          if (s.selected?.id === id)
            s.selected = { ...s.selected, ...updates };
        }
      })
      .addCase(deleteInvoice.rejected, (s, a) => {
        s.error = a.payload || "No se pudo eliminar la factura.";
      })

      // validate
      .addCase(validateInvoice.fulfilled, (s, a) => {
        const { id, updates } = a.payload;
        s.items = s.items.map((it) =>
          it.id === id ? { ...it, ...updates } : it
        );
        if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
      })

      // toggle status
      .addCase(toggleInvoiceStatus.fulfilled, (s, a) => {
        const { id, updates } = a.payload;
        s.items = s.items.map((it) =>
          it.id === id ? { ...it, ...updates } : it
        );
        if (s.selected?.id === id) s.selected = { ...s.selected, ...updates };
      })

      // add payment (JSON, sin archivo)
      .addCase(addInvoicePayment.fulfilled, (s, a) => {
        const { payment, markAsPaid } = a.payload;
        if (payment) {
          if (s.selected?.id === payment.invoice_id) {
            s.selectedPayments = [payment, ...s.selectedPayments];
            if (markAsPaid) {
              s.selected = { ...s.selected, payment_status: "Pagado" };
            }
          }
          s.items = s.items.map((it) =>
            it.id === payment.invoice_id
              ? { ...it, ...(markAsPaid ? { payment_status: "Pagado" } : {}) }
              : it
          );
        }
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setPagination,
  setPage,
  selectInvoice,
  clearInvoicesState,
} = invoicesSlice.actions;

export default invoicesSlice.reducer;
