import { createSelector } from "reselect";

// Selector general de usuarios

export const selectUsers = (state) => state.users;

// usuarios ordenados por apellido y nombre

export const selectSortedUsers = createSelector([selectUsers], (users) => {
  return users.sort((a, b) => {
    const nameA = a.lastname.toLowerCase() + a.first_name.toLowerCase();
    const nameB = b.lastname.toLowerCase() + b.first_name.toLowerCase();
    return nameA.localeCompare(nameB);
  });
});

// Selector base
export const selectUsdRates = (state) => state.usd_rates;

// Ordenado por ID descendente
export const selectUsdRatesByIdDesc = createSelector(
  [selectUsdRates],
  (usdRates) => {
    if (!Array.isArray(usdRates)) return [];
    return [...usdRates].sort((a, b) => b.id - a.id);
  }
);

// Selector general de proveedores y ordenado alfabéticamente (supplier_name)
export const selectSuppliers = (state) => state.suppliers;
export const selectSortedSuppliers = createSelector(
  [selectSuppliers],
  (suppliers) => {
    if (!Array.isArray(suppliers)) return [];
    return [...suppliers].sort((a, b) => {
      const nameA = a.supplier_name.toLowerCase();
      const nameB = b.supplier_name.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
);