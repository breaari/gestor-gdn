<?php
// backphp-diego/users/users.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

/* ============== BOOTSTRAP ============== */
require __DIR__ . '/../bd/bd.php';
require __DIR__ . '/../config.php';

/* ============== HELPERS ============== */
function out($data, int $status = 200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function only_digits(string $v): string { return preg_replace('/\D+/', '', $v) ?? ''; }
function nonempty_str($v): ?string { $v = isset($v) ? trim((string)$v) : null; return ($v === '' ? null : $v); }
function clamp_int($v, int $min, int $max): int { $i = (int)$v; return max($min, min($max, $i)); }
function parse_boolish($v): ?int {
  if ($v === null) return null;
  $s = strtolower(trim((string)$v));
  if (in_array($s, ['1','true','sí','si','yes'], true)) return 1;
  if (in_array($s, ['0','false','no'], true)) return 0;
  return null;
}
function bool01($v): int {
  return (int)!!(filter_var($v, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? (int)$v);
}

/** Proyección pública del usuario según el nuevo esquema */
function public_user(array $row): array {
  return [
    'id'               => isset($row['id']) ? (int)$row['id'] : null,
    'email'            => $row['email']            ?? null,
    'cuit_or_cuil'     => $row['cuit_or_cuil']     ?? null,
    'is_administrator' => isset($row['is_administrator']) ? (int)$row['is_administrator'] : 0,
    'company_name'     => $row['company_name']     ?? null,
    'fantasy_name'     => $row['fantasy_name']     ?? null,
    'alias'            => $row['alias']            ?? null,
    'cbu_or_cvu'       => $row['cbu_or_cvu']       ?? null,
    'bank'             => $row['bank']             ?? null,
    'is_active'        => isset($row['is_active']) ? (int)$row['is_active'] : 1,
    'created_at'       => $row['created_at']       ?? null,
    'updated_at'       => $row['updated_at']       ?? null,
  ];
}

/* ============== INPUT ============== */
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = null;
$raw = file_get_contents('php://input');
if ($raw) {
  $j = json_decode($raw, true);
  if (is_array($j)) $body = $j;
}
if (!$body && !empty($_POST)) $body = $_POST;

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

/* ================== ROUTER ================== */
try {
  switch ($method) {

    /* ================== GET ================== */
    case 'GET': {
      // GET /users.php?id=123  -> detalle
      if ($id) {
        $row = db_select(
          'SELECT id,email,cuit_or_cuil,is_administrator,company_name,fantasy_name,alias,cbu_or_cvu,bank,is_active,created_at,updated_at
             FROM users WHERE id=:id LIMIT 1',
          [':id' => $id]
        )->fetch();
        if (!$row) out(['message' => 'No encontrado'], 404);
        out(['user' => public_user($row)]);
      }

      // GET /users.php?limit=&offset=&q=&is_admin=&is_active=&bank=
      $limit   = clamp_int($_GET['limit']  ?? 50, 1, 100);
      $offset  = max(0, (int)($_GET['offset'] ?? 0));
      $qRaw    = nonempty_str($_GET['q'] ?? $_GET['supplier_q'] ?? null);
      $qDigits = $qRaw !== null ? only_digits($qRaw) : null;
      $isAdm   = parse_boolish($_GET['is_admin']  ?? null);
      $isAct   = parse_boolish($_GET['is_active'] ?? null);
      $bank    = nonempty_str($_GET['bank'] ?? null);

      $where  = [];
      $params = [];

      if ($isAdm !== null) { $where[] = 'is_administrator = :ia'; $params[':ia'] = $isAdm; }
      if ($isAct !== null) { $where[] = 'is_active = :ac';       $params[':ac'] = $isAct; }
      if ($bank !== null)  { $where[] = 'bank LIKE :bk';         $params[':bk'] = '%'.$bank.'%'; }

      if ($qRaw !== null) {
        $or = ['email LIKE :q', 'company_name LIKE :q', 'fantasy_name LIKE :q'];
        $params[':q'] = '%'.$qRaw.'%';
        if ($qDigits !== null && $qDigits !== '') {
          $or[] = 'cuit_or_cuil LIKE :qd';
          $params[':qd'] = '%'.$qDigits.'%';
        }
        $where[] = '(' . implode(' OR ', $or) . ')';
      }

      $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

      $total = (int)db_select("SELECT COUNT(*) FROM users $whereSql", $params)->fetchColumn();

      $sql = "
        SELECT id,email,cuit_or_cuil,is_administrator,company_name,fantasy_name,alias,cbu_or_cvu,bank,is_active,created_at,updated_at
        FROM users
        $whereSql
        ORDER BY created_at DESC, id DESC
        LIMIT $limit OFFSET $offset
      ";
      $rows = db_select($sql, $params)->fetchAll();

      $users = array_map('public_user', $rows ?: []);
      out(['users' => $users, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
    }

    /* ================== POST (create) ================== */
    case 'POST': {
      $email    = strtolower(trim((string)($body['email'] ?? '')));
      $cuit     = only_digits((string)($body['cuit_or_cuil'] ?? ''));
      $company  = trim((string)($body['company_name']  ?? ''));
      $fantasy  = trim((string)($body['fantasy_name']  ?? ''));
      $is_admin = bool01($body['is_administrator'] ?? 0);

      $alias    = nonempty_str($body['alias']      ?? null);
      $cbu      = nonempty_str($body['cbu_or_cvu'] ?? null);
      $bank     = nonempty_str($body['bank']       ?? null);
      $is_act   = array_key_exists('is_active', $body) ? bool01($body['is_active']) : 1;

      if ($cbu !== null) {
        $cbu = only_digits($cbu);
        if ($cbu !== '' && !preg_match('/^\d{22}$/', $cbu)) {
          out(['message' => 'CBU/CVU inválido. Debe tener 22 dígitos.'], 422);
        }
      }

      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(['message'=>'Email inválido'], 422);
      if (!preg_match('/^\d{11}$/', $cuit))          out(['message'=>'CUIT/CUIL debe tener 11 dígitos'], 422);
      if ($company === '')                           out(['message'=>'company_name es requerido'], 422);
      if ($fantasy === '')                           out(['message'=>'fantasy_name es requerido'], 422);

      if (exists_email($email)) out(['message'=>'Email ya registrado'], 409);
      if (exists_cuit($cuit))   out(['message'=>'CUIT/CUIL ya registrado'], 409);
      if ($cbu && exists_cbu($cbu)) out(['message'=>'CBU/CVU ya está en uso'], 409);

      db_exec(
        "INSERT INTO users (email,cuit_or_cuil,is_administrator,company_name,fantasy_name,alias,cbu_or_cvu,bank,is_active)
         VALUES (:e,:c,:a,:co,:fa,:al,:cb,:bk,:ia)",
        [':e'=>$email, ':c'=>$cuit, ':a'=>$is_admin, ':co'=>$company, ':fa'=>$fantasy, ':al'=>$alias, ':cb'=>$cbu, ':bk'=>$bank, ':ia'=>$is_act]
      );

      $newId = (int)last_id();
      $created = db_select(
        'SELECT id,email,cuit_or_cuil,is_administrator,company_name,fantasy_name,alias,cbu_or_cvu,bank,is_active,created_at,updated_at
           FROM users WHERE id=:id LIMIT 1',
        [':id'=>$newId]
      )->fetch();

      out(['message'=>'Creado', 'user'=>public_user($created)], 201);
    }

    /* ================== PUT (update) ================== */
    case 'PUT': {
      if (!$id) out(['message'=>'Falta id'], 400);

      $curr = db_select('SELECT * FROM users WHERE id=:id LIMIT 1', [':id'=>$id])->fetch();
      if (!$curr) out(['message'=>'No encontrado'], 404);

      $email    = array_key_exists('email', $body)            ? strtolower(trim((string)$body['email'])) : $curr['email'];
      $cuit     = array_key_exists('cuit_or_cuil', $body)     ? only_digits((string)$body['cuit_or_cuil']) : $curr['cuit_or_cuil'];
      $company  = array_key_exists('company_name', $body)     ? trim((string)$body['company_name']) : $curr['company_name'];
      $fantasy  = array_key_exists('fantasy_name', $body)     ? trim((string)$body['fantasy_name']) : $curr['fantasy_name'];
      $is_admin = array_key_exists('is_administrator', $body) ? bool01($body['is_administrator']) : (int)$curr['is_administrator'];

      $alias    = array_key_exists('alias', $body)      ? nonempty_str($body['alias']) : ($curr['alias'] ?? null);
      $cbu      = array_key_exists('cbu_or_cvu', $body) ? nonempty_str($body['cbu_or_cvu']) : ($curr['cbu_or_cvu'] ?? null);
      $bank     = array_key_exists('bank', $body)       ? nonempty_str($body['bank']) : ($curr['bank'] ?? null);
      $is_act   = array_key_exists('is_active', $body)  ? bool01($body['is_active']) : (int)$curr['is_active'];

      if ($cbu !== null) {
        $cbu = only_digits($cbu);
        if ($cbu !== '' && !preg_match('/^\d{22}$/', $cbu)) {
          out(['message'=>'CBU/CVU inválido. Debe tener 22 dígitos.'], 422);
        }
      }

      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) out(['message'=>'Email inválido'], 422);
      if (!preg_match('/^\d{11}$/', $cuit))          out(['message'=>'CUIT/CUIL debe tener 11 dígitos'], 422);
      if ($company === '')                           out(['message'=>'company_name no puede ser vacío'], 422);
      if ($fantasy === '')                           out(['message'=>'fantasy_name no puede ser vacío'], 422);

      if (exists_email($email, $id)) out(['message'=>'Email ya registrado'], 409);
      if (exists_cuit($cuit, $id))   out(['message'=>'CUIT/CUIL ya registrado'], 409);
      if ($cbu !== null && $cbu !== '' && exists_cbu($cbu, $id)) out(['message'=>'CBU/CVU ya está en uso'], 409);

      db_exec(
        "UPDATE users
            SET email=:e, cuit_or_cuil=:c, is_administrator=:a,
                company_name=:co, fantasy_name=:fa, alias=:al, cbu_or_cvu=:cb, bank=:bk, is_active=:ia
          WHERE id=:id",
        [':e'=>$email, ':c'=>$cuit, ':a'=>$is_admin, ':co'=>$company, ':fa'=>$fantasy, ':al'=>$alias, ':cb'=>$cbu, ':bk'=>$bank, ':ia'=>$is_act, ':id'=>$id]
      );

      $updated = db_select(
        'SELECT id,email,cuit_or_cuil,is_administrator,company_name,fantasy_name,alias,cbu_or_cvu,bank,is_active,created_at,updated_at
           FROM users WHERE id=:id LIMIT 1',
        [':id'=>$id]
      )->fetch();

      out(['message'=>'Actualizado', 'user'=>public_user($updated)]);
    }

    /* ================== DELETE ================== */
    case 'DELETE': {
      if (!$id) out(['message'=>'Falta id'], 400);

      // hard=1 -> borrado físico; por defecto soft (desactivar)
      $hard = (int)($_GET['hard'] ?? $_GET['force'] ?? 0);

      if ($hard === 1) {
        // ⚠️ Si hay FKs sin CASCADE, puede fallar (se captura en el catch)
        db_exec('DELETE FROM users WHERE id=:id LIMIT 1', [':id' => $id]);
        out(['ok' => true, 'deleted' => $id, 'soft' => 0]);
      } else {
        db_exec('UPDATE users SET is_active=0 WHERE id=:id', [':id' => $id]);
        out(['ok' => true, 'deleted' => $id, 'soft' => 1, 'message' => 'Desactivado']);
      }
    }

    default:
      out(['message' => 'Método no permitido'], 405);
  }

} catch (Throwable $e) {
  $msg = $e->getMessage();
  $dup = strtolower($msg);
  if (strpos($dup, 'duplicate') !== false) {
    if (strpos($dup, 'cbu_or_cvu') !== false) out(['message'=>'CBU/CVU ya está en uso'], 409);
    if (strpos($dup, 'email')     !== false) out(['message'=>'Email ya registrado'], 409);
    if (strpos($dup, 'cuit')      !== false || strpos($dup, 'cuit_or_cuil') !== false) out(['message'=>'CUIT/CUIL ya registrado'], 409);
  }
  out(['message'=>'Error de servidor', 'detail'=>$msg], 500);
}
