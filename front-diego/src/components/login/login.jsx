

// src/login/Login.jsx
import React, { useEffect, useState } from "react";
import { isValidCuit, onlyDigits } from "../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginByCuit, clearAuthMessages } from "../../redux/users.slice"; // ajustá la ruta si tu estructura difiere

export const Login = () => {
  const [cuit, setCuit] = useState("");
  const [localError, setLocalError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const authStatus = useSelector((s) => s.users.authStatus); // "idle" | "loading" | "succeeded" | "failed"
  const authError  = useSelector((s) => s.users.error);
  const authUser   = useSelector((s) => s.users.authUser);
  const loading = authStatus === "loading";

  // limpia mensajes al desmontar
  useEffect(() => {
    return () => { dispatch(clearAuthMessages()); };
  }, [dispatch]);

  // si ya quedó autenticado, redirige
  useEffect(() => {
    if (authUser?.id && authStatus === "succeeded") {
      navigate(`/manager/${authUser.id}/invoices`, { replace: true });
    }
  }, [authUser, authStatus, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    dispatch(clearAuthMessages());

    const digits = onlyDigits(cuit);
    if (!isValidCuit(digits)) {
      setLocalError("CUIT/CUIL inválido. Debe tener 11 dígitos y dígito verificador correcto.");
      return;
    }

    try {
      const user = await dispatch(loginByCuit({ cuit_or_cuil: digits })).unwrap();
      localStorage.setItem("authenticatedUserId", String(user.id));
      navigate(`/manager/${user.id}/invoices`, { replace: true });
    } catch (_) {
      // mensaje ya queda en authError
    }
  };

  const combinedError = localError || authError;

  return (
    <div className="min-h-screen bg-azuloscuro flex items-center justify-center p-4">
      {/* título */}
      <div className="absolute top-4 left-6">
        <h1 className="text-white text-xl font-semibold tracking-wide">Gestor de facturación GDN</h1>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-azulceleste/10 text-azulceleste grid place-items-center">🧾</div>
          <h1 className="text-2xl font-semibold text-azuloscuro">Ingresar con CUIT/CUIL</h1>
        </div>
        {combinedError && (
          <div className="mb-4 rounded-lg bg-rojonaranja/10 border border-rojonaranja/30 text-rojonaranja text-sm p-3">
            {combinedError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="cuit" className="block text-sm font-medium text-slate-700">CUIT / CUIL</label>
            <input
              id="cuit"
              name="cuit"
              inputMode="numeric"
              autoComplete="username"
              placeholder="11 dígitos (sin guiones)"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-azulceleste"
            />
            <p className="mt-1 text-xs text-slate-500">Solo números. Ej: 20XXXXXXXXX</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-azulceleste text-white py-2.5 font-medium hover:bg-azulceleste/90 active:scale-[.99] disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>

          <hr className="my-2 border-slate-200" />

          <button
            onClick={() => navigate("/register")}
            type="button"
            className="w-full rounded-xl border border-azulceleste/30 text-azulceleste py-2.5 font-medium hover:bg-azulceleste/10"
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </div>
  );
};
