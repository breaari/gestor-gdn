// src/components/panel/AddCategory.jsx
import React, { useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { createCategory, fetchCategories } from "../../redux/categories.slice";

export default function AddCategory({
  children = "+ Agregar categoría",
  onCreated,
  onClick,
}) {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const canSubmit = useMemo(() => !!name.trim(), [name]);

  const resetForm = () => {
    setName("");
    setErr("");
  };

  const openModal = () => {
    resetForm();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const closeModal = () => {
    resetForm();
    setOpen(false);
  };

  const createOne = async () => {
    await dispatch(createCategory({ name: name.trim() })).unwrap();
    dispatch(fetchCategories());
    onClick?.();
    onCreated?.();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      setErr("");
      await createOne();
      closeModal();
    } catch (e2) {
      setErr(
        (typeof e2 === "string" && e2) ||
          e2?.message ||
          "No se pudo crear la categoría."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndAnother = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setErr("");
      await createOne();
      // seguir en el modal, limpiar y reenfocar
      setName("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e2) {
      setErr(
        (typeof e2 === "string" && e2) ||
          e2?.message ||
          "No se pudo crear la categoría."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón disparador */}
      <button onClick={openModal} className="inline-flex items-center gap-2 btn-blue shadow-sm">
        {children}
      </button>

      {/* Modal */}
      {open && (
        <div className="modal">
          <div
            className="modal-overlay"
            onClick={() => !loading && closeModal()}
          />
          <div className="modal-center">
            <div className="modal-card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="modal-title">Agregar categoría</h3>
                <button
                  className="close-btn"
                  onClick={() => !loading && closeModal()}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Error */}
              {err && <div className="alert-error">{err}</div>}

              {/* Form */}
              <form onSubmit={handleSave} className="flex flex-col">
                {/* Cuerpo scrollable */}
                <div className="flex-1 max-h-[60vh] overflow-y-auto space-y-4">
                  <Field label="Nombre">
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-black w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                      placeholder="Ej: Servicios Generales"
                      maxLength={100}
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">Hasta 100 caracteres.</p>
                  </Field>
                </div>

                {/* Footer fijo con 3 botones */}
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
                      {loading ? "Guardando…" : "Guardar"}
                    </button>

                     {/* <-- ESTE ES EL BOTÓN QUE QUERÍAS --> */}
                    <button
                      type="button"
                      onClick={handleSaveAndAnother}
                      className="inline-flex items-center rounded-md bg-azulceleste px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      disabled={!canSubmit || loading}
                    >
                      {loading ? "Guardando…" : "Guardar y crear otra"}
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
