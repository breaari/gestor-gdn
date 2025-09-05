// // src/pages/Register.jsx
// import React, { useEffect, useState } from "react";
// import { isValidCuit, onlyDigits } from "../utils";
// import { useNavigate } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { register as registerUser, clearAuthMessages } from "../../redux/users.slice";

// export default function Register() {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();

//   const [form, setForm] = useState({
//     email: "",
//     cuit_or_cuil: "",
//     company_name: "",
//     fantasy_name: "",
//     alias: "",        // opcional
//     cbu_or_cvu: "",   // opcional (22 dígitos)
//     bank: "",         // opcional
//   });
//   const [localError, setLocalError] = useState("");

//   const authStatus = useSelector((s) => s.users.authStatus);
//   const authError  = useSelector((s) => s.users.error);
//   const authUser   = useSelector((s) => s.users.authUser);

//   const loading = authStatus === "loading";
//   const combinedError = localError || authError;

//   useEffect(() => {
//     return () => { dispatch(clearAuthMessages()); };
//   }, [dispatch]);

//   useEffect(() => {
//     if (authUser?.id) {
//       // alineado con el login por CUIT
//       navigate(`/manager/${authUser.id}/invoices`, { replace: true });
//     }
//   }, [authUser, navigate]);

//   const onChange = (e) => {
//     const { name, value } = e.target;
//     setForm((f) => ({ ...f, [name]: value }));
//     if (localError) setLocalError("");
//   };

//   const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLocalError("");
//     dispatch(clearAuthMessages());

//     const cuitDigits = onlyDigits(form.cuit_or_cuil);
//     const cbuDigits  = onlyDigits(form.cbu_or_cvu);

//     if (!isValidEmail(form.email)) return setLocalError("Email inválido.");
//     if (!isValidCuit(cuitDigits)) return setLocalError("CUIT/CUIL inválido. Debe tener 11 dígitos y DV correcto.");
//     if (!form.company_name.trim() || !form.fantasy_name.trim()) {
//       return setLocalError("Completá razón social y nombre de fantasía.");
//     }
//     // CBU/CVU opcional pero, si viene, DEBE tener 22 dígitos
//     if (form.cbu_or_cvu.trim() && cbuDigits.length !== 22) {
//       return setLocalError("El CBU/CVU debe tener exactamente 22 dígitos.");
//     }

//     try {
//       const user = await dispatch(
//         registerUser({
//           email: form.email.trim(),
//           cuit_or_cuil: cuitDigits,
//           company_name: form.company_name.trim(),
//           fantasy_name: form.fantasy_name.trim(),
//           alias: form.alias.trim() || undefined,
//           cbu_or_cvu: cbuDigits || undefined,
//           bank: form.bank.trim() || undefined,
//           is_active: 1, // alta activa por defecto
//         })
//       ).unwrap();

//       localStorage.setItem("authenticatedUserId", String(user.id));
//       navigate(`/manager/${user.id}/invoices`, { replace: true });
//     } catch (_) {
//       // el mensaje ya está en authError
//     }
//   };

//   return (
//     <div className="min-h-screen bg-azuloscuro flex items-center justify-center p-4">
//       {/* TÍTULO SUPERIOR IZQUIERDO */}
//       <div className="absolute top-4 left-6">
//         <h1 className="text-white text-xl font-semibold tracking-wide">Gestor de facturación GDN</h1>
//       </div>

//       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
//         <div className="flex items-center gap-3 mb-4">
//           <div className="h-9 w-9 rounded-xl bg-azulceleste/10 text-azulceleste grid place-items-center">📝</div>
//           <h1 className="text-2xl font-semibold text-azuloscuro">Crear cuenta</h1>
//         </div>
//         <p className="text-sm text-slate-500 mb-4">Completá tus datos para registrarte.</p>

