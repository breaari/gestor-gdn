<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function out($data, int $status=200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

$UPLOADS_FS_DIR   = '/var/www/facturacion/backend/uploads';
$UPLOADS_WEB_BASE = '/diego/uploads';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  out(['message' => 'Método no permitido'], 405);
}

if (!isset($_FILES['file'])) {
  out(['message' => 'Falta el campo de archivo: file'], 400);
}

if (!is_dir($UPLOADS_FS_DIR)) {
  out([
    'message' => 'La carpeta de uploads no existe',
    'fs_dir' => $UPLOADS_FS_DIR
  ], 500);
}

if (!is_writable($UPLOADS_FS_DIR)) {
  out([
    'message' => 'La carpeta de uploads no tiene permisos de escritura',
    'fs_dir' => $UPLOADS_FS_DIR
  ], 500);
}

$MAX_BYTES = 10 * 1024 * 1024;
$ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
  out(['message' => 'Error subiendo archivo (código '.$file['error'].')'], 400);
}

if ($file['size'] > $MAX_BYTES) {
  out(['message' => 'El archivo excede 10MB'], 413);
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
if (!$finfo) {
  out(['message' => 'No se pudo inicializar finfo'], 500);
}

$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!$mime) {
  out(['message' => 'No se pudo detectar el MIME'], 500);
}

if (!in_array($mime, $ALLOWED_MIME, true)) {
  out(['message' => 'Tipo de archivo no permitido: '.$mime], 415);
}

$orig   = $file['name'] ?? 'archivo';
$orig   = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
$stamp  = (string) round(microtime(true) * 1000);
$dest   = $stamp . '_' . $orig;

$destFs  = $UPLOADS_FS_DIR . '/' . $dest;
$destWeb = $UPLOADS_WEB_BASE . '/' . $dest;

if (!move_uploaded_file($file['tmp_name'], $destFs)) {
  out([
    'message' => 'No se pudo guardar el archivo',
    'destFs' => $destFs
  ], 500);
}

@chmod($destFs, 0644);

out([
  'ok'      => true,
  'path'    => $destWeb,
  'mime'    => $mime,
  'fs_path' => $destFs,
]);