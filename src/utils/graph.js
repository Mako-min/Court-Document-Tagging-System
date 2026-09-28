export function graphLayout(annotations, relations) {
  const targets = new Set(relations.map((item) => item.target));
  const groups = [[], [], []];
  for (const item of annotations)
    groups[targets.has(item.id) ? 2 : item.label === 'GM' || item.label === 'GF' ? 1 : 0].push(
      item,
    );
  const nodes = groups.flatMap((items, column) =>
    items.map((item, row) => ({
      ...item,
      x: 22 + column * 270,
      y: 32 + row * 130,
      width: 220,
      height: 86,
    })),
  );
  const edges = relations.flatMap((relation) =>
    relation.sources
      .map((source) => {
        const from = nodes.find((item) => item.id === source);
        const to = nodes.find((item) => item.id === relation.target);
        if (!from || !to) return null;
        const sameColumn = from.x === to.x;
        const x1 = from.x + from.width;
        const y1 = from.y + 43;
        const x2 = sameColumn ? to.x + to.width : to.x;
        const y2 = to.y + 43;
        return {
          id: `${relation.id}-${source}`,
          type: relation.type,
          path: `M${x1},${y1} C${x1 + 38},${y1} ${sameColumn ? x2 + 38 : x2 - 38},${y2} ${x2},${y2}`,
          x: sameColumn ? x1 + 22 : (x1 + x2) / 2,
          y: (y1 + y2) / 2 - 8,
        };
      })
      .filter(Boolean),
  );
  return {
    nodes,
    edges,
    width: 820,
    height: Math.max(250, Math.max(...groups.map((group) => group.length), 1) * 130 + 35),
  };
}

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char],
  );
export function graphSvg(annotations, relations) {
  const graph = graphLayout(annotations, relations);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${graph.width}" height="${graph.height}" viewBox="0 0 ${graph.width} ${graph.height}"><rect width="100%" height="100%" fill="#f4f7fb"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#657ca1"/></marker></defs><g font-family="Arial, Microsoft YaHei, sans-serif">${graph.edges.map((edge) => `<path d="${edge.path}" fill="none" stroke="#657ca1" stroke-width="1.5" marker-end="url(#arrow)"/><text x="${edge.x}" y="${edge.y}" font-size="11" fill="#2563eb">${escape(edge.type)}</text>`).join('')}${graph.nodes.map((node) => `<g><title>${escape(node.text)}</title><rect x="${node.x}" y="${node.y}" width="220" height="86" rx="10" fill="white" stroke="#c7d1e2"/><text x="${node.x + 14}" y="${node.y + 24}" fill="#2563eb" font-size="12" font-weight="bold">${escape(node.id)} · ${escape(node.label)}</text><text x="${node.x + 14}" y="${node.y + 47}" fill="#20375c" font-size="12">${escape(node.text.slice(0, 15))}</text><text x="${node.x + 14}" y="${node.y + 66}" fill="#20375c" font-size="12">${escape(node.text.slice(15, 29))}${node.text.length > 29 ? '…' : ''}</text></g>`).join('')}</g></svg>`;
}
