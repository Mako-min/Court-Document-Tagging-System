import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnnotations, overlaps, nextId } from '../src/utils/annotation.js';
import { graphSvg, graphLayout } from '../src/utils/graph.js';
import { createSeed } from '../src/data/seed.js';

test('seed annotations reference the exact original text and valid endpoints', () => {
  for (const doc of createSeed().documents.filter((item) => item.annotations.length))
    assert.deepEqual(validateAnnotations(doc), []);
});

test('adjacent ranges are allowed, contained and intersecting ranges are rejected', () => {
  const existing = [{ start: 10, end: 20 }];
  assert.equal(overlaps(existing, 20, 30), false);
  assert.equal(overlaps(existing, 0, 10), false);
  assert.equal(overlaps(existing, 12, 18), true);
  assert.equal(overlaps(existing, 5, 25), true);
});

test('validation detects stale offsets, missing normative subtype and invalid relationship', () => {
  const doc = createSeed().documents[0];
  doc.annotations[0].start += 1;
  doc.annotations[1].subtype = '';
  doc.relations[0].sources = ['P99'];
  const issues = validateAnnotations(doc);
  assert.equal(issues.length, 4);
  assert.ok(issues.some((item) => item.message.includes('原文位置')));
  assert.ok(issues.some((item) => item.message.includes('子类型')));
  assert.ok(issues.some((item) => item.message.includes('端点')));
});

test('IDs remain unique after deletion and sparse numbering', () => {
  assert.equal(nextId([{ id: 'P1' }, { id: 'P7' }], 'P'), 'P8');
  assert.equal(nextId([], 'R'), 'R1');
});

test('graph includes every source of a joint relation', () => {
  const doc = createSeed().documents[0];
  const layout = graphLayout(doc.annotations, doc.relations);
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.length, 2);
  assert.ok(layout.edges.every((edge) => !edge.path.includes('undefined')));
});

test('SVG export escapes imported text rather than injecting markup', () => {
  const svg = graphSvg([{ id: 'P1', text: '<script>&"x"</script>', label: 'SF' }], []);
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(svg.includes('&amp;'));
});
