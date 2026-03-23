<?php
// backphp-diego/invoices/invoices.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

/* ============== BOOTSTRAP ============== */
require __DIR__ . '/../bd/bd.php';
require __DIR__ . '/../config/config.php';

/* ============== HELPERS ============== */
function out($data, int $status = 200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function clamp_int($v, int $min, int $max): int {
  $i = (int)$v;
  return max($min, min($max, $i));
}

function parse_boolish($v): ?int {
  if ($v === null) return null;
  $s = strtolower(trim((string)$v));
  if (in_array($s, ['1', 'true', 'sí', 'si', 'yes'], true)) return 1;
  if (in_array($s, ['0', 'false', 'no'], true)) return 0;
  return null;
}

function nonempty_str($v): ?string {
  $v = isset($v) ? trim((string)$v) : null;
  return ($v === '' ? null : $v);
}

function parse_datetime($v): ?string {
  if ($v === null) return null;
  $ts = strtotime((string)$v);
  if ($ts === false) return null;
  return date('Y-m-d H:i:s', $ts);
}

function int_or_null($v): ?int {
  if ($v === null || $v === '') return null;
  return is_numeric($v) ? (int)$v : null;
}

function table_exists($name): bool {
  return (bool) db_select(
    'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = :t',
    [':t' => $name]
  )->fetchColumn();
}

/* ============== PUBLIC SHAPES ============== */
function public_invoice(array $row): array {
  return [
    'id'             => isset($row['id']) ? (int)$row['id'] : null,
    'supplier_id'    => isset($row['supplier_id']) ? (int)$row['supplier_id'] : null,
    'company_name'   => $row['company_name'] ?? null,
    'category_id'    => isset($row['category_id']) ? (int)$row['category_id'] : null,
    'locality_id'    => isset($row['locality_id']) ? (int)$row['locality_id'] : null,
    'payment_status' => $row['payment_status'] ?? null,
    'is_valid'       => isset($row['is_valid']) ? (int)$row['is_valid'] : 1,
    'invalid_reason' => $row['invalid_reason'] ?? null,
    'invalidated_at' => $row['invalidated_at'] ?? null,
    'upload_date'    => $row['upload_date'] ?? null,
    'upload_month'   => isset($row['upload_month']) ? (int)$row['upload_month'] : null,
    'archive_path'   => $row['archive_path'] ?? null,
  ];
}

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

/* ============== INPUT ============== */
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$body = null;
$raw = file_get_contents('php://input');
if ($raw) {
  $j = json_decode($raw, true);
  if (is_array($j)) $body = $j;
}
if (!$body && !empty($_POST)) $body = $_POST;
if (!$body) $body = [];

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? null;

$PAYMENT_STATUS = ['Pendiente', 'Pagado'];

/* ============== ROUTER ============== */
try {
  switch ($method) {

    case 'GET': {
      if ($id) {
        $row = db_select(
          'SELECT id,supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,upload_month,archive_path
             FROM invoices
            WHERE id = :id
            LIMIT 1',
          [':id' => $id]
        )->fetch();

        if (!$row) out(['message' => 'No encontrado'], 404);

        $res = ['invoice' => public_invoice($row)];

        $include_payments = (int)($_GET['include_payments'] ?? 0);
        if ($include_payments === 1 && table_exists('invoice_payments')) {
          $p = db_select(
            'SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
               FROM invoice_payments
              WHERE invoice_id = :id
              ORDER BY paid_at DESC, id DESC',
            [':id' => $id]
          )->fetchAll();

          $res['payments'] = array_map('public_payment', $p ?: []);
        }

        out($res);
      }

      $limit        = clamp_int($_GET['limit'] ?? 50, 1, 100);
      $offset       = max(0, (int)($_GET['offset'] ?? 0));
      $supplier_id  = int_or_null($_GET['supplier_id'] ?? null);
      $category_id  = int_or_null($_GET['category_id'] ?? ($_GET['category'] ?? null));
      $locality_id  = int_or_null($_GET['locality_id'] ?? ($_GET['locality'] ?? null));
      $is_valid     = parse_boolish($_GET['is_valid'] ?? null);
      $status       = nonempty_str($_GET['payment_status'] ?? ($_GET['status'] ?? null));
      $month        = int_or_null($_GET['month'] ?? null);
      $from         = parse_datetime($_GET['date_from'] ?? null);
      $to           = parse_datetime($_GET['date_to'] ?? null);
      $q            = nonempty_str($_GET['q'] ?? null);
      $company_name = nonempty_str($_GET['company_name'] ?? null);
      $supplier_q   = nonempty_str($_GET['supplier_q'] ?? null);

      $where = [];
      $params = [];

      if ($supplier_id !== null) {
        $where[] = 'supplier_id = :sid';
        $params[':sid'] = $supplier_id;
      }

      if ($category_id !== null) {
        $where[] = 'category_id = :cid';
        $params[':cid'] = $category_id;
      }

      if ($locality_id !== null) {
        $where[] = 'locality_id = :lid';
        $params[':lid'] = $locality_id;
      }

      if ($is_valid !== null) {
        $where[] = 'is_valid = :iv';
        $params[':iv'] = $is_valid;
      }

      if ($status !== null && in_array($status, $PAYMENT_STATUS, true)) {
        $where[] = 'payment_status = :ps';
        $params[':ps'] = $status;
      }

      if ($company_name !== null) {
        $where[] = 'company_name = :cn';
        $params[':cn'] = $company_name;
      }

      if ($month !== null && $month >= 1 && $month <= 12) {
        $where[] = 'upload_month = :um';
        $params[':um'] = $month;
      }

      if ($from !== null) {
        $where[] = 'upload_date >= :df';
        $params[':df'] = $from;
      }

      if ($to !== null) {
        $where[] = 'upload_date <= :dt';
        $params[':dt'] = $to;
      }

      if ($q !== null) {
        $where[] = 'archive_path LIKE :q';
        $params[':q'] = '%' . $q . '%';
      }

      if ($supplier_q !== null) {
        $digits = preg_replace('/\D+/', '', $supplier_q);

        $supplierSubquery = 'supplier_id IN (
          SELECT id
            FROM users
           WHERE company_name LIKE :sq
              OR fantasy_name LIKE :sq
              OR email LIKE :sq';

        if ($digits !== '') {
          $supplierSubquery .= ' OR cuit_or_cuil LIKE :sqd';
          $params[':sqd'] = '%' . $digits . '%';
        }

        $supplierSubquery .= '
        )';

        $where[] = $supplierSubquery;
        $params[':sq'] = '%' . $supplier_q . '%';
      }

      $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

      $total = (int) db_select(
        "SELECT COUNT(*) FROM invoices $whereSql",
        $params
      )->fetchColumn();

      $rows = db_select(
        "SELECT id,supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,upload_month,archive_path
           FROM invoices
           $whereSql
           ORDER BY upload_date DESC, id DESC
           LIMIT $limit OFFSET $offset",
        $params
      )->fetchAll();

      $invoices = array_map('public_invoice', $rows ?: []);
      out([
        'invoices' => $invoices,
        'total'    => $total,
        'limit'    => $limit,
        'offset'   => $offset,
      ]);
    }

    case 'POST': {
      if ($action === 'add_payment') {
        $invoice_id   = (int)($body['invoice_id'] ?? 0);
        $receipt_path = nonempty_str($body['receipt_path'] ?? null);
        $paid_at      = parse_datetime($body['paid_at'] ?? 'now');
        $mark_as_paid = parse_boolish($body['mark_as_paid'] ?? null);

        if ($invoice_id <= 0) out(['message' => 'invoice_id es requerido'], 422);
        if ($paid_at === null) out(['message' => 'paid_at inválido'], 422);
        if (!table_exists('invoice_payments')) out(['message' => 'La tabla invoice_payments no existe'], 500);

        $exists = db_select(
          'SELECT 1 FROM invoices WHERE id = :id LIMIT 1',
          [':id' => $invoice_id]
        )->fetchColumn();

        if (!$exists) out(['message' => 'Factura inexistente'], 404);

        db_exec(
          'INSERT INTO invoice_payments (invoice_id, receipt_path, paid_at)
           VALUES (:inv, :rp, :pa)',
          [
            ':inv' => $invoice_id,
            ':rp'  => $receipt_path,
            ':pa'  => $paid_at,
          ]
        );

        if ($mark_as_paid === 1) {
          db_exec(
            'UPDATE invoices SET payment_status = :ps WHERE id = :id',
            [':ps' => 'Pagado', ':id' => $invoice_id]
          );
        }

        $pid = (int) last_id();

        $created = db_select(
          'SELECT id, invoice_id, receipt_path, paid_at, created_at, updated_at
             FROM invoice_payments
            WHERE id = :id',
          [':id' => $pid]
        )->fetch();

        out([
          'message' => 'Comprobante registrado',
          'payment' => public_payment($created),
        ], 201);
      }

      $supplier_id    = (int)($body['supplier_id'] ?? 0);
      $company_name   = nonempty_str($body['company_name'] ?? null);
      $category_id    = int_or_null($body['category_id'] ?? null);
      $locality_id    = int_or_null($body['locality_id'] ?? null);
      $payment_status = nonempty_str($body['payment_status'] ?? 'Pendiente');
      $is_valid       = array_key_exists('is_valid', $body) ? (int)((bool)$body['is_valid']) : 1;
      $upload_date    = parse_datetime($body['upload_date'] ?? 'now');
      $archive_path   = nonempty_str($body['archive_path'] ?? null);

      $invalid_reason = null;
      $invalidated_at = null;

      if ($supplier_id <= 0) out(['message' => 'supplier_id es requerido'], 422);
      if ($company_name === null) out(['message' => 'company_name es requerido'], 422);
      if ($archive_path === null) out(['message' => 'archive_path es requerido'], 422);
      if (!in_array($payment_status, $PAYMENT_STATUS, true)) out(['message' => 'payment_status inválido'], 422);
      if ($upload_date === null) out(['message' => 'upload_date inválido'], 422);

      db_exec(
        'INSERT INTO invoices (supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,archive_path)
         VALUES (:sid,:con,:cid,:lid,:ps,:iv,:ir,:ia,:ud,:ap)',
        [
          ':sid' => $supplier_id,
          ':con' => $company_name,
          ':cid' => $category_id,
          ':lid' => $locality_id,
          ':ps'  => $payment_status,
          ':iv'  => $is_valid,
          ':ir'  => $invalid_reason,
          ':ia'  => $invalidated_at,
          ':ud'  => $upload_date,
          ':ap'  => $archive_path,
        ]
      );

      $newId = (int) last_id();

      $row = db_select(
        'SELECT id,supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,upload_month,archive_path
           FROM invoices
          WHERE id = :id
          LIMIT 1',
        [':id' => $newId]
      )->fetch();

      out(['message' => 'Creado', 'invoice' => public_invoice($row)], 201);
    }

    case 'PUT': {
      if (!$id) out(['message' => 'Falta id'], 400);

      $curr = db_select(
        'SELECT * FROM invoices WHERE id = :id LIMIT 1',
        [':id' => $id]
      )->fetch();

      if (!$curr) out(['message' => 'No encontrado'], 404);

      $supplier_id    = array_key_exists('supplier_id', $body) ? (int)$body['supplier_id'] : (int)$curr['supplier_id'];
      $company_name   = array_key_exists('company_name', $body) ? nonempty_str($body['company_name']) : $curr['company_name'];
      $category_id    = array_key_exists('category_id', $body) ? int_or_null($body['category_id']) : ($curr['category_id'] ?? null);
      $locality_id    = array_key_exists('locality_id', $body) ? int_or_null($body['locality_id']) : ($curr['locality_id'] ?? null);
      $payment_status = array_key_exists('payment_status', $body) ? nonempty_str($body['payment_status']) : $curr['payment_status'];
      $is_valid       = array_key_exists('is_valid', $body) ? (int)((bool)$body['is_valid']) : (int)$curr['is_valid'];
      $archive_path   = array_key_exists('archive_path', $body) ? nonempty_str($body['archive_path']) : $curr['archive_path'];
      $upload_date    = array_key_exists('upload_date', $body) ? parse_datetime($body['upload_date']) : $curr['upload_date'];

      $invalid_reason = array_key_exists('invalid_reason', $body)
        ? nonempty_str($body['invalid_reason'])
        : ($curr['invalid_reason'] ?? null);

      $invalidated_at = array_key_exists('invalidated_at', $body)
        ? parse_datetime($body['invalidated_at'])
        : ($curr['invalidated_at'] ?? null);

      if ($is_valid === 0 && (int)$curr['is_valid'] === 1) {
        if ($invalid_reason === null) $invalid_reason = 'Marcada como no válida';
        if ($invalidated_at === null) $invalidated_at = date('Y-m-d H:i:s');
      }

      if ($is_valid === 1 && (int)$curr['is_valid'] === 0) {
        $invalid_reason = null;
        $invalidated_at = null;
      }

      if ($supplier_id <= 0) out(['message' => 'supplier_id inválido'], 422);
      if ($company_name === null) out(['message' => 'company_name requerido'], 422);
      if ($archive_path === null) out(['message' => 'archive_path requerido'], 422);
      if ($upload_date === null) out(['message' => 'upload_date inválido'], 422);
      if (!in_array($payment_status, $PAYMENT_STATUS, true)) out(['message' => 'payment_status inválido'], 422);

      db_exec(
        'UPDATE invoices
            SET supplier_id = :sid,
                company_name = :con,
                category_id = :cid,
                locality_id = :lid,
                payment_status = :ps,
                is_valid = :iv,
                invalid_reason = :ir,
                invalidated_at = :ia,
                upload_date = :ud,
                archive_path = :ap
          WHERE id = :id',
        [
          ':sid' => $supplier_id,
          ':con' => $company_name,
          ':cid' => $category_id,
          ':lid' => $locality_id,
          ':ps'  => $payment_status,
          ':iv'  => $is_valid,
          ':ir'  => $invalid_reason,
          ':ia'  => $invalidated_at,
          ':ud'  => $upload_date,
          ':ap'  => $archive_path,
          ':id'  => $id,
        ]
      );

      $row = db_select(
        'SELECT id,supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,upload_month,archive_path
           FROM invoices
          WHERE id = :id
          LIMIT 1',
        [':id' => $id]
      )->fetch();

      out(['message' => 'Actualizado', 'invoice' => public_invoice($row)]);
    }

    case 'DELETE': {
      if (!$id) out(['message' => 'Falta id'], 400);

      $hard = parse_boolish($_GET['hard'] ?? null);

      if ($hard === 1) {
        $exists = db_select(
          'SELECT 1 FROM invoices WHERE id = :id LIMIT 1',
          [':id' => $id]
        )->fetchColumn();

        if (!$exists) out(['message' => 'No encontrado'], 404);

        try {
          db_exec('START TRANSACTION');

          if (table_exists('invoice_payments')) {
            db_exec(
              'DELETE FROM invoice_payments WHERE invoice_id = :id',
              [':id' => $id]
            );
          }

          db_exec(
            'DELETE FROM invoices WHERE id = :id',
            [':id' => $id]
          );

          db_exec('COMMIT');
          out(['message' => 'Eliminada', 'id' => (int)$id]);
        } catch (Throwable $e) {
          try {
            db_exec('ROLLBACK');
          } catch (Throwable $ignored) {
          }

          out([
            'message' => 'No se pudo eliminar (hard).',
            'detail'  => $e->getMessage(),
          ], 500);
        }
      }

      $reason = nonempty_str($_GET['reason'] ?? null) ?? 'Marcada como no válida (DELETE)';

      try {
        db_exec(
          'UPDATE invoices
              SET is_valid = 0,
                  invalid_reason = :r,
                  invalidated_at = NOW()
            WHERE id = :id',
          [':r' => $reason, ':id' => $id]
        );

        $row = db_select(
          'SELECT id,supplier_id,company_name,category_id,locality_id,payment_status,is_valid,invalid_reason,invalidated_at,upload_date,upload_month,archive_path
             FROM invoices
            WHERE id = :id
            LIMIT 1',
          [':id' => $id]
        )->fetch();

        out([
          'message' => 'Factura marcada como no válida',
          'invoice' => public_invoice($row),
        ]);
      } catch (Throwable $e) {
        out([
          'message' => 'No se pudo invalidar (soft).',
          'detail'  => $e->getMessage(),
        ], 500);
      }
    }

    default:
      out(['message' => 'Método no permitido'], 405);
  }
} catch (Throwable $e) {
  out(['message' => 'Error de servidor', 'detail' => $e->getMessage()], 500);
}