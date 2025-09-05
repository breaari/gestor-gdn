// // src/components/panel/LocalitiesTable.jsx
// import React, { useState, useEffect, useMemo } from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { Dialog, Transition } from "@headlessui/react";
// import { FaTrash } from "react-icons/fa";

// import {
//   fetchLocalities,
//   setFilters,
//   deleteLocality,
//   setPage,
//   setPagination, // 👈 forzar 5 por página
// } from "../../redux/localities.slice";

// import Pagination from "../pagination";
// import EditLocality from "./editLocality"; // (lo creamos luego)

// const cx = (...c) => c.filter(Boolean).join(" ");

// export default function LocalitiesTable() {
//   const dispatch = useDispatch();
//   const {
//     list = [],
//     status = "idle",
//     error = null,
//     total = 0,
//     pagination = { limit: 20, offset: 0 },
//   } = useSelector((s) => s.localities ?? {});

//   const limit = pagination?.limit ?? 20;
//   const offset = pagination?.offset ?? 0;
//   const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
//   const pageCount = useMemo(
//     () => Math.max(1, Math.ceil((total ?? 0) / limit)),
//     [total, limit]
//   );

//   /* ===== Forzar 5 por página una sola vez ===== */
//   useEffect(() => {
//     if ((pagination?.limit ?? 0) !== 5) {
//       dispatch(setPagination({ limit: 5, offset: 0 }));
//       dispatch(fetchLocalities());
//     } else if (status === "idle") {
//       dispatch(fetchLocalities());
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [status]);

//   /* ===== Buscador por nombre/slug ===== */
//   const [q, setQ] = useState("");
//   const [debouncedQ, setDebouncedQ] = useState(q);
//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
//     return () => clearTimeout(t);
//   }, [q]);

//   useEffect(() => {
//     dispatch(setFilters({ q: debouncedQ }));
//     dispatch(fetchLocalities());
//   }, [debouncedQ, dispatch]);

//   // Cambio de página
//   const handlePageChange = (nextPage) => {
//     if (nextPage < 1 || nextPage > pageCount) return;
//     dispatch(setPage(nextPage));
//     dispatch(fetchLocalities());
//   };

//   /* ===== Modal eliminar ===== */
//   const [delModal, setDelModal] = useState({
//     open: false,
//     loading: false,
//     error: "",
//     locality: null,
//   });

//   const openDelete = (locality) =>
//     setDelModal({ open: true, loading: false, error: "", locality });

//   const closeDelete = () =>
//     setDelModal({ open: false, loading: false, error: "", locality: null });

//   const confirmDelete = async () => {
//     if (!delModal.locality?.id) return;
//     setDelModal((m) => ({ ...m, loading: true, error: "" }));
//     try {
//       await dispatch(deleteLocality(delModal.locality.id)).unwrap();
//       closeDelete();
//       dispatch(fetchLocalities());
//     } catch (e) {
//       setDelModal((m) => ({
//         ...m,
//         loading: false,
//         error: e || "No se pudo eliminar.",
//       }));
//     }
//   };

//   return (
//     <>
//       {/* Filtro de búsqueda */}
//       <section className="mb-4">
//         <div className="rounded-md bg-white p-4 md:p-5 border border-slate-200">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
//             <div className="md:col-span-2">
//               <label className="field-label mb-2">Buscar localidad</label>
//               <input
//                 type="search"
//                 className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//                 placeholder="Nombre…"
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//               />
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Tabla */}
//       <div className="card">
//         <div className="overflow-x-auto">
//           <table className="table">
//             <thead className="thead">
//               <tr>
//                 <Th>Nombre</Th>
//                 <Th>Acciones</Th>
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-slate-200">
//               {status === "loading" && (
//                 <tr>
//                   <td colSpan={2} className="td text-center text-slate-500">
//                     Cargando…
//                   </td>
//                 </tr>
//               )}

//               {status !== "loading" &&
//                 list.map((l) => (
//                   <tr key={l.id} className="hover:bg-slate-50 group">
//                     <Td className="font-medium text-slate-900">
//                       {l.name || "—"}
//                     </Td>

//                     <Td>
//                       <div className="flex items-center gap-2">
//                         <EditLocality locality={l} />

//                         <button
//                           type="button"
//                           onClick={() => openDelete(l)}
//                           className="icon-btn text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
//                           title="Eliminar"
//                           aria-label="Eliminar"
//                         >
//                           <FaTrash />
//                         </button>
//                       </div>
//                     </Td>
//                   </tr>
//                 ))}

//               {status !== "loading" && list.length === 0 && (
//                 <tr>
//                   <td colSpan={2} className="td text-center text-slate-500">
//                     {error || "No hay localidades para mostrar."}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Paginación */}
//       <div className="mt-4">
//         <Pagination
//           page={page}
//           pageCount={pageCount}
//           total={total ?? 0}
//           limit={limit}
//           disabled={status === "loading"}
//           onPageChange={handlePageChange}
//         />
//       </div>

