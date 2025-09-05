// src/components/panel/AddInvoicePayment.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { FaUpload } from "react-icons/fa";
import { createInvoicePayment } from "../../redux/invoices.payments.slice"; // ✅ nombre correcto
import { updateInvoice } from "../../redux/invoices.slice";
import { toAbsoluteFileUrl } from "../utils";

const PAYMENTS_URL =
  import.meta.env.VITE_API_INVOICE_PAYMENTS_URL ??
  "https://backgdn.universidadsiglo21online.com/diego/invoices_payments/invoice_payments.php";

export default function AddInvoicePayment({
  invoice,            // { id, ... }
  children,           // opcional: texto del botón en lugar del ícono
  className = "",
  defaultMarkPaid = true,
  onCreated,          // callback(payment)
}) {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [markPaid, setMarkPaid] = useState(!!defaultMarkPaid);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // estado para existente
  const [checking, setChecking] = useState(false);
  const [existing, setExisting] = useState(null); // { id, invoice_id, receipt_path, paid_at, ... } | null
  const [showForm, setShowForm] = useState(true); // si hay existente, arranca oculto

  // ahora pedimos archivo obligatorio cuando mostramos el form
  const canSubmit = useMemo(() => !!invoice?.id && !!file && showForm, [invoice?.id, file, showForm]);

  const reset = () => {
    setFile(null);
    setMarkPaid(!!defaultMarkPaid);
    setErr("");
    setExisting(null);
    setChecking(false);
    setShowForm(true);
  };

  const openModal = () => {
    reset();
    setOpen(true);
  };
  const closeModal = () => {
    if (loading) return;
    setOpen(false);
  };

  // Al abrir, chequeo si existe al menos un comprobante
  useEffect(() => {
    if (!open || !invoice?.id) return;
    let abort = false;
    const run = async () => {
      try {
        setChecking(true);
        const qs = new URLSearchParams({ invoice_id: String(invoice.id), limit: "1" }).toString();
        const res = await fetch(`${PAYMENTS_URL}?${qs}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (abort) return;
        const items = Array.isArray(data?.payments) ? data.payments : [];
        if (items.length > 0) {
          setExisting(items[0]);
          setShowForm(false); // si hay, primero muestro aviso + link
        } else {
          setExisting(null);
          setShowForm(true);
        }
      } catch (_) {
        if (!abort) {
          // si falla el check, dejamos seguir con el form
          setExisting(null);
          setShowForm(true);
        }
      } finally {
        if (!abort) setChecking(false);
      }
    };
    run();
    return () => { abort = true; };
  }, [open, invoice?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      setErr("");

      // paid_at automático (ahora)
      const paid_at = toSQLDatetime(new Date());

      // 1) Crear registro en invoice_payments (multipart por archivo)
      const payment = await dispatch(
        createInvoicePayment({ invoice_id: invoice.id, paid_at, file })
      ).unwrap();

      // 2) Opcional: marcar factura como Pagado
      if (markPaid) {
        await dispatch(
          updateInvoice({ id: invoice.id, updates: { payment_status: "Pagado" } })
        ).unwrap();
      }

      onCreated?.(payment);
      closeModal();
    } catch (e2) {
      setErr(
        (typeof e2 === "string" && e2) ||
          e2?.message ||
          "No se pudo registrar el comprobante."
      );
    } finally {
      setLoading(false);
    }
  };

  const existingHref = existing?.receipt_path ? toAbsoluteFileUrl(existing.receipt_path) : null;

  return (
    <>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={openModal}
        className={children ? `btn-outline ${className}` : `icon-btn ${className}`}
        title="Cargar comprobante de pago"
        aria-label="Cargar comprobante de pago"
      >
        {children || <FaUpload className="text-slate-700" />}
      </button>

      {/* Modal */}
      {open && (
        <div className="modal">
          <div className="modal-overlay" onClick={closeModal} />
          <div className="modal-center">
            <div className="modal-card max-w-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="modal-title">Comprobante de pago</h3>
                <button className="close-btn" onClick={closeModal} aria-label="Cerrar">
                  ✕
                </button>
              </div>

              {/* Estado: check de existente */}
              {checking && (
                <div className="alert-warn">Buscando comprobante existente…</div>
              )}

              {err && <div className="alert-error">{err}</div>}

              {/* Si ya hay uno cargado, aviso + link */}
              {!!existing && !showForm && (
                <div className="rounded-md border border-slate-200 p-3 mb-4 bg-slate-50">
                  <p className="text-sm text-slate-700">
                    Ya hay un comprobante cargado para esta factura.
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {existingHref ? (
                      <a
                        href={existingHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-azuloscuro hover:bg-slate-50 underline"
                      >
                        Ver comprobante
                      </a>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                    <span className="text-xs text-slate-500">
                      Pagado el {fmtDateTime(existing.paid_at)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={closeModal}
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md bg-azuloscuro px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                      onClick={() => setShowForm(true)}
                    >
                      Cargar otro (reemplaza)
                    </button>
                  </div>
                </div>
              )}

              {/* Form de subida (solo si showForm) */}
              {showForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Archivo (PDF / JPG / PNG)">
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                    {!!file && (
                      <p className="text-xs text-slate-500 mt-1">
                        {file.name} — {(file.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </Field>

                  <div className="rounded-md border border-slate-200 p-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={markPaid}
                        onChange={(e) => setMarkPaid(e.target.checked)}
                      />
                      <span className="text-sm text-slate-700">
                        Marcar factura como <b>Pagado</b> automáticamente
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-md bg-azuloscuro px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                      disabled={!canSubmit || loading}
                    >
                      {loading ? "Guardando…" : "Guardar"}
                    </button>
                  </div>

                  {!!existing && (
                    <p className="mt-2 text-xs text-slate-500">
                      Al guardar, el comprobante previo quedará reemplazado (el registro anterior no se borra automáticamente).
                    </p>
                  )}
                </form>
              )}
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

// 'YYYY-MM-DD HH:mm:ss' (para el back PHP)
function toSQLDatetime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

function fmtDateTime(sql) {
  // 'YYYY-MM-DD HH:mm:ss' -> 'DD/MM/YYYY HH:mm'
  if (!sql) return "—";
  const [d, t] = String(sql).split(" ");
  const [Y, M, D] = d.split("-").map((x) => parseInt(x, 10));
  const [h = "00", m = "00"] = (t || "").split(":");
  if (!Y || !M || !D) return sql;
  return `${String(D).padStart(2, "0")}/${String(M).padStart(2, "0")}/${Y} ${h}:${m}`;
}
