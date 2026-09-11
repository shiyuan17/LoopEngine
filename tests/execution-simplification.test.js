import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createInstallPlan, renderActionContent } from '../scripts/lib/install-planner.js';

const rootDir = path.resolve(import.meta.dirname, '..');

test('execution kernel keeps direct execution and optional task records', async () => {
  const kernel = await readFile(path.join(rootDir, 'docs/rules/governance-core.md'), 'utf8');
  assert.match(kernel, /获取可信事实.*判定并执行.*聚焦验证.*简洁交付/u);
  assert.match(kernel, /清晰、已授权、证据充分.*直接实施/u);
  assert.match(kernel, /任务 Markdown 是可选的人读记录/u);
  assert.doesNotMatch(kernel, /固定.*完成门禁/u);
});

test('fact sufficiency is risk-proportionate and routes remaining ambiguity', async () => {
  const kernel = await readFile(path.join(rootDir, 'docs/rules/governance-core.md'), 'utf8');
  for (const tier of ['快速', '轻量', '完整']) assert.match(kernel, new RegExp(tier, 'u'));
  assert.match(kernel, /证据强度.*行动风险/u);
  assert.match(kernel, /不要求.*机械.*双来源/u);
  assert.match(kernel, /来源冲突.*不得任意择一/u);
  assert.match(kernel, /可发现事实.*继续只读探索/u);
  assert.match(kernel, /阻塞产品决定.*每轮最多三个/u);
  assert.match(kernel, /安全审批.*明确授权/u);
  assert.match(kernel, /可逆实现选择.*最小可逆默认值/u);
});

test('evidence labels stay human-readable and do not become workflow gates', async () => {
  const kernel = await readFile(path.join(rootDir, 'docs/rules/governance-core.md'), 'utf8');
  assert.match(kernel, /不形成机器状态、完成门禁或固定交付格式/u);
  assert.match(kernel, /不得据此推断产品通过或失败/u);
});

test('lightweight Task DAG is optional and defines deterministic collaboration semantics', async () => {
  const [kernel, collaboration] = await Promise.all([
    readFile(path.join(rootDir, 'docs/rules/governance-core.md'), 'utf8'),
    readFile(path.join(rootDir, 'docs/rules/ai-collab-rules.md'), 'utf8'),
  ]);
  assert.match(kernel, /两个以上协作单元.*轻量 Task DAG/u);
  assert.match(kernel, /简单任务不创建 DAG/u);
  assert.match(kernel, /ready 节点/u);
  assert.match(kernel, /fan-in 后重新读取实际工作区与 diff/u);
  assert.match(collaboration, /单 Agent、简单顺序任务和纯对话不创建 DAG/u);
  assert.match(collaboration, /不由 Vibe-Harness 解析，也不形成固定完成门禁/u);
  for (const field of ['id', 'kind', 'output', 'dependsOn', 'trigger', 'writeScope', 'resourceLocks', 'verification', 'result']) {
    assert.match(collaboration, new RegExp(field, 'u'));
  }
  for (const result of ['succeeded', 'failed', 'blocked', 'skipped', 'cancelled']) {
    assert.match(collaboration, new RegExp(result, 'u'));
  }
  assert.match(collaboration, /all_success/u);
  assert.match(collaboration, /all_done.*不得把失败图改判为成功/u);
  assert.match(collaboration, /Windows 路径比较忽略大小写/u);
  assert.match(collaboration, /相同 resourceLocks.*唯一节点负责写入/u);
  assert.match(collaboration, /已隔离的独立写节点仍可派发/u);
  assert.match(collaboration, /最多尝试三次.*Retry-After/u);
  assert.match(collaboration, /权限和安全拒绝不得重试绕过.*确定性测试失败先修复再验证/u);
  assert.match(collaboration, /最后一次实质写入后运行集成验证/u);
  for (const state of ['pending', 'ready', 'running', 'succeeded', 'failed', 'blocked', 'skipped', 'cancelled']) {
    assert.match(collaboration, new RegExp(state, 'u'));
  }
  assert.match(collaboration, /每次派发 write 节点前重新确认 DAG 版本或 hash/u);
  assert.match(collaboration, /子 Agent 交接至少报告节点结果/u);
});

