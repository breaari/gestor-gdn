<?php
// backphp-diego/invoice_payments/invoice_payments.php
declare(strict_types=1);

/* ============== BOOTSTRAP ============== */
require __DIR__ . '/../bd/bd.php';
require __DIR__ . '/../config/config.php';

/* ============== CONFIG UPLOADS ============== */
// Ruta en disco donde se guardan los archivos
$RECEIPTS_DIR = __DIR__ . '/../uploads/invoices_receipts';
// Prefijo de URL pública — ahora con /diego al inicio
$RECEIPTS_URL_PREFIX = '/diego/uploads/invoices_receipts';

/* ============== HELPERS ============== */
function out($data, int $status=200) { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function clamp_int($v, int $min, int $max): int { $i=(int)$v; return max($min, min($max, $i)); }
function nonempty_str($v): ?string { $v = isset($v)? trim((string)$v) : null; return ($v === '' ? null : $v); }
function parse_datetime($v): ?string { if ($v === null) return null; $ts = strtotime((string)$v); if ($ts === false) return null; return date('Y-m-d H:i:s', $ts); }
function int_or_null($v): ?int { if ($v === null || $v === '') return null; return is_numeric($v) ? (int)$v : null; }
function ensure_dir(string $dir): void { if (!is_dir($dir)) { @mkdir($dir, 0755, true); } }
function safe_basename(string $name): string { $name = preg_replace('/[^\w\-.]+/u', '_', $name); return trim($name, '._'); }
function allowed_ext(string $ext): bool { $ext = strtolower($ext); $whitelist = ['pdf','jpg','jpeg','png','webp']; return in_array($ext, $whitelist, true); }
function detect_ext_by_mime(string $path): ?string { $f = new finfo(FILEINFO_MIME_TYPE); $mime = $f->file($path) ?: ''; $map = ['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp']; return $map[$mime] ?? null; }

/* ============== PUBLIC SHAPE ============== */
function public_payment(array $r): array {
  return [
    'id'           => (int)$r['id'],
    'invoice_id'   => (int)$r['invoice_id'],
    'receipt_path' => $r['receipt_path'] ?? null,
    'paid_at'      => $r['paid_at'],
    'created_at'   => $r['created_at'] ?? null,
    'updated_at'   => $r['updated_at'] ?? null,
  ];
}

/* ============== READ INPUT ============== */
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
      // GET /invoice_payments.php?id=ID
      if ($id) {
        $row = db_select(
          'SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
             FROM invoice_payments
            WHERE id=:id
            LIMIT 1',
          [':id'=>$id]
        )->fetch();
        if (!$row) out(['message'=>'No encontrado'], 404);
        out(['payment'=>public_payment($row)]);
      }

      // GET /invoice_payments.php?invoice_id=&date_from=&date_to=&limit=&offset=
      $limit   = clamp_int($_GET['limit']  ?? 50, 1, 100);
      $offset  = max(0, (int)($_GET['offset'] ?? 0));
      $invoice_id = int_or_null($_GET['invoice_id'] ?? null);
      $from = parse_datetime($_GET['date_from'] ?? null);
      $to   = parse_datetime($_GET['date_to']   ?? null);

      $where = [];
      $params = [];
      if ($invoice_id !== null) { $where[] = 'invoice_id = :inv'; $params[':inv'] = $invoice_id; }
      if ($from !== null) { $where[] = 'paid_at >= :df'; $params[':df'] = $from; }
      if ($to !== null)   { $where[] = 'paid_at <= :dt'; $params[':dt'] = $to; }
      $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

      // Interpolar LIMIT/OFFSET como enteros saneados
      $sql = "
        SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
          FROM invoice_payments
          $whereSql
         ORDER BY paid_at DESC, id DESC
         LIMIT $limit OFFSET $offset
      ";

      $total = (int)db_select("SELECT COUNT(*) FROM invoice_payments $whereSql", $params)->fetchColumn();
      $rows = db_select($sql, $params)->fetchAll();

      $items = array_map('public_payment', $rows ?: []);
      out(['payments'=>$items, 'total'=>$total, 'limit'=>$limit, 'offset'=>$offset]);
    }

    /* ========== POST (create / replace) ========== */
    case 'POST': {
      $invoice_id  = (int)($body['invoice_id'] ?? ($_POST['invoice_id'] ?? 0));
      $paid_at     = parse_datetime($body['paid_at'] ?? ($_POST['paid_at'] ?? 'now'));
      $receipt_path_param = nonempty_str($body['receipt_path'] ?? ($_POST['receipt_path'] ?? null));

      if ($invoice_id <= 0) out(['message'=>'invoice_id es requerido'], 422);
      if ($paid_at === null) out(['message'=>'paid_at inválido'], 422);

      // Verificar que la invoice exista
      $exists = db_select('SELECT 1 FROM invoices WHERE id=:id LIMIT 1', [':id'=>$invoice_id])->fetchColumn();
      if (!$exists) out(['message'=>'Factura inexistente'], 404);

      // Subir archivo (obligatorio en tu UI; aquí lo tratamos si viene)
      $final_path = $receipt_path_param;

      if (isset($_FILES['receipt']) && is_array($_FILES['receipt'])) {
        $f = $_FILES['receipt'];
        if ($f['error'] !== UPLOAD_ERR_OK) out(['message'=>'Error al subir archivo', 'code'=>$f['error']], 422);
        if ($f['size'] > 20 * 1024 * 1024) out(['message'=>'Archivo demasiado grande (máx 20MB)'], 413);

        $orig = safe_basename($f['name']);
        $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        if (!allowed_ext($ext)) {
          $ext = detect_ext_by_mime($f['tmp_name']) ?? $ext;
          if (!allowed_ext($ext)) out(['message'=>'Tipo de archivo no permitido. Permitidos: pdf,jpg,png,webp'], 415);
        }

        ensure_dir($RECEIPTS_DIR);
        $ts = date('Ymd_His');
        $rand = bin2hex(random_bytes(4));
        $fname = "inv{$invoice_id}_$ts_$rand.$ext";
        $destPath = $RECEIPTS_DIR . DIRECTORY_SEPARATOR . $fname;

        if (!move_uploaded_file($f['tmp_name'], $destPath)) out(['message'=>'No se pudo guardar el archivo en disco'], 500);

        // Guardamos con /diego delante en la URL pública
        $final_path = $RECEIPTS_URL_PREFIX . '/' . $fname;
      }

      // === Reemplazo: si ya existe un registro para esta invoice, lo borramos junto con su archivo ===
      $prev = db_select(
        'SELECT id, receipt_path FROM invoice_payments WHERE invoice_id=:inv ORDER BY id DESC LIMIT 1',
        [':inv'=>$invoice_id]
      )->fetch();

      if ($prev && isset($prev['id'])) {
        // borrar registro anterior
        db_exec('DELETE FROM invoice_payments WHERE id=:id', [':id'=>(int)$prev['id']]);

        // intentar borrar archivo anterior solo si pertenece a nuestro prefix
        $oldPath = $prev['receipt_path'] ?? null;
        if ($oldPath && strpos($oldPath, $RECEIPTS_URL_PREFIX . '/') === 0) {
          $fsPath = $RECEIPTS_DIR . DIRECTORY_SEPARATOR . basename($oldPath);
          if (is_file($fsPath)) { @unlink($fsPath); }
        }
      }

      // Insert del nuevo registro
      db_exec(
        'INSERT INTO invoice_payments (invoice_id, receipt_path, paid_at)
         VALUES (:inv, :rp, :pa)',
        [':inv'=>$invoice_id, ':rp'=>$final_path, ':pa'=>$paid_at]
      );

      $newId = (int)last_id();
      $row = db_select(
        'SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
           FROM invoice_payments
          WHERE id=:id
          LIMIT 1',
        [':id'=>$newId]
      )->fetch();

      out(['message'=>'Comprobante creado', 'payment'=>public_payment($row)], 201);
    }

    /* ========== PUT (update) ========== */
    case 'PUT': {
      if (!$id) out(['message'=>'Falta id'], 400);
      $curr = db_select('SELECT * FROM invoice_payments WHERE id=:id LIMIT 1', [':id'=>$id])->fetch();
      if (!$curr) out(['message'=>'No encontrado'], 404);

      $invoice_id   = array_key_exists('invoice_id', $body) ? (int)$body['invoice_id'] : (int)$curr['invoice_id'];
      $paid_at      = array_key_exists('paid_at', $body) ? parse_datetime($body['paid_at']) : $curr['paid_at'];
      $receipt_path = array_key_exists('receipt_path', $body) ? nonempty_str($body['receipt_path']) : ($curr['receipt_path'] ?? null);

      if ($invoice_id <= 0) out(['message'=>'invoice_id inválido'], 422);
      if ($paid_at === null) out(['message'=>'paid_at inválido'], 422);

      db_exec(
        'UPDATE invoice_payments
            SET invoice_id=:inv, paid_at=:pa, receipt_path=:rp
          WHERE id=:id',
        [':inv'=>$invoice_id, ':pa'=>$paid_at, ':rp'=>$receipt_path, ':id'=>$id]
      );

      $row = db_select(
        'SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
           FROM invoice_payments
          WHERE id=:id
          LIMIT 1',
        [':id'=>$id]
      )->fetch();

      out(['message'=>'Comprobante actualizado', 'payment'=>public_payment($row)]);
    }

    /* ========== DELETE (delete record + archivo opcional) ========== */
    case 'DELETE': {
      if (!$id) out(['message'=>'Falta id'], 400);
      $keep_file = (int)($_GET['keep_file'] ?? 0);

      $curr = db_select('SELECT * FROM invoice_payments WHERE id=:id LIMIT 1', [':id'=>$id])->fetch();
      if (!$curr) out(['message'=>'No encontrado'], 404);

      db_exec('DELETE FROM invoice_payments WHERE id=:id', [':id'=>$id]);

      if ($keep_file !== 1 && !empty($curr['receipt_path'])) {
        $path = $curr['receipt_path'];
        if (strpos($path, $RECEIPTS_URL_PREFIX.'/') === 0) {
          $fsPath = $RECEIPTS_DIR . DIRECTORY_SEPARATOR . basename($path);
          if (is_file($fsPath)) { @unlink($fsPath); }
        }
      }

      out(['message'=>'Comprobante eliminado']);
    }

    default:
      out(['message'=>'Método no permitido'], 405);
  }
} catch (Throwable $e) {
  out(['message'=>'Error de servidor', 'detail'=>$e->getMessage()], 500);
}
