// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import usersReducer, { hydrateAuth } from "./users.slice";
import invoicesReducer from "./invoices.slice";
import categoriesReducer from "./categories.slice"; 
import localitiesReducer from "./localities.slice";

const store = configureStore({
  reducer: {
    users: usersReducer,
    invoices: invoicesReducer,
    categories: categoriesReducer,
    localities: localitiesReducer,
    // si tenés más slices, agregalos acá
  },
  devTools: true,
});

// 🔸 Hidratar auth desde localStorage (opcional)
try {
  const raw = localStorage.getItem("user");
  if (raw) {
    const parsed = JSON.parse(raw);
    store.dispatch(hydrateAuth(parsed));
  }
} catch (_) {
  // ignore
}

export default store;
