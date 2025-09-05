// src/components/panel/InvoicesTable.jsx
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { FaEye, FaUpload, FaTrash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, Transition } from "@headlessui/react";
import {
  fetchInvoices,
  setFilters,
  updateInvoice,
  setPage,
  deleteInvoice,
  setPagination,
  clearFilters,
} from "../../redux/invoices.slice";
import Pagination from "../pagination";
import {
  MONTHS_ES,
  toAbsoluteFileUrl,
  fmtDateAR,
  COMPANY_OPTIONS,
} from "../utils";
import ProfileCard from "./ProfileCard";
import EditInvoice from "./editInvoice";
import AddInvoicePayment from "./addInvoicePayment";

const USERS_URL =
  import.meta.env.VITE_API_USERS_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/users/users.php";
const CATEGORIES_URL =
  import.meta.env.VITE_API_CATEGORIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/categories/categories.php";
const LOCALITIES_URL =
  import.meta.env.VITE_API_LOCALITIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/localities/localities.php";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function InvoicesTable({ isAdmin = false }) {
  const dispatch = useDispatch();
  const { items, status, error, filters, total, pagination } = useSelector(
    (s) => s.invoices
  );
  const authUser = useSelector((s) => s.users.authUser);

  // --- cat/loc dinámicos ---
  const [cats, setCats] = useState([]); // [{id,name}]
  const [locs, setLocs] = useState([]); // [{id,name}]
  const catMap = useMemo(
    () => Object.fromEntries(cats.map((c) => [String(c.id), c.name])),
    [cats]
  );
  const locMap = useMemo(
    () => Object.fromEntries(locs.map((l) => [String(l.id), l.name])),
    [locs]
  );

  // Cache de proveedores (id -> {company_name, fantasy_name, ...})
  const [supplierMap, setSupplierMap] = useState({});

  // Filtros locales (inputs controlados)
  const [razonSocial, setRazonSocial] = useState(
    String(filters.company_name || "")
  );
  const [categoria, setCategoria] = useState(String(filters.category_id || ""));
  const [localidad, setLocalidad] = useState(String(filters.locality_id || ""));
  const [estado, setEstado] = useState(filters.payment_status || "");
  const [mes, setMes] = useState(Number(filters.month || 0));
  const [validez, setValidez] = useState(
    filters.is_valid === 0 || filters.is_valid === 1
      ? String(filters.is_valid)
      : ""
  );

  const [localErr, setLocalErr] = useState("");

  // Modal proveedor
  const [provModal, setProvModal] = useState({
    open: false,
    loading: false,
    error: "",
    data: null,
  });

  // Modal "Cargar comprobante"
  const [rcptModal, setRcptModal] = useState({
    open: false,
    loading: false,
    error: "",
    invoice: null,
    file: null, // simulado
  });

  // Modal eliminar
  const [delModal, setDelModal] = useState({
    open: false,
    loading: false,
    error: "",
    invoice: null,
  });

  // MOBILE: sheet de filtros
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Forzar 5 por página una sola vez
  useEffect(() => {
    if ((pagination?.limit ?? 0) !== 5) {
      dispatch(setPagination({ limit: 5, offset: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limit = pagination?.limit ?? 5;
  const offset = pagination?.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / limit));

  // Carga cat/loc al montar (sin is_active)
  useEffect(() => {
    const load = async () => {
      try {
        const [rc, rl] = await Promise.all([
          fetch(`${CATEGORIES_URL}?limit=200`, { credentials: "include" }),
          fetch(`${LOCALITIES_URL}?limit=200`, { credentials: "include" }),
        ]);
        const dc = await rc.json().catch(() => ({}));
        const dl = await rl.json().catch(() => ({}));
        setCats(Array.isArray(dc?.categories) ? dc.categories : []);
        setLocs(Array.isArray(dl?.localities) ? dl.localities : []);
      } catch (_) {
        // silencioso
      }
    };
    load();
  }, []);

  // Carga inicial de facturas
  useEffect(() => {
    if (status === "idle" && authUser?.id) {
      dispatch(fetchInvoices());
    }
  }, [dispatch, status, authUser?.id]);

  // Prefetch proveedores (admin)
  useEffect(() => {
    if (!isAdmin || !items?.length) return;

    const ids = [...new Set(items.map((r) => r?.supplier_id).filter(Boolean))];
    const missing = ids.filter((id) => !supplierMap[id]);

    if (missing.length === 0) return;

    let abort = false;
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(`${USERS_URL}?id=${id}`, {
                credentials: "include",
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data?.user) return [id, null];
              const u = data.user;
              return [
                id,
                {
                  id: u.id,
                  company_name: u.company_name ?? "",
                  fantasy_name: u.fantasy_name ?? "",
                  email: u.email ?? "",
                  cuit_or_cuil: u.cuit_or_cuil ?? "",
                  is_administrator: !!Number(u.is_administrator),
                },
              ];
            } catch {
              return [id, null];
            }
          })
        );

        if (abort) return;
        setSupplierMap((prev) => {
          const next = { ...prev };
          for (const [id, val] of results) if (val) next[id] = val;
          return next;
        });
      } catch {}
    })();

    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isAdmin]);

  // Helper: empujar filtros al slice + fetch
  const pushFilters = (next) => {
    dispatch(setFilters(next));
    dispatch(fetchInvoices());
  };

  // Handlers filtros
  const onChangeCat = (v) => {
    setCategoria(v);
    pushFilters({ category_id: v || "" });
  };
  const onChangeLoc = (v) => {
    setLocalidad(v);
    pushFilters({ locality_id: v || "" });
  };
  const onChangeEstado = (v) => {
    setEstado(v);
    pushFilters({ payment_status: v || "" });
  };
  const onChangeMes = (v) => {
    const n = Number(v);
    setMes(n);
    pushFilters({ month: n === 0 ? "" : n });
  };
  const onChangeValidez = (v) => {
    setValidez(v);
    pushFilters({ is_valid: v === "" ? "" : Number(v) });
  };
  const onChangeRazon = (v) => {
    setRazonSocial(v);
    dispatch(setFilters({ company_name: v || "" }));
    dispatch(fetchInvoices());
  };

  // Pills de filtros activos (definir DESPUÉS de los handlers)
  const activeFilters = useMemo(() => {
    const pills = [];
    if (razonSocial)
      pills.push({
        k: "Razón",
        v: razonSocial,
        clear: () => onChangeRazon(""),
      });
    if (categoria)
      pills.push({
        k: "Categoría",
        v: catMap[String(categoria)] ?? `#${categoria}`,
        clear: () => onChangeCat(""),
      });
    if (localidad)
      pills.push({
        k: "Localidad",
        v: locMap[String(localidad)] ?? `#${localidad}`,
        clear: () => onChangeLoc(""),
      });
    if (estado)
      pills.push({ k: "Estado", v: estado, clear: () => onChangeEstado("") });
    if (mes && Number(mes) !== 0) {
      const mLabel =
        MONTHS_ES.find((m) => Number(m.v) === Number(mes))?.label ?? mes;
      pills.push({ k: "Mes", v: mLabel, clear: () => onChangeMes(0) });
    }
    if (validez !== "")
      pills.push({
        k: "Validez",
        v: validez === "1" ? "Válidas" : "No válidas",
        clear: () => onChangeValidez(""),
      });
    return pills;
  }, [razonSocial, categoria, localidad, estado, mes, validez, catMap, locMap]);

  // Abrir modal proveedor
  const openProveedor = async (supplierId) => {
    if (!supplierId) return;
    setProvModal({ open: true, loading: true, error: "", data: null });
    try {
      const res = await fetch(`${USERS_URL}?id=${supplierId}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || "No se pudo cargar el proveedor.");
      const user = data?.user ?? null;
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
        error: e?.message || "Error al cargar.",
        data: null,
      });
    }
  };
  const closeProveedor = () =>
    setProvModal({ open: false, loading: false, error: "", data: null });

  // Paginación
  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    dispatch(setPage(nextPage));
    dispatch(fetchInvoices());
  };

  // Comprobante (simulado)
  const openReceipt = (invoice) =>
    setRcptModal({
      open: true,
      loading: false,
      error: "",
      invoice,
      file: null,
    });
  const closeReceipt = () =>
    setRcptModal({
      open: false,
      loading: false,
      error: "",
      invoice: null,
      file: null,
    });

  const confirmReceipt = async () => {
    if (!rcptModal.invoice?.id) return;
    try {
      setRcptModal((m) => ({ ...m, loading: true, error: "" }));
      // Simulamos subida de comprobante y marcamos Pagado
      await dispatch(
        updateInvoice({
          id: rcptModal.invoice.id,
          updates: { payment_status: "Pagado" },
        })
      ).unwrap();
      closeReceipt();
    } catch (e) {
      setRcptModal((m) => ({
        ...m,
        loading: false,
        error: e?.message || "No se pudo guardar el comprobante.",
      }));
    }
  };

  // Eliminar (UI)
  const openDelete = (invoice) =>
    setDelModal({ open: true, loading: false, error: "", invoice });
  const closeDelete = () =>
    setDelModal({ open: false, loading: false, error: "", invoice: null });
  const confirmDelete = async () => {
    if (!delModal.invoice?.id) return;
    try {
      setDelModal((m) => ({ ...m, loading: true, error: "" }));
      await dispatch(
        deleteInvoice({ id: delModal.invoice.id, hard: true })
      ).unwrap();
      closeDelete(); // el reducer ya saca la fila
      // opcional: si querés forzar refetch ↓
      // dispatch(fetchInvoices());
    } catch (e) {
      setDelModal((m) => ({
        ...m,
        loading: false,
        error:
          (typeof e === "string" && e) || e?.message || "No se pudo eliminar.",
      }));
    }
  };

  const resetAllFilters = () => {
    // 1) Reset Redux
    dispatch(clearFilters());
    dispatch(setPage(1));

    // 2) Reset estados locales controlados
    setRazonSocial("");
    setCategoria("");
    setLocalidad("");
    setEstado("");
    setMes(0);
    setValidez("");

    // 3) Refetch
    dispatch(fetchInvoices());
  };

  return (
    <div className="p-4 md:p-5">
      {/* ===== MOBILE: trigger filtros + chips ===== */}
      <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
        >
          Filtros{activeFilters.length ? ` (${activeFilters.length})` : ""}
        </button>
        <button
          type="button"
          onClick={resetAllFilters}
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="opacity-70"
                >
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== DESKTOP filters ===== */}
      <section className="mb-5 hidden md:block">
        <div className="rounded-md bg-white p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="field-label mb-2">Razón social</label>
              <select
                className="select border border-slate-300 w-full"
                value={razonSocial}
                onChange={(e) => onChangeRazon(e.target.value)}
              >
                <option value="">Todas</option>
                {COMPANY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-2">Categoría</label>
              <select
                className="select border border-slate-300 w-full"
                value={categoria}
                onChange={(e) => onChangeCat(e.target.value)}
              >
                <option value="">Todas</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-2">Localidad</label>
              <select
                className="select border border-slate-300 w-full"
                value={localidad}
                onChange={(e) => onChangeLoc(e.target.value)}
              >
                <option value="">Todas</option>
                {locs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-2">Estado</label>
              <select
                className="select border border-slate-300 w-full"
                value={estado}
                onChange={(e) => onChangeEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Pagado">Pagado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>

            <div>
              <label className="field-label mb-2">Mes</label>
              <select
                className="select border border-slate-300 w-full"
                value={mes}
                onChange={(e) => onChangeMes(e.target.value)}
              >
                {MONTHS_ES.map((m) => (
                  <option key={m.v} value={m.v}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label mb-2">Validez</label>
              <select
                className="select border border-slate-300 w-full"
                value={validez}
                onChange={(e) => onChangeValidez(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="1">Sólo válidas</option>
                <option value="0">Sólo no válidas</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
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
            {error || "No hay resultados para los filtros seleccionados."}
          </div>
        )}

        {status !== "loading" &&
          items.map((r) => {
            const hasFile = !!r.archive_path;
            const href = hasFile ? toAbsoluteFileUrl(r.archive_path) : "#";
            const catName = r.category_id
              ? catMap[String(r.category_id)] || `#${r.category_id}`
              : "—";
            const locName = r.locality_id
              ? locMap[String(r.locality_id)] || `#${r.locality_id}`
              : "—";

            const sup = supplierMap[r.supplier_id];
            const proveedorLabel = sup
              ? `${sup.company_name || "—"}${
                  sup.fantasy_name ? ` (${sup.fantasy_name})` : ""
                }`
              : `Proveedor #${r.supplier_id}`;

            return (
              <div key={r.id} className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-500">
                    {fmtDateAR(r.upload_date)}
                  </span>
                  <StatusBadge estado={r.payment_status} />
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openProveedor(r.supplier_id)}
                    className="mt-2 text-left text-sm font-semibold text-slate-900 hover:underline"
                  >
                    {proveedorLabel}{" "}
                    {supplierMap[r.supplier_id]?.is_administrator && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        Admin
                      </span>
                    )}
                  </button>
                )}

                <div className="mt-1 text-sm text-slate-600">
                  {catName} · {locName}
                </div>

                <div className="mt-2">
                  <ValidityBadge
                    isValid={Number(r.is_valid) === 1}
                    reason={r.invalid_reason}
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {/* Ver archivo */}
                  {hasFile ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <FaEye /> Ver
                    </a>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}

                  {/* Admin actions */}
                  {isAdmin && <EditInvoice invoice={r} />}
                  {isAdmin && <AddInvoicePayment invoice={r} />}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openDelete(r)}
                      className="inline-flex items-center gap-2 rounded-md  px-3 py-2 text-sm font-medium hover:text-red-700 text-slate-300 "
                      title="Eliminar"
                      aria-label="Eliminar"
                    >
                      <FaTrash /> 
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* ===== TABLA DESKTOP ===== */}
      <div className="hidden md:block card mt-5">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="thead">
              <tr>
                <Th>Fecha de carga</Th>
                {isAdmin && <Th>Proveedor</Th>}
                <Th>Categoría</Th>
                <Th>Localidad</Th>
                <Th>Estado</Th>
                <Th>Validez</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {status === "loading" && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="td text-center text-slate-500"
                  >
                    Cargando…
                  </td>
                </tr>
              )}

              {status !== "loading" &&
                items.map((r) => {
                  const hasFile = !!r.archive_path;
                  const href = hasFile
                    ? toAbsoluteFileUrl(r.archive_path)
                    : "#";
                  const catName = r.category_id
                    ? catMap[String(r.category_id)] || `#${r.category_id}`
                    : "—";
                  const locName = r.locality_id
                    ? locMap[String(r.locality_id)] || `#${r.locality_id}`
                    : "—";

                  const sup = supplierMap[r.supplier_id];
                  const proveedorLabel = sup
                    ? `${sup.company_name || "—"}${
                        sup.fantasy_name ? ` (${sup.fantasy_name})` : ""
                      }`
                    : `Proveedor #${r.supplier_id}`;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 group">
                      <Td className="font-medium text-slate-900">
                        {fmtDateAR(r.upload_date)}
                      </Td>

                      {isAdmin && (
                        <Td>
                          <button
                            type="button"
                            onClick={() => openProveedor(r.supplier_id)}
                            className="text-left group"
                            title="Ver datos del proveedor"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 group-hover:underline">
                                {proveedorLabel}
                              </span>
                              {supplierMap[r.supplier_id]?.is_administrator && (
                                <span
                                  className="status-badge status-badge--admin"
                                  title="Usuario administrador"
                                >
                                  Admin
                                </span>
                              )}
                            </div>
                          </button>
                        </Td>
                      )}

                      <Td>{catName}</Td>
                      <Td>{locName}</Td>
                      <Td>
                        <StatusBadge estado={r.payment_status} />
                      </Td>
                      <Td>
                        <ValidityBadge
                          isValid={Number(r.is_valid) === 1}
                          reason={r.invalid_reason}
                        />
                      </Td>

                      <Td>
                        <div className="flex items-center gap-2">
                          {/* Ver archivo */}
                          {hasFile ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="icon-btn"
                              title="Ver archivo"
                              aria-label="Ver archivo"
                            >
                              <FaEye className="text-slate-700" />
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}

                          {/* Editar / Cargar comprobante / Eliminar => SOLO admin */}
                          {isAdmin && <EditInvoice invoice={r} />}

                          {isAdmin && (
                            <AddInvoicePayment
                              invoice={r}
                              // defaultMarkPaid={true}
                            />
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openDelete(r)}
                              className="icon-btn text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}

              {status !== "loading" && items.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="td text-center text-slate-500"
                  >
                    {error ||
                      "No hay resultados para los filtros seleccionados."}
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-slate-900 mb-3">
                    {provModal.data?.company_name || "Proveedor"}
                  </Dialog.Title>

                  {provModal.loading && (
                    <p className="text-slate-500">Cargando proveedor…</p>
                  )}
                  {!provModal.loading && provModal.error && (
                    <p className="text-red-600">{provModal.error}</p>
                  )}
                  {!provModal.loading && !provModal.error && (
                    <ProfileCard user={provModal.data} compact />
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

      {/* ===== Modal Cargar Comprobante (simulado) ===== */}
      <Transition appear show={rcptModal.open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={rcptModal.loading ? () => {} : closeReceipt}
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
                  <Dialog.Title className="text-lg font-semibold">
                    Cargar comprobante de pago
                  </Dialog.Title>

                  <p className="mt-2 text-sm text-slate-600">
                    Esta acción marcará la factura como <b>Pagado</b>. (Simulado)
                  </p>

                  {rcptModal.error && (
                    <div className="mt-3 alert-error">{rcptModal.error}</div>
                  )}

                  <div className="mt-4">
                    <label className="field-label">Archivo (opcional)</label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="file-input file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200"
                      onChange={(e) =>
                        setRcptModal((m) => ({
                          ...m,
                          file: e.target.files?.[0] || null,
                        }))
                      }
                      disabled={rcptModal.loading}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Por ahora no se sube realmente; luego conectamos el
                      upload.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeReceipt}
                      disabled={rcptModal.loading}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmReceipt}
                      disabled={rcptModal.loading}
                      className="inline-flex items-center rounded-md bg-azuloscuro px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {rcptModal.loading ? "Guardando…" : "Guardar y marcar pagada"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ===== Modal Eliminar (UI ready) ===== */}
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
                    Eliminar factura
                  </Dialog.Title>

                  <p className="mt-3 text-sm text-slate-700">
                    ¿Seguro querés eliminar esta factura? Esta acción no se
                    puede deshacer.
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
                      <label className="field-label mb-2">Razón social</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={razonSocial}
                        onChange={(e) => onChangeRazon(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {COMPANY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Categoría</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={categoria}
                        onChange={(e) => onChangeCat(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Localidad</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={localidad}
                        onChange={(e) => onChangeLoc(e.target.value)}
                      >
                        <option value="">Todas</option>
                        {locs.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Estado</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={estado}
                        onChange={(e) => onChangeEstado(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="Pagado">Pagado</option>
                        <option value="Pendiente">Pendiente</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Mes</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={mes}
                        onChange={(e) => onChangeMes(e.target.value)}
                      >
                        {MONTHS_ES.map((m) => (
                          <option key={m.v} value={m.v}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label mb-2">Validez</label>
                      <select
                        className="select border border-slate-300 w-full"
                        value={validez}
                        onChange={(e) => onChangeValidez(e.target.value)}
                      >
                        <option value="">Todas</option>
                        <option value="1">Sólo válidas</option>
                        <option value="0">Sólo no válidas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer fijo */}
                <div className="sticky bottom-0 flex items-center gap-3 px-4 py-3 border-t bg-white rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      resetAllFilters();
                    }}
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

function ValidityBadge({ isValid, reason }) {
  const base = "status-badge transition-colors duration-300 ease-in-out";
  return isValid ? (
    <span className={`${base} status-badge--paid`} title="Factura válida">
      Válida
    </span>
  ) : (
    <span
      className={`${base} status-badge--muted`}
      title={reason || "Factura no válida"}
    >
      No válida
    </span>
  );
}

/* UI helpers */
function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
function Th({ children }) {
  return <th className="th">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`td ${className}`}>{children}</td>;
}
function StatusBadge({ estado }) {
  const base = "status-badge transition-colors duration-300 ease-in-out";
  if (estado === "Pagado")
    return <span className={`${base} status-badge--paid`}>Pagado</span>;
  if (estado === "Pendiente")
    return <span className={`${base} status-badge--pend`}>Pendiente</span>;
  return <span className={`${base} status-badge--muted`}>—</span>;
}
