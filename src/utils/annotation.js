export function validateAnnotations(doc) {
  const issues = [];
  if (!doc.annotations.length) issues.push({ message: '请至少添加一个命题标注。' });
  for (const item of doc.annotations) {
    if (!['SF', 'GF', 'SM', 'GM'].includes(item.label))
      issues.push({ id: item.id, message: `${item.id} 缺少有效标签。` });
    if (
      item.start < 0 ||
      item.end > doc.text.length ||
      item.start >= item.end ||
      doc.text.slice(item.start, item.end) !== item.text
    )
      issues.push({ id: item.id, message: `${item.id} 的原文位置不一致。` });
    if (item.label === 'GM' && !item.subtype)
      issues.push({ id: item.id, message: `${item.id} 请选择一般规范判断的子类型。` });
  }
  const ids = new Set(doc.annotations.map((item) => item.id));
  for (const relation of doc.relations) {
    if (
      !relation.sources.length ||
      !ids.has(relation.target) ||
      relation.sources.some((id) => !ids.has(id) || id === relation.target)
    )
      issues.push({ message: `${relation.id} 的关系端点无效。` });
    if (relation.type === 'J' && relation.sources.length < 2)
      issues.push({ message: `${relation.id} 的组合关系需要至少两个起点。` });
  }
  return issues;
}

export function overlaps(annotations, start, end) {
  return annotations.some((item) => start < item.end && end > item.start);
}

export function nextId(items, prefix) {
  return `${prefix}${Math.max(0, ...items.map((item) => Number(item.id.slice(prefix.length)) || 0)) + 1}`;
}

export function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