//         {combinedError && (
//           <div className="mb-4 rounded-lg bg-rojonaranja/10 border border-rojonaranja/30 text-rojonaranja text-sm p-3">
//             {combinedError}
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-slate-700">Email</label>
//             <input
//               name="email"
//               type="email"
//               autoComplete="email"
//               value={form.email}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="tu@mail.com"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700">CUIT / CUIL</label>
//             <input
//               name="cuit_or_cuil"
//               inputMode="numeric"
//               value={form.cuit_or_cuil}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="11 dígitos (sin guiones)"
//               required
//             />
//             <p className="mt-1 text-xs text-slate-500">Solo números. Ej: 20XXXXXXXXX</p>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700">Razón social</label>
//             <input
//               name="company_name"
//               value={form.company_name}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="Empresa S.A. / Tu nombre"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700">Nombre de fantasía</label>
//             <input
//               name="fantasy_name"
//               value={form.fantasy_name}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="Comercial"
//               required
//             />
//           </div>

//           {/* Alias (opcional) */}
//           <div>
//             <label className="block text-sm font-medium text-slate-700">Alias (opcional)</label>
//             <input
//               name="alias"
//               value={form.alias}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="mi.alias.banco"
//             />
//           </div>

//           {/* CBU/CVU (opcional, 22 dígitos) */}
//           <div>
//             <label className="block text-sm font-medium text-slate-700">CBU / CVU (opcional)</label>
//             <input
//               name="cbu_or_cvu"
//               inputMode="numeric"
//               value={form.cbu_or_cvu}
//               onChange={onChange}
//               maxLength={22}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="22 dígitos"
//             />
//             <p className="mt-1 text-xs text-slate-500">Si lo completás, debe tener exactamente 22 dígitos.</p>
//           </div>

//           {/* Banco (opcional) */}
//           <div>
//             <label className="block text-sm font-medium text-slate-700">Banco (opcional)</label>
//             <input
//               name="bank"
//               value={form.bank}
//               onChange={onChange}
//               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
//               placeholder="Nombre del banco"
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full rounded-xl bg-azulceleste text-white py-2.5 font-medium hover:bg-azulceleste/90 active:scale-[.99] disabled:opacity-60"
//           >
//             {loading ? "Creando cuenta..." : "Registrarme"}
//           </button>

