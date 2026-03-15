import './style.css';
import * as d3 from 'd3';

const SUPER_GENRES = [
  { id: 'american', name: '美国啤酒', nameEn: 'American Beer', categories: ['1', '18', '19', '20', '21', '22'], color: '#D4A24A' },
  { id: 'international', name: '国际拉格', nameEn: 'International Lager', categories: ['2'], color: '#8AAFC8' },
  { id: 'czech', name: '捷克拉格', nameEn: 'Czech Lager', categories: ['3'], color: '#5EAD5E' },
  { id: 'german', name: '德国啤酒', nameEn: 'German Beer', categories: ['4', '5', '6', '7', '8', '9'], color: '#C87533' },
  { id: 'wheat', name: '小麦啤酒', nameEn: 'Wheat Beer', categories: ['10'], color: '#D8B840' },
  { id: 'british', name: '英伦与爱尔兰', nameEn: 'British & Irish', categories: ['11', '12', '13', '14', '15', '16', '17'], color: '#C44A2A' },
  { id: 'belgian', name: '比利时与酸啤', nameEn: 'Belgian & Sour', categories: ['23', '24', '25', '26'], color: '#9B4EC8' },
  { id: 'specialty', name: '特色啤酒', nameEn: 'Specialty Beer', categories: ['27', '28', '29', '30', '31', '32', '33', '34'], color: '#3A8FB7' },
];

const SECTION_LABELS = [
  { key: 'overall_impression', label: '整体印象' },
  { key: 'aroma', label: '香气' },
  { key: 'appearance', label: '外观' },
  { key: 'flavor', label: '风味' },
  { key: 'mouthfeel', label: '口感' },
  { key: 'history', label: '历史' },
  { key: 'ingredients', label: '原料' },
  { key: 'comments', label: '备注' },
  { key: 'comparison', label: '风格对比' },
];

const FOCAL_POINT_FACTORS = {
  american: [0.2, 0.4],
  international: [0.35, 0.25],
  czech: [0.5, 0.3],
  german: [0.65, 0.4],
  wheat: [0.65, 0.6],
  british: [0.4, 0.65],
  belgian: [0.8, 0.6],
  specialty: [0.5, 0.8],
};

const state = {
  data: null,
  nodes: [],
  links: [],
  categoryMap: new Map(),
  nodeMap: new Map(),
  sgMap: new Map(),
  nodesBySg: new Map(),
  relatedMap: new Map(),
  selectedNode: null,
  showLinks: true,
  simulation: null,
  mapWidth: 2600,
  mapHeight: 1800,
};

const dom = {};

init();

async function init() {
  cacheDom();
  indexSuperGenres();

  try {
    const response = await fetch(import.meta.env.BASE_URL + 'data.json');
    if (!response.ok) throw new Error(`Failed to load data: ${response.status}`);
    state.data = await response.json();
  } catch {
    showLoadError();
    return;
  }

  state.categoryMap.clear();
  (state.data.categories || []).forEach(category => state.categoryMap.set(category.id, category));

  setupData();
  setupSvg();
  runSimulation();
  setupZoom();
  setupSearch();
  setupSuperNav();
  setupPanelControls();
  setupToolbar();
}

function cacheDom() {
  dom.svg = d3.select('#map');
  dom.loader = document.getElementById('loader');
  dom.tooltip = document.getElementById('tooltip');
  dom.detailPanel = document.getElementById('detailPanel');
  dom.panelContent = document.getElementById('panelContent');
  dom.searchInput = document.getElementById('searchInput');
  dom.searchResults = document.getElementById('searchResults');
  dom.superNav = document.getElementById('superNav');
  dom.mapContainer = document.getElementById('mapContainer');
  dom.selections = {};
  dom.maps = {};
}

function indexSuperGenres() {
  state.sgMap.clear();
  SUPER_GENRES.forEach(superGenre => {
    superGenre.categories.forEach(categoryId => state.sgMap.set(categoryId, superGenre));
  });
}

function showLoadError() {
  dom.panelContent.innerHTML = `
    <div class="panel-placeholder">
      <h2>数据加载失败</h2>
      <p>请检查 public/data.json 是否存在且格式正确。</p>
    </div>
  `;
  hideLoader();
}

function hideLoader() {
  dom.loader?.classList.add('hidden');
}

