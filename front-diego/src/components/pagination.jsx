// // src/components/ui/Pagination.jsx
// import React from "react";

// const cx = (...c) => c.filter(Boolean).join(" ");

// function buildPages(page, pageCount) {
//   if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

//   const pages = [1];
//   const left = Math.max(2, page - 1);
//   const right = Math.min(pageCount - 1, page + 1);

//   if (left > 2) pages.push("…");
//   for (let p = left; p <= right; p++) pages.push(p);
//   if (right < pageCount - 1) pages.push("…");

//   pages.push(pageCount);
//   return pages;
// }

// export default function Pagination({
//   page,
//   pageCount,
//   total,
//   limit,
//   onPageChange,
//   disabled = false,
// }) {
//   if (!pageCount || pageCount < 2) return null;

//   const start = (page - 1) * limit + 1;
//   const end = Math.min(total, page * limit);
//   const pages = buildPages(page, pageCount);

//   return (
//     <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//       <div className="text-sm text-slate-600">
//         Mostrando <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> de{" "}
//         <span className="font-medium">{total}</span>
//       </div>

//       <nav className="flex items-center gap-1" aria-label="Paginación">
//         <button
//           type="button"
//           className={cx("btn btn-outline px-3 py-1", page <= 1 && "opacity-50 cursor-not-allowed")}
//           onClick={() => onPageChange(page - 1)}
//           disabled={disabled || page <= 1}
//         >
//           ← Anterior
//         </button>

//         {pages.map((p, i) =>
//           p === "…" ? (
//             <span key={`dots-${i}`} className="px-2 text-slate-500 select-none">
//               …
//             </span>
//           ) : (
//             <button
//               key={p}
//               type="button"
//               aria-current={p === page ? "page" : undefined}
//               className={cx(
//                 "btn px-3 py-1",
//                 p === page ? "btn-red" : "btn-outline"
//               )}
//               onClick={() => onPageChange(p)}
//               disabled={disabled || p === page}
//             >
//               {p}
//             </button>
//           )
//         )}

//         <button
//           type="button"
//           className={cx(
//             "btn btn-outline px-3 py-1",
//             page >= pageCount && "opacity-50 cursor-not-allowed"
//           )}
//           onClick={() => onPageChange(page + 1)}
//           disabled={disabled || page >= pageCount}
//         >
//           Siguiente →
//         </button>
//       </nav>
//     </div>
//   );
// }

// src/components/ui/Pagination.jsx
import React from "react";

const cx = (...c) => c.filter(Boolean).join(" ");

function buildPages(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);

  if (left > 2) pages.push("…");
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < pageCount - 1) pages.push("…");

  pages.push(pageCount);
  return pages;
}

export default function Pagination({
  page,
  pageCount,
  total,
  limit,
  onPageChange,
  disabled = false,
}) {
  if (!pageCount || pageCount < 2) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const pages = buildPages(page, pageCount);

  const prevDisabled = disabled || page <= 1;
  const nextDisabled = disabled || page >= pageCount;

  return (
    <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Resumen (centrado en mobile) */}
      <div className="text-sm text-slate-600 text-center md:text-left">
        Mostrando <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> de{" "}
        <span className="font-medium">{total}</span>
      </div>

      {/* ===== NAV MOBILE (centrado, misma estética, flechas sin texto) ===== */}
      <nav className="md:hidden overflow-x-auto" aria-label="Paginación móvil">
        <div className="min-w-full flex justify-center">
          <div className="inline-flex items-center whitespace-nowrap gap-1 px-1">
            <button
              type="button"
              title="Anterior"
              aria-label="Página anterior"
              className={cx(
                "btn btn-outline h-9 w-9 inline-flex items-center justify-center rounded-md p-0",
                prevDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => onPageChange(page - 1)}
              disabled={prevDisabled}
            >
              ←
            </button>

            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`dots-m-${i}`} className="px-2 text-slate-500 select-none">
                  …
                </span>
              ) : (
                <button
                  key={`m-${p}`}
                  type="button"
                  aria-current={p === page ? "page" : undefined}
                  className={cx("btn px-3 py-1", p === page ? "btn-red" : "btn-outline")}
                  onClick={() => onPageChange(p)}
                  disabled={disabled || p === page}
                >
                  {p}
                </button>
              )
            )}

            <button
              type="button"
              title="Siguiente"
              aria-label="Página siguiente"
              className={cx(
                "btn btn-outline h-9 w-9 inline-flex items-center justify-center rounded-md p-0",
                nextDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => onPageChange(page + 1)}
              disabled={nextDisabled}
            >
              →
            </button>
          </div>
        </div>
      </nav>

      {/* ===== NAV DESKTOP (igual que antes) ===== */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Paginación">
        <button
          type="button"
          className={cx("btn btn-outline px-3 py-1", prevDisabled && "opacity-50 cursor-not-allowed")}
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
        >
          ← Anterior
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`dots-${i}`} className="px-2 text-slate-500 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              className={cx("btn px-3 py-1", p === page ? "btn-red" : "btn-outline")}
              onClick={() => onPageChange(p)}
              disabled={disabled || p === page}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className={cx("btn btn-outline px-3 py-1", nextDisabled && "opacity-50 cursor-not-allowed")}
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
        >
          Siguiente →
        </button>
      </nav>
    </div>
  );
}