//           <div className="text-center text-sm text-slate-600">
//             <button
//               type="button"
//               onClick={() => { dispatch(clearAuthMessages()); navigate("/login"); }}
//               className="underline underline-offset-2 hover:text-azuloscuro"
//             >
//               ¿Ya tenés cuenta? Iniciar sesión
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// src/pages/Register.jsx
import React, { useEffect, useState } from "react";
import { isValidCuit, onlyDigits } from "../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { register as registerUser, clearAuthMessages, logout } from "../../redux/users.slice";

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    email: "",
    cuit_or_cuil: "",
    company_name: "",
    fantasy_name: "",
    alias: "",
    cbu_or_cvu: "",
    bank: "",
  });
  const [localError, setLocalError] = useState("");
  const [successUser, setSuccessUser] = useState(null); // 👈 éxito

  const authStatus = useSelector((s) => s.users.authStatus);
  const authError  = useSelector((s) => s.users.error);
  const loading = authStatus === "loading";
  const combinedError = localError || authError;

  useEffect(() => () => { dispatch(clearAuthMessages()); }, [dispatch]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (localError) setLocalError("");
  };

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    dispatch(clearAuthMessages());

    const cuitDigits = onlyDigits(form.cuit_or_cuil);
    const cbuDigits  = onlyDigits(form.cbu_or_cvu);

    if (!isValidEmail(form.email)) return setLocalError("Email inválido.");
    if (!isValidCuit(cuitDigits)) return setLocalError("CUIT/CUIL inválido. Debe tener 11 dígitos y DV correcto.");
    if (!form.company_name.trim() || !form.fantasy_name.trim())
      return setLocalError("Completá razón social y nombre de fantasía.");
    if (form.cbu_or_cvu.trim() && cbuDigits.length !== 22)
      return setLocalError("El CBU/CVU debe tener exactamente 22 dígitos.");

    try {
      const user = await dispatch(
        registerUser({
          email: form.email.trim(),
          cuit_or_cuil: cuitDigits,
          company_name: form.company_name.trim(),
          fantasy_name: form.fantasy_name.trim(),
          alias: form.alias.trim() || undefined,
          cbu_or_cvu: cbuDigits || undefined,
          bank: form.bank.trim() || undefined,
          is_active: 1,
        })
      ).unwrap();

      // Mostrar pantalla de éxito (no navegamos)
      setSuccessUser(user);
      // Opcional: limpiar form
      // setForm({ email:"", cuit_or_cuil:"", company_name:"", fantasy_name:"", alias:"", cbu_or_cvu:"", bank:"" });
    } catch (_) { /* mensaje ya está en authError */ }
  };

  const goToLogin = () => {
    // limpiamos auth para que el login no redirija solo
    dispatch(logout());
    dispatch(clearAuthMessages());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-azuloscuro flex items-center justify-center p-4">
      <div className="absolute top-4 left-6">
        <h1 className="text-white text-xl font-semibold tracking-wide">Gestor de facturación GDN</h1>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-azulceleste/10 text-azulceleste grid place-items-center">📝</div>
          <h1 className="text-2xl font-semibold text-azuloscuro">
            {successUser ? "¡Cuenta creada!" : "Crear cuenta"}
          </h1>
        </div>

        {!successUser && <p className="text-sm text-slate-500 mb-4">Sin contraseña. Completá tus datos para registrarte.</p>}

        {/* Mensaje de error */}
        {!successUser && combinedError && (
          <div className="mb-4 rounded-lg bg-rojonaranja/10 border border-rojonaranja/30 text-rojonaranja text-sm p-3">
            {combinedError}
          </div>
        )}

        {/* Vista de ÉXITO */}
        {successUser ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
              <div className="font-semibold mb-1">Tu cuenta se creó correctamente ✅</div>
              <ul className="text-sm space-y-1">
                <li><span className="font-medium">Razón social:</span> {successUser.company_name}</li>
                <li><span className="font-medium">CUIT/CUIL:</span> {successUser.cuit_or_cuil}</li>
                <li><span className="font-medium">Email:</span> {successUser.email}</li>
              </ul>
            </div>

            <p className="text-sm text-slate-600">
              Ya podés volver al inicio e ingresar con tu CUIT/CUIL.
            </p>

            <div className="flex gap-2">
              <button
                onClick={goToLogin}
                className="flex-1 rounded-xl bg-azulceleste text-white py-2.5 font-medium hover:bg-azulceleste/90 active:scale-[.99]"
              >
                Ir al inicio
              </button>
              {/* <button
                onClick={() => { setSuccessUser(null); }}
                className="rounded-xl border border-slate-300 px-4 py-2.5"
              >
                Crear otra
              </button> */}
            </div>
          </div>
        ) : (
          // Formulario de registro (solo si no hay éxito)
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="tu@mail.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">CUIT / CUIL</label>
              <input
                name="cuit_or_cuil"
                inputMode="numeric"
                value={form.cuit_or_cuil}
                onChange={onChange}
                maxLength={11}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="11 dígitos (sin guiones)"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Solo números. Ej: 20XXXXXXXXX</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Razón social</label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="Empresa S.A. / Tu nombre"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre de fantasía</label>
              <input
                name="fantasy_name"
                value={form.fantasy_name}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="Comercial"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Alias (opcional)</label>
              <input
                name="alias"
                value={form.alias}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="mi.alias.banco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">CBU / CVU (opcional)</label>
              <input
                name="cbu_or_cvu"
                inputMode="numeric"
                value={form.cbu_or_cvu}
                onChange={onChange}
                maxLength={22}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="22 dígitos"
              />
              <p className="mt-1 text-xs text-slate-500">Si lo completás, debe tener exactamente 22 dígitos.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Banco (opcional)</label>
              <input
                name="bank"
                value={form.bank}
                onChange={onChange}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
                placeholder="Nombre del banco"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-azulceleste text-white py-2.5 font-medium hover:bg-azulceleste/90 active:scale-[.99] disabled:opacity-60"
            >
              {loading ? "Creando cuenta..." : "Registrarme"}
            </button>

            <div className="text-center text-sm text-slate-600">
              <button
                type="button"
                onClick={() => { dispatch(clearAuthMessages()); navigate("/login"); }}
                className="underline underline-offset-2 hover:text-azuloscuro"
              >
                ¿Ya tenés cuenta? Iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