function setupData() {
  const { styles = [], relations = [] } = state.data || {};

  state.nodeMap.clear();
  state.nodesBySg.clear();
  state.relatedMap.clear();

  state.nodes = styles.map(style => {
    const superGenre = state.sgMap.get(style.category);
    return {
      ...style,
      sgId: superGenre?.id || 'unknown',
      sgColor: superGenre?.color || '#888',
      radius: style.key ? 30 : 20,
      searchText: `${style.name_zh || ''} ${style.name_en || ''} ${style.code || style.id || ''}`.toLowerCase(),
    };
  });

  state.nodes.forEach(node => {
    state.nodeMap.set(node.id, node);
    if (node.code) state.nodeMap.set(node.code, node);

    if (!state.nodesBySg.has(node.sgId)) state.nodesBySg.set(node.sgId, []);
    state.nodesBySg.get(node.sgId).push(node);
    state.relatedMap.set(node.id, []);
  });

  const seenLinks = new Set();
  state.links = relations
    .filter(link => {
      const src = state.nodeMap.get(link.source);
      const tgt = state.nodeMap.get(link.target);
      if (!src || !tgt) return false;

      const key = `${link.source}-${link.target}-${link.type}`;
      if (seenLinks.has(key)) return false;
      seenLinks.add(key);
      return true;
    })
    .map(link => ({
      source: link.source,
      target: link.target,
      type: link.type || 'related',
    }));

  state.links.forEach(link => {
    const sourceNode = state.nodeMap.get(link.source);
    const targetNode = state.nodeMap.get(link.target);
    if (!sourceNode || !targetNode) return;

    state.relatedMap.get(sourceNode.id)?.push({ node: targetNode, type: link.type });
    state.relatedMap.get(targetNode.id)?.push({ node: sourceNode, type: reverseRelType(link.type) });
  });

  const focalPoints = Object.fromEntries(
    Object.entries(FOCAL_POINT_FACTORS).map(([id, [xFactor, yFactor]]) => [
      id,
      { x: state.mapWidth * xFactor, y: state.mapHeight * yFactor },
    ]),
  );

  state.nodes.forEach(node => {
    const target = focalPoints[node.sgId] || { x: state.mapWidth / 2, y: state.mapHeight / 2 };
    node.x = target.x + (Math.random() - 0.5) * 400;
    node.y = target.y + (Math.random() - 0.5) * 400;
    node.fx_target = target.x;
    node.fy_target = target.y;
  });
}

function setupSvg() {
  const defs = dom.svg.append('defs');

  const hullFilter = defs
    .append('filter')
    .attr('id', 'hullBlur')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%');

  hullFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '40');

  defs
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 0 10 7')
    .attr('refX', '8')
    .attr('refY', '3.5')
    .attr('markerWidth', '6')
    .attr('markerHeight', '4')
    .attr('orient', 'auto')
    .append('polygon')
    .attr('points', '0 0, 10 3.5, 0 7')
    .attr('class', 'link-arrow');

  dom.svg.append('g').attr('class', 'hull-layer');
  dom.svg.append('g').attr('class', 'link-layer');
  dom.svg.append('g').attr('class', 'node-layer');
}

function runSimulation() {
  const simLinks = state.links.map(link => ({
    ...link,
    source: state.nodeMap.get(link.source),
    target: state.nodeMap.get(link.target),
  }));

  state.simulation = d3
    .forceSimulation(state.nodes)
    .force('link', d3.forceLink(simLinks).id(d => d.id).distance(100).strength(0.4))
    .force('collide', d3.forceCollide().radius(d => d.radius + 25).iterations(3))
    .force('x', d3.forceX(d => d.fx_target).strength(0.12))
    .force('y', d3.forceY(d => d.fy_target).strength(0.12))
    .force('charge', d3.forceManyBody().strength(-400))
    .alphaMin(0.02)
    .velocityDecay(0.4);

  let ticks = 0;
  state.simulation.on('tick', () => {
    ticks += 1;
    if (ticks % 2 !== 0) return;
    updateHulls();
    updateLinks(simLinks);
    updateNodes();
  });

  state.simulation.on('end', () => {
    updateHulls();
    updateLinks(simLinks);
    updateNodes();
  });

  createDomStructure(simLinks);

  setTimeout(() => {
    hideLoader();
  }, 1200);
}

function createDomStructure(simLinks) {
  const hullLayer = dom.svg.select('.hull-layer');
  hullLayer
    .selectAll('g.sg-group')
    .data(SUPER_GENRES)
    .join('g')
    .attr('class', 'sg-group')
    .attr('id', d => `sg-group-${d.id}`)
    .call(group => {
      group
        .append('path')
        .attr('class', 'sg-hull')
        .attr('fill', d => d.color)
        .style('filter', 'url(#hullBlur)');

      group
        .append('text')
        .attr('class', 'sg-hull-label')
        .attr('fill', d => d.color)
        .text(d => d.name);
    });

  dom.svg
    .select('.link-layer')
    .selectAll('path.relation-link')
    .data(simLinks)
    .join('path')
    .attr('class', 'relation-link')
    .attr('data-type', d => d.type)
    .attr('marker-end', d => (d.type === 'influenced_by' || d.type === 'influenced' ? 'url(#arrowhead)' : null));

  const nodeGroups = dom.svg
    .select('.node-layer')
    .selectAll('g.node')
    .data(state.nodes, d => d.id)
    .join('g')
    .attr('class', d => `node id-${d.id}`);

  dom.selections.hullGroups = hullLayer.selectAll('g.sg-group');
  dom.selections.links = dom.svg.select('.link-layer').selectAll('path.relation-link');
  dom.selections.nodes = nodeGroups;
  dom.maps.hullGroupById = new Map(SUPER_GENRES.map(superGenre => [superGenre.id, dom.selections.hullGroups.filter(d => d.id === superGenre.id)]));

  nodeGroups.append('circle').attr('class', 'node-dot').attr('r', 2).attr('fill', d => d.sgColor).attr('cy', -8);
  nodeGroups.append('text').attr('class', 'node-zh').text(d => d.name_zh || d.name_en);
  nodeGroups.append('text').attr('class', 'node-en').attr('y', 14).text(d => d.name_en || '');

  nodeGroups
    .on('mouseenter', (event, node) => {
      showTooltip(event, node);
      highlightRelated(node);
    })
    .on('mouseleave', () => {
      hideTooltip();
      if (!state.selectedNode) clearHighlight();
    })
    .on('click', (event, node) => {
      event.stopPropagation();
      selectNode(node);
    });
}

function updateNodes() {
  dom.selections.nodes?.attr('transform', d => `translate(${d.x},${d.y})`);
}

function updateLinks(simLinks) {
  dom.selections.links?.attr('d', d => bezierPath(d.source.x, d.source.y + 4, d.target.x, d.target.y + 4));
}

function updateHulls() {
  const curve = d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5));

  SUPER_GENRES.forEach(superGenre => {
    const nodes = state.nodesBySg.get(superGenre.id) || [];
    const group = dom.maps.hullGroupById?.get(superGenre.id);

    if (!nodes.length) {
      group.select('path').attr('d', '');
      return;
    }

    const points = [];
    const padding = 60;

    nodes.forEach(node => {
      points.push([node.x, node.y - padding]);
      points.push([node.x + padding * 0.866, node.y - padding * 0.5]);
      points.push([node.x + padding * 0.866, node.y + padding * 0.5]);
      points.push([node.x, node.y + padding]);
      points.push([node.x - padding * 0.866, node.y + padding * 0.5]);
      points.push([node.x - padding * 0.866, node.y - padding * 0.5]);
    });

    const hull = d3.polygonHull(points);
    if (!hull) return;

    group.select('path').attr('d', curve(hull));
    group.select('.sg-hull-label').attr('x', d3.mean(hull, p => p[0])).attr('y', d3.mean(hull, p => p[1]));
  });
}

function setupZoom() {
  const allLayers = dom.svg.selectAll('.hull-layer, .link-layer, .node-layer');
  const wrapper = dom.svg.append('g').attr('class', 'zoom-wrapper');
  allLayers.each(function moveLayer() {
    wrapper.node().appendChild(this);
  });

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', event => {
      wrapper.attr('transform', event.transform);
    });

  dom.svg.call(zoom);
  dom.zoom = zoom;

  setTimeout(() => {
    const mapRect = dom.mapContainer.getBoundingClientRect();
    const scale = 0.6;
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

  dom.svg.on('click', () => {
    deselectNode();
  });
}

function setupSearch() {
  const input = dom.searchInput;
  const results = dom.searchResults;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      results.classList.remove('open');
      results.innerHTML = '';
      clearHighlight();
      return;
    }

    const matches = state.nodes.filter(node => node.searchText.includes(query)).slice(0, 12);

    if (!matches.length) {
      results.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">未找到匹配结果</div>';
    } else {
      results.innerHTML = matches
        .map(
          node => `
            <div class="search-result-item" data-id="${node.id}">
              <span class="search-result-dot" style="background:${node.sgColor}"></span>
              <span>
                <span class="search-result-name">${node.name_zh || node.name_en}</span>
                <span class="search-result-en">${node.name_en ? `(${node.name_en})` : ''}</span>
              </span>
            </div>
          `,
        )
        .join('');
    }

    results.classList.add('open');
    const visibleIds = new Set(matches.map(node => node.id));
    dom.selections.nodes?.classed('dimmed', d => !visibleIds.has(d.id));

    results.querySelectorAll('.search-result-item[data-id]').forEach(element => {
      element.addEventListener('click', () => {
        const targetNode = state.nodeMap.get(element.dataset.id);
        if (!targetNode) return;

        navigateToNode(targetNode);
        selectNode(targetNode);
        results.classList.remove('open');
        input.value = '';
        dom.selections.nodes?.classed('dimmed', false);
      });
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => results.classList.remove('open'), 200);
  });
}

function setupSuperNav() {
  SUPER_GENRES.forEach(superGenre => {
    const button = document.createElement('button');
    button.className = 'sg-pill';
    button.style.setProperty('--pill-color', superGenre.color);
    button.innerHTML = `<span class="sg-dot" style="background:${superGenre.color}"></span>${superGenre.name}`;

    button.addEventListener('click', () => {
      const nodes = state.nodesBySg.get(superGenre.id) || [];
      if (!nodes.length) return;

      const x = d3.mean(nodes, node => node.x);
      const y = d3.mean(nodes, node => node.y);
      const mapRect = dom.mapContainer.getBoundingClientRect();
      const scale = 0.8;
      const tx = mapRect.width / 2 - x * scale;
      const ty = mapRect.height / 2 - y * scale;

      dom.svg.transition().duration(800).call(dom.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      dom.superNav.querySelectorAll('.sg-pill').forEach(pill => pill.classList.remove('active'));
      button.classList.add('active');
    });

    dom.superNav.appendChild(button);
  });
}

function setupPanelControls() {
  document.getElementById('panelClose').addEventListener('click', deselectNode);
}

function setupToolbar() {
  document.getElementById('toggleLinks').addEventListener('click', function toggleLinks() {
    state.showLinks = !state.showLinks;
    this.classList.toggle('active', state.showLinks);

    if (!state.showLinks) {
      dom.selections.links?.classed('visible', false);
      return;
    }

    if (state.selectedNode) highlightRelated(state.selectedNode);
  });
}

function selectNode(node) {
  state.selectedNode = node;
  highlightRelated(node);
  showDetails(node);
  dom.detailPanel.classList.add('open');
  dom.selections.nodes?.classed('focused', d => d.id === node.id);
}

function deselectNode() {
  state.selectedNode = null;
  clearHighlight();
  dom.detailPanel.classList.remove('open');
  dom.selections.nodes?.classed('focused', false);
}

function highlightRelated(node) {
  const relatedItems = state.relatedMap.get(node.id) || [];
  const relatedIds = new Set([node.id, node.code, ...relatedItems.map(item => item.node.id)]);

  dom.selections.nodes?.classed('dimmed', d => !relatedIds.has(d.id) && !relatedIds.has(d.code));
  dom.selections.nodes?.classed('highlighted', d => relatedIds.has(d.id) || relatedIds.has(d.code));
  dom.selections.hullGroups?.classed('dimmed', d => d.id !== node.sgId);

  if (!state.showLinks) return;

  dom.selections.links?.classed('visible', d => {
    const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
    const targetId = typeof d.target === 'object' ? d.target.id : d.target;
    return sourceId === node.id || targetId === node.id;
  });
}

function clearHighlight() {
  dom.selections.nodes?.classed('dimmed', false).classed('highlighted', false);
  dom.selections.hullGroups?.classed('dimmed', false);
  dom.selections.links?.classed('visible', false);
}

function showDetails(node) {
  const superGenre = state.sgMap.get(node.category);
  const category = state.categoryMap.get(node.category);
  const details = node.details || {};
  const color = superGenre?.color || '#888';
  const stats = parseVitalStats(details.vital_statistics || details.stats);
  const tags = splitList(details.tags);
  const examples = splitList(details.commercial_examples);
  const relatedStyles = dedupeRelatedStyles(state.relatedMap.get(node.id) || []);
  const styleCode = node.code || node.id || '';

  const sectionsHtml = SECTION_LABELS.filter(section => details[section.key])
    .map(
      section => `
        <div class="detail-section" style="--section-color: ${color}">
          <div class="detail-section-title">${section.label}</div>
          <div class="detail-section-body">${details[section.key]}</div>
        </div>
      `,
    )
    .join('');

  const statsHtml = stats
    ? `<div class="vital-stats">${Object.entries(stats)
        .map(
          ([key, value]) => `
            <div class="stat-card">
              <div class="stat-label">${key}</div>
              <div class="stat-value">${value}</div>
            </div>
          `,
        )
        .join('')}</div>`
    : '';

  const tagsHtml = tags.length
    ? `
      <div class="detail-section">
        <div class="detail-section-title" style="--section-color: ${color}">标签</div>
        <div class="tag-list">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      </div>
    `
    : '';

  const examplesHtml = examples.length
    ? `
      <div class="detail-section">
        <div class="detail-section-title" style="--section-color: ${color}">商业案例</div>
        <div class="examples-list">${examples.map(example => `<span class="example">${example}</span>`).join('')}</div>
      </div>
    `
    : '';

  const relatedHtml = relatedStyles.length
    ? `
      <div class="related-styles">
        <div class="detail-section-title" style="--section-color: ${color}">关联风格</div>
        <div class="related-list">
          ${relatedStyles
            .map(
              item => `
                <div class="related-item" data-id="${item.node.id}">
                  <span class="related-dot" style="background:${item.node.sgColor}"></span>
                  <span>${item.node.name_zh || item.node.name_en}</span>
                  <span class="related-type">${relTypeLabel(item.type)}</span>
                </div>
              `,
            )
            .join('')}
        </div>
      </div>
    `
    : '';

  dom.panelContent.innerHTML = `
    <div class="style-header">
      <div class="style-badge" style="border-color: ${color}40; color: ${color}; background: ${color}15">
        <span class="sg-dot" style="background:${color}"></span>
        ${superGenre?.name || ''} · ${category?.name_zh || ''}
      </div>
      <div class="style-name-zh">${node.name_zh || node.name_en}</div>
      <div class="style-name-en">${node.name_en || ''}</div>
      <div class="style-code">BJCP ${styleCode}</div>
    </div>
    ${statsHtml}
    ${sectionsHtml}
    ${tagsHtml}
    ${examplesHtml}
    ${relatedHtml}
  `;

  dom.panelContent.querySelectorAll('.related-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetNode = state.nodeMap.get(item.dataset.id);
      if (!targetNode) return;
      navigateToNode(targetNode);
      selectNode(targetNode);
    });
  });
}

function navigateToNode(node) {
  if (!dom.zoom) return;

  const mapRect = dom.mapContainer.getBoundingClientRect();
  const scale = 1.8;
  const tx = mapRect.width / 2 - node.x * scale;
  const ty = mapRect.height / 2 - node.y * scale;

  dom.svg.transition().duration(800).call(dom.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function showTooltip(event, node) {
  const description = node.details?.overall_impression || '';
  const shortDescription = description.length > 80 ? `${description.slice(0, 80)}...` : description;

  dom.tooltip.innerHTML = `
    <div class="tooltip-name">${node.name_zh || node.name_en}</div>
    <div class="tooltip-en">${node.code} · ${node.name_en || ''}</div>
    ${shortDescription ? `<div class="tooltip-desc">${shortDescription}</div>` : ''}
  `;

  dom.tooltip.classList.add('visible');

  const rect = dom.tooltip.getBoundingClientRect();
  let left = event.clientX + 16;
  let top = event.clientY + 16;

  if (left + rect.width > window.innerWidth) left = event.clientX - rect.width - 16;
  if (top + rect.height > window.innerHeight) top = event.clientY - rect.height - 16;

  dom.tooltip.style.left = `${left}px`;
  dom.tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  dom.tooltip.classList.remove('visible');
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(/[、，,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseVitalStats(value) {
  if (!value) return null;

  const output = {};
  const matchers = [
    { key: 'OG', regex: /OG[：:]\s*([\d.]+-[\d.]+)/i },
    { key: 'FG', regex: /FG[：:]\s*([\d.]+-[\d.]+)/i },
    { key: 'IBU', regex: /IBU[sS]?[：:]\s*([\d.]+-[\d.]+)/i },
    { key: 'SRM', regex: /SRM[：:]\s*([\d.]+-[\d.]+)/i },
    { key: 'ABV', regex: /ABV[：:]\s*([\d.]+-[\d.]+%?)/i },
  ];

  matchers.forEach(({ key, regex }) => {
    const match = value.match(regex);
    if (match) output[key] = match[1];
  });

  return Object.keys(output).length ? output : null;
}

function dedupeRelatedStyles(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.node.id}-${item.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = Math.abs(dx) * 0.4;
  const cy = Math.abs(dy) * 0.15;
  return `M${x1},${y1} C${x1 + cx},${y1 + cy} ${x2 - cx},${y2 - cy} ${x2},${y2}`;
}

function reverseRelType(type) {
  if (type === 'influenced_by') return 'influenced';
  if (type === 'influenced') return 'influenced_by';
  return type;
}

function relTypeLabel(type) {
  return {
    related: '相关',
    compared_to: '对比',
    influenced_by: '受影响',
    influenced: '影响了',
  }[type] || type;
}
