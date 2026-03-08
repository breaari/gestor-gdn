<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/cors.php';

error_reporting(E_ALL);
ini_set('display_errors', '1');

$DB_HOST = "127.0.0.1";
$DB_NAME = "diego";     // <- TU base
$DB_USER = "root";      // <- XAMPP default
$DB_PASS = "";          // <- XAMPP default (vacío)

function pdo(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;
  $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
  $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function db_select(string $sql, array $params = []): PDOStatement {
  $st = pdo()->prepare($sql);
  $st->execute($params);
  return $st;
}
function db_exec(string $sql, array $params = []): int {
  $st = pdo()->prepare($sql);
  $st->execute($params);
  return $st->rowCount();
}
function last_id(): string { return pdo()->lastInsertId(); }
