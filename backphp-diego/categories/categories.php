<?php
// backphp-diego/categories/categories.php
// CRUD para tabla `categories` SIN is_active
// Schema:
// - id (INT UNSIGNED, PK, AI)
// - name (VARCHAR(100), INDEX)  -- recomendable UNIQUE
// - slug (VARCHAR(120), STORED GENERATED)
// - created_at, updated_at (TIMESTAMPs)
declare(strict_types=1);

require_once __DIR__ . '/../config/cors.php';

/* ============== BOOTSTRAP ============== */
require __DIR__ . '/../bd/bd.php';
require __DIR__ . '/../config.php';

/* ============== HELPERS ============== */
function out($data, int $status=200){ http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function clamp_int($v, int $min, int $max): int { $i=(int)$v; return max($min, min($max, $i)); }
function nonempty_str($v): ?string { $v = isset($v)? trim((string)$v) : null; return ($v === '' ? null : $v); }

/* ============== PUBLIC SHAPE ============== */
function public_category(array $row): array {
  return [
    'id'         => isset($row['id']) ? (int)$row['id'] : null,
    'name'       => $row['name'] ?? null,
    'slug'       => $row['slug'] ?? null,
    'created_at' => $row['created_at'] ?? null,
    'updated_at' => $row['updated_at'] ?? null,
  ];
}

/* ============== VALIDATION HELPERS ============== */
function exists_name(string $name, ?int $excludeId=null): bool {
  $sql = 'SELECT 1 FROM categories WHERE name = :n';
  $p = [':n'=>$name];
  if ($excludeId !== null) { $sql .= ' AND id <> :id'; $p[':id'] = $excludeId; }
  return (bool)db_select($sql.' LIMIT 1', $p)->fetchColumn();
}

/* ============== INPUT ============== */
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = null;
$raw = file_get_contents('php://input');
if ($raw) { $j = json_decode($raw, true); if (is_array($j)) $body = $j; }
if (!$body && !empty($_POST)) $body = $_POST;

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

/* ============== ROUTER ============== */
try {
  switch ($method) {

    /* ========== GET ========== */
    case 'GET': {
      // Detalle
      if ($id) {
        $row = db_select(
          'SELECT id,name,slug,created_at,updated_at FROM categories WHERE id=:id LIMIT 1',
          [':id'=>$id]
        )->fetch();
        if (!$row) out(['message'=>'No encontrado'], 404);
        out(['category' => public_category($row)]);
      }

      // Listado
      $limit   = clamp_int($_GET['limit']  ?? 50, 1, 200);
      $offset  = max(0, (int)($_GET['offset'] ?? 0));
      $q       = nonempty_str($_GET['q'] ?? null);

      $where = [];
      $params = [];
      if ($q !== null)  { $where[] = '(name LIKE :q OR slug LIKE :q)'; $params[':q'] = '%'.$q.'%'; }

      $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';
      $total = (int)db_select("SELECT COUNT(*) FROM categories $whereSql", $params)->fetchColumn();

      // IMPORTANTE: interpolar enteros en LIMIT/OFFSET
      $rows = db_select(
        "SELECT id,name,slug,created_at,updated_at
           FROM categories
           $whereSql
           ORDER BY name ASC, id ASC
           LIMIT $limit OFFSET $offset",
        $params
      )->fetchAll();

      $cats = array_map('public_category', $rows ?: []);
      out(['categories'=>$cats, 'total'=>$total, 'limit'=>$limit, 'offset'=>$offset]);
    }

    /* ========== POST (create) ========== */
    case 'POST': {
      $name = nonempty_str($body['name'] ?? null);

      if ($name === null) out(['message'=>'name es requerido'], 422);
      if (mb_strlen($name) > 100) out(['message'=>'name debe tener hasta 100 caracteres'], 422);
      if (exists_name($name)) out(['message'=>'Ya existe una categoría con ese nombre'], 409);

      db_exec('INSERT INTO categories (name) VALUES (:n)', [':n'=>$name]);

      $newId = (int)last_id();
      $row = db_select(
        'SELECT id,name,slug,created_at,updated_at FROM categories WHERE id=:id LIMIT 1',
        [':id'=>$newId]
      )->fetch();

      out(['message'=>'Creada', 'category'=>public_category($row)], 201);
    }

    /* ========== PUT (update) ========== */
    case 'PUT': {
      if (!$id) out(['message'=>'Falta id'], 400);

      $curr = db_select('SELECT * FROM categories WHERE id=:id LIMIT 1', [':id'=>$id])->fetch();
      if (!$curr) out(['message'=>'No encontrado'], 404);

      $name = array_key_exists('name', $body) ? nonempty_str($body['name']) : $curr['name'];

      if ($name === null) out(['message'=>'name no puede ser vacío'], 422);
      if (mb_strlen($name) > 100) out(['message'=>'name debe tener hasta 100 caracteres'], 422);
      if ($name !== $curr['name'] && exists_name($name, $id)) out(['message'=>'Ya existe una categoría con ese nombre'], 409);

      db_exec('UPDATE categories SET name=:n WHERE id=:id', [':n'=>$name, ':id'=>$id]);

      $row = db_select(
        'SELECT id,name,slug,created_at,updated_at FROM categories WHERE id=:id LIMIT 1',
        [':id'=>$id]
      )->fetch();

      out(['message'=>'Actualizada', 'category'=>public_category($row)]);
    }

    /* ========== DELETE (hard delete) ========== */
    case 'DELETE': {
      if (!$id) out(['message'=>'Falta id'], 400);
      db_exec('DELETE FROM categories WHERE id=:id LIMIT 1', [':id'=>$id]);
      out(['message'=>'Eliminada']);
    }

    default:
      out(['message'=>'Método no permitido'], 405);
  }
} catch (Throwable $e) {
  $msg = $e->getMessage();
  if (stripos($msg, 'duplicate') !== false && stripos($msg, 'name') !== false) {
    out(['message'=>'Ya existe una categoría con ese nombre'], 409);
  }
  out(['message'=>'Error de servidor', 'detail'=>$msg], 500);
}
