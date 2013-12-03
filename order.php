<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

  $filename = $_GET['code'];
  if (preg_match('/^[-\dA-Z]+$/', $filename)) {

    $data = file_get_contents('php://input');
    file_put_contents("order/$filename", $data);
  }

  return;
}

echo '{';

$implode = '';
foreach (scandir('order') as $filename) {
  if (preg_match('/^[-\dA-Z]+$/', $filename)) {
    echo $implode.'"'.$filename.'":';

    readfile("order/$filename");

    $implode = ',';
  }
}

echo '}';
