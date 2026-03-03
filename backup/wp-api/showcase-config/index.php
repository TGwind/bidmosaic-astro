<?php
/**
 * /api/showcase-config — GET 读取 / POST 保存 showcase 配置 JSON
 *
 * 图片存储策略：
 *  - 上传的 base64 图片解码为实体文件，保存到 /showcase/uploads/
 *  - JSON 中只保存相对 URL（/showcase/uploads/xxx.jpg）
 *  - 替换图片时自动删除旧文件，JSON 体积保持轻量
 */

// 禁止 warning/notice 混入 JSON 响应体
ini_set('display_errors', '0');
error_reporting(0);

$file      = dirname(__DIR__, 2) . '/showcase-config.json';
$uploadDir = dirname(__DIR__, 2) . '/showcase/uploads/';
$uploadUrl = '/showcase/uploads/';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Empty body']);
        exit;
    }
    $decoded = json_decode($raw);
    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
        exit;
    }

    // 确保上传目录存在
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // 加载旧配置，用于删除被替换或移除的图片文件
    $oldConfig = (file_exists($file) && filesize($file) > 0)
        ? json_decode(file_get_contents($file))
        : null;

    // ── 辅助：从 URL 剥离查询参数，用于文件系统操作 ──
    function stripQuery($url) {
        $path = parse_url($url, PHP_URL_PATH);
        return $path ?: $url;
    }

    // ── 辅助：保存 base64 为文件，返回 URL；若失败返回原 base64 ──
    function saveBase64Image($base64, $prefix, $id, $uploadDir, $uploadUrl) {
        if (!preg_match('/^data:(image\/[\w+]+);base64,(.+)$/s', $base64, $m)) {
            return $base64; // 格式不对，原样返回
        }
        $ext  = ($m[1] === 'image/png') ? 'png' : 'jpg';
        $name = "{$prefix}-{$id}.{$ext}";
        // 删除同前缀同 ID 的所有旧文件（兼容扩展名变化）
        foreach (glob($uploadDir . "{$prefix}-{$id}.*") ?: [] as $old) {
            unlink($old);
        }
        $data = base64_decode($m[2], true);
        if ($data === false || file_put_contents($uploadDir . $name, $data) === false) {
            return $base64; // 写入失败，原样保留
        }
        return $uploadUrl . $name;
    }

    // ── 处理案例图片 ──
    if (isset($decoded->caseImages)) {
        // 删除旧配置中已移除或被新图替换的本地文件
        if ($oldConfig && isset($oldConfig->caseImages)) {
            foreach ((array)$oldConfig->caseImages as $id => $oldImg) {
                $newImg = isset($decoded->caseImages->$id) ? $decoded->caseImages->$id : null;
                if ($oldImg && strpos(stripQuery($oldImg), $uploadUrl) === 0 && $newImg !== $oldImg) {
                    $oldPath = $uploadDir . basename(stripQuery($oldImg));
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
            }
        }
        // 将 base64 转存为实体文件
        foreach ($decoded->caseImages as $id => $img) {
            if (strpos($img, 'data:') === 0) {
                $decoded->caseImages->$id = saveBase64Image($img, 'case', $id, $uploadDir, $uploadUrl);
            }
        }
    }

    // ── 处理联系方式 QR 图片 ──
    if (isset($decoded->contacts)) {
        foreach ($decoded->contacts as $i => $contact) {
            // 删除被替换的旧 QR 文件
            $oldQr = ($oldConfig && isset($oldConfig->contacts[$i]))
                ? ($oldConfig->contacts[$i]->qr ?? '')
                : '';
            if ($oldQr && strpos(stripQuery($oldQr), $uploadUrl) === 0) {
                $newQr = $contact->qr ?? '';
                if ($newQr !== $oldQr) {
                    $oldPath = $uploadDir . basename(stripQuery($oldQr));
                    if (file_exists($oldPath)) {
                        unlink($oldPath);
                    }
                }
            }
            // 将 base64 转存为实体文件
            if (isset($contact->qr) && strpos($contact->qr, 'data:') === 0) {
                $contact->qr = saveBase64Image($contact->qr, 'qr', $i, $uploadDir, $uploadUrl);
                $decoded->contacts[$i] = $contact;
            }
        }
    }

    $jsonStr = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonStr === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'JSON encode failed: ' . json_last_error_msg()]);
        exit;
    }
    if (file_put_contents($file, $jsonStr) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Write failed (check permissions)']);
        exit;
    }
    $response = json_encode(['ok' => true, 'config' => $decoded]);
    echo $response !== false ? $response : json_encode(['ok' => true]);
    exit;
}

// GET
if (!file_exists($file)) {
    echo '{}';
    exit;
}
echo file_get_contents($file);
