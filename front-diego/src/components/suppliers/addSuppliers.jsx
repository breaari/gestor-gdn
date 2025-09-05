// src/components/suppliers/AddSupplier.jsx
import React, { Fragment, useMemo, useState } from "react";
import { Dialog, Transition, Switch } from "@headlessui/react";
import { FaPlus } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { createUser } from "../../redux/users.slice";

const cx = (...c) => c.filter(Boolean).join(" ");
const digitsOnly = (s = "") => String(s || "").replace(/\D+/g, "");

const emptyForm = {
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

export default function AddSupplier({
  className,
  title = "Nuevo proveedor",
  onCreated,
}) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 👇 para no mostrar errores hasta que el user interactúe o intente guardar
  const [touched, setTouched] = useState({
    email: false,
    cuit_or_cuil: false,
    company_name: false,
    fantasy_name: false,
    cbu_or_cvu: false,
  });
  const [submitTried, setSubmitTried] = useState(false);

  const markTouched = (k) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ===== Validaciones (lógicas) =====
  const email = form.email.trim();
  const emailOk = /\S+@\S+\.\S+/.test(email);

  const cuitDigits = useMemo(
    () => digitsOnly(form.cuit_or_cuil),
    [form.cuit_or_cuil]
  );
  const cuitOk = cuitDigits.length === 11;

  const companyOk = !!form.company_name.trim();
  const fantasyOk = !!form.fantasy_name.trim();

  const cbuDigits = useMemo(
    () => digitsOnly(form.cbu_or_cvu),
    [form.cbu_or_cvu]
  );
  const cbuOk = !form.cbu_or_cvu || cbuDigits.length === 22; // opcional, pero si lo ponen => 22 dígitos

  // Deshabilitar guardar si algo requerido no está OK
  const canSave = useMemo(() => {
    if (loading) return false;
    return emailOk && cuitOk && companyOk && fantasyOk && cbuOk;
  }, [loading, emailOk, cuitOk, companyOk, fantasyOk, cbuOk]);

  // ===== Mensajes sólo si touched o submitTried =====
  const showEmailError = (touched.email || submitTried) && !emailOk;
  const showCuitError = (touched.cuit_or_cuil || submitTried) && !cuitOk;
  const showCompanyError = (touched.company_name || submitTried) && !companyOk;
  const showFantasyError = (touched.fantasy_name || submitTried) && !fantasyOk;
  const showCbuError =
    (touched.cbu_or_cvu || submitTried) && !!form.cbu_or_cvu && !cbuOk;

  // ===== Open/Close =====
  const openModal = () => {
    setError("");
    setForm(emptyForm);
    setTouched({
      email: false,
      cuit_or_cuil: false,
      company_name: false,
      fantasy_name: false,
      cbu_or_cvu: false,
    });
    setSubmitTried(false);
    setOpen(true);
  };
  const closeModal = () => {
    if (loading) return;
    setOpen(false);
  };

  const buildPayload = () => ({
    email,
    cuit_or_cuil: cuitDigits,
    company_name: form.company_name.trim(),
    fantasy_name: form.fantasy_name.trim(),
    alias: form.alias.trim() || null,
    bank: form.bank.trim() || null,
    cbu_or_cvu: cbuDigits ? cbuDigits : null,
    is_active: Number(!!form.is_active),
    is_administrator: Number(!!form.is_administrator),
  });

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setSubmitTried(true); // 👈 a partir de acá se muestran errores si los hay
    if (!canSave) return;

    setError("");
    setLoading(true);
    try {
      const created = await dispatch(createUser(buildPayload())).unwrap();
      onCreated?.(created);
      setOpen(false);
      setForm(emptyForm);
    } catch (e) {
      setError(
        typeof e === "string" ? e : e?.message || "No se pudo crear el proveedor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón CTA */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 btn-blue shadow-sm"
      >
        <span>+ Nuevo proveedor</span>
      </button>

      {/* Modal */}
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-md bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    {title}
                  </Dialog.Title>

                  <form onSubmit={handleCreate} className="mt-4 space-y-4">
                    {error && (
                      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Razón social *">
                        <input
                          type="text"
                          className={cx(
                            "w-full rounded-md border px-3 py-2",
                            showCompanyError ? "border-red-300" : "border-slate-300"
                          )}
                          placeholder="Ej: ACME S.A."
                          value={form.company_name}
                          onChange={(e) => setField("company_name", e.target.value)}
                          onBlur={() => markTouched("company_name")}
                        />
                        {showCompanyError && (
                          <p className="mt-1 text-xs text-red-600">
                            Razón social es requerida.
                          </p>
                        )}
                      </Field>

                      <Field label="Nombre de fantasía *">
                        <input
                          type="text"
                          className={cx(
                            "w-full rounded-md border px-3 py-2",
                            showFantasyError ? "border-red-300" : "border-slate-300"
                          )}
                          placeholder="Ej: ACME"
                          value={form.fantasy_name}
                          onChange={(e) => setField("fantasy_name", e.target.value)}
                          onBlur={() => markTouched("fantasy_name")}
                        />
                        {showFantasyError && (
                          <p className="mt-1 text-xs text-red-600">
                            Nombre de fantasía es requerido.
                          </p>
                        )}
                      </Field>

                      <Field label="Email *">
                        <input
                          type="email"
                          className={cx(
                            "w-full rounded-md border px-3 py-2",
                            showEmailError ? "border-red-300" : "border-slate-300"
                          )}
                          placeholder="email@dominio.com"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          onBlur={() => markTouched("email")}
                          autoComplete="off"
                        />
                        {showEmailError && (
                          <p className="mt-1 text-xs text-red-600">Email inválido.</p>
                        )}
                      </Field>

                      <Field label="CUIT / CUIL (11 dígitos) *">
                        <input
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={14}
                          className={cx(
                            "w-full rounded-md border px-3 py-2",
                            showCuitError ? "border-red-300" : "border-slate-300"
                          )}
                          placeholder="XX-XXXXXXXX-X"
                          value={form.cuit_or_cuil}
                          onChange={(e) => setField("cuit_or_cuil", e.target.value)}
                          onBlur={() => markTouched("cuit_or_cuil")}
                          autoComplete="off"
                        />
                        {showCuitError && (
                          <p className="mt-1 text-xs text-red-600">
                            CUIT/CUIL debe tener 11 dígitos.
                          </p>
                        )}
                      </Field>

                      <Field label="Alias (opcional)">
                        <input
                          type="text"
                          className="w-full rounded-md border border-slate-300 px-3 py-2"
                          value={form.alias}
                          onChange={(e) => setField("alias", e.target.value)}
                        />
                      </Field>

                      <Field label="Banco (opcional)">
                        <input
                          type="text"
                          className="w-full rounded-md border border-slate-300 px-3 py-2"
                          value={form.bank}
                          onChange={(e) => setField("bank", e.target.value)}
                        />
                      </Field>

                      <Field label="CBU / CVU (22 dígitos, opcional)">
                        <input
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={26}
                          className={cx(
                            "w-full rounded-md border px-3 py-2",
                            showCbuError ? "border-red-300" : "border-slate-300"
                          )}
                          placeholder="22 dígitos (sin espacios)"
                          value={form.cbu_or_cvu}
                          onChange={(e) => setField("cbu_or_cvu", e.target.value)}
                          onBlur={() => markTouched("cbu_or_cvu")}
                          autoComplete="off"
                        />
                        {showCbuError && (
                          <p className="mt-1 text-xs text-red-600">
                            CBU/CVU debe tener 22 dígitos.
                          </p>
                        )}
                      </Field>

                      {/* Switches */}
                      <div className="md:col-span-2">
                        <span className="field-label">Estado y permisos</span>
                        <div className="mt-2 flex flex-wrap items-center gap-6">
                          <label className="inline-flex items-center gap-2">
                            <Switch
                              checked={!!form.is_active}
                              onChange={(v) => setField("is_active", v ? 1 : 0)}
                              className={cx(
                                "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                                form.is_active
                                  ? "bg-emerald-500 border-emerald-600"
                                  : "bg-slate-300 border-slate-400"
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
                                form.is_administrator
                                  ? "bg-blue-600 border-blue-700"
                                  : "bg-slate-300 border-slate-400"
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
                        {loading ? "Creando…" : "Crear proveedor"}
                      </button>
                    </div>
                  </form>
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
