// 契约先行用的本地假数据。
// 场景：后端某个技能还没上传，但前端要把整条链路先写完跑通。
// 用法：在 agentConfig.js 的 AGENT_MOCK_TOOLS 里写上工具名，runTool 会优先命中这里；
// 后端就绪后把名字从数组里删掉即可切回真实实现，前端其余逻辑一行不用改。

const baseFixture = (name, params) => ({
  ok: true,
  skill: name,
  result: {
    mocked: true,
    echo: params || {},
    items: [],
    resultCount: 0,
  },
  warnings: ['mock_result'],
  truncated: false,
});

export const AGENT_MOCK_FIXTURES = {
  // 示例：富集能力后端空壳时的占位结构，字段与真实 enrichment.php 返回保持一致。
  run_enrichment: (name, params) => ({
    ok: true,
    skill: name,
    result: {
      mocked: true,
      datasetId: params?.datasetId || '',
      geneSet: params?.geneSet || 'KEGG',
      items: [
        { t: 'mock pathway', p: 0.01, o: 2.0, c: 12.5, g: 'GENE1;GENE2' },
      ],
      resultCount: 1,
    },
    warnings: ['mock_result'],
    truncated: false,
  }),
};

export function mockToolResult(name, params) {
  const factory = AGENT_MOCK_FIXTURES[name];
  if (factory) return factory(name, params);
  return baseFixture(name, params);
}
