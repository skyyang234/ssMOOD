<?php

//------------------------------------------------------------------------------
// 发布时去掉此处代码，仅用于生产和测试环境。
// 跨域配置（注意：各业务脚本自行设置 Content-Type，此处只设 CORS）
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
//------------------------------------------------------------------------------



// 数据库配置（这里只放占位值；真实值写在 config.local.php，该文件不入库）
$servername = 'localhost';
$dbname = 'ssmood';
$logFile = __DIR__ . '/logfile.log';
$creds = [];
$username = '';
$password = '';

// 大模型接口（占位值）
$openaiApiKey = 'your-api-key';
$url = '';
$model = '';

// ── 本地 / 生产环境覆盖 ────────────────────────────────────────────────
// 部署时把 config.local.php.example 复制成 config.local.php 并填入真实值。
// 该文件已被 .gitignore 忽略，不会进入仓库。
if (file_exists(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// $servername 可能被本地文件覆盖，这里同步一次（原逻辑：$host 是它的别名）
$host = $servername;
