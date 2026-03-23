<?php
$allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://facturacion.universidadsiglo21online.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}
