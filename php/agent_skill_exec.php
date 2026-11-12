<?php
/**
 * ssMOOD AI · 三入口之一：技能执行器
 *
 * 职责：按调用方（前端）指定的技能名执行一次技能，并把结构化结果原样返回。
 *      此接口不做意图判断、不做技能选择——调哪个技能完全由调用方决定。
 *      内部只做一件编排以外的事：通过映射表把技能名映射到既有实现，
 *      全部技能逻辑复用 php/agent_skills.php 的 execute_agent_skill，不重写任何技能。
 *
 * 输入（POST JSON，此签名一经确定不再变动）：
 *      {
 *        "skill":   string,          // 必填，技能名
 *        "params":  object,          // 可选，技能参数
 *        "context": object,          // 可选，当前页面上下文（get_current_page_context 会回显）
 *        "locale":  string           // 可选，缺省取 context.locale，再缺省 'zh'
 *      }
 *
 * 输出（此签名一经确定不再变动）：
 *      成功：{ "ok": true,  "data": <技能 result>, "error": null,
 *              "meta": { skill, capability, warnings, truncated } }
 *      失败：{ "ok": false, "data": null, "error": "<错误码>", "meta": {...} }
 *      错误码：invalid_json_body / missing_skill / unknown_skill /
 *              capability_unavailable / invalid_arguments / skill_exception
 *
 * 新增技能时：在下方 agent_skill_exec_registry() 里加一行即可；
 * 若新技能尚未实现，状态标为 'unavailable'，调用方会拿到统一的
 * capability_unavailable，而不是沉默失败。
 *
 * 保留名：skill = "_manifest" 时返回完整技能清单（每项附带 capability 状态），
 * 前端据此生成给 LLM 的工具描述，无需在前端硬编码技能表，也无需新增接口。
 * 以下划线开头的 skill 名一律作为保留名，不得用于真实技能。
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
require __DIR__ . '/agent_skills.php';

function agent_skill_exec_out($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function agent_skill_exec_string($value, $maxLen) {
    $value = is_scalar($value) ? trim((string)$value) : '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $maxLen, 'UTF-8') : substr($value, 0, $maxLen);
}

function agent_skill_exec_assoc($value, $maxKeys, $maxLen) {
    $out = [];
    $count = 0;
    foreach ((array)$value as $key => $item) {
        if ($count >= $maxKeys) break;
        if (!is_scalar($item) && $item !== null) continue;
        $out[agent_skill_exec_string($key, 50)] = agent_skill_exec_string($item ?? '', $maxLen);
        $count++;
    }
    return $out;
}

function agent_skill_exec_context($context) {
    $out = [];
    foreach (['routeName', 'path', 'locale', 'title', 'pageType', 'businessState', 'plotState', 'pageSummary'] as $key) {
        if (!array_key_exists($key, (array)$context)) continue;
        $out[$key] = is_array($context[$key]) ? agent_skill_exec_assoc($context[$key], 24, 120) : agent_skill_exec_string($context[$key], 240);
    }
    return $out;
}

/**
 * 技能名 -> 能力状态映射表。'available' 表示可执行；'unavailable' 表示现有代码里
 * 仍是空壳/未接线，调用方会收到统一的 capability_unavailable。新增技能只需在此加一行。
 */
function agent_skill_exec_registry() {
    return [
        'search_datasets'              => 'available',
        'build_navigation_action'      => 'available',
        'get_current_page_context'     => 'available',
        'get_dataset_summary'          => 'available',
        'get_platform_overview'        => 'available',
        'get_database_statistics'      => 'available',
        'get_database_update_info'     => 'available',
        'search_genes'                 => 'available',
        'search_traits'                => 'available',
        'get_gene_expression_summary'  => 'available',
        'compare_gene_expression'      => 'available',
        'get_deg_summary'              => 'available',
        'compare_deg_summary'          => 'available',
        'get_enrichment_summary'       => 'unavailable', // 富集表未接线：现有实现恒返回不可用
        'get_celltype_composition'     => 'available',
        'get_gwas_signal_summary'      => 'available',
        'get_atac_peak_summary'        => 'available',
        'get_plot_data'                => 'available',
        'build_plot_action'            => 'available',
        'web_search_literature'        => 'unavailable', // 无外部检索实现：现有实现恒返回不可用
        'summarize_external_evidence'  => 'available',
        'combine_data_with_knowledge'  => 'available',
    ];
}