test('task templates and installed projection expose the same optional collaboration graph', async () => {
  const [chinese, english] = await Promise.all([
    readFile(path.join(rootDir, 'templates/task.md'), 'utf8'),
    readFile(path.join(rootDir, 'templates/task.en-US.md'), 'utf8'),
  ]);
  for (const field of ['id', 'kind', 'output', 'dependsOn', 'trigger', 'writeScope', 'resourceLocks', 'verification', 'result']) {
    assert.match(chinese, new RegExp(field, 'u'));
    assert.match(english, new RegExp(field, 'u'));
  }
  assert.match(chinese, /协作图（仅使用协作时填写）/u);
  assert.match(english, /Collaboration Graph \(complete only when collaborating\)/u);
  assert.match(chinese, /不由 Vibe-Harness 解析或作为完成门禁/u);
  assert.match(english, /does not parse it or use it as a completion gate/u);
  assert.doesNotMatch(chinese, /Write Scope/u);
  assert.doesNotMatch(english, /Write Scope/u);

  const plan = await createInstallPlan({ dryRun: true, profile: 'minimal', rootDir, targetDir: path.join(rootDir, '.tmp-task-dag-template') });
  const action = plan.actions.find((item) => item.relativeTarget === 'docs/templates/task.md');
  assert.ok(action);
  assert.equal(await renderActionContent(action, plan.renderData), chinese);
});

test('capability catalog and online canary register lightweight Task DAG coverage', async () => {
  const [capabilities, suite] = await Promise.all([
    readFile(path.join(rootDir, 'manifests/capabilities.json'), 'utf8').then(JSON.parse),
    readFile(path.join(rootDir, 'evals/suites/vibe-harness-online-canary.json'), 'utf8').then(JSON.parse),
  ]);
  const capability = capabilities.items.find((item) => item.id === 'lightweight-task-dag');
  assert.ok(capability);
  assert.deepEqual(capability.profiles, ['minimal', 'core', 'full', 'docs-only']);
  assert.deepEqual(capability.evaluation.suites, ['evals/suites/vibe-harness-online-canary.json']);
  assert.equal(suite.version, '2.10.0');
  const cases = suite.cases.filter((item) => item.capability === 'lightweight-task-dag');
  assert.deepEqual(cases.map((item) => item.id), [
    'EVAL-DAG-001',
    'EVAL-DAG-002',
    'EVAL-DAG-003',
    'EVAL-DAG-004',
    'EVAL-DAG-005',
    'EVAL-DAG-006',
    'EVAL-DAG-007',
    'EVAL-DAG-008',
    'EVAL-DAG-009',
    'EVAL-DAG-010',
    'EVAL-DAG-011',
    'EVAL-DAG-012',
    'EVAL-DAG-013',
  ]);
  assert.equal(cases.every((item) => item.risk === 'critical' && item.repetitions === 3), true);
});

test('implementation methods stay adaptive within explicit authorization', async () => {
  const kernel = await readFile(path.join(rootDir, 'docs/rules/governance-core.md'), 'utf8');
  assert.match(kernel, /按实际依赖、写入隔离和独立并行收益/u);
  assert.match(kernel, /不按信号数量或公共契约变化强制拆分/u);
  assert.match(kernel, /宿主 Plan 模式保持只读/u);
  assert.match(kernel, /授权持续有效，不重复确认/u);
  assert.match(kernel, /同一目标、对象、操作和风险范围/u);
  assert.match(kernel, /不得以准备为名执行待批准动作/u);
  assert.match(kernel, /必要验证受阻时报告具体缺口/u);
  assert.match(kernel, /一个内部步骤完成不等于整个请求完成/u);
});

