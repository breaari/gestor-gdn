// src/components/panel/uploadInvoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createInvoice, fetchInvoices } from "../../redux/invoices.slice";
import { COMPANY_OPTIONS, STATUS_OPTIONS } from "../utils";

const USERS_URL =
  import.meta.env.VITE_API_USERS_URL ?? "https://backgdn.universidadsiglo21online.com/diego/users/users.php";
const CATS_URL =
  import.meta.env.VITE_API_CATEGORIES_URL ?? "https://backgdn.universidadsiglo21online.com/diego/categories/categories.php";
const LOCS_URL =
  import.meta.env.VITE_API_LOCALITIES_URL ?? "https://backgdn.universidadsiglo21online.com/diego/localities/localities.php";

// Si tu back usa otro parámetro para listar proveedores, cambialo acá:
const SUPPLIERS_QUERY = "suppliers=1";

export default function UploadInvoice({
  children = "+ Cargar Factura",
  onClick,
  onCreated,
}) {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.users.authUser);
  const isAdmin = !!authUser?.is_administrator;

  const [open, setOpen] = useState(false);

  // Proveedor (solo admin)
  const [supplierId, setSupplierId] = useState(authUser?.id ?? null);
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supErr, setSupErr] = useState("");

  // Opciones dinámicas
  const [cats, setCats] = useState([]);
  const [locs, setLocs] = useState([]);
  const [optsLoading, setOptsLoading] = useState(false);
  const [optsErr, setOptsErr] = useState("");

  // Campos de la factura
  const [company, setCompany] = useState("");
  const [categoryId, setCategoryId] = useState(null); // 👈 ids (opcional)
  const [localityId, setLocalityId] = useState(null); // 👈 ids (opcional)
  const [status, setStatus] = useState("Pendiente");
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0); // re-mount para limpiar input file
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(
    () =>
      !!authUser?.id &&
      (!!supplierId || !isAdmin) &&
      !!file &&
      !!company &&
      !!status, // categoría/localidad son opcionales
    [authUser?.id, supplierId, isAdmin, file, company, status]
  );

  const resetForm = () => {
    setSupplierId(authUser?.id ?? null);
    setCompany("");
    setCategoryId(null);
    setLocalityId(null);
    setStatus("Pendiente");
    setFile(null);
    setFileKey((k) => k + 1);
    setErr("");
    setSupErr("");
    setOptsErr("");
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
  };
  const closeModal = () => {
    resetForm();
    setOpen(false);
  };

  // Carga proveedores (solo admin) al abrir
  useEffect(() => {
    if (!open || !isAdmin) return;

    let abort = false;
    (async () => {
      setSupLoading(true);
      setSupErr("");
      try {
        const res = await fetch(`${USERS_URL}?${SUPPLIERS_QUERY}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "No se pudo cargar la lista de proveedores.");

        let list = data?.suppliers || data?.users || [];
        list = Array.isArray(list) ? list : [];
        list = list
          .filter((u) => u && u.id)
          .map((u) => ({
            id: u.id,
            company_name: u.company_name || u.companyName || "",
            cuit_or_cuil: u.cuit_or_cuil || u.cuit || u.cuil || "",
          }))
          .sort(
            (a, b) =>
              (a.company_name || "").localeCompare(b.company_name || "") ||
              (a.cuit_or_cuil || "").localeCompare(b.cuit_or_cuil || "")
          );

        if (abort) return;
        setSuppliers(list);

        const hasCurrent = list.some((u) => u.id === authUser?.id);
        setSupplierId(hasCurrent ? authUser?.id : list[0]?.id ?? null);
      } catch (e) {
        if (!abort) setSupErr(e?.message || "Error al cargar proveedores.");
      } finally {
        if (!abort) setSupLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [open, isAdmin, authUser?.id]);

  // Carga categorías y localidades activas al abrir
  useEffect(() => {
    if (!open) return;

    let abort = false;
    (async () => {
      setOptsLoading(true);
      setOptsErr("");
      try {
        const [rc, rl] = await Promise.all([
          fetch(`${CATS_URL}?limit=200&is_active=1`, { credentials: "include" }),
          fetch(`${LOCS_URL}?limit=200&is_active=1`, { credentials: "include" }),
        ]);
        const [dc, dl] = await Promise.all([rc.json().catch(() => ({})), rl.json().catch(() => ({}))]);
        if (!rc.ok) throw new Error(dc?.message || "No se pudo cargar categorías.");
        if (!rl.ok) throw new Error(dl?.message || "No se pudo cargar localidades.");

        const catsList = Array.isArray(dc?.categories) ? dc.categories : [];
        const locsList = Array.isArray(dl?.localities) ? dl.localities : [];

        if (abort) return;
        setCats(catsList);
        setLocs(locsList);
      } catch (e) {
        if (!abort) setOptsErr(e?.message || "Error al cargar opciones.");
      } finally {
        if (!abort) setOptsLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [open]);

  const simulatePath = (f) =>
    `/uploads/${Date.now()}_${(f?.name || "archivo").replace(/\s+/g, "_")}`;

  const uploadFileIfConfigured = async (f, supplierIdForUpload) => {
    const uploadURL = `https://backgdn.universidadsiglo21online.com/diego/invoices/upload.php`; // si no existe, se usa simulatePath
    if (!uploadURL) return simulatePath(f);

    const fd = new FormData();
    fd.append("file", f);
    if (supplierIdForUpload) fd.append("supplier_id", String(supplierIdForUpload));

    const res = await fetch(uploadURL, { method: "POST", body: fd, credentials: "include" });

    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.message || "No se pudo subir el archivo.");
    return data?.path || data?.url || simulatePath(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!canSubmit) return;

    try {
      setLoading(true);

      const chosenSupplierId = isAdmin ? supplierId : authUser.id;
      const archive_path = await uploadFileIfConfigured(file, chosenSupplierId);

      const body = {
        supplier_id: chosenSupplierId,
        company_name: company,              // ENUM en BD
        category_id: categoryId || null,    // ids opcionales
        locality_id: localityId || null,    // ids opcionales
        payment_status: status,             // 'Pendiente' | 'Pagado'
        archive_path,
      };

      await dispatch(createInvoice(body)).unwrap();

      dispatch(fetchInvoices());
      onClick?.();
      onCreated?.();
      closeModal();
    } catch (e2) {
      setErr(e2?.message || "No se pudo cargar la factura.");
    } finally {
      setLoading(false);
    }
  };

  const optionLabel = (u) =>
    `${u.cuit_or_cuil || "—"}${u.company_name ? ` (${u.company_name})` : ""}`;

  return (
    <>
      {/* Botón disparador */}
      <button onClick={openModal} className="inline-flex items-center gap-2 btn-blue shadow-sm">
        {children}
      </button>

      {/* Modal */}
      {open && (
        <div className="modal">
          <div className="modal-overlay" onClick={() => !loading && closeModal()} />
          <div className="modal-center">
            <div className="modal-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="modal-title">Cargar factura</h3>
                <button
                  className="close-btn"
                  onClick={() => !loading && closeModal()}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {err && <div className="alert-error">{err}</div>}

              {!authUser?.id && (
                <div className="alert-warn">Necesitás iniciar sesión para cargar facturas.</div>
              )}

              {optsErr && <div className="alert-warn">{optsErr}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Proveedor (solo admin) */}
                {isAdmin && (
                  <Field label="Proveedor (CUIT — Razón Social)">
                    <select
                      value={supplierId ?? ""}
                      onChange={(e) => setSupplierId(Number(e.target.value) || null)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      disabled={supLoading}
                    >
                      {!supLoading && suppliers.length === 0 && (
                        <option value="">(No hay proveedores)</option>
                      )}
                      {supLoading && <option value="">Cargando proveedores…</option>}
                      {!supLoading &&
                        suppliers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {optionLabel(u)}
                          </option>
                        ))}
                    </select>
                    {supErr && <p className="mt-1 text-sm text-red-600">{supErr}</p>}
                  </Field>
                )}

                <Field label="Razón social">
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="select border border-slate-300 text-black cursor-pointer"
                    required
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
                      onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      disabled={optsLoading}
                    >
                      <option value="">—</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Localidad (opcional)">
                    <select
                      value={localityId ?? ""}
                      onChange={(e) => setLocalityId(e.target.value ? Number(e.target.value) : null)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      disabled={optsLoading}
                    >
                      <option value="">—</option>
                      {locs.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="form-grid-2">
                  <Field label="Estado">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="select border border-slate-300 text-black cursor-pointer"
                      required
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Archivo (PDF o imagen)">
                    <input
                      key={fileKey}
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="file-input file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200"
                      required
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => !loading && closeModal()}
                    className="btn-outline border border-slate-300 text-slate-700"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-blue disabled:opacity-60"
                    disabled={!canSubmit || loading}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
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

