// src/components/panel/editInvoice.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaEdit } from "react-icons/fa";
import { updateInvoice } from "../../redux/invoices.slice";
import { COMPANY_OPTIONS, toAbsoluteFileUrl } from "../utils";

const USERS_URL =
  import.meta.env.VITE_API_USERS_URL ?? "https://backgdn.universidadsiglo21online.com/diego/users/users.php";
const SUPPLIERS_QUERY = "suppliers=1";

const CATEGORIES_URL =
  import.meta.env.VITE_API_CATEGORIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/categories/categories.php";
const LOCALITIES_URL =
  import.meta.env.VITE_API_LOCALITIES_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/localities/localities.php";

export default function EditInvoice({
  invoice,        // { id, supplier_id, company_name, category_id, locality_id, payment_status, is_valid, invalid_reason, invalidated_at, archive_path, ... }
  children,       // opcional: texto del botón en lugar del ícono
  className = "",
  onUpdated,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.users.authUser);
  const isAdmin = !!authUser?.is_administrator;

  const [open, setOpen] = useState(false);

  // opciones dinámicas
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [optsErr, setOptsErr] = useState("");
  const [optsLoading, setOptsLoading] = useState(false);

  // proveedores (solo admin)
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supErr, setSupErr] = useState("");

  // form
  const [supplierId, setSupplierId] = useState(invoice?.supplier_id ?? null);
  const [company, setCompany] = useState(invoice?.company_name ?? "");
  const [categoryId, setCategoryId] = useState(invoice?.category_id ?? "");
  const [localityId, setLocalityId] = useState(invoice?.locality_id ?? "");
  const [status, setStatus] = useState(invoice?.payment_status ?? "Pendiente");
  const [isValid, setIsValid] = useState(
    typeof invoice?.is_valid === "number" ? invoice.is_valid === 1 : true
  );
  const [invalidReason, setInvalidReason] = useState(invoice?.invalid_reason ?? "");
  const [file, setFile] = useState(null); // reemplazo simulado
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const nameRef = useRef(null);

  // originales para comparar
  const original = {
    supplier_id: invoice?.supplier_id ?? null,
    company_name: invoice?.company_name ?? "",
    category_id: invoice?.category_id ?? "",
    locality_id: invoice?.locality_id ?? "",
    payment_status: invoice?.payment_status ?? "Pendiente",
    is_valid: typeof invoice?.is_valid === "number" ? invoice.is_valid : 1,
    invalid_reason: invoice?.invalid_reason ?? null,
  };

  const companyTrim = (company || "").trim();
  const canSubmit = useMemo(() => {
    const changed =
      (isAdmin && supplierId !== original.supplier_id) ||
      companyTrim !== original.company_name ||
      String(categoryId || "") !== String(original.category_id || "") ||
      String(localityId || "") !== String(original.locality_id || "") ||
      status !== original.payment_status ||
      (isValid ? 1 : 0) !== original.is_valid ||
      (isValid ? null : (invalidReason || "")) !== (original.invalid_reason || null) ||
      !!file;
    return !!invoice?.id && !!companyTrim && !!status && changed;
  }, [
    invoice?.id,
    isAdmin,
    supplierId,
    companyTrim,
    categoryId,
    localityId,
    status,
    isValid,
    invalidReason,
    original,
    file,
  ]);

  const openModal = () => {
    // reset con los valores actuales
    setSupplierId(invoice?.supplier_id ?? null);
    setCompany(invoice?.company_name ?? "");
    setCategoryId(invoice?.category_id ?? "");
    setLocalityId(invoice?.locality_id ?? "");
    setStatus(invoice?.payment_status ?? "Pendiente");
    setIsValid(typeof invoice?.is_valid === "number" ? invoice.is_valid === 1 : true);
    setInvalidReason(invoice?.invalid_reason ?? "");
    setFile(null);
    setErr("");
    setOpen(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  };
  const closeModal = () => {
    setErr("");
    setOpen(false);
  };

  // cargar categorías/localidades al abrir
  useEffect(() => {
    if (!open) return;
    let abort = false;

    (async () => {
      try {
        setOptsErr("");
        setOptsLoading(true);
        const [rc, rl] = await Promise.all([
          fetch(`${CATEGORIES_URL}?limit=200`, { credentials: "include" }),
          fetch(`${LOCALITIES_URL}?limit=200`, { credentials: "include" }),
        ]);
        const [dc, dl] = await Promise.all([
          rc.json().catch(() => ({})),
          rl.json().catch(() => ({})),
        ]);
        if (!abort) {
          setCats(Array.isArray(dc?.categories) ? dc.categories : []);
          setLocs(Array.isArray(dl?.localities) ? dl.localities : []);
        }
      } catch (e) {
        if (!abort) setOptsErr(e?.message || "No se pudieron cargar opciones.");
      } finally {
        if (!abort) setOptsLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [open]);

  // cargar proveedores al abrir (solo admin)
  useEffect(() => {
    if (!open || !isAdmin) return;
    let abort = false;
    (async () => {
      try {
        setSupErr("");
        setSupLoading(true);
        const res = await fetch(`${USERS_URL}?${SUPPLIERS_QUERY}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "No se pudo cargar proveedores.");
        let list = data?.suppliers || data?.users || [];
        list = Array.isArray(list) ? list : [];
        list = list
          .filter((u) => u && u.id)
          .map((u) => ({
            id: u.id,
            label: `${u.cuit_or_cuil || "—"}${u.company_name ? ` (${u.company_name})` : ""}`,
          }))
          .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
        if (!abort) setSuppliers(list);
      } catch (e) {
        if (!abort) setSupErr(e?.message || "Error al cargar proveedores.");
      } finally {
        if (!abort) setSupLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [open, isAdmin]);

  // path simulado para reemplazo de archivo
  const simulatePath = (f) =>
    `/uploads/${Date.now()}_${(f?.name || "archivo").replace(/\s+/g, "_")}`;

  const nowSQL = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setErr("");

      const updates = {};
      if (isAdmin && supplierId !== original.supplier_id) {
        updates.supplier_id = Number(supplierId);
      }
      if (companyTrim !== original.company_name) updates.company_name = companyTrim;
      if (String(categoryId || "") !== String(original.category_id || "")) {
        updates.category_id = categoryId ? Number(categoryId) : null;
      }
      if (String(localityId || "") !== String(original.locality_id || "")) {
        updates.locality_id = localityId ? Number(localityId) : null;
      }
      if (status !== original.payment_status) updates.payment_status = status;

      // validez / motivo / fecha
      const nextValidInt = isValid ? 1 : 0;
      if (nextValidInt !== original.is_valid) {
        updates.is_valid = nextValidInt;
        if (nextValidInt === 0) {
          updates.invalid_reason = (invalidReason || "").trim() || null;
          updates.invalidated_at = nowSQL();
        } else {
          updates.invalid_reason = null;
          updates.invalidated_at = null;
        }
      } else if (nextValidInt === 0 && (invalidReason || "") !== (original.invalid_reason || "")) {
        // sigue inválida pero cambió el motivo
        updates.invalid_reason = (invalidReason || "").trim() || null;
      }

      if (file) updates.archive_path = simulatePath(file);

      await dispatch(updateInvoice({ id: invoice.id, updates })).unwrap();
      onUpdated?.();
      closeModal();
    } catch (e2) {
      setErr(
        (typeof e2 === "string" && e2) ||
          e2?.message ||
          "No se pudo actualizar la factura."
      );
    } finally {
      setLoading(false);
    }
  };

  const currentFileHref = invoice?.archive_path
    ? toAbsoluteFileUrl(invoice.archive_path)
    : null;

  return (
    <>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={openModal}
        className={children ? `btn-outline ${className}` : `icon-btn ${className}`}
        title="Editar factura"
        aria-label="Editar factura"
      >
        {children || <FaEdit className="text-slate-700 text-lg" />}
      </button>

      {/* Modal */}
      {open && (
        <div className="modal">
          <div className="modal-overlay" onClick={() => !loading && closeModal()} />
          <div className="modal-center">
            <div className="modal-card">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="modal-title">Editar factura</h3>
                <button
                  className="close-btn"
                  onClick={() => !loading && closeModal()}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Errores */}
              {optsErr && <div className="alert-warn">{optsErr}</div>}
              {supErr && <div className="alert-warn">{supErr}</div>}
              {err && <div className="alert-error">{err}</div>}

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Cuerpo (scrollable si crece) */}
                <div className="flex-1 max-h-[65vh] overflow-y-auto space-y-4">
                  {isAdmin && (
                    <Field label="Proveedor">
                      <select
                        value={supplierId ?? ""}
                        onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)}
                        className="select border border-slate-300 text-black cursor-pointer"
                        disabled={supLoading}
                      >
                        <option value="">—</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <Field label="Razón social">
                    <select
                      ref={nameRef}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      required
                      disabled={optsLoading}
                    >
                      <option value="">Seleccionar</option>
                      {COMPANY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="form-grid-2">
                    <Field label="Categoría (opcional)">
                      <select
                        value={categoryId ?? ""}
                        onChange={(e) =>
                          setCategoryId(e.target.value ? Number(e.target.value) : "")
                        }
                        className="select border border-slate-300 text-black cursor-pointer"
                        disabled={optsLoading}
                      >
                        <option value="">—</option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Localidad (opcional)">
                      <select
                        value={localityId ?? ""}
                        onChange={(e) =>
                          setLocalityId(e.target.value ? Number(e.target.value) : "")
                        }
                        className="select border border-slate-300 text-black cursor-pointer"
                        disabled={optsLoading}
                      >
                        <option value="">—</option>
                        {locs.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Estado de pago">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      required
                    >
                      <option value="Pagado">Pagado</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </Field>

                  <div className="rounded-md border border-slate-200 p-3">
                    <label className="field-label">Validez</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isValid}
                          onChange={(e) => setIsValid(e.target.checked)}
                        />
                        <span className="text-sm text-slate-700">Factura válida</span>
                      </label>
                    </div>

                    {!isValid && (
                      <div className="mt-3">
                        <label className="field-label mb-1">Motivo de invalidez</label>
                        <input
                          type="text"
                          value={invalidReason}
                          onChange={(e) => setInvalidReason(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                          placeholder="Ej: Falta dato obligatorio, PDF ilegible, etc."
                          maxLength={255}
                        />
                      </div>
                    )}
                  </div>

                  <Field label="Archivo actual">
                    {currentFileHref ? (
                      <a
                        href={currentFileHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-azuloscuro underline"
                      >
                        Ver archivo
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </Field>
                </div>

                {/* Footer fijo */}
                <div className="mt-4 border-t pt-4 bg-white sticky bottom-0">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => !loading && closeModal()}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-azuloscuro px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                      disabled={!canSubmit || loading}
                    >
                      {loading ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* UI helper */
function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