function agent_skill_exec_unavailable_reason($skill) {
    $reasons = [
        'get_enrichment_summary' => 'enrichment_summary_table_not_confirmed',
        'web_search_literature'  => 'external_knowledge_unavailable',
    ];
    return $reasons[$skill] ?? 'capability_unavailable';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    agent_skill_exec_out(['ok' => false, 'data' => null, 'error' => 'method_not_allowed', 'meta' => null], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    agent_skill_exec_out(['ok' => false, 'data' => null, 'error' => 'invalid_json_body', 'meta' => null], 400);
}

$skill = agent_skill_exec_string($input['skill'] ?? '', 80);
if ($skill === '') {
    agent_skill_exec_out(['ok' => false, 'data' => null, 'error' => 'missing_skill', 'meta' => null], 400);
}

$params = is_array($input['params'] ?? null) ? $input['params'] : [];
$context = is_array($input['context'] ?? null) ? agent_skill_exec_context($input['context']) : [];
$locale = agent_skill_exec_string($input['locale'] ?? ($context['locale'] ?? 'zh'), 16) ?: 'zh';

$registry = agent_skill_exec_registry();
$manifestNames = array_map(function($item) { return $item['name']; }, get_agent_skill_manifest($locale));

// 保留名 _manifest：把「技能清单 + 能力状态」交给前端，避免前端硬编码技能表。
if ($skill === '_manifest') {
    $skills = get_agent_skill_manifest($locale);
    foreach ($skills as $index => $item) {
        $skills[$index]['capability'] = $registry[$item['name']] ?? 'available';
    }
    agent_skill_exec_out([
        'ok' => true,
        'data' => ['locale' => $locale, 'skills' => $skills],
        'error' => null,
        'meta' => ['skill' => $skill, 'capability' => 'available', 'warnings' => [], 'truncated' => false],
    ]);
}

if (isset($registry[$skill]) && $registry[$skill] !== 'available') {
    // 空壳能力必须显式告知，不沉默失败。
    agent_skill_exec_out([
        'ok' => false,
        'data' => null,
        'error' => 'capability_unavailable',
        'meta' => [
            'skill' => $skill,
            'capability' => 'unavailable',
            'reason' => agent_skill_exec_unavailable_reason($skill),
        ],
    ]);
}

// 映射表里没有、技能清单里也没有 -> 未知技能。清单里有但映射表未登记的技能
// 仍然放行执行，以免新增技能时漏改映射表就报错。
if (!isset($registry[$skill]) && !in_array($skill, $manifestNames, true)) {
    agent_skill_exec_out([
        'ok' => false,
        'data' => null,
        'error' => 'unknown_skill',
        'meta' => ['skill' => $skill],
    ]);
}

$validation = validate_agent_skill_arguments($skill, $params);
if (!$validation['ok']) {
    agent_skill_exec_out([
        'ok' => false,
        'data' => null,
        'error' => 'invalid_arguments',
        'meta' => ['skill' => $skill, 'reason' => $validation['warning']],
    ]);
}

try {
    $result = execute_agent_skill($skill, $validation['arguments'], $context, $locale);
} catch (Throwable $e) {
    agent_skill_exec_out([
        'ok' => false,
        'data' => null,
        'error' => 'skill_exception',
        'meta' => ['skill' => $skill],
    ]);
}

// 现有技能返回体为 {ok, skill, arguments, result, warnings, truncated}，此处原样搬运，
// warnings 始终透传，执行失败也不会沉默。
agent_skill_exec_out([
    'ok' => (bool)($result['ok'] ?? false),
    'data' => $result['result'] ?? null,
    'error' => null,
    'meta' => [
        'skill' => $result['skill'] ?? $skill,
        'capability' => 'available',
        'warnings' => array_values(array_unique(array_filter($result['warnings'] ?? []))),
        'truncated' => !empty($result['truncated']),
    ],
]);

?>
