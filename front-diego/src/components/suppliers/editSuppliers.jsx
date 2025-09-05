

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition, Switch } from "@headlessui/react";
import { FaEdit } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { updateUser, fetchUserById } from "../../redux/users.slice";

const cx = (...c) => c.filter(Boolean).join(" ");
const digitsOnly = (s = "") => String(s || "").replace(/\D+/g, "");

const emptyUser = {
  id: null,
  email: "",
  cuit_or_cuil: "",
  company_name: "",
  fantasy_name: "",
  alias: "",
  bank: "",
  cbu_or_cvu: "",
  is_active: 1,
  is_administrator: 0,
};

export default function EditSupplier({
  user,
  userId,
  className,
  title = "Editar proveedor",
  onSaved,
}) {
  const dispatch = useDispatch();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [error, setError] = useState("");

  const [loadedUser, setLoadedUser] = useState(user || emptyUser);
  const [form, setForm] = useState(user || emptyUser);

  const openModal = () => {
    setError("");
    setOpen(true);
  };
  const closeModal = () => {
    if (loading) return;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    if (user?.id) {
      setLoadedUser(user);
      setForm(user);
      return;
    }
    if (!userId) {
      setLoadedUser(emptyUser);
      setForm(emptyUser);
      return;
    }

    let abort = false;
    (async () => {
      try {
        setLoadingUser(true);
        const u = await dispatch(fetchUserById(userId)).unwrap();
        if (abort) return;
        setLoadedUser(u || emptyUser);
        setForm(u || emptyUser);
      } catch (e) {
        if (!abort) setError(e || "No se pudo cargar el usuario.");
      } finally {
        if (!abort) setLoadingUser(false);
      }
    })();

    return () => { abort = true; };
  }, [open, user, userId, dispatch]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cuitDigits = useMemo(() => digitsOnly(form.cuit_or_cuil), [form.cuit_or_cuil]);
  const cuitError = useMemo(() => {
    if (!cuitDigits) return "";
    return /^\d{11}$/.test(cuitDigits) ? "" : "CUIT/CUIL debe tener 11 dígitos.";
  }, [cuitDigits]);
  const emailError = useMemo(() => {
    if (!form.email) return "";
    const ok = /\S+@\S+\.\S+/.test(form.email);
    return ok ? "" : "Email inválido.";
  }, [form.email]);

  const canSave = useMemo(() => {
    if (loading || loadingUser) return false;
    if (cuitError || emailError) return false;
    return !!loadedUser?.id;
  }, [loading, loadingUser, cuitError, emailError, loadedUser?.id]);

  const buildDiff = () => {
    const fields = [
      "email",
      "cuit_or_cuil",
      "company_name",
      "fantasy_name",
      "alias",
      "bank",
      "cbu_or_cvu",
      "is_active",
      "is_administrator",
    ];
    const diff = {};
    fields.forEach((k) => {
      let next = form[k];
      if (k === "cuit_or_cuil") next = cuitDigits;
      if (k === "is_active" || k === "is_administrator") next = Number(!!next);
      if (next !== loadedUser[k]) diff[k] = next;
    });
    return diff;
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!canSave) return;
    const diff = buildDiff();
    if (Object.keys(diff).length === 0) { setOpen(false); return; }

    setError("");
    setLoading(true);
    try {
      await dispatch(updateUser({ id: loadedUser.id, updates: diff })).unwrap();
      onSaved?.({ id: loadedUser.id, ...diff });
      setOpen(false);
    } catch (e) {
      setError(e || "No se pudo actualizar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón ícono */}
      <button
        type="button"
        onClick={openModal}
        className={cx("icon-btn", className)}
        title={title}
        aria-label={title}
      >
        <FaEdit className="text-slate-700 text-xl" />
      </button>

      {/* Modal */}
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Editar proveedor
                  </Dialog.Title>

                  {loadingUser && <p className="mt-4 text-slate-500">Cargando datos…</p>}

                  {!loadingUser && (
                    <form onSubmit={handleSave} className="mt-4 space-y-4">
                      {error && (
                        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                          {error}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Razón social">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={form.company_name || ""}
                            onChange={(e) => setField("company_name", e.target.value)}
                          />
                        </Field>

                        <Field label="Nombre de fantasía">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={form.fantasy_name || ""}
                            onChange={(e) => setField("fantasy_name", e.target.value)}
                          />
                        </Field>

                        <Field label="Email">
                          <input
                            type="email"
                            className={cx(
                              "w-full rounded-md border px-3 py-2",
                              emailError ? "border-red-300" : "border-slate-300"
                            )}
                            value={form.email || ""}
                            onChange={(e) => setField("email", e.target.value)}
                          />
                          {emailError && (
                            <p className="mt-1 text-xs text-red-600">{emailError}</p>
                          )}
                        </Field>

                        <Field label="CUIT / CUIL (11 díg)">
                          <input
                            inputMode="numeric"
                            pattern="\d*"
                            className={cx(
                              "w-full rounded-md border px-3 py-2",
                              cuitError ? "border-red-300" : "border-slate-300"
                            )}
                            value={form.cuit_or_cuil || ""}
                            onChange={(e) => setField("cuit_or_cuil", e.target.value)}
                          />
                          {cuitError && (
                            <p className="mt-1 text-xs text-red-600">{cuitError}</p>
                          )}
                        </Field>

                        <Field label="Alias (opcional)">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={form.alias || ""}
                            onChange={(e) => setField("alias", e.target.value)}
                          />
                        </Field>

                        <Field label="Banco (opcional)">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={form.bank || ""}
                            onChange={(e) => setField("bank", e.target.value)}
                          />
                        </Field>

                        <Field label="CBU / CVU (opcional)">
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-300 px-3 py-2"
                            value={form.cbu_or_cvu || ""}
                            onChange={(e) => setField("cbu_or_cvu", e.target.value)}
                          />
                        </Field>

                        {/* === Switches lado a lado en el mismo bloque === */}
                        <div className="md:col-span-2">
                          <span className="field-label">Estado y permisos</span>
                          <div className="mt-2 flex flex-wrap items-center gap-6">
                            <label className="inline-flex items-center gap-2">
                              <Switch
                                checked={!!form.is_active}
                                onChange={(v) => setField("is_active", v ? 1 : 0)}
                                className={cx(
                                  "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                                  form.is_active ? "bg-emerald-500 border-emerald-600" : "bg-slate-300 border-slate-400"
                                )}
                              >
                                <span
                                  className={cx(
                                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                    form.is_active ? "translate-x-5" : "translate-x-1"
                                  )}
                                />
                              </Switch>
                              <span className="text-sm text-slate-800">
                                Activar / desactivar usuario
                              </span>
                            </label>

                            <label className="inline-flex items-center gap-2">
                              <Switch
                                checked={!!form.is_administrator}
                                onChange={(v) => setField("is_administrator", v ? 1 : 0)}
                                className={cx(
                                  "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                                  form.is_administrator ? "bg-blue-600 border-blue-700" : "bg-slate-300 border-slate-400"
                                )}
                              >
                                <span
                                  className={cx(
                                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                    form.is_administrator ? "translate-x-5" : "translate-x-1"
                                  )}
                                />
                              </Switch>
                              <span className="text-sm text-slate-800">
                                ¿Es administrador?
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          disabled={loading}
                          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!canSave}
                          className="inline-flex items-center rounded-md bg-azuloscuro px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                        >
                          {loading ? "Guardando…" : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
