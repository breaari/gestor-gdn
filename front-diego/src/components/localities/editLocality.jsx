// src/components/panel/editLocality.jsx
import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { FaEdit } from "react-icons/fa";
import { updateLocality } from "../../redux/localities.slice";

export default function EditLocality({
  locality,                 // { id, name, ... }
  children,                 // opcional: texto del botón en lugar del ícono
  onUpdated,                // callback opcional después de actualizar
  className = "",           // estilos extra para el botón
}) {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(locality?.name ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const originalName = locality?.name ?? "";
  const nameTrim = (name || "").trim();
  const canSubmit = useMemo(
    () => !!locality?.id && !!nameTrim && nameTrim !== originalName,
    [locality?.id, nameTrim, originalName]
  );

  const openModal = () => {
    setName(locality?.name ?? "");
    setErr("");
    setOpen(true);
  };
  const closeModal = () => {
    setErr("");
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setErr("");
      await dispatch(
        updateLocality({ id: locality.id, updates: { name: nameTrim } })
      ).unwrap();

      onUpdated?.();
      closeModal();
    } catch (e2) {
      setErr(
        (typeof e2 === "string" && e2) ||
          e2?.message ||
          "No se pudo actualizar la localidad."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={openModal}
        className={children ? `btn-outline ${className}` : `icon-btn ${className}`}
        title="Editar localidad"
        aria-label="Editar localidad"
      >
        {children || <FaEdit className="text-slate-700 text-xl" />}
      </button>

      {/* Modal */}
      {open && (
        <div className="modal">
          <div className="modal-overlay" onClick={() => !loading && closeModal()} />
          <div className="modal-center">
            <div className="modal-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="modal-title">Editar localidad</h3>
                <button
                  className="close-btn"
                  onClick={() => !loading && closeModal()}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {err && <div className="alert-error">{err}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nombre">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                    placeholder="Ej: Capital Federal"
                    maxLength={100}
                    required
                  />
                </Field>

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
                    {loading ? "Guardando..." : "Guardar cambios"}
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