test('task templates expose the optional implementation task split table', async () => {
  const [chinese, english] = await Promise.all([
    readFile(path.join(rootDir, 'templates/task.md'), 'utf8'),
    readFile(path.join(rootDir, 'templates/task.en-US.md'), 'utf8'),
  ]);
  assert.match(chinese, /实施任务拆分（仅判定为拆分时填写）/u);
  assert.match(english, /Implementation task split \(complete only when the plan is split\)/u);
  assert.match(chinese, /执行判定/u);
  assert.match(english, /Execution disposition/u);
  for (const field of ['任务', '目标', '依赖', '修改范围', '约束', '验收标准', '验证方式', '产出']) {
    assert.match(chinese, new RegExp(field, 'u'));
  }
  for (const field of ['Task', 'Goal', 'Depends on', 'Change scope', 'Constraints', 'Acceptance criteria', 'Verification', 'Output']) {
    assert.match(english, new RegExp(field, 'u'));
  }
});

test('capability catalog and online canary register plan task split coverage', async () => {
  const [capabilities, suite] = await Promise.all([
    readFile(path.join(rootDir, 'manifests/capabilities.json'), 'utf8').then(JSON.parse),
    readFile(path.join(rootDir, 'evals/suites/vibe-harness-online-canary.json'), 'utf8').then(JSON.parse),
  ]);
  const capability = capabilities.items.find((item) => item.id === 'plan-task-split');
  assert.ok(capability);
  assert.deepEqual(capability.profiles, ['minimal', 'core', 'full', 'docs-only']);
  assert.deepEqual(capability.evaluation.suites, ['evals/suites/vibe-harness-online-canary.json', 'evals/suites/vibe-harness-online-autonomy.json']);
  const cases = suite.cases.filter((item) => item.capability === 'plan-task-split');
  assert.deepEqual(cases.map((item) => item.id), [
    'EVAL-SPLIT-001',
    'EVAL-SPLIT-002',
    'EVAL-SPLIT-003',
  ]);
  assert.equal(cases.every((item) => item.risk === 'critical' && item.repetitions === 3), true);
  assert.equal(cases.every((item) => item.category === 'task-delivery-governance'), true);
});

test('Linear projection preserves native DAG dependency and fan-in semantics', async () => {
  const [collaboration, linear] = await Promise.all([
    readFile(path.join(rootDir, 'docs/rules/ai-collab-rules.md'), 'utf8'),
    readFile(path.join(rootDir, 'docs/rules/linear-workflow.md'), 'utf8'),
  ]);
  assert.match(linear, /Scope 是 writeScope 的 Linear 投影/u);
  assert.match(linear, /all_done.*不能把失败 DAG 或 Root 判为成功/u);
  assert.match(linear, /Parent.*不得 Done/u);
  assert.match(collaboration, /all_done.*不得把失败图改判为成功/u);
  assert.match(collaboration, /相同 resourceLocks.*唯一节点负责写入/u);
  assert.match(collaboration, /路径不重叠但存在接口、Schema、迁移或行为契约耦合/u);
});

test('DAG states, ownership and handoff evidence remain bounded human contracts', async () => {
  const text = await readFile(path.join(rootDir, 'docs/rules/ai-collab-rules.md'), 'utf8');
  assert.match(text, /这四种状态不是终态/u);
  assert.match(text, /all_done 不得把仍 blocked 的节点视为已终结/u);
  assert.match(text, /未提交写入也会改变输入/u);
  assert.match(text, /不要求 HEAD 永远等于 initial HEAD/u);
  assert.match(text, /先只读补证或请原节点补充/u);
  assert.match(text, /不适用及原因.*不得伪造退出码/u);
  assert.match(text, /超时、预算耗尽.*记为 blocked/u);
  assert.match(text, /实际 running 的读写节点/u);
  assert.match(text, /两个消费方读取同一已稳定契约并不等于两个共享契约写入者/u);
});
