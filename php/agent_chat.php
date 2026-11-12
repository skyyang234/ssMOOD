<?php
/**
 * ssMOOD AI · 三入口之一：最终回答生成（Final）
 *
 * 三个固定入口（签名不再变动）：
 *      1. php/agent_llm.php        纯 LLM 转发
 *      2. php/agent_skill_exec.php 技能执行器
 *      3. php/agent_chat.php       本文件，最终回答生成
 *
 * 本文件只有一种行为：最终回答生成（Final）。
 * 旧的「Plan -> 技能执行 -> Final」后端编排已删除，编排全部由前端完成；
 * 请求里的 mode / finalOnly 字段若仍存在会被忽略，仅为兼容旧调用方。
 *
 * 输入（此签名一经确定不再变动）：
 *      {
 *        "messages":               [{"role":"system|user|assistant","content":"..."}], // 必填，含前端自带的系统提示词
 *        "structured_tool_results": [{ ok, skill, result, warnings, truncated }],      // 可选，另支持驼峰 structuredToolResults
 *        "context":                object,   // 可选
 *        "locale":                 string,   // 可选
 *
 *        // 以下全部可选，用于「调参不动后端」：
 *        "temperature": number,    // 缺省 0.25，夹在 [0,2]
 *        "maxTokens":   integer,   // 缺省 1000，夹在 [1,4000]
 *        "model":       string,    // 缺省取 config.php 的 $model
 *        "verification": object    // 后置校验的话术/句式微调，见 verify_final_output_payload：
 *                                  //   offerPhrases: string[]        追加承诺句式（只能增，不能取消内置句式）
 *                                  //   protectedIdentifiers: string[] 追加免检标识符（字面全匹配）
 *                                  //   neutralReply: string         替换中性句
 *                                  //   conservativeReply: string    替换保守话术
 *                                  //   qualitativeWord: string      替换数字降级词（默认中文「若干」）
 *                                  // 注意：校验本身不可被关闭，后端仍以 AGENT_FINAL_OUTPUT_VERIFY 为总开关。
 *      }
 *
 * 输出（此签名一经确定不再变动）：
 *      { "reply": string, "actions": array, "warnings": array }
 *
 * 本文件不调用任何技能、不做意图判断、不注入任何系统提示词（系统提示词由前端
 * 在 messages 里自带）。编排逻辑全部在前端，后端只负责数据与转发。
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

@set_time_limit(180);

// Master switch for the post-generation reply guard (see verify_final_output_payload).
// true  = every dataset id / route / figure in the reply must trace back to this
//         turn's skill results, otherwise the reply is neutralised or downgraded.
// false = the model reply is returned exactly as before this guard existed.
const AGENT_FINAL_OUTPUT_VERIFY = true;

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    agent_json_out(['error' => 'Method not allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    agent_json_out(['error' => 'Invalid JSON body'], 400);
}

$locale = sanitize_string($input['locale'] ?? 'zh', 16) ?: 'zh';
$messages = is_array($input['messages'] ?? null) ? $input['messages'] : [];
$userMessage = latest_user_message($messages);
$isZh = stripos($locale, 'zh') === 0;

if ($userMessage === '') {
    agent_json_out(['error' => 'Missing user message'], 400);
}

$guard = safety_guard($userMessage);
if (!$guard['allowed']) {
    agent_json_out([
        'reply' => $isZh ? '这个请求涉及安全或越权风险，我不能协助执行。请改为询问 ssMOOD 数据库使用、页面辅助、组学结果解释或相关研究问题。' : 'This request involves safety or authorization risks, so I cannot help execute it. Please ask about ssMOOD usage, current-page assistance, omics interpretation, or related research questions.',
        'actions' => [],
        'warnings' => ['safety_guard_blocked', $guard['reason']],
    ]);
}

require __DIR__ . '/config.php';

// 编排已全部前移到前端：本入口只负责最终回答生成（含后置校验），
// 不调用技能、不做意图判断、不再注入任何系统提示词。
handle_final_only_request($input, $locale, $userMessage);

function agent_json_out($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sanitize_string($value, $maxLen) {
    $value = is_scalar($value) ? trim((string)$value) : '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen, 'UTF-8') : substr($value, 0, $maxLen);
}

function sanitize_assoc($value, $maxKeys, $maxLen) {
    $out = [];
    $count = 0;
    foreach ($value as $key => $item) {
        if ($count >= $maxKeys) break;
        if (!is_scalar($item) && $item !== null) continue;
        $out[sanitize_string($key, 50)] = sanitize_string($item ?? '', $maxLen);
        $count++;
    }
    return $out;
}

function latest_user_message($messages) {
    for ($i = count($messages) - 1; $i >= 0; $i--) {
        if (($messages[$i]['role'] ?? '') === 'user') return sanitize_string($messages[$i]['content'] ?? '', 1600);
    }
    return '';
}

function safety_guard($message) {
    $text = strtolower($message);
    $blocked = [
        'api key', 'token', 'password', 'secret', 'config.php', '/etc/ssmood', '泄露', '密钥', '密码', '配置文件',
        'rm -rf', 'sudo ', 'shell', 'system command', '执行命令', '删库', 'drop table', 'truncate table', 'delete from',
        'insert into', 'update ', 'grant all', 'sql injection', 'union select', '<?php', '<script', '写文件', '删文件', '越权'
    ];
    foreach ($blocked as $term) {
        if ($term !== '' && strpos($text, strtolower($term)) !== false) {
            return ['allowed' => false, 'reason' => 'matched_security_term'];
        }
    }
    return ['allowed' => true, 'reason' => 'safety_guard_passed'];
}

function call_model_api($url, $model, $openaiApiKey, $messages, $temperature, $maxTokens) {
    // Force JSON output so planner/final models cannot wrap the payload in prose
    // (which is what triggered plan_json_invalid on agnes). Some endpoints reject
    // response_format, so we retry once without it as a fallback.
    $base = ['model' => $model, 'messages' => $messages, 'temperature' => $temperature, 'max_tokens' => $maxTokens];
    $attempts = [
        $base + ['response_format' => ['type' => 'json_object']],
        $base,
    ];
    $lastWarning = 'model_api_error';
    foreach ($attempts as $bodyArr) {
        $body = json_encode($bodyArr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($body === false) return ['ok' => false, 'content' => '', 'warning' => 'model_payload_encode_failed'];
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 50);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer ' . $openaiApiKey]);
        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            $lastWarning = $error !== '' ? 'model_api_error' : 'model_api_http_' . $httpCode;
            continue; // try next attempt (e.g. drop response_format)
        }
        $decoded = json_decode($response, true);
        $content = $decoded['choices'][0]['message']['content'] ?? '';
        if (!is_string($content) || trim($content) === '') {
            $lastWarning = 'model_empty_response';
            continue;
        }
        return ['ok' => true, 'content' => $content, 'warning' => ''];
    }
    return ['ok' => false, 'content' => '', 'warning' => $lastWarning];
}

function parse_ai_json_response($rawContent) {
    $raw = trim((string)$rawContent);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) return ['ok' => true, 'data' => $decoded, 'warning' => ''];
    if (preg_match('/```(?:json)?\s*(.*?)```/is', $raw, $m)) {
        $decoded = json_decode(trim($m[1]), true);
        if (is_array($decoded)) return ['ok' => true, 'data' => $decoded, 'warning' => 'parsed_fenced_json'];
    }
    $object = extract_first_json_object($raw);
    if ($object !== '') {
        $decoded = json_decode($object, true);
        if (is_array($decoded)) return ['ok' => true, 'data' => $decoded, 'warning' => 'parsed_embedded_json'];
    }
    return ['ok' => false, 'data' => null, 'warning' => 'json_parse_failed'];
}

function extract_first_json_object($text) {
    $start = strpos($text, '{');
    if ($start === false) return '';
    $depth = 0; $inString = false; $escape = false; $len = strlen($text);
    for ($i = $start; $i < $len; $i++) {
        $ch = $text[$i];
        if ($inString) {
            if ($escape) { $escape = false; continue; }
            if ($ch === '\\') { $escape = true; continue; }
            if ($ch === '"') $inString = false;
            continue;
        }
        if ($ch === '"') { $inString = true; continue; }
        if ($ch === '{') $depth++;
        if ($ch === '}') {
            $depth--;
            if ($depth === 0) return substr($text, $start, $i - $start + 1);
        }
    }
    return '';
}

function sanitize_final_response($data) {
    if (!is_array($data)) return ['reply' => '', 'actions' => [], 'warnings' => ['final_not_object']];
    return [
        'reply' => sanitize_string($data['reply'] ?? '', 3000),
        'actions' => is_array($data['actions'] ?? null) ? $data['actions'] : [],
        'warnings' => is_array($data['warnings'] ?? null) ? array_map(function($w) { return sanitize_string($w, 120); }, $data['warnings']) : [],
    ];
}

function sanitize_actions($actions) {
    if (!is_array($actions)) return [];
    $out = [];
    $allowedTypes = ['navigate', 'dataset_card', 'gene_card', 'plot', 'plot_card', 'warning_card', 'external_evidence_card'];
    foreach ($actions as $action) {
        if (!is_array($action)) continue;
        $type = sanitize_string($action['type'] ?? '', 40);
        if (!in_array($type, $allowedTypes, true)) continue;
        $item = ['type' => $type, 'label' => sanitize_string($action['label'] ?? ($action['title'] ?? ''), 100)];
        if ($item['label'] === '') continue;
        foreach (['title', 'description', 'omicsType', 'datasetId', 'traitId', 'name', 'plotType', 'renderTarget'] as $field) {
            if (isset($action[$field])) $item[$field] = sanitize_string($action[$field], 180);
        }
        if (isset($action['route'])) {
            $route = sanitize_string($action['route'], 200);
            if (($type === 'navigate' || $type === 'dataset_card') && !is_safe_route($route)) continue;
            $item['route'] = $route;
        }
        if (isset($action['params']) && is_array($action['params'])) $item['params'] = sanitize_assoc($action['params'], 16, 120);
        if (($type === 'plot' || $type === 'plot_card') && isset($action['payload']) && is_array($action['payload'])) {
            $payload = sanitize_plot_payload($action['payload']);
            if ($payload !== null) $item['payload'] = $payload;
        }
        $key = ($item['type'] ?? '') . '|' . ($item['route'] ?? '') . '|' . ($item['label'] ?? '') . '|' . ($item['title'] ?? '');
        $out[$key] = $item;
        if (count($out) >= 6) break;
    }
    return array_values($out);
}

function sanitize_plot_payload($payload) {
    $data = $payload['data'] ?? [];
    $layout = $payload['layout'] ?? [];
    $config = $payload['config'] ?? [];
    if (!is_array($data) || !is_array($layout) || !is_array($config)) return null;
    $clean = ['data' => array_values($data), 'layout' => (object)$layout, 'config' => (object)$config];
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > 250000) return null;
    return $clean;
}

function is_safe_route($route) {
    if ($route === '/') return true;
    $path = parse_url($route, PHP_URL_PATH);
    if (!is_string($path) || $path === '') return false;
    $allowedPrefixes = ['/browse', '/browse/SingleCell', '/browse/SpatialTranscriptome', '/browse/atac', '/browse/gwas', '/about/download'];
    foreach ($allowedPrefixes as $prefix) if ($path === $prefix || strpos($path, $prefix . '/') === 0) return true;
    return false;
}

function skill_results_to_actions($skillResults) {
    $actions = [];
    foreach ($skillResults as $result) {
        $r = $result['result'] ?? [];
        if (is_array($r) && isset($r['actions']) && is_array($r['actions'])) $actions = array_merge($actions, $r['actions']);
    }
    return $actions;
}

function verify_final_output_payload($payload, $skillResults, $locale, $userMessage, $options = []) {
    if (!AGENT_FINAL_OUTPUT_VERIFY) return ['payload' => $payload, 'warnings' => []];
    $reply = isset($payload['reply']) ? (string)$payload['reply'] : '';
    $warnings = [];
    if ($reply === '') return ['payload' => $payload, 'warnings' => $warnings];

    $isZh = stripos((string)$locale, 'zh') === 0;
    $actions = isset($payload['actions']) && is_array($payload['actions']) ? $payload['actions'] : [];
    $evidence = collect_final_output_evidence($skillResults);
    $hasData = $evidence['hasData'];
    $attemptedSkills = is_array($skillResults) ? count($skillResults) : 0;

    // 1) Capability offers ("我可以帮您进一步查询" etc.) only stand when real data
    //    or actions back them up; otherwise they are rewritten as neutral wording.
    $reply = neutralize_unsupported_offers($reply, $actions, $hasData, $isZh, $warnings, $options);

    // A reply drafted without any skill never claimed database values, so its
    // illustrative wording stays untouched (greetings, glossary, method notes).
    if ($attemptedSkills === 0) {
        $payload['reply'] = trim($reply);
        return ['payload' => $payload, 'warnings' => $warnings];
    }

    // 2) Dataset ids / routes that no skill actually returned are dropped.
    $referencesRemoved = false;
    $reply = strip_unsupported_references($reply, $evidence['haystack'], (string)$userMessage, $referencesRemoved, $options);
    if ($referencesRemoved) $warnings[] = 'unsupported_reference_removed';

    // 3) Figures that cannot be traced back to a successful skill result are
    //    downgraded to a qualitative wording. Skipped when real data came back,
    //    where counts may legitimately be derived from the returned records.
    $numbersDowngraded = 0;
    if (!$hasData) {
        $reply = downgrade_unsourced_numbers($reply, $evidence['numbers'], (string)$userMessage, $isZh, $numbersDowngraded, $options);
        if ($numbersDowngraded > 0) $warnings[] = 'unsourced_number_downgraded';
    }

    // 4) Nothing could be verified yet the reply still cited concrete facts: fall
    //    back to the conservative wording instead of shipping invented details.
    if (!$hasData && ($referencesRemoved || $numbersDowngraded > 0)) {
        $reply = conservative_verified_reply($isZh, $options);
        $warnings[] = 'reply_downgraded_to_verified_scope';
    }

    $reply = trim($reply);
    if ($reply === '') {
        $reply = conservative_verified_reply($isZh, $options);
        $warnings[] = 'reply_downgraded_to_verified_scope';
    }

    $payload['reply'] = $reply;
    return ['payload' => $payload, 'warnings' => $warnings];
}

function collect_final_output_evidence($skillResults) {
    $haystack = '';
    $numbers = [];
    $hasData = false;
    foreach ((array)$skillResults as $result) {
        if (!is_array($result)) continue;
        // Failed skills (for example the enrichment stub) cannot back any claim,
        // and their arguments come from the model itself, so never trust them.
        if (empty($result['ok']) || !array_key_exists('result', $result) || $result['result'] === null) continue;
        $scalars = [];
        flatten_skill_scalars($result['result'], $scalars);
        foreach ($scalars as $value) {
            $text = trim((string)$value);
            if ($text === '') continue;
            $haystack .= $text . "\n";
            foreach (extract_number_tokens($text) as $token) {
                foreach (number_lookup_keys($token) as $key) $numbers[$key] = true;
            }
            if (!$hasData && !(is_numeric($text) && (float)$text == 0.0)) $hasData = true;
        }
    }
    return ['haystack' => $haystack, 'numbers' => array_keys($numbers), 'hasData' => $hasData];
}

function flatten_skill_scalars($value, &$out, $depth = 0) {
    if ($depth > 6) return;
    if (is_array($value)) {
        foreach ($value as $item) flatten_skill_scalars($item, $out, $depth + 1);
        return;
    }
    if (is_scalar($value) && !is_bool($value)) $out[] = (string)$value;
}

function number_token_pattern() {
    return '/(?<![\w.,%])-?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:[eE][-+]?\d+)?%?(?![\w.])/u';
}

function extract_number_tokens($text) {
    $tokens = [];
    if (preg_match_all(number_token_pattern(), (string)$text, $matches)) {
        foreach ($matches[0] as $token) $tokens[] = $token;
    }
    return $tokens;
}

function number_lookup_keys($raw) {
    $keys = [];
    $clean = str_replace([',', ' '], '', trim((string)$raw));
    $clean = rtrim($clean, '%');
    if ($clean === '') return $keys;
    $keys[] = $clean;
    if (preg_match('/^-?\d+(?:\.\d+)?$/', $clean)) $keys[] = (string)(float)$clean;
    return $keys;
}

function neutralize_unsupported_offers($reply, $actions, $hasData, $isZh, &$warnings, $options = []) {
    $patterns = [
        '我可以帮您', '我可以帮你', '我能帮您', '我可以为您', '可以帮您查询', '帮您进一步查询',
        '进一步查询', '进一步为您', '建议您也可以', '如需', '想要了解更多',
        'i can help you', 'i can query', 'i could help', 'further query', 'let me know if you',
        'you may also want', 'if you need',
    ];
    // 调用方只能追加句式，不能取消内置句式。
    $patterns = array_merge($patterns, verified_guard_list($options, 'offerPhrases'));
    $lowerReply = strtolower($reply);
    $found = false;
    foreach ($patterns as $pattern) {
        if ($pattern !== '' && strpos($lowerReply, strtolower($pattern)) !== false) { $found = true; break; }
    }
    if (!$found) return $reply;
    // Real data or actionable cards do back the offer up, so keep the wording.
    if ($hasData || count($actions) > 0) return $reply;

    $default = $isZh
        ? '当前我能确认的信息以上述已验证的结果为准。'
        : 'What I can confirm is limited to the verified results above.';
    $neutral = verified_guard_option($options, 'neutralReply', $default);
    $sentences = split_reply_sentences($reply);
    $kept = [];
    $replaced = false;
    foreach ($sentences as $sentence) {
        $lowerSentence = strtolower($sentence);
        $hit = false;
        foreach ($patterns as $pattern) {
            if ($pattern !== '' && strpos($lowerSentence, strtolower($pattern)) !== false) { $hit = true; break; }
        }
        if (!$hit) { $kept[] = $sentence; continue; }
        if (!$replaced) { $kept[] = $neutral; $replaced = true; }
    }
    if ($replaced) $warnings[] = 'unsupported_offer_neutralized';
    return implode('', $kept);
}

function strip_unsupported_references($reply, $haystack, $userMessage, &$removed, $options = []) {
    $sentences = split_reply_sentences($reply);
    if (count($sentences) === 0) return $reply;
    $kept = [];
    $removed = false;
    foreach ($sentences as $sentence) {
        if (sentence_has_unsupported_reference($sentence, $haystack, $userMessage, $options)) { $removed = true; continue; }
        $kept[] = $sentence;
    }
    return $removed ? implode('', $kept) : $reply;
}

function sentence_has_unsupported_reference($sentence, $haystack, $userMessage, $options = []) {
    // Only app routes are checked, so biology ratios such as CD4/CD8 stay untouched.
    if (preg_match_all('#/(?:browse|about|download|doc)(?:/[A-Za-z0-9_-]+)*#', $sentence, $matches)) {
        foreach ($matches[0] as $token) {
            if (!reference_is_supported($token, $haystack, $userMessage)) return true;
        }
    }
    // Identifier-like tokens must mix digits with letters/underscores, which keeps
    // plain words (pathway names, sentences) untouched.
    if (preg_match_all('/\b(?=[A-Za-z0-9_]*[0-9])(?=[A-Za-z0-9_]*[A-Za-z_])[A-Za-z0-9_]{4,}\b/', $sentence, $matches)) {
        foreach ($matches[0] as $token) {
            if (is_protected_identifier($token, $options)) continue;
            // Real identifiers carry an underscore or an accession-like digit run,
            // so ordinary gene symbols such as CX3CR1 are not treated as invented.
            if (!preg_match('/_|\d{3,}|^(?:GSE|GSM|SRR|PRJ|E-[A-Z]{4})/i', $token)) continue;
            if (!reference_is_supported($token, $haystack, $userMessage)) return true;
        }
    }
    return false;
}

function reference_is_supported($token, $haystack, $userMessage) {
    $needle = trim($token);
    if ($needle === '') return true;
    if ($haystack !== '' && stripos($haystack, $needle) !== false) return true;
    // Anything the user typed themselves may be echoed back - that is not invented.
    if ($userMessage !== '' && stripos($userMessage, $needle) !== false) return true;
    return false;
}

function is_protected_identifier($token, $options = []) {
    if (preg_match('/^(?:UMAP_?\d+|PC\d+|BA\d+|chr\d+|10x|COVID-?19|v\d+(?:\.\d+)?|log2?FC|FDR\d*)$/i', $token)) return true;
    // 调用方追加的免检标识符按字面全词比较，不接受正则，避免注入/灾难性回溯。
    foreach (verified_guard_list($options, 'protectedIdentifiers') as $extra) {
        if (strcasecmp($token, $extra) === 0) return true;
    }
    return false;
}

function downgrade_unsourced_numbers($reply, $allowed, $userMessage, $isZh, &$downgraded, $options = []) {
    $allowedMap = [];
    foreach ((array)$allowed as $token) {
        foreach (number_lookup_keys($token) as $key) $allowedMap[$key] = true;
    }
    foreach (extract_number_tokens((string)$userMessage) as $token) {
        foreach (number_lookup_keys($token) as $key) $allowedMap[$key] = true;
    }
    $qualitative = verified_guard_option($options, 'qualitativeWord', $isZh ? '若干' : 'several');
    $downgraded = 0;
    $out = preg_replace_callback(number_token_pattern(), function($m) use (&$downgraded, $allowedMap, $qualitative) {
        foreach (number_lookup_keys($m[0]) as $key) {
            if (isset($allowedMap[$key])) return $m[0];
        }
        $downgraded++;
        return $qualitative;
    }, $reply);
    return $out === null ? $reply : $out;
}

// 后置校验的话术微调入口。调用方（前端）可以覆盖文案/追加句式，但无法关闭校验本身，
// 这样后续调优改前端即可，不必再动后端。
function verified_guard_option($options, $key, $default) {
    $value = is_array($options) ? ($options[$key] ?? null) : null;
    if (!is_string($value)) return $default;
    $value = trim($value);
    return $value === '' ? $default : $value;
}

function verified_guard_list($options, $key) {
    $list = is_array($options) ? ($options[$key] ?? null) : null;
    if (!is_array($list)) return [];
    $out = [];
    foreach ($list as $item) {
        $clean = sanitize_string($item ?? '', 80);
        if ($clean !== '') $out[] = $clean;
    }
    return $out;
}

function conservative_verified_reply($isZh, $options = []) {
    $default = $isZh
        ? '当前我能确认的信息是：本次查询没有返回可用的数据库结果，因此我不能给出具体的条目、数值或数据集信息。请提供有效的数据集、基因或性状后再试。'
        : 'Based on what I can confirm: this query returned no usable database results, so I cannot provide specific items, figures, or dataset details. Please retry with a valid dataset, gene, or trait.';
    return verified_guard_option($options, 'conservativeReply', $default);
}

function split_reply_sentences($reply) {
    $text = trim((string)$reply);
    if ($text === '') return [];
    $ok = preg_match_all('/[^\n。！？!?;；]+(?:[\n。！？!?;；]+|$)/u', $text, $matches);
    if (!$ok || empty($matches[0])) return [$text];
    $sentences = [];
    foreach ($matches[0] as $sentence) {
        $sentence = trim($sentence);
        if ($sentence !== '') $sentences[] = $sentence;
    }
    return count($sentences) > 0 ? $sentences : [$text];
}

function handle_final_only_request($input, $locale, $userMessage) {
    global $url, $model, $openaiApiKey;
    $isZh = stripos((string)$locale, 'zh') === 0;

    $messages = sanitize_caller_messages($input['messages'] ?? null);
    if (count($messages) === 0) {
        agent_json_out([
            'reply' => $isZh ? '缺少 messages 参数，无法生成回答。' : 'Missing messages, cannot generate a reply.',
            'actions' => [],
            'warnings' => ['final_only_missing_messages'],
        ]);
    }
    $skillResults = sanitize_structured_tool_results($input['structured_tool_results'] ?? ($input['structuredToolResults'] ?? []));
    $finalMessages = final_only_append_tool_results($messages, $skillResults);

    // 采样参数交由调用方控制，避免后续调参再改后端。
    $temperature = isset($input['temperature']) && is_numeric($input['temperature'])
        ? max(0.0, min((float)$input['temperature'], 2.0))
        : 0.25;
    $maxTokens = isset($input['maxTokens']) && is_numeric($input['maxTokens'])
        ? max(1, min((int)$input['maxTokens'], 4000))
        : 1000;
    $modelName = sanitize_string($input['model'] ?? '', 80) ?: $model;
    $verification = is_array($input['verification'] ?? null) ? $input['verification'] : [];

    $warnings = [];
    $call = call_model_api($url, $modelName, $openaiApiKey, $finalMessages, $temperature, $maxTokens);
    if ($call['ok']) {
        $parsed = parse_ai_json_response($call['content']);
        if ($parsed['ok']) {
            $final = sanitize_final_response($parsed['data']);
            $reply = $final['reply'];
            $actions = sanitize_actions(array_merge(skill_results_to_actions($skillResults), $final['actions']));
            $warnings = array_merge($warnings, $final['warnings']);
        } else {
            $reply = '';
            $actions = sanitize_actions(skill_results_to_actions($skillResults));
            $warnings[] = 'final_json_invalid';
        }
    } else {
        $reply = '';
        $actions = sanitize_actions(skill_results_to_actions($skillResults));
        $warnings[] = $call['warning'];
        $warnings[] = 'final_call_failed';
    }

    if ($reply === '') {
        $reply = $isZh ? '智能助手暂时无法生成可靠回答，请稍后再试。' : 'The assistant could not produce a reliable reply. Please try again later.';
    }

    $payload = [
        'reply' => $reply,
        'actions' => $actions,
        'warnings' => array_values(array_unique(array_filter($warnings))),
    ];

    // final-only 同样走后置校验：具体的数据集/数字声明必须能在本次技能结果里溯源。
    $verified = verify_final_output_payload($payload, $skillResults, $locale, $userMessage, $verification);
    $payload = $verified['payload'];
    if (!empty($verified['warnings'])) {
        $payload['warnings'] = array_values(array_unique(array_filter(array_merge($payload['warnings'], $verified['warnings']))));
    }

    agent_json_out($payload);
}

function sanitize_caller_messages($messages) {
    if (!is_array($messages)) return [];
    $out = [];
    foreach ($messages as $message) {
        if (!is_array($message)) continue;
        $role = strtolower(sanitize_string($message['role'] ?? '', 20));
        if (!in_array($role, ['system', 'user', 'assistant'], true)) continue;
        $content = sanitize_string($message['content'] ?? '', 12000);
        if ($content === '') continue;
        $out[] = ['role' => $role, 'content' => $content];
        if (count($out) >= 24) break;
    }
    return $out;
}

function sanitize_structured_tool_results($results) {
    if (!is_array($results)) return [];
    $out = [];
    foreach ($results as $result) {
        if (!is_array($result)) continue;
        $out[] = [
            'ok' => !empty($result['ok']),
            'skill' => sanitize_string($result['skill'] ?? '', 80),
            'arguments' => is_array($result['arguments'] ?? null) ? $result['arguments'] : [],
            'result' => $result['result'] ?? null,
            'warnings' => is_array($result['warnings'] ?? null) ? array_map(function($w) { return sanitize_string($w, 120); }, $result['warnings']) : [],
            'truncated' => !empty($result['truncated']),
        ];
        if (count($out) >= 8) break;
    }
    return $out;
}

function final_only_append_tool_results($messages, $skillResults) {
    if (count($skillResults) === 0) return $messages;
    // 调用方若已把技能结果写进自己的 messages，则不再重复注入。
    foreach ($messages as $message) {
        if (is_string($message['content'] ?? null) && strpos($message['content'], 'structured_tool_results') !== false) return $messages;
    }
    foreach ($skillResults as $result) {
        $messages[] = ['role' => 'user', 'content' => json_encode([
            'messageType' => 'structured_tool_results',
            'toolResults' => [$result],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
    }
    return $messages;
}



?>