//       {/* Modal Eliminar */}
//       <Transition appear show={delModal.open} as={React.Fragment}>
//         <Dialog
//           as="div"
//           className="relative z-50"
//           onClose={delModal.loading ? () => {} : closeDelete}
//         >
//           <Transition.Child
//             as={React.Fragment}
//             enter="ease-out duration-150"
//             enterFrom="opacity-0"
//             enterTo="opacity-100"
//             leave="ease-in duration-100"
//             leaveFrom="opacity-100"
//             leaveTo="opacity-0"
//           >
//             <div className="fixed inset-0 bg-black/40" />
//           </Transition.Child>

//           <div className="fixed inset-0 overflow-y-auto">
//             <div className="flex min-h-full items-center justify-center p-4">
//               <Transition.Child
//                 as={React.Fragment}
//                 enter="ease-out duration-200"
//                 enterFrom="opacity-0 scale-95"
//                 enterTo="opacity-100 scale-100"
//                 leave="ease-in duration-150"
//                 leaveFrom="opacity-100 scale-100"
//                 leaveTo="opacity-0 scale-95"
//               >
//                 <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
//                   <Dialog.Title className="text-lg font-semibold text-red-600">
//                     Eliminar localidad
//                   </Dialog.Title>

//                   <p className="mt-3 text-sm text-slate-700">
//                     ¿Seguro querés eliminar{" "}
//                     <span className="font-medium">
//                       {delModal.locality?.name || "esta localidad"}
//                     </span>
//                     ? Esta acción no se puede deshacer.
//                   </p>

//                   {delModal.error && (
//                     <div className="mt-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
//                       {delModal.error}
//                     </div>
//                   )}

//                   <div className="mt-6 flex justify-end gap-3">
//                     <button
//                       type="button"
//                       onClick={closeDelete}
//                       disabled={delModal.loading}
//                       className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//                     >
//                       Cancelar
//                     </button>
//                     <button
//                       type="button"
//                       onClick={confirmDelete}
//                       disabled={delModal.loading}
//                       className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
//                     >
//                       {delModal.loading ? "Eliminando…" : "Eliminar"}
//                     </button>
//                   </div>
//                 </Dialog.Panel>
//               </Transition.Child>
//             </div>
//           </div>
//         </Dialog>
//       </Transition>
//     </>
//   );
// }

// /* UI helpers */
// function Th({ children }) {
//   return <th className="th">{children}</th>;
// }
// function Td({ children, className = "" }) {
//   return <td className={cx("td", className)}>{children}</td>;
// }

// src/components/panel/LocalitiesTable.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dialog, Transition } from "@headlessui/react";
import { FaTrash } from "react-icons/fa";

import {
  fetchLocalities,
  setFilters,
  deleteLocality,
  setPage,
  setPagination, // forzar 5 por página
} from "../../redux/localities.slice";

