<?php
// backphp-diego/invoices/upload.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';

/* CORS */

header('Content-Type: application/json; charset=utf-8');

function out($data, int $status=200) { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

/* === Raíces: FS y web ===
   __DIR__ = .../backphp-diego/invoices
   dirname(__DIR__) = .../backphp-diego  (RAÍZ DEL PROYECTO)
*/
$SITE_ROOT_FS     = str_replace('\\','/', dirname(__DIR__)); // p.ej. C:/Users/.../backphp-diego
$UPLOADS_FS_DIR   = $SITE_ROOT_FS . '/uploads';               // C:/.../backphp-diego/uploads
$UPLOADS_WEB_BASE = '/diego/uploads';                         // URL pública (tu alias / vhost)

/* Validaciones */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  out(['message' => 'Método no permitido'], 405);
}
if (!isset($_FILES['file'])) {
  out(['message' => 'Falta el campo de archivo: file'], 400);
}

/* Asegurar carpeta */
if (!is_dir($UPLOADS_FS_DIR)) {
  if (!@mkdir($UPLOADS_FS_DIR, 0775, true) && !is_dir($UPLOADS_FS_DIR)) {
    out(['message' => 'No se pudo crear la carpeta de uploads', 'fs_dir' => $UPLOADS_FS_DIR], 500);
  }
}

/* Reglas */
$MAX_BYTES = 64 * 1024 * 1024; // 10MB
$ALLOWED_MIME = ['application/pdf','image/jpeg', 'image/jpg','image/png','image/webp'];

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
  out(['message' => 'Error subiendo archivo (código '.$file['error'].')'], 400);
}
if ($file['size'] > $MAX_BYTES) {
  out(['message' => 'El archivo excede 10MB'], 413);
}

/* MIME real */
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);
if (!in_array($mime, $ALLOWED_MIME, true)) {
  out(['message' => 'Tipo de archivo no permitido: '.$mime], 415);
}

/* Nombre seguro */
$orig   = $file['name'] ?? 'archivo';
$orig   = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
$stamp  = (string) round(microtime(true) * 1000);
$rand   = bin2hex(random_bytes(4));
$dest   = $stamp . '_' . $rand . '_' . $orig;

$destFs  = $UPLOADS_FS_DIR . '/' . $dest;   // FS real .../backphp-diego/uploads/...
$destWeb = $UPLOADS_WEB_BASE . '/' . $dest; // URL /diego/uploads/...

/* Guardar */
if (!move_uploaded_file($file['tmp_name'], $destFs)) {
  out(['message' => 'No se pudo guardar el archivo', 'fs_path' => $destFs], 500);
}
@chmod($destFs, 0644);

/* Respuesta (incluye fs_path para verificar) */
out([
  'ok'      => true,
  'path'    => $destWeb,  // guardá esto en invoice.archive_path
  'mime'    => $mime,
  'fs_path' => $destFs,   // útil en dev
]);
