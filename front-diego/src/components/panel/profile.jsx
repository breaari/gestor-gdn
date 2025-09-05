// src/panel/profile.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { Navbar } from "../navbar/navbar";
import { fetchUserById } from "../../redux/users.slice";
import ProfileCard from "./profileCard";

export default function Profile() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const authUser     = useSelector((s) => s.users.authUser);
  const detail       = useSelector((s) => s.users.detail);
  const detailStatus = useSelector((s) => s.users.detailStatus); // "idle" | "loading" | "succeeded" | "failed"
  const error        = useSelector((s) => s.users.error);

  const numericId   = Number(id);
  const viewingSelf = Number(authUser?.id) === numericId;
  const isAdmin     = !!authUser?.is_administrator;

  // Traer detalle si estamos viendo a otro usuario
  useEffect(() => {
    if (!numericId) return;
    if (!viewingSelf) dispatch(fetchUserById(numericId));
  }, [dispatch, numericId, viewingSelf]);

  // Usuario a mostrar: si es el propio, authUser; si no, detail (cuando haya llegado)
  const viewUser = useMemo(() => {
    if (viewingSelf) return authUser || null;
    return detail?.id === numericId ? detail : null;
  }, [viewingSelf, authUser, detail, numericId]);

  const isLoading = !viewingSelf && detailStatus === "loading";
  const loadError = !viewingSelf && detailStatus === "failed" ? (error || "No se pudo cargar el perfil.") : "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar: sin tabs admin en esta vista */}
      <Navbar isAdmin={false} activeTab="perfil" setActiveTab={() => {}} />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl bg-red-500/95 text-white p-5 mt-4">
          <div className="text-xl md:text-2xl font-semibold">Perfil</div>
          {isAdmin && !viewingSelf && (
            <p className="text-sm mt-1 opacity-90">Vista como administrador del usuario #{numericId}</p>
          )}
        </div>

        <section className="mt-6">
          {isLoading && <div className="text-slate-600">Cargando…</div>}

          {loadError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              {loadError}
            </div>
          )}

           {!isLoading && !loadError && <ProfileCard user={viewUser} />}
        </section>
      </main>
    </div>
  );
}

