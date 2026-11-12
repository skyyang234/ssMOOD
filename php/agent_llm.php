<?php
/**
 * ssMOOD AI · 三入口之一：纯 LLM 转发
 *
 * 职责：把调用方（前端）组装好的 messages 原样转发给 LLM 供应商，并把供应商的
 *      返回内容原样带回。此接口不做任何编排、不做意图判断、不调用任何技能、
 *      不注入任何系统提示词——系统提示词由调用方在 messages 里自带。
 *
 * 输入（POST JSON，此签名一经确定不再变动）：
 *      {
 *        "messages":    [{"role":"system|user|assistant","content":"..."}],  // 必填
 *        "temperature": number,   // 可选，缺省 0.25，自动夹在 [0,2]
 *        "model":       string,   // 可选，缺省取 config.php 的 $model
 *        "maxTokens":   integer,  // 可选，缺省 2000，夹在 [1,32000]
 *        "jsonMode":    boolean,  // 可选，true 时向供应商附加 response_format=json_object
 *        "tools":       array,    // 可选，原样透传给供应商（function calling 用）
 *        "toolChoice":  string|object // 可选，配合 tools 使用，按供应商格式透传
 *      }
 *      以上可选字段是为「调参不动后端」预留的旋钮，前端可自行调整；除此之外
 *      后端不再持有任何与编排/产品参数相关的可调项。
 *
 * 输出（此签名一经确定不再变动）：
 *      成功：{ "ok": true,  "content": "<助手文本>", "raw": <供应商原始返回>, "error": null }
 *      失败：{ "ok": false, "content": "",            "raw": null,             "error": "<错误码>" }
 *      错误码：method_not_allowed / invalid_json_body / missing_messages /
 *              request_encode_failed / upstream_error / upstream_http_<code> /
 *              invalid_upstream_payload
 *
 * 编排逻辑全部在前端，后端只负责数据与转发。此接口不再变动。
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

@set_time_limit(180);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/config.php';

function agent_llm_out($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function agent_llm_fail($error, $statusCode = 200) {
    agent_llm_out(['ok' => false, 'content' => '', 'raw' => null, 'error' => $error], $statusCode);
}

function agent_llm_sanitize_string($value, $maxLen) {
    $value = is_scalar($value) ? trim((string)$value) : '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen, 'UTF-8') : substr($value, 0, $maxLen);
}

function agent_llm_sanitize_messages($messages) {
    if (!is_array($messages)) return [];
    $out = [];
    foreach ($messages as $message) {
        if (!is_array($message)) continue;
        $role = strtolower(agent_llm_sanitize_string($message['role'] ?? '', 20));
        if (!in_array($role, ['system', 'user', 'assistant'], true)) continue;
        $content = agent_llm_sanitize_string($message['content'] ?? '', 16000);
        if ($content === '') continue;
        $out[] = ['role' => $role, 'content' => $content];
        if (count($out) >= 24) break;
    }
    return $out;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    agent_llm_fail('method_not_allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    agent_llm_fail('invalid_json_body', 400);
}

$messages = agent_llm_sanitize_messages($input['messages'] ?? null);
if (count($messages) === 0) {
    agent_llm_fail('missing_messages', 400);
}

$temperature = isset($input['temperature']) && is_numeric($input['temperature'])
    ? max(0.0, min((float)$input['temperature'], 2.0))
    : 0.25;
$modelName = agent_llm_sanitize_string($input['model'] ?? '', 80);
if ($modelName === '') $modelName = $model;

// Optional transport knobs. They are intentionally caller-controlled so that
// sampling / structured-output settings never require a backend change.
$maxTokens = isset($input['maxTokens']) && is_numeric($input['maxTokens'])
    ? max(1, min((int)$input['maxTokens'], 32000))
    : 2000;
$jsonMode = !empty($input['jsonMode']);
$tools = is_array($input['tools'] ?? null) ? $input['tools'] : null;
$toolChoice = (is_string($input['toolChoice'] ?? null) || is_array($input['toolChoice'] ?? null)) ? $input['toolChoice'] : null;
if ($tools !== null && strlen((string)json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) > 200000) {
    agent_llm_fail('tools_too_large', 400);
}

$payload = [
    'model' => $modelName,
    'messages' => $messages,
    'temperature' => $temperature,
    'max_tokens' => $maxTokens,
];
if ($jsonMode) $payload['response_format'] = ['type' => 'json_object'];
if ($tools !== null) $payload['tools'] = $tools;
if ($toolChoice !== null) $payload['tool_choice'] = $toolChoice;

$body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($body === false) {
    agent_llm_fail('request_encode_failed');
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 50);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer ' . $openaiApiKey]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    agent_llm_fail($curlError !== '' ? 'upstream_error' : 'upstream_http_' . $httpCode);
}

$decoded = json_decode($response, true);
if (!is_array($decoded)) {
    agent_llm_fail('invalid_upstream_payload');
}

// content 是助手文本；raw 是供应商原始返回，调用方如需 tokens/finish_reason 自行取用。
agent_llm_out([
    'ok' => true,
    'content' => agent_llm_sanitize_string($decoded['choices'][0]['message']['content'] ?? '', 60000),
    'raw' => $decoded,
    'error' => null,
]);

?>