import Pagination from "../pagination";
import EditLocality from "./editLocality";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function LocalitiesTable() {
  const dispatch = useDispatch();
  const {
    list = [],
    status = "idle",
    error = null,
    total = 0,
    pagination = { limit: 20, offset: 0 },
  } = useSelector((s) => s.localities ?? {});

  const limit = pagination?.limit ?? 20;
  const offset = pagination?.offset ?? 0;
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((total ?? 0) / limit)),
    [total, limit]
  );

  /* ===== Forzar 5 por página una sola vez ===== */
  useEffect(() => {
    if ((pagination?.limit ?? 0) !== 5) {
      dispatch(setPagination({ limit: 5, offset: 0 }));
      dispatch(fetchLocalities());
    } else if (status === "idle") {
      dispatch(fetchLocalities());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ===== Buscador por nombre ===== */
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    dispatch(setFilters({ q: debouncedQ }));
    dispatch(fetchLocalities());
  }, [debouncedQ, dispatch]);

  // Cambio de página
  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    dispatch(setPage(nextPage));
    dispatch(fetchLocalities());
  };

  /* ===== Reset filtros ===== */
  const handleResetFilters = () => {
    setQ("");
    dispatch(setFilters({ q: "" }));
    dispatch(setPage(1));
    dispatch(fetchLocalities());
  };

  /* ===== Modal eliminar ===== */
  const [delModal, setDelModal] = useState({
    open: false,
    loading: false,
    error: "",
    locality: null,
  });

  const openDelete = (locality) =>
    setDelModal({ open: true, loading: false, error: "", locality });

  const closeDelete = () =>
    setDelModal({ open: false, loading: false, error: "", locality: null });

  const confirmDelete = async () => {
    if (!delModal.locality?.id) return;
    setDelModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      await dispatch(deleteLocality(delModal.locality.id)).unwrap();
      closeDelete();
      dispatch(fetchLocalities());
    } catch (e) {
      setDelModal((m) => ({
        ...m,
        loading: false,
        error: e || "No se pudo eliminar.",
      }));
    }
  };

  /* ===== Mobile: sheet y chips ===== */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilters = useMemo(() => {
    const pills = [];
    if (q?.trim()) pills.push({ k: "Buscar", v: q.trim(), clear: handleResetFilters });
    return pills;
  }, [q]);

  return (
    <div className="p-4 md:p-5">
      {/* ===== MOBILE: trigger filtros + chips ===== */}
      <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-2  flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
        >
          Filtros{activeFilters.length ? ` (${activeFilters.length})` : ""}
        </button>
        <button
          type="button"
          onClick={handleResetFilters}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Limpiar
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="md:hidden mt-2 -mx-4 px-4 overflow-x-auto">
          <div className="flex items-center gap-2 pb-2">
            {activeFilters.map((p, i) => (
              <button
                key={i}
                onClick={p.clear}
                className="whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700"
                title="Quitar filtro"
              >
                <span className="font-semibold">{p.k}:</span> {p.v}
                <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-70">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== DESKTOP: filtro búsqueda ===== */}
      <section className="mb-4 hidden md:block">
        <div className="rounded-md bg-white p-4 md:p-5 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="field-label mb-2">Buscar localidad</label>
              <input
                type="search"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="Nombre…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== LISTA MOBILE (cards) ===== */}
      <div className="md:hidden space-y-3">
        {status === "loading" && (
          <div className="rounded-lg border bg-white p-4 text-center text-slate-500">
            Cargando…
          </div>
        )}

        {status !== "loading" && list.length === 0 && (
          <div className="rounded-lg border bg-white p-4 text-center text-slate-500">
            {error || "No hay localidades para mostrar."}
          </div>
        )}

        {status !== "loading" &&
          list.map((l) => (
            <div key={l.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  {l.name || "—"}
                </div>

                {/* Acciones: Editar + Eliminar (ghost) en la MISMA línea */}
                <div className="flex items-center gap-2">
                  <EditLocality locality={l} />
                  <button
                    type="button"
                    onClick={() => openDelete(l)}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50/40 active:bg-red-100/50 transition-colors"
                    title="Eliminar"
                    aria-label="Eliminar"
                  >
                    <FaTrash className="text-current" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* ===== TABLA DESKTOP ===== */}
      <div className="hidden md:block card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="thead">
              <tr>
                <Th>Nombre</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {status === "loading" && (
                <tr>
                  <td colSpan={2} className="td text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              )}

              {status !== "loading" &&
                list.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 group">
                    <Td className="font-medium text-slate-900">
                      {l.name || "—"}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2">
                        <EditLocality locality={l} />
                        <button
                          type="button"
                          onClick={() => openDelete(l)}
                          className="icon-btn text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar"
                          aria-label="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}

              {status !== "loading" && list.length === 0 && (
                <tr>
                  <td colSpan={2} className="td text-center text-slate-500">
                    {error || "No hay localidades para mostrar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="mt-4">
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total ?? 0}
          limit={limit}
          disabled={status === "loading"}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Modal Eliminar */}
      <Transition appear show={delModal.open} as={React.Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={delModal.loading ? () => {} : closeDelete}
        >
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-red-600">
                    Eliminar localidad
                  </Dialog.Title>

                  <p className="mt-3 text-sm text-slate-700">
                    ¿Seguro querés eliminar{" "}
                    <span className="font-medium">
                      {delModal.locality?.name || "esta localidad"}
                    </span>
                    ? Esta acción no se puede deshacer.
                  </p>

                  {delModal.error && (
                    <div className="mt-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                      {delModal.error}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeDelete}
                      disabled={delModal.loading}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={delModal.loading}
                      className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {delModal.loading ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* MOBILE Filter Sheet (bottom) */}
      <Transition appear show={mobileFiltersOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="relative z-50 md:hidden"
          onClose={setMobileFiltersOpen}
        >
          <Transition.Child
            as={React.Fragment}
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0">
            <Transition.Child
              as={React.Fragment}
              enter="transform transition duration-250"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="transform transition duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel className="mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-2xl">
                {/* handle */}
                <div className="w-full flex justify-center py-2">
                  <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                </div>

                <div className="px-4 pb-2">
                  <Dialog.Title className="text-base font-semibold text-slate-900 mb-3">
                    Filtros
                  </Dialog.Title>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="field-label mb-2">Buscar localidad</label>
                      <input
                        type="search"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                        placeholder="Nombre…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer fijo */}
                <div className="sticky bottom-0 flex items-center gap-3 px-4 py-3 border-t bg-white rounded-b-2xl">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="flex-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Aplicar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

/* UI helpers */
function Th({ children }) {
  return <th className="th">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={cx("td", className)}>{children}</td>;
}
