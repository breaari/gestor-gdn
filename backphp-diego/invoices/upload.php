<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function out($data, int $status=200) {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function parseSizeToBytes(string $value): int {
  $value = trim($value);
  if ($value === '') return 0;

  $unit = strtolower(substr($value, -1));
  $number = (float) $value;

  return match ($unit) {
    'g' => (int) round($number * 1024 * 1024 * 1024),
    'm' => (int) round($number * 1024 * 1024),
    'k' => (int) round($number * 1024),
    default => (int) round($number),
  };
}

$UPLOADS_FS_DIR   = '/var/www/facturacion/backend/uploads';
$UPLOADS_WEB_BASE = '/diego/uploads';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  out(['message' => 'Método no permitido'], 405);
}

// Detectar cuando PHP descarta el archivo por post_max_size
$postMaxBytes = parseSizeToBytes((string) ini_get('post_max_size'));
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);

if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes) {
  out([
    'message' => 'El archivo supera el tamaño máximo permitido por el servidor.'
  ], 413);
}

if (!isset($_FILES['file'])) {
  out(['message' => 'No se recibió ningún archivo.'], 400);
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
  $uploadErrors = [
    UPLOAD_ERR_INI_SIZE   => 'El archivo supera el tamaño máximo permitido por el servidor.',
    UPLOAD_ERR_FORM_SIZE  => 'El archivo supera el tamaño máximo permitido por el formulario.',
    UPLOAD_ERR_PARTIAL    => 'El archivo se subió de forma incompleta.',
    UPLOAD_ERR_NO_FILE    => 'No se seleccionó ningún archivo.',
    UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal del servidor.',
    UPLOAD_ERR_CANT_WRITE => 'El servidor no pudo guardar el archivo.',
    UPLOAD_ERR_EXTENSION  => 'Una extensión del servidor bloqueó la subida.',
  ];

  out([
    'message' => $uploadErrors[$file['error']] ?? ('Error subiendo archivo (código '.$file['error'].')')
  ], 400);
}

if ($file['size'] > $MAX_BYTES) {
  out(['message' => 'El archivo excede el máximo permitido de 10 MB.'], 413);
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