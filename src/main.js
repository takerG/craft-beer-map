import './style.css';
import * as d3 from 'd3';

/* ============================================
   精酿啤酒风格地图 — 主应用 (Organic Force Layout)
   Craft Beer Style Map
   ============================================ */

const SUPER_GENRES = [
  { id: 'american',      name: '美国啤酒',       nameEn: 'American Beer',       categories: ['1','18','19','20','21','22'], color: '#D4A24A' },
  { id: 'international', name: '国际拉格',       nameEn: 'International Lager', categories: ['2'],                          color: '#8AAFC8' },
  { id: 'czech',         name: '捷克拉格',       nameEn: 'Czech Lager',         categories: ['3'],                          color: '#5EAD5E' },
  { id: 'german',        name: '德国啤酒',       nameEn: 'German Beer',         categories: ['4','5','6','7','8','9'],       color: '#C87533' },
  { id: 'wheat',         name: '小麦啤酒',       nameEn: 'Wheat Beer',          categories: ['10'],                         color: '#D8B840' },
  { id: 'british',       name: '英国与爱尔兰',   nameEn: 'British & Irish',     categories: ['11','12','13','14','15','16','17'], color: '#C44A2A' },
  { id: 'belgian',       name: '比利时与酸味',   nameEn: 'Belgian & Sour',      categories: ['23','24','25','26'],           color: '#9B4EC8' },
  { id: 'specialty',     name: '特种啤酒',       nameEn: 'Specialty Beer',      categories: ['27','28','29','30','31','32','33','34'], color: '#3A8FB7' },
];

const state = {
  data: null,
  nodes: [],
  links: [],
  hulls: [],
  categoryMap: new Map(),
  nodeMap: new Map(),
  sgMap: new Map(),
  selectedNode: null,
  showLinks: true,
  simulation: null,
  mapWidth: 2000,
  mapHeight: 1400,
};

const dom = {};

async function init() {
  dom.svg = d3.select('#map');
  dom.tooltip = document.getElementById('tooltip');
  dom.detailPanel = document.getElementById('detailPanel');
  dom.panelContent = document.getElementById('panelContent');
  dom.searchInput = document.getElementById('searchInput');
  dom.searchResults = document.getElementById('searchResults');
  dom.superNav = document.getElementById('superNav');
  dom.mapContainer = document.getElementById('mapContainer');

  SUPER_GENRES.forEach(sg => {
    sg.categories.forEach(catId => state.sgMap.set(catId, sg));
  });

  try {
    const resp = await fetch(import.meta.env.BASE_URL + 'data.json');
    state.data = await resp.json();
  } catch {
    dom.panelContent.innerHTML = '<div class="panel-placeholder"><h2>数据加载失败</h2></div>';
    return;
  }

  (state.data.categories || []).forEach(c => state.categoryMap.set(c.id, c));

  setupData();
  setupSVG();
  runSimulation();
  
  setupZoom();
  setupSearch();
  setupSuperNav();
  setupPanelControls();
  setupToolbar();
}

function setupData() {
  const { styles = [], relations = [] } = state.data;
  
  // 1. Setup Nodes
  state.nodes = styles.map(s => {
    const sg = state.sgMap.get(s.category);
    return {
      ...s,
      sgId: sg ? sg.id : 'unknown',
      sgColor: sg ? sg.color : '#888',
      radius: s.key ? 30 : 20, // Keep logical radius for collision
    };
  });
  
  state.nodes.forEach(n => {
    state.nodeMap.set(n.id, n);
    state.nodeMap.set(n.code, n);
  });

  // 2. Setup Links
  const seen = new Set();
  state.links = relations.filter(l => {
    const src = state.nodeMap.get(l.source);
    const tgt = state.nodeMap.get(l.target);
    if (!src || !tgt) return false;
    const key = `${l.source}-${l.target}-${l.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(l => ({
    source: l.source,
    target: l.target,
    type: l.type
  }));

  // Define focal points for Super Genres (Archipelagos layout)
  const W = state.mapWidth;
  const H = state.mapHeight;
  const focalPoints = {
    'american':      { x: W * 0.2,  y: H * 0.4 },
    'international': { x: W * 0.35, y: H * 0.25 },
    'czech':         { x: W * 0.5,  y: H * 0.3 },
    'german':        { x: W * 0.65, y: H * 0.4 },
    'wheat':         { x: W * 0.65, y: H * 0.6 },
    'british':       { x: W * 0.4,  y: H * 0.65 },
    'belgian':       { x: W * 0.8,  y: H * 0.6 },
    'specialty':     { x: W * 0.5,  y: H * 0.8 },
  };

  // Assign initial positions and focal targets
  state.nodes.forEach(n => {
    const fp = focalPoints[n.sgId] || { x: W/2, y: H/2 };
    // Randomize initial placement near focus
    n.x = fp.x + (Math.random() - 0.5) * 400;
    n.y = fp.y + (Math.random() - 0.5) * 400;
    n.fx_target = fp.x;
    n.fy_target = fp.y;
  });
}

function setupSVG() {
  const svg = dom.svg;
  
  const defs = svg.append('defs');
  
  // Blurred Hull filter
  const hullFilter = defs.append('filter').attr('id', 'hullBlur')
    .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  hullFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '40');

  // Arrowhead marker
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 0 10 7')
    .attr('refX', '8').attr('refY', '3.5')
    .attr('markerWidth', '6').attr('markerHeight', '4')
    .attr('orient', 'auto')
    .append('polygon')
    .attr('points', '0 0, 10 3.5, 0 7')
    .attr('class', 'link-arrow');

  svg.append('g').attr('class', 'hull-layer');
  svg.append('g').attr('class', 'link-layer');
  svg.append('g').attr('class', 'node-layer');
}

function runSimulation() {
  // Convert link sources/targets to object references for d3
  const simLinks = state.links.map(d => Object.create(d));
  // Change identifiers to object refs
  simLinks.forEach(l => {
    l.source = state.nodeMap.get(l.source);
    l.target = state.nodeMap.get(l.target);
  });

  state.simulation = d3.forceSimulation(state.nodes)
    // Link force: pull related nodes together
    .force('link', d3.forceLink(simLinks).id(d => d.id).distance(80).strength(0.4))
    // Collision: prevent nodes overlapping
    .force('collide', d3.forceCollide().radius(d => d.radius + 20).iterations(3))
    // Custom attractors to pull into Super Genre groups
    .force('x', d3.forceX(d => d.fx_target).strength(0.12))
    .force('y', d3.forceY(d => d.fy_target).strength(0.12))
    // Manybody: push nodes apart generally
    .force('charge', d3.forceManyBody().strength(-300))
    // Friction
    .velocityDecay(0.4);

  // We don't render every tick for performance, just wait until it settles mostly
  // or render every few ticks. Let's render on every tick to see it form
  let ticks = 0;
  state.simulation.on('tick', () => {
    ticks++;
    if (ticks % 2 === 0) { // Slight optimization
      updateHulls();
      updateLinks(simLinks);
      updateNodes();
    }
  });

  // Render structure once initially
  createDOMStructure(simLinks);

  // Hide loader after a short delay (let the simulation settle a bit)
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1200);
}

function createDOMStructure(simLinks) {
  // Hulls
  const hullLayer = dom.svg.select('.hull-layer');
  hullLayer.selectAll('g.sg-group')
    .data(SUPER_GENRES)
    .join('g')
    .attr('class', 'sg-group')
    .attr('id', d => `sg-group-${d.id}`)
    .call(g => {
      g.append('path')
       .attr('class', 'sg-hull')
       .attr('fill', d => d.color)
       .style('filter', 'url(#hullBlur)');
       
      g.append('text')
       .attr('class', 'sg-hull-label')
       .text(d => d.name)
       .attr('fill', d => d.color);
    });

  // Links
  const linkLayer = dom.svg.select('.link-layer');
  linkLayer.selectAll('path.relation-link')
    .data(simLinks)
    .join('path')
    .attr('class', 'relation-link')
    .attr('data-type', d => d.type || 'related')
    .attr('marker-end', d => 
      (d.type === 'influenced_by' || d.type === 'influenced') ? 'url(#arrowhead)' : null
    );

  // Nodes (Typography only)
  const nodeLayer = dom.svg.select('.node-layer');
  const nodeGroups = nodeLayer.selectAll('g.node')
    .data(state.nodes, d => d.id)
    .join('g')
    .attr('class', d => `node id-${d.id}`);

  nodeGroups.append('circle')
    .attr('class', 'node-dot')
    .attr('r', 2)
    .attr('fill', d => d.sgColor)
    .attr('cy', -8);

  nodeGroups.append('text')
    .attr('class', 'node-zh')
    .text(d => d.name_zh);

  nodeGroups.append('text')
    .attr('class', 'node-en')
    .attr('y', 14)
    .text(d => d.name_en);

  // Events
  nodeGroups
    .on('mouseenter', (event, d) => {
      showTooltip(event, d);
      highlightRelated(d);
    })
    .on('mouseleave', () => {
      hideTooltip();
      if (!state.selectedNode) clearHighlight();
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      selectNode(d);
    });
}

function updateNodes() {
  dom.svg.select('.node-layer').selectAll('g.node')
    .attr('transform', d => `translate(${d.x},${d.y})`);
}

function updateLinks(simLinks) {
  dom.svg.select('.link-layer').selectAll('path.relation-link')
    .attr('d', d => {
      // Small offset so links don't cross exact center of text
      return bezierPath(d.source.x, d.source.y + 4, d.target.x, d.target.y + 4);
    });
}

function updateHulls() {
  const hullLayer = dom.svg.select('.hull-layer');
  const curve = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));

  SUPER_GENRES.forEach(sg => {
    const nodes = state.nodes.filter(n => n.sgId === sg.id);
    const sgGroup = hullLayer.select(`#sg-group-${sg.id}`);
    
    if (nodes.length === 0) {
      sgGroup.select('path').attr('d', '');
      return;
    }

    const pad = 60;
    const points = [];
    
    // Add artificial points around each node to ensure we always have >= 3 points
    // for the hull, even for a single node, to form a nice circular blob.
    nodes.forEach(n => {
      points.push([n.x, n.y - pad]);
      points.push([n.x + pad * 0.866, n.y - pad * 0.5]);
      points.push([n.x + pad * 0.866, n.y + pad * 0.5]);
      points.push([n.x, n.y + pad]);
      points.push([n.x - pad * 0.866, n.y + pad * 0.5]);
      points.push([n.x - pad * 0.866, n.y - pad * 0.5]);
    });

    const hull = d3.polygonHull(points);
    if (hull) {
      sgGroup.select('path').attr('d', curve(hull));
      
      const cx = d3.mean(hull, p => p[0]);
      const cy = d3.mean(hull, p => p[1]);
      sgGroup.select('.sg-hull-label')
        .attr('x', cx).attr('y', cy);
    }
  });
}

function bezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = Math.abs(dx) * 0.4;
  const cy = Math.abs(dy) * 0.15;
  return `M${x1},${y1} C${x1 + cx},${y1 + cy} ${x2 - cx},${y2 - cy} ${x2},${y2}`;
}

// ─── Interaction & UI ───

function setupZoom() {
  const container = dom.svg.select('.hull-layer').node().parentNode;
  const allLayers = dom.svg.selectAll('.hull-layer, .link-layer, .node-layer');

  const wrapper = dom.svg.append('g').attr('class', 'zoom-wrapper');
  allLayers.each(function () { wrapper.node().appendChild(this); });

  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      wrapper.attr('transform', event.transform);
    });

  dom.svg.call(zoom);
  dom.zoom = zoom;
  dom.zoomWrapper = wrapper;

  // Initial map center
  setTimeout(() => {
    const mapRect = dom.mapContainer.getBoundingClientRect();
    const scale = 0.6; // zoomed out slightly
    const tx = mapRect.width / 2 - (state.mapWidth / 2) * scale;
    const ty = mapRect.height / 2 - (state.mapHeight / 2) * scale;
    const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale);
    dom.svg.call(zoom.transform, initialTransform);
    
    document.getElementById('resetView').addEventListener('click', () => {
      dom.svg.transition().duration(600).call(zoom.transform, initialTransform);
    });
  }, 100);

  document.getElementById('zoomIn').addEventListener('click', () => {
    dom.svg.transition().duration(200).call(zoom.scaleBy, 1.4);
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    dom.svg.transition().duration(200).call(zoom.scaleBy, 0.7);
  });

  dom.svg.on('click', () => { deselectNode(); });
}

function selectNode(node) {
  state.selectedNode = node;
  highlightRelated(node);
  showDetails(node);
  dom.detailPanel.classList.add('open');
  dom.svg.selectAll('g.node').classed('focused', d => d.id === node.id);
}

function deselectNode() {
  state.selectedNode = null;
  clearHighlight();
  dom.detailPanel.classList.remove('open');
  dom.svg.selectAll('g.node').classed('focused', false);
}

function highlightRelated(node) {
  const relatedIds = new Set([node.id, node.code]);
  state.links.forEach(l => {
    const srcId = typeof l.source === 'object' ? l.source.id : l.source;
    const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
    if (srcId === node.id || srcId === node.code) relatedIds.add(tgtId);
    if (tgtId === node.id || tgtId === node.code) relatedIds.add(srcId);
  });

  // Dim unrelated nodes and hulls
  dom.svg.selectAll('g.node').classed('dimmed', d => !relatedIds.has(d.id) && !relatedIds.has(d.code));
  dom.svg.selectAll('g.node').classed('highlighted', d => relatedIds.has(d.id) || relatedIds.has(d.code));
  
  dom.svg.selectAll('g.sg-group').classed('dimmed', d => d.id !== node.sgId);

  if (state.showLinks) {
    dom.svg.selectAll('.relation-link')
      .classed('visible', d => {
        const srcId = typeof d.source === 'object' ? d.source.id : d.source;
        const tgtId = typeof d.target === 'object' ? d.target.id : d.target;
        return srcId === node.id || srcId === node.code || tgtId === node.id || tgtId === node.code;
      });
  }
}

function clearHighlight() {
  dom.svg.selectAll('g.node').classed('dimmed', false).classed('highlighted', false);
  dom.svg.selectAll('g.sg-group').classed('dimmed', false);
  dom.svg.selectAll('.relation-link').classed('visible', false);
}

// ─── Details, Search, Tools (identical logic) ───

function showDetails(node) {
  const sg = state.sgMap.get(node.category);
  const cat = state.categoryMap.get(node.category);
  const sgColor = sg?.color || '#888';
  const details = node.details || {};
  const stats = parseVitalStats(details.vital_statistics);
  const tags = details.tags ? details.tags.split(/[、，,]/).map(t => t.trim()).filter(Boolean) : [];
  const examples = details.commercial_examples ? details.commercial_examples.split(/[,，]/).map(e => e.trim()).filter(Boolean) : [];

  const relatedStyles = [];
  state.links.forEach(l => {
    let targetId = null;
    let type = l.type;
    const srcId = typeof l.source === 'object' ? l.source.id : l.source;
    const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
    
    if (srcId === node.id || srcId === node.code) targetId = tgtId;
    else if (tgtId === node.id || tgtId === node.code) { targetId = srcId; type = reverseRelType(l.type); }
    
    if (targetId) {
      const target = state.nodeMap.get(targetId);
      if (target && !relatedStyles.find(r => r.node.id === target.id && r.type === type)) {
        relatedStyles.push({ node: target, type });
      }
    }
  });

  const sectionDefs = [
    { key: 'overall_impression', label: '整体印象' },
    { key: 'aroma', label: '香气' },
    { key: 'appearance', label: '外观' },
    { key: 'flavor', label: '风味' },
    { key: 'mouthfeel', label: '口感' },
    { key: 'history', label: '历史' },
    { key: 'ingredients', label: '特色成分' },
    { key: 'comments', label: '备注' },
    { key: 'comparison', label: '风格对比' },
  ];

  const sectionsHtml = sectionDefs.filter(s => details[s.key]).map(s => `
      <div class="detail-section" style="--section-color: ${sgColor}">
        <div class="detail-section-title">${s.label}</div>
        <div class="detail-section-body">${details[s.key]}</div>
      </div>
    `).join('');

  const statsHtml = stats ? `<div class="vital-stats">${Object.entries(stats).map(([k, v]) => `<div class="stat-card"><div class="stat-label">${k}</div><div class="stat-value">${v}</div></div>`).join('')}</div>` : '';
  const tagsHtml = tags.length ? `<div class="detail-section"><div class="detail-section-title" style="--section-color: ${sgColor}">标签</div><div class="tag-list">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div></div>` : '';
  const examplesHtml = examples.length ? `<div class="detail-section"><div class="detail-section-title" style="--section-color: ${sgColor}">商业案例</div><div class="examples-list">${examples.map(e => `<span class="example">${e}</span>`).join('')}</div></div>` : '';
  const relatedHtml = relatedStyles.length ? `<div class="related-styles"><div class="detail-section-title" style="--section-color: ${sgColor}">关联风格</div><div class="related-list">${relatedStyles.map(r => `<div class="related-item" data-id="${r.node.id}"><span class="related-dot" style="background:${r.node.sgColor}"></span><span>${r.node.name_zh || r.node.name_en}</span><span class="related-type">${relTypeLabel(r.type)}</span></div>`).join('')}</div></div>` : '';

  dom.panelContent.innerHTML = `
    <div class="style-header">
      <div class="style-badge" style="border-color: ${sgColor}40; color: ${sgColor}; background: ${sgColor}15">
        <span class="sg-dot" style="background: ${sgColor}"></span>
        ${sg?.name || ''} · ${cat?.name_zh || ''}
      </div>
      <div class="style-name-zh">${node.name_zh || node.name_en}</div>
      <div class="style-name-en">${node.name_en || ''}</div>
      <div class="style-code">BJCP ${node.code || node.id}</div>
    </div>
    ${statsHtml}${sectionsHtml}${tagsHtml}${examplesHtml}${relatedHtml}
  `;

  dom.panelContent.querySelectorAll('.related-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = state.nodeMap.get(item.dataset.id);
      if (target) { navigateToNode(target); selectNode(target); }
    });
  });
}

function navigateToNode(node) {
  if (!dom.zoom) return;
  const mapRect = dom.mapContainer.getBoundingClientRect();
  const scale = 1.8;
  const tx = mapRect.width / 2 - node.x * scale;
  const ty = mapRect.height / 2 - node.y * scale;
  dom.svg.transition().duration(800)
    .call(dom.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function setupSearch() {
  const i = dom.searchInput;
  const r = dom.searchResults;
  i.addEventListener('input', () => {
    const q = i.value.trim().toLowerCase();
    if (!q) { r.classList.remove('open'); r.innerHTML = ''; clearHighlight(); return; }
    const m = state.nodes.filter(n => (n.name_zh||'').toLowerCase().includes(q) || (n.name_en||'').toLowerCase().includes(q) || (n.code||n.id||'').toLowerCase().includes(q)).slice(0, 12);
    if (!m.length) { r.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">未找到匹配结果</div>'; }
    else { r.innerHTML = m.map(n => `<div class="search-result-item" data-id="${n.id}"><span class="search-result-dot" style="background:${n.sgColor}"></span><span><span class="search-result-name">${n.name_zh || n.name_en}</span><span class="search-result-en">${n.name_en ? `(${n.name_en})` : ''}</span></span></div>`).join(''); }
    r.classList.add('open');
    const mid = new Set(m.map(x => x.id));
    dom.svg.selectAll('g.node').classed('dimmed', d => !mid.has(d.id));
    r.querySelectorAll('.search-result-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const n = state.nodeMap.get(el.dataset.id);
        if (n) { navigateToNode(n); selectNode(n); r.classList.remove('open'); i.value = ''; dom.svg.selectAll('g.node').classed('dimmed', false); }
      });
    });
  });
  i.addEventListener('blur', () => setTimeout(() => r.classList.remove('open'), 200));
}

function setupSuperNav() {
  SUPER_GENRES.forEach(sg => {
    const btn = document.createElement('button');
    btn.className = 'sg-pill'; btn.style.setProperty('--pill-color', sg.color);
    btn.innerHTML = `<span class="sg-dot" style="background:${sg.color}"></span>${sg.name}`;
    btn.addEventListener('click', () => {
      const nodes = state.nodes.filter(n => n.sgId === sg.id);
      if (!nodes.length) return;
      const x = d3.mean(nodes, n => n.x);
      const y = d3.mean(nodes, n => n.y);
      const mapRect = dom.mapContainer.getBoundingClientRect();
      const scale = 0.8;
      const tx = mapRect.width / 2 - x * scale;
      const ty = mapRect.height / 2 - y * scale;
      dom.svg.transition().duration(800).call(dom.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      dom.superNav.querySelectorAll('.sg-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    });
    dom.superNav.appendChild(btn);
  });
}

function setupPanelControls() { document.getElementById('panelClose').addEventListener('click', deselectNode); }
function setupToolbar() {
  document.getElementById('toggleLinks').addEventListener('click', function () {
    state.showLinks = !state.showLinks; this.classList.toggle('active', state.showLinks);
    if (!state.showLinks) dom.svg.selectAll('.relation-link').classed('visible', false);
    else if (state.selectedNode) highlightRelated(state.selectedNode);
  });
}

function showTooltip(e, node) {
  const tt = dom.tooltip;
  const desc = node.details?.overall_impression;
  const truncDesc = desc ? desc.substring(0, 80) + (desc.length > 80 ? '...' : '') : '';
  tt.innerHTML = `<div class="tooltip-name">${node.name_zh || node.name_en}</div><div class="tooltip-en">${node.code} · ${node.name_en || ''}</div>${truncDesc ? `<div class="tooltip-desc">${truncDesc}</div>` : ''}`;
  tt.classList.add('visible');
  const r = tt.getBoundingClientRect();
  let l = e.clientX + 16; let t = e.clientY + 16;
  if (l + r.width > window.innerWidth) l = e.clientX - r.width - 16;
  if (t + r.height > window.innerHeight) t = e.clientY - r.height - 16;
  tt.style.left = `${l}px`; tt.style.top = `${t}px`;
}
function hideTooltip() { dom.tooltip.classList.remove('visible'); }

function parseVitalStats(s) {
  if (!s) return null; const o = {};
  [{k:'OG',r:/OG[：:]\s*([\d.]+-[\d.]+)/i},{k:'FG',r:/FG[：:]\s*([\d.]+-[\d.]+)/i},{k:'IBU',r:/IBU[sS]?[：:]\s*([\d.]+-[\d.]+)/i},{k:'SRM',r:/SRM[：:]\s*([\d.]+-[\d.]+)/i},{k:'ABV',r:/ABV[：:]\s*([\d.]+-[\d.]+%?)/i}]
    .forEach(({k,r}) => { const m = s.match(r); if (m) o[k] = m[1]; });
  return Object.keys(o).length ? o : null;
}
function reverseRelType(t) { return t === 'influenced_by' ? 'influenced' : t === 'influenced' ? 'influenced_by' : t; }
function relTypeLabel(t) { return {related: '相关', compared_to: '对比', influenced_by: '受影响', influenced: '影响了'}[t] || t; }

init();
