import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const componentRoot = path.resolve(
  'ai-mode/skill/craft-beer-guide/components/recommendation-v2-card',
);

test('candidate component reacquires contexts and declares expirable card', () => {
  const source = fs.readFileSync(path.join(componentRoot, 'index.js'), 'utf8');
  const styles = fs.readFileSync(path.join(componentRoot, 'index.wxss'), 'utf8');
  const template = fs.readFileSync(path.join(componentRoot, 'index.wxml'), 'utf8');
  const mcp = JSON.parse(
    fs.readFileSync('ai-mode/skill/craft-beer-guide/mcp.candidate.json', 'utf8'),
  );
  const component = mcp.components.find((item) =>
    item.path === 'components/recommendation-v2-card/index');

  assert.match(source, /getContext\(this\)\.sendFollowUpMessage|getContext\(this\)/);
  assert.match(source, /getViewContext\(this\)/);
  assert.match(source, /NotificationType\.Overflow/);
  assert.match(source, /\[ai-mode\].*overflow monitor=on/);
  assert.doesNotMatch(source, /this\._modelCtx|this\._viewCtx|NotificationType\.Expire/);
  assert.doesNotMatch(styles, /(?:^|[;\s])(?:min-|max-)?height\s*:/m);
  [...template.matchAll(/<[^>]+\bbindtap="[^"]+"[^>]*>/g)].forEach((match) => {
    assert.match(match[0], /\bhover-class="[^"]+"/);
  });
  assert.equal(component.expirable, true);
  assert.equal(component.expiredText, '推荐条件已更新，请使用最新结果');
});

test('UI-01 inFlight blocks duplicate terminal taps', () => {
  const calls = [];
  const definition = loadComponent({
    getContext() {
      return { on() {}, sendFollowUpMessage(value) { calls.push(value); } };
    },
    getViewContext() {
      return { openDetailPage() {}, expirePreviousCards() {} };
    },
  });
  const instance = createInstance(definition, {
    flow: { flowId: 'arf_1234567890ab', revision: 0 },
    inFlight: true,
  });
  instance.sendTerminalAction('getBeerStyleDetail', {
    displayName: 'Test',
    styleRef: { kind: 'bjcp', id: '1A' },
  });
  assert.equal(calls.length, 0);
});

test('UI-01 first terminal tap holds inFlight until a result notification', () => {
  const calls = [];
  const definition = loadComponent({
    getContext() {
      return { on() {}, sendFollowUpMessage(value) { calls.push(value); } };
    },
    getViewContext() {
      return { openDetailPage() {}, expirePreviousCards() {} };
    },
  });
  const instance = createInstance(definition, {
    flow: { flowId: 'arf_1234567890ab', revision: 0 },
  });
  const item = {
    displayName: 'Test',
    styleRef: { kind: 'bjcp', id: '1A' },
  };
  instance.sendTerminalAction('getBeerStyleDetail', item);
  instance.sendTerminalAction('getBeerStyleDetail', item);
  assert.equal(calls.length, 1);
  assert.equal(instance.data.inFlight, true);
});

test('adjust action stays in conversation and asks to preserve the full snapshot', () => {
  const calls = [];
  const definition = loadComponent({
    getContext() {
      return { on() {}, sendFollowUpMessage(value) { calls.push(value); } };
    },
    getViewContext() {
      return { openDetailPage() { throw new Error('must stay in conversation'); } };
    },
  });
  const instance = createInstance(definition, { inFlight: false });
  instance.onTapAdjust();
  assert.equal(calls.length, 1);
  assert.match(calls[0].content[0].text, /完整快照/);
  assert.equal(instance.data.inFlight, true);
});

function loadComponent(modelContext) {
  let definition;
  const source = fs.readFileSync(path.join(componentRoot, 'index.js'), 'utf8');
  vm.runInNewContext(source, {
    Component(value) {
      definition = value;
    },
    wx: {
      modelContext: {
        ...modelContext,
        NotificationType: { Result: 'result', Overflow: 'overflow' },
      },
    },
    Math,
  });
  return definition;
}

function createInstance(definition, data) {
  const instance = {
    data: { ...definition.data, ...data },
    setData(value) {
      this.data = { ...this.data, ...value };
    },
  };
  Object.entries(definition.methods).forEach(([name, method]) => {
    instance[name] = method.bind(instance);
  });
  return instance;
}
