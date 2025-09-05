// src/components/suppliers/SuppliersTable.jsx
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { FaEdit, FaUserSlash, FaTrash } from "react-icons/fa";
import { Dialog, Transition } from "@headlessui/react";
import Pagination from "../pagination";
import { formatCuit } from "../utils";
import ProfileCard from "../panel/profileCard";

// Redux
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsers,
  fetchUserById,
  deleteUser,
  setFilters,
  setPage,
  resetFilters,
} from "../../redux/users.slice";
import EditSupplier from "./editSuppliers";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function SuppliersTable() {
  const dispatch = useDispatch();
  const {
    list: items,
    status,
    error,
    total,
    pagination,
    filters,
  } = useSelector((s) => s.users);

  const limit = pagination?.limit ?? 10;
  const offset = pagination?.offset ?? 0;
  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((total ?? 0) / limit)),
    [total, limit]
  );

  // ===== Filtros locales controlados
  const [q, setQ] = useState(filters.q || "");
  const [isAdmin, setIsAdmin] = useState(
    filters.is_admin === 0 || filters.is_admin === 1
      ? String(filters.is_admin)
      : ""
  );
  const [isActive, setIsActive] = useState(
    filters.is_active === 0 || filters.is_active === 1
      ? String(filters.is_active)
      : ""
  );

  // Debounce búsqueda
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Cargar lista al iniciar y cuando cambian filtros/paginación
  useEffect(() => {
    dispatch(fetchUsers());
  }, [
    dispatch,
    filters.is_admin,
    filters.is_active,
    filters.q,
    pagination.limit,
    pagination.offset,
  ]);

  // Empujar q al slice con debounce
  useEffect(() => {
    dispatch(setFilters({ q: debouncedQ }));
  }, [debouncedQ, dispatch]);

  // Handlers filtros
  const onChangeIsAdmin = (v) => {
    setIsAdmin(v);
    dispatch(setFilters({ is_admin: v === "" ? null : Number(v) }));
  };
  const onChangeIsActive = (v) => {
    setIsActive(v);
    dispatch(setFilters({ is_active: v === "" ? null : Number(v) }));
  };

  // Helpers para limpiar individualmente
  const clearQ = () => {
    setQ("");
    dispatch(setFilters({ q: "" }));
  };
  const clearIsAdmin = () => onChangeIsAdmin("");
  const clearIsActive = () => onChangeIsActive("");

  // Pills de filtros activos
  const activeFilters = useMemo(() => {
    const pills = [];
    if (q?.trim())
      pills.push({ k: "Buscar", v: q.trim(), clear: clearQ });
    if (isAdmin !== "")
      pills.push({
        k: "Tipo",
        v: isAdmin === "1" ? "Administrador" : "Proveedor",
        clear: clearIsAdmin,
      });
    if (isActive !== "")
      pills.push({
        k: "Estado",
        v: isActive === "1" ? "Activos" : "Inactivos",
        clear: clearIsActive,
      });
    return pills;
  }, [q, isAdmin, isActive]);

  // Paginación
  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    dispatch(setPage(nextPage));
  };

  // ===== Modales =====
  // Ver proveedor
  const [provModal, setProvModal] = useState({
    open: false,
    loading: false,
    error: "",
    data: null,
  });
  const openProveedor = async (id) => {
    if (!id) return;
    setProvModal({ open: true, loading: true, error: "", data: null });
    try {
      const user = await dispatch(fetchUserById(id)).unwrap();
      setProvModal({
        open: true,
        loading: false,
        error: "",
        data: user || null,
      });
    } catch (e) {
      setProvModal({
        open: true,
        loading: false,
        error: e || "Error al cargar.",
        data: null,
      });
    }
  };
  const closeProveedor = () =>
    setProvModal({ open: false, loading: false, error: "", data: null });

  // Eliminar proveedor
  const [delModal, setDelModal] = useState({
    open: false,
    loading: false,
    error: "",
    user: null,
  });
  const openDelete = (u) =>
    setDelModal({ open: true, loading: false, error: "", user: u });
  const closeDelete = () =>
    setDelModal({ open: false, loading: false, error: "", user: null });

  const confirmDelete = async () => {
    if (!delModal.user?.id) return;
    setDelModal((m) => ({ ...m, loading: true, error: "" }));
    try {
      await dispatch(deleteUser(delModal.user.id)).unwrap();
      closeDelete(); // extraReducer ya saca el user de la lista
    } catch (e) {
      setDelModal((m) => ({
        ...m,
        loading: false,
        error: e || "No se pudo eliminar.",
      }));
    }
  };

  const handleResetFilters = () => {
    // limpiar inputs locales
    setQ("");
    setIsAdmin("");
    setIsActive("");
    // resetear slice + volver a cargar
    dispatch(resetFilters());
    dispatch(fetchUsers());
  };

  // ===== MOBILE: sheet de filtros
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

      {/* ===== DESKTOP: Buscador y filtros ===== */}
      <section className="mb-5 hidden md:block">
        <div className="rounded-md bg-white p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="field-label mb-2">
                Buscar proveedores (razón social / fantasía / CUIT-CUIL)
              </label>
              <input
                type="search"
                className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="Ej: ACME / Juan Pérez / 20123456783"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label mb-2">Tipo de usuario</label>
              <select
                className="select border border-slate-300 w-full"
                value={isAdmin}
                onChange={(e) => onChangeIsAdmin(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="1">Administrador</option>
                <option value="0">Proveedor</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="field-label mb-2">Estado</label>
              <select
                className="select border border-slate-300 w-full"
                value={isActive}
                onChange={(e) => onChangeIsActive(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="1">Activos</option>
                <option value="0">Inactivos</option>
              </select>
            </div>

            {/* Botón a la derecha */}
            <div className="md:col-span-8 flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LISTA MOBILE (cards) ===== */}
      <div className="md:hidden mt-4 space-y-3">
        {status === "loading" && (
          <div className="rounded-lg border bg-white p-4 text-center text-slate-500">
            Cargando…
          </div>
        )}

        {status !== "loading" && items.length === 0 && (
          <div className="rounded-lg border bg-white p-4 text-center text-slate-500">
            {error || "No hay resultados."}
          </div>
        )}

        {status !== "loading" &&
          items.map((u) => {
            const company = u?.company_name || "—";
            const fantasy = u?.fantasy_name ? ` (${u.fantasy_name})` : "";
            const cuitFmt = formatCuit(u?.cuit_or_cuil) || "—";
            const isAdministrator = !!Number(u?.is_administrator);
            const isActiveRow = u?.is_active !== 0;

            return (
              <div key={u.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-500">{cuitFmt}</span>
                  {!isActiveRow ? (
                    <span className="status-badge status-badge--muted">Inactivo</span>
                  ) : isAdministrator ? (
                    <span className="status-badge status-badge--admin">Administrador</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="mt-2 text-left text-sm font-semibold text-slate-900 hover:underline"
                  onClick={() => openProveedor(u.id)}
                  title="Ver datos del proveedor"
                >
                  {company}
                  {fantasy}
                </button>

                <div className="mt-3 flex items-center gap-3">
                  <EditSupplier user={u} />
<button
  type="button"
  onClick={() => openDelete(u)}
  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50/40 active:bg-red-100/50 transition-colors"
  title="Eliminar"
  aria-label="Eliminar"
>
  <FaTrash className="text-current" />
</button>

                </div>
              </div>
            );
          })}
      </div>

      {/* ===== TABLA DESKTOP ===== */}
      <div className="hidden md:block card mt-2">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="thead">
              <tr>
                <Th>CUIT / CUIL</Th>
                <Th>Razón social (fantasía)</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {status === "loading" && (
                <tr>
                  <td colSpan={3} className="td text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              )}

              {status !== "loading" &&
                items.map((u) => {
                  const company = u?.company_name || "—";
                  const fantasy = u?.fantasy_name ? ` (${u.fantasy_name})` : "";
                  const cuitFmt = formatCuit(u?.cuit_or_cuil) || "—";
                  const isAdministrator = !!Number(u?.is_administrator);
                  const isActiveRow = u?.is_active !== 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 group">
                      <Td className="font-medium">{cuitFmt}</Td>

                      <Td className="font-medium text-slate-900">
                        <button
                          type="button"
                          className="text-left group"
                          onClick={() => openProveedor(u.id)}
                          title="Ver datos del proveedor"
                        >
                          <span className="group-hover:underline">
                            {company}
                            {fantasy}
                          </span>
                          {isAdministrator && (
                            <span className="ml-2 status-badge status-badge--admin align-middle">
                              Administrador
                            </span>
                          )}
                          {!isActiveRow && (
                            <span className="ml-2 status-badge status-badge--muted align-middle">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          <EditSupplier user={u} />
                          <button
                            type="button"
                            onClick={() => openDelete(u)}
                            className="icon-btn text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar (opción avanzada)"
                            aria-label="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}

              {status !== "loading" && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="td text-center text-slate-500">
                    {error || "No hay resultados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Paginación ===== */}
      <Pagination
        page={page}
        pageCount={pageCount}
        total={total ?? 0}
        limit={limit}
        disabled={status === "loading"}
        onPageChange={handlePageChange}
      />

      {/* ===== Modal Proveedor ===== */}
      <Transition appear show={provModal.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeProveedor}>
          <Transition.Child
            as={Fragment}
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
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    {provModal.data?.company_name || "Proveedor"}
                  </Dialog.Title>

                  {provModal.loading && (
                    <p className="mt-4 text-slate-500">Cargando proveedor…</p>
                  )}
                  {!provModal.loading && provModal.error && (
                    <p className="mt-4 text-red-600">{provModal.error}</p>
                  )}

                  {!provModal.loading && !provModal.error && (
                    <div className="mt-4">
                      <ProfileCard user={provModal.data} compact />
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={closeProveedor}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ===== Modal Eliminar ===== */}
      <Transition appear show={delModal.open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={delModal.loading ? () => {} : closeDelete}
        >
          <Transition.Child
            as={Fragment}
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
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-red-600">
                    Eliminar proveedor
                  </Dialog.Title>

                  <p className="mt-3 text-sm text-slate-700">
                    ¿Seguro querés eliminar{" "}
                    <span className="font-medium">
                      {delModal.user?.company_name || "este proveedor"}
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

      {/* ===== MOBILE Filter Sheet (bottom) ===== */}
      <Transition appear show={mobileFiltersOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 md:hidden"
          onClose={setMobileFiltersOpen}
        >
          <Transition.Child
            as={Fragment}
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
              as={Fragment}
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
                      <label className="field-label mb-2">
                        Buscar proveedores
                      </label>
                      <input
                        type="search"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                        placeholder="Ej: ACME / Juan Pérez / 20123456783"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="field-label mb-2">Tipo de usuario</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={isAdmin}
                        onChange={(e) => onChangeIsAdmin(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="1">Administrador</option>
                        <option value="0">Proveedor</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Estado</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={isActive}
                        onChange={(e) => onChangeIsActive(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="1">Activos</option>
                        <option value="0">Inactivos</option>
                      </select>
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
  return <td className={`td ${className}`}>{children}</td>;
}
