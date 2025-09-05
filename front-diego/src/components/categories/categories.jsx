// src/panel/categories.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navbar } from "../navbar/navbar";
import {
  fetchCategories,
  setFilters,
  setPage,
} from "../../redux/categories.slice";
import CategoriesTable from "./categoriesTable";
import AddCategory from "./addCategory";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Categories() {
  const dispatch = useDispatch();

  // auth (para Navbar)
  const authUser = useSelector((s) => s.users?.authUser);
  const isAdmin = !!authUser?.is_administrator;

  // estado categories (blindado por si aún no registraste el reducer)
  const {
    list = [],
    status = "idle",
    error = null,
    total = 0,
    filters = { q: "" },
  } = useSelector((s) => s.categories ?? {});

  // pestaña activa (Navbar)
  const [activeTab, setActiveTab] = useState("categorias");

  // búsqueda con debounce
  const [q, setQ] = useState(filters.q ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // aplicar filtros cada vez que cambia la búsqueda
  useEffect(() => {
    dispatch(setFilters({ q: debouncedQ }));
    dispatch(fetchCategories());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);


  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pageCount) return;
    dispatch(setPage(nextPage));
    dispatch(fetchCategories());
  };

  // (placeholder) acción del botón "Agregar categoría"
  const handleAddCategory = () => {
    // luego conectamos acá el componente/modal de "Nueva categoría"
    console.log("Abrir modal: Agregar categoría");
  };

  return (
    <div className="page">
      <Navbar
        isAdmin={isAdmin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title="Gestor de facturación GDN"
      />

      <main className="container-xl">
        {/* Banda superior */}
        <section className="band-red">
          <div className="panel-row">
            <h2 className="text-xl md:text-2xl font-semibold">Categorías</h2>

            <AddCategory></AddCategory>
          </div>
        </section>

       

        <section className="mt-4">
        <CategoriesTable 
        // onEdit={handleEdit} 
        />
      </section>
      </main>
    </div>
  );
}

/* UI helpers */
function Th({ children }) {
  return <th className="th">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={cx("td", className)}>{children}</td>;
}
