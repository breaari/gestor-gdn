
import React from "react";
import { formatCuit } from "../utils"; // misma ruta que usás en SuppliersTable

const Field = ({ label, children }) => (
  <div>
    <label className="field-label">{label}</label>
    {children}
  </div>
);

export default function ProfileCard({ user, compact = false }) {
  if (!user) return <p className="text-slate-600">No hay datos de usuario.</p>;

  const isAdmin = !!user.is_administrator;
  const cuitFmt = formatCuit(user.cuit_or_cuil);

  return (
    <div className="bg-white rounded-md shadow-sm border p-5">
      {!compact && (
        <h2 className="text-lg font-semibold text-azuloscuro mb-4">
          Perfil del proveedor
        </h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <Field label="Email">
          <div className="mt-1">{user.email || "—"}</div>
        </Field>

        <Field label="CUIT / CUIL">
          <div className="mt-1">{cuitFmt || user.cuit_or_cuil || "—"}</div>
        </Field>

        <Field label="Razón social">
          <div className="mt-1">{user.company_name || "—"}</div>
        </Field>

        <Field label="Nombre de fantasía">
          <div className="mt-1">{user.fantasy_name || "—"}</div>
        </Field>

        <Field label="Alias">
          <div className="mt-1">{user.alias || "—"}</div>
        </Field>

        <Field label="CBU / CVU">
          <div className="mt-1">{user.cbu_or_cvu || "—"}</div>
        </Field>

        {/* NUEVO: Banco */}
        <Field label="Banco">
          <div className="mt-1">{user.bank || "—"}</div>
        </Field>

        <Field label="Rol">
          <div className="mt-1">
            <span className={`status-badge ${isAdmin ? "status-badge--admin" : "status-badge--muted"}`}>
              {isAdmin ? "Administrador" : "Proveedor"}
            </span>
          </div>
        </Field>
      </div>

      {!compact && (
        <p className="text-xs text-slate-500 mt-4">Esta vista es solo de lectura.</p>
      )}
    </div>
  );
}
