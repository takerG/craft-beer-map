import './style.css';
import * as d3 from 'd3';
import { buildWallBoards, getOverviewFocusPoint, layoutBoardCategories, layoutCategoryStyles } from './wall-layout.js';

const MAP_WIDTH = 2200;
const MAP_HEIGHT = 1440;
const INITIAL_SCALE = 0.74;
const MID_SCALE = 1.1;
const STYLE_SCALE = 1.8;
const DETAIL_SCALE = 1.95;

const ZOOM_LEVELS = {
  overview: 0.9,
  categories: 1.45,
  styles: 2.1,
};

const SUPER_GENRES = [
  { id: 'american', name: '美国啤酒', nameEn: 'American', categories: ['1', '18', '19', '20', '21', '22'], color: '#ffb24c', x: 500, y: 500, rx: 300, ry: 190 },
  { id: 'international', name: '国际拉格', nameEn: 'International', categories: ['2'], color: '#7db8ff', x: 910, y: 280, rx: 170, ry: 110 },
  { id: 'czech', name: '捷克拉格', nameEn: 'Czech', categories: ['3'], color: '#58c886', x: 1260, y: 270, rx: 170, ry: 110 },
  { id: 'german', name: '德奥与德国系', nameEn: 'Germanic', categories: ['4', '5', '6', '7', '8', '9', '10'], color: '#ff7a3d', x: 1580, y: 500, rx: 330, ry: 220 },
  { id: 'british', name: '英伦与爱尔兰', nameEn: 'British & Irish', categories: ['11', '12', '13', '14', '15', '16', '17'], color: '#ff5a43', x: 620, y: 930, rx: 340, ry: 220 },
  { id: 'belgian', name: '比利时与酸啤', nameEn: 'Belgian & Sour', categories: ['23', '24', '25', '26'], color: '#a86dff', x: 1420, y: 860, rx: 280, ry: 180 },
  { id: 'specialty', name: '特色与实验啤酒', nameEn: 'Specialty', categories: ['27', '28', '29', '30', '31', '32', '33', '34'], color: '#53d4da', x: 1820, y: 1030, rx: 300, ry: 220 },
];

const DETAIL_SECTIONS = [
  ['overall_impression', '整体印象'],
  ['aroma', '香气'],
  ['appearance', '外观'],
  ['flavor', '风味'],
  ['mouthfeel', '口感'],
  ['history', '历史'],
  ['ingredients', '特色成分'],
  ['comparison', '风格对比'],
  ['comments', '注释'],
];

const state = {
  data: null,
  categories: [],
  styles: [],
  relations: [],
  categoryMap: new Map(),
  styleMap: new Map(),
  styleByCategory: new Map(),
  styleBySuper: new Map(),
  relatedByStyle: new Map(),
  selectedStyle: null,
  selectedCategory: null,
  hoveredStyle: null,
  showLinks: true,
  zoomK: INITIAL_SCALE,
  transform: d3.zoomIdentity,
  boardMap: new Map(),
};

const dom = {};

init();

async function init() {
  cacheDom();
  document.documentElement.style.setProperty('--atlas-bg', `url("${import.meta.env.BASE_URL}beer-atlas-bg.svg")`);
  state.data = await loadData();
  normalizeData();
  setupSvg();
  renderAll();
  setupZoom();
  setupToolbar();
  setupSearch();
  setupSuperNav();
  setupPanelControls();
  setupViewportObservers();
  hideLoader();
}

async function loadData() {
  const response = await fetch(`${import.meta.env.BASE_URL}data.json`);
  if (!response.ok) throw new Error(`Failed to load data.json: ${response.status}`);
  return response.json();
}

function cacheDom() {
  dom.svg = d3.select('#map').attr('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  dom.loader = document.getElementById('loader');
  dom.tooltip = document.getElementById('tooltip');
  dom.detailPanel = document.getElementById('detailPanel');
  dom.panelContent = document.getElementById('panelContent');
  dom.searchInput = document.getElementById('searchInput');
  dom.searchResults = document.getElementById('searchResults');
  dom.superNav = document.getElementById('superNav');
  dom.mapContainer = document.getElementById('mapContainer');
  dom.zoomInBtn = document.getElementById('zoomIn');
  dom.zoomOutBtn = document.getElementById('zoomOut');
  dom.resetViewBtn = document.getElementById('resetView');
  dom.toggleLinksBtn = document.getElementById('toggleLinks');
  dom.panelCloseBtn = document.getElementById('panelClose');
}

function normalizeData() {
  state.categories = (state.data.categories || []).map((category) => {
    const superGenre = findSuperGenre(category.id);
    return {
      ...category,
      superGenreId: superGenre.id,
      color: superGenre.color,
    };
  });

  state.categories.forEach((category) => {
    state.categoryMap.set(category.id, category);
  });

  state.styles = (state.data.styles || []).map((style) => {
    const category = state.categoryMap.get(style.category);
    const superGenre = category ? findSuperGenre(category.id) : SUPER_GENRES[0];
    const details = style.details || {};
    return {
      ...style,
      id: style.id || style.code,
      code: style.code || style.id,
      details,
      superGenreId: superGenre.id,
      color: superGenre.color,
      searchText: `${style.code || ''} ${style.name_zh || ''} ${style.name_en || ''}`.toLowerCase(),
    };
  });

  state.styles.forEach((style) => {
    state.styleMap.set(style.id, style);
    state.styleMap.set(style.code, style);
    if (!state.styleByCategory.has(style.category)) state.styleByCategory.set(style.category, []);
    state.styleByCategory.get(style.category).push(style);
    if (!state.styleBySuper.has(style.superGenreId)) state.styleBySuper.set(style.superGenreId, []);
    state.styleBySuper.get(style.superGenreId).push(style);
    state.relatedByStyle.set(style.id, []);
  });

  state.relations = (state.data.relations || [])
    .map((relation) => {
      const source = state.styleMap.get(relation.source);
      const target = state.styleMap.get(relation.target);
      if (!source || !target) return null;
      return { ...relation, source, target };
    })
    .filter(Boolean);

  state.relations.forEach((relation) => {
    state.relatedByStyle.get(relation.source.id)?.push(relation);
    state.relatedByStyle.get(relation.target.id)?.push(relation);
  });

  layoutWallBoards();
  layoutCategories();
  layoutStyles();
}

function findSuperGenre(categoryId) {
  return SUPER_GENRES.find((group) => group.categories.includes(categoryId)) || SUPER_GENRES[0];
}

function layoutWallBoards() {
  state.boardMap.clear();
  const styleCountBySuper = new Map(SUPER_GENRES.map((group) => [group.id, state.styleBySuper.get(group.id)?.length || 0]));
  const boards = buildWallBoards(SUPER_GENRES, styleCountBySuper);
  boards.forEach((board, index) => {
    const group = SUPER_GENRES[index];
    Object.assign(group, board);
    state.boardMap.set(group.id, board);
  });
}

function layoutCategories() {
  SUPER_GENRES.forEach((group) => {
    const board = state.boardMap.get(group.id);
    const categories = state.categories.filter((category) => category.superGenreId === group.id);
    const slots = layoutBoardCategories(categories, board);
    categories.forEach((category, index) => {
      Object.assign(category, slots[index], {
        boardId: group.id,
      });
    });
  });
}

function layoutStyles() {
  state.categories.forEach((category) => {
    const styles = state.styleByCategory.get(category.id) || [];
    positionStyleCluster(category, styles);
  });
}

function positionStyleCluster(category, styles) {
  const positions = layoutCategoryStyles(styles, category);
  styles.forEach((style, index) => {
    const pos = positions[index];
    style.x = pos.x;
    style.y = pos.y;
  });
}

function setupSvg() {
  const defs = dom.svg.append('defs');

  defs
    .append('filter')
    .attr('id', 'softGlow')
    .attr('x', '-120%')
    .attr('y', '-120%')
    .attr('width', '340%')
    .attr('height', '340%')
    .call((filter) => {
      filter.append('feGaussianBlur').attr('stdDeviation', '18').attr('result', 'blur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

  defs
    .append('filter')
    .attr('id', 'planetGlow')
    .attr('x', '-200%')
    .attr('y', '-200%')
    .attr('width', '500%')
    .attr('height', '500%')
    .call((filter) => {
      filter.append('feGaussianBlur').attr('stdDeviation', '26').attr('result', 'planet-blur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'planet-blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

  dom.scene = dom.svg.append('g').attr('class', 'scene');
  dom.bgLayer = dom.scene.append('g').attr('class', 'bg-layer');
  dom.overviewLayer = dom.scene.append('g').attr('class', 'overview-layer');
  dom.categoryLayer = dom.scene.append('g').attr('class', 'category-layer');
  dom.linkLayer = dom.scene.append('g').attr('class', 'link-layer');
  dom.styleLayer = dom.scene.append('g').attr('class', 'style-layer');
}

function renderAll() {
  renderBackdrop();
  renderOverview();
  renderCategories();
  renderStyles();
  renderLinks();
  updateVisibility(state.zoomK);
}

function renderBackdrop() {
  dom.bgLayer
    .append('rect')
    .attr('class', 'menu-wall-shadow')
    .attr('x', 220)
    .attr('y', 188)
    .attr('width', 1500)
    .attr('height', 360)
    .attr('rx', 36);

  dom.bgLayer
    .append('rect')
    .attr('class', 'menu-wall-glow')
    .attr('x', 250)
    .attr('y', 206)
    .attr('width', 1440)
    .attr('height', 316)
    .attr('rx', 28);
}

function renderOverview() {
  const groups = dom.overviewLayer
    .selectAll('g.super-genre')
    .data(SUPER_GENRES, (d) => d.id)
    .join('g')
    .attr('class', 'super-genre')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .on('click', (event, group) => {
      event.stopPropagation();
      zoomToSuperGenre(group);
    });

  groups.each(function decorateOverview(group) {
    const root = d3.select(this);
    root.selectAll('*').remove();
    const boardX = -group.width / 2;
    const boardY = -group.height / 2;

    root.append('rect').attr('class', 'super-genre-aura').attr('x', boardX - 4).attr('y', boardY - 4).attr('width', group.width + 8).attr('height', group.height + 8).attr('rx', 24);
    root.append('rect').attr('class', 'super-genre-frame').attr('x', boardX).attr('y', boardY).attr('width', group.width).attr('height', group.height).attr('rx', 22);
    root.append('rect').attr('class', 'super-genre-surface').attr('x', boardX + 10).attr('y', boardY + 10).attr('width', group.width - 20).attr('height', group.height - 20).attr('rx', 18);
    root.append('rect').attr('class', 'super-genre-accent').attr('x', boardX + 18).attr('y', boardY + 18).attr('width', 10).attr('height', group.height - 36).attr('rx', 5).attr('fill', group.color);
    root.append('rect').attr('class', 'super-genre-header').attr('x', boardX + 26).attr('y', boardY + 24).attr('width', group.width - 52).attr('height', 86).attr('rx', 16);
    root.append('rect').attr('class', 'super-genre-divider').attr('x', boardX + 26).attr('y', boardY + 122).attr('width', group.width - 52).attr('height', 2).attr('rx', 1);

    root
      .append('rect')
      .attr('class', 'super-genre-tap')
      .attr('x', -18)
      .attr('y', boardY + 20)
      .attr('width', 36)
      .attr('height', 62)
      .attr('rx', 14);

    root
      .append('rect')
      .attr('class', 'super-genre-pour')
      .attr('x', -5)
      .attr('y', boardY + 68)
      .attr('width', 10)
      .attr('height', 36)
      .attr('rx', 5)
      .attr('fill', group.color);

    root
      .selectAll('rect.super-genre-placeholder')
      .data([0, 1, 2])
      .join('rect')
      .attr('class', 'super-genre-placeholder')
      .attr('x', boardX + 30)
      .attr('y', (_, index) => boardY + 148 + index * 42)
      .attr('width', (_, index) => group.width - 64 - index * 18)
      .attr('height', 16)
      .attr('rx', 8);

    root
      .append('text')
      .attr('class', 'super-genre-title')
      .attr('y', boardY + 58)
      .text(group.name);

    root
      .append('text')
      .attr('class', 'super-genre-subtitle')
      .attr('y', boardY + 86)
      .text(group.nameEn);

    root
      .append('text')
      .attr('class', 'super-genre-count')
      .attr('y', boardY + group.height - 26)
      .text(`${state.styleBySuper.get(group.id)?.length || 0} styles`);
  });
}

function renderCategories() {
  const categoryGroups = dom.categoryLayer
    .selectAll('g.category-node')
    .data(state.categories, (d) => d.id)
    .join('g')
    .attr('class', 'category-node')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .on('click', (event, category) => {
      event.stopPropagation();
      state.selectedCategory = category.id;
      zoomToCategory(category);
      showCategoryDetails(category);
      updateCategoryFocus();
    });

  categoryGroups
    .append('rect')
    .attr('class', 'category-aura')
    .attr('x', (d) => -d.width / 2)
    .attr('y', (d) => -d.height / 2)
    .attr('width', (d) => d.width)
    .attr('height', (d) => d.height)
    .attr('rx', 12)
    .attr('fill', (d) => d.color);

  categoryGroups
    .append('rect')
    .attr('class', 'category-core')
    .attr('x', (d) => -d.width / 2 + 8)
    .attr('y', (d) => -d.height / 2 + 6)
    .attr('width', 6)
    .attr('height', (d) => d.height - 12)
    .attr('rx', 3)
    .attr('fill', (d) => d.color);

  categoryGroups
    .append('text')
    .attr('class', 'category-label')
    .attr('x', (d) => -d.width / 2 + 22)
    .attr('y', 5)
    .attr('text-anchor', 'start')
    .text((d) => d.name_zh);

  categoryGroups
    .append('text')
    .attr('class', 'category-count')
    .attr('x', (d) => d.width / 2 - 18)
    .attr('y', 5)
    .attr('text-anchor', 'end')
    .text((d) => `${state.styleByCategory.get(d.id)?.length || 0} styles`);

  dom.categoryNodes = categoryGroups;
}

function renderStyles() {
  const styleGroups = dom.styleLayer
    .selectAll('g.style-node')
    .data(state.styles, (d) => d.id)
    .join('g')
    .attr('class', 'style-node')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .on('mouseenter', (event, style) => {
      state.hoveredStyle = style.id;
      updateStyleFocus();
      showTooltip(event, style);
    })
    .on('mouseleave', () => {
      state.hoveredStyle = null;
      updateStyleFocus();
      hideTooltip();
    })
    .on('click', (event, style) => {
      event.stopPropagation();
      state.selectedStyle = style.id;
      state.selectedCategory = style.category;
      showStyleDetails(style);
      updateStyleFocus();
      updateCategoryFocus();
      if (state.zoomK < DETAIL_SCALE) zoomToStyle(style);
    });

  styleGroups
    .append('circle')
    .attr('class', 'style-ring')
    .attr('r', (d) => (d.key ? 16 : 11))
    .attr('fill', (d) => d.color);

  styleGroups
    .append('circle')
    .attr('class', 'style-core')
    .attr('r', (d) => (d.key ? 8 : 5))
    .attr('fill', '#fff7e7');

  styleGroups
    .append('text')
    .attr('class', 'style-label')
    .attr('y', 28)
    .text((d) => d.name_zh);

  styleGroups
    .append('text')
    .attr('class', 'style-code')
    .attr('y', 43)
    .text((d) => d.code);

  dom.styleNodes = styleGroups;
}

function renderLinks() {
  dom.linkSelection = dom.linkLayer
    .selectAll('path.relation-link')
    .data(state.relations, (d) => `${d.source.id}-${d.target.id}-${d.type}`)
    .join('path')
    .attr('class', 'relation-link')
    .attr('data-type', (d) => d.type)
    .attr('d', (d) => buildCurve(d.source, d.target));
}

function setupZoom() {
  const zoom = d3
    .zoom()
    .scaleExtent([0.55, 3.8])
    .on('zoom', (event) => {
      state.zoomK = event.transform.k;
      state.transform = event.transform;
      dom.scene.attr('transform', event.transform);
      updateVisibility(event.transform.k);
      updateFocusLens();
    });

  dom.svg.call(zoom);
  dom.zoom = zoom;
  const initialFocus = getOverviewFocusPoint();
  const initial = centerTransform(INITIAL_SCALE, initialFocus.x, initialFocus.y);
  state.transform = initial;
  dom.svg.call(zoom.transform, initial);
  updateFocusLens();
}

function setupToolbar() {
  dom.zoomInBtn?.addEventListener('click', () => {
    dom.svg.transition().duration(220).call(dom.zoom.scaleBy, 1.3);
  });

  dom.zoomOutBtn?.addEventListener('click', () => {
    dom.svg.transition().duration(220).call(dom.zoom.scaleBy, 0.78);
  });

  dom.resetViewBtn?.addEventListener('click', () => {
    state.selectedStyle = null;
    state.selectedCategory = null;
    updateStyleFocus();
    updateCategoryFocus();
    const initialFocus = getOverviewFocusPoint();
    dom.svg.transition().duration(700).call(dom.zoom.transform, centerTransform(INITIAL_SCALE, initialFocus.x, initialFocus.y));
    showWelcomePanel();
  });

  dom.toggleLinksBtn?.addEventListener('click', () => {
    state.showLinks = !state.showLinks;
    dom.toggleLinksBtn.classList.toggle('active', state.showLinks);
    dom.toggleLinksBtn.setAttribute('aria-pressed', String(state.showLinks));
    updateStyleFocus();
  });

  dom.svg.on('click', () => {
    state.selectedStyle = null;
    updateStyleFocus();
  });
}

function setupSearch() {
  const debounced = debounce(() => {
    const query = dom.searchInput.value.trim().toLowerCase();
    if (!query) {
      dom.searchResults.classList.remove('open');
      dom.searchResults.innerHTML = '';
      return;
    }

    const matches = state.styles.filter((style) => style.searchText.includes(query)).slice(0, 10);
    dom.searchResults.innerHTML = matches
      .map(
        (style) => `
          <button class="search-result-item" data-style-id="${escapeHtml(style.id)}" role="option">
            <span class="search-result-dot" style="background:${style.color}"></span>
            <span>
              <span class="search-result-name">${escapeHtml(style.name_zh || style.name_en)}</span>
              <span class="search-result-en">${escapeHtml(style.code)} · ${escapeHtml(style.name_en || '')}</span>
            </span>
          </button>
        `,
      )
      .join('');

    dom.searchResults.classList.add('open');
    dom.searchResults.querySelectorAll('[data-style-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const style = state.styleMap.get(button.dataset.styleId);
        if (!style) return;
        state.selectedStyle = style.id;
        state.selectedCategory = style.category;
        showStyleDetails(style);
        updateStyleFocus();
        updateCategoryFocus();
        zoomToStyle(style);
        dom.searchInput.value = '';
        dom.searchResults.classList.remove('open');
      });
    });
  }, 120);

  dom.searchInput.addEventListener('input', debounced);
  dom.searchInput.addEventListener('blur', () => {
    setTimeout(() => dom.searchResults.classList.remove('open'), 160);
  });
}

function setupSuperNav() {
  dom.superNav.innerHTML = '';
  SUPER_GENRES.forEach((group) => {
    const button = document.createElement('button');
    button.className = 'sg-pill';
    button.style.setProperty('--pill-color', group.color);
    button.innerHTML = `<span class="sg-dot" style="background:${group.color}"></span>${escapeHtml(group.name)}`;
    button.addEventListener('click', () => zoomToSuperGenre(group));
    dom.superNav.appendChild(button);
  });
}

function setupPanelControls() {
  dom.panelCloseBtn?.addEventListener('click', () => {
    dom.detailPanel.classList.remove('open');
    state.selectedStyle = null;
    updateStyleFocus();
  });
}

function setupViewportObservers() {
  window.addEventListener(
    'resize',
    debounce(() => {
      updateFocusLens();
      updateStyleFocus();
      updateCategoryFocus();
    }, 80),
  );
}

function updateVisibility(scale) {
  const overviewAlpha = scale < ZOOM_LEVELS.overview ? 1 : Math.max(0, 1 - (scale - ZOOM_LEVELS.overview) * 1.6);
  const categoryAlpha = scale < ZOOM_LEVELS.overview ? 0.18 : scale < ZOOM_LEVELS.categories ? 1 : Math.max(0.48, 1 - (scale - ZOOM_LEVELS.categories) * 0.22);
  const styleAlpha = scale < ZOOM_LEVELS.categories ? 0 : 1;

  dom.overviewLayer.style('opacity', overviewAlpha);
  dom.categoryLayer.style('opacity', categoryAlpha);
  dom.styleLayer.style('opacity', styleAlpha);

  const labelMode = scale >= DETAIL_SCALE;
  dom.styleNodes?.classed('labels-visible', labelMode);
  dom.categoryNodes?.classed('labels-visible', scale >= MID_SCALE);

  updateStyleFocus();
  updateCategoryFocus();
}

function updateCategoryFocus() {
  const activeCategory = state.selectedCategory;
  dom.categoryNodes?.classed('is-active', (d) => d.id === activeCategory);
  dom.categoryNodes?.classed('is-dimmed', (d) => Boolean(activeCategory) && d.id !== activeCategory && state.zoomK >= ZOOM_LEVELS.categories);
  applyCategoryDensity();
}

function updateStyleFocus() {
  const activeId = state.selectedStyle || state.hoveredStyle;
  const relatedIds = new Set();

  if (activeId) {
    relatedIds.add(activeId);
    (state.relatedByStyle.get(activeId) || []).forEach((relation) => {
      relatedIds.add(relation.source.id);
      relatedIds.add(relation.target.id);
    });
  }

  dom.styleNodes?.classed('is-active', (d) => d.id === activeId);
  dom.styleNodes?.classed('is-related', (d) => activeId && relatedIds.has(d.id) && d.id !== activeId);
  dom.styleNodes?.classed('is-dimmed', (d) => activeId && !relatedIds.has(d.id));
  applyStyleDensity(activeId, relatedIds);

  dom.linkSelection
    ?.classed('is-visible', (d) => {
      if (!state.showLinks || state.zoomK < ZOOM_LEVELS.styles || !activeId) return false;
      return d.source.id === activeId || d.target.id === activeId;
    })
    .classed('is-muted', () => !activeId);
}

function updateFocusLens() {
  const rect = dom.mapContainer.getBoundingClientRect();
  const focusMode = state.zoomK >= ZOOM_LEVELS.styles;
  const clearRadius = clamp(Math.min(rect.width, rect.height) * 0.24, 250, 440);
  const falloffRadius = clamp(clearRadius + Math.min(rect.width, rect.height) * 0.3, 520, 860);
  const edgeOpacity = focusMode ? clamp((state.zoomK - ZOOM_LEVELS.styles) / 1.8, 0, 0.42) : 0;

  dom.mapContainer.classList.toggle('focus-mode', focusMode);
  dom.mapContainer.style.setProperty('--focus-x', `${rect.width / 2}px`);
  dom.mapContainer.style.setProperty('--focus-y', `${rect.height / 2}px`);
  dom.mapContainer.style.setProperty('--focus-clear-radius', `${clearRadius}px`);
  dom.mapContainer.style.setProperty('--focus-falloff-radius', `${falloffRadius}px`);
  dom.mapContainer.style.setProperty('--focus-edge-opacity', edgeOpacity.toFixed(3));
}

function applyCategoryDensity() {
  if (!dom.categoryNodes) return;

  const rect = dom.mapContainer.getBoundingClientRect();
  const focusRadius = clamp(Math.min(rect.width, rect.height) * 0.34, 340, 620);
  const fadeRadius = focusRadius + 320;
  const focusMode = state.zoomK >= ZOOM_LEVELS.categories;

  dom.categoryNodes.each(function setCategoryDensity(category) {
    const distance = projectDistance(category.x, category.y, rect);
    const focus = focusMode ? Math.max(0, 1 - distance / fadeRadius) : 1;
    const opacity = focusMode ? 0.52 + focus * 0.48 : 1;
    const labelOpacity = state.zoomK >= MID_SCALE ? Math.min(1, 0.68 + focus * 0.32) : 0;
    d3.select(this)
      .style('--category-opacity', opacity.toFixed(3))
      .style('--category-label-opacity', labelOpacity.toFixed(3))
      .classed('is-focus-far', focusMode && distance > fadeRadius);
  });
}

function applyStyleDensity(activeId, relatedIds) {
  if (!dom.styleNodes) return;

  const rect = dom.mapContainer.getBoundingClientRect();
  const focusMode = state.zoomK >= ZOOM_LEVELS.styles;
  const nearRadius = clamp(Math.min(rect.width, rect.height) * 0.24, 260, 430);
  const fadeRadius = clamp(nearRadius + Math.min(rect.width, rect.height) * 0.28, 520, 840);
  const detailMode = state.zoomK >= DETAIL_SCALE;

  dom.styleNodes.each(function setStyleDensity(style) {
    const distance = projectDistance(style.x, style.y, rect);
    const focus = focusMode ? Math.max(0, 1 - distance / fadeRadius) : 1;
    const isActive = style.id === activeId;
    const isRelated = Boolean(activeId) && relatedIds.has(style.id) && style.id !== activeId;
    const isDimmedByRelation = Boolean(activeId) && !relatedIds.has(style.id);

    let nodeOpacity = focusMode ? 0.44 + focus * 0.56 : 1;
    let labelOpacity = detailMode ? Math.max(0.32, focus * 0.96) : Math.max(0, focus * 0.28 - 0.08);

    if (isRelated) {
      nodeOpacity = Math.max(nodeOpacity, 0.76);
      labelOpacity = Math.max(labelOpacity, detailMode ? 0.82 : 0.28);
    }

    if (isActive) {
      nodeOpacity = 1;
      labelOpacity = 1;
    }

    if (isDimmedByRelation) {
      nodeOpacity *= 0.72;
      labelOpacity *= 0.42;
    }

    d3.select(this)
      .style('--node-opacity', nodeOpacity.toFixed(3))
      .style('--label-opacity', labelOpacity.toFixed(3))
      .classed('is-focus-far', focusMode && distance > fadeRadius)
      .classed('is-focus-near', focusMode && distance <= nearRadius);
  });
}

function projectDistance(x, y, rect) {
  const px = state.transform.applyX(x);
  const py = state.transform.applyY(y);
  const dx = px - rect.width / 2;
  const dy = py - rect.height / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

function zoomToSuperGenre(group) {
  state.selectedCategory = null;
  updateCategoryFocus();
  const transform = centerTransform(MID_SCALE, group.x, group.y);
  dom.svg.transition().duration(700).call(dom.zoom.transform, transform);
  showSuperGenreDetails(group);
}

function zoomToCategory(category) {
  const transform = centerTransform(STYLE_SCALE, category.x, category.y);
  dom.svg.transition().duration(700).call(dom.zoom.transform, transform);
}

function zoomToStyle(style) {
  const transform = centerTransform(DETAIL_SCALE, style.x, style.y);
  dom.svg.transition().duration(720).call(dom.zoom.transform, transform);
}

function centerTransform(scale, x, y) {
  const rect = dom.mapContainer.getBoundingClientRect();
  const tx = rect.width / 2 - x * scale;
  const ty = rect.height / 2 - y * scale;
  return d3.zoomIdentity.translate(tx, ty).scale(scale);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showSuperGenreDetails(group) {
  const styles = state.styleBySuper.get(group.id) || [];
  const categories = state.categories.filter((category) => category.superGenreId === group.id);
  dom.panelContent.innerHTML = `
    <div class="panel-hero" style="--panel-color:${group.color}">
      <div class="hero-kicker">Super Genre</div>
      <h2>${escapeHtml(group.name)}</h2>
      <p>${escapeHtml(group.nameEn)}</p>
    </div>
    <div class="panel-grid">
      <div class="panel-stat"><span>Categories</span><strong>${categories.length}</strong></div>
      <div class="panel-stat"><span>Styles</span><strong>${styles.length}</strong></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">包含类别</div>
      <div class="detail-chip-list">
        ${categories.map((category) => `<button class="detail-chip" data-category-id="${escapeHtml(category.id)}">${escapeHtml(category.id)} ${escapeHtml(category.name_zh)}</button>`).join('')}
      </div>
    </div>
  `;
  attachCategoryChipHandlers();
  dom.detailPanel.classList.add('open');
}

function showCategoryDetails(category) {
  const styles = state.styleByCategory.get(category.id) || [];
  dom.panelContent.innerHTML = `
    <div class="panel-hero" style="--panel-color:${category.color}">
      <div class="hero-kicker">BJCP Category ${escapeHtml(category.id)}</div>
      <h2>${escapeHtml(category.name_zh)}</h2>
      <p>${escapeHtml(category.name_en || '')}</p>
    </div>
    <div class="panel-grid">
      <div class="panel-stat"><span>Styles</span><strong>${styles.length}</strong></div>
      <div class="panel-stat"><span>Region</span><strong>${escapeHtml(findSuperGenre(category.id).name)}</strong></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">风格列表</div>
      <div class="detail-list">
        ${styles
          .map(
            (style) => `
              <button class="detail-list-item" data-style-id="${escapeHtml(style.id)}">
                <span class="detail-list-code">${escapeHtml(style.code)}</span>
                <span>${escapeHtml(style.name_zh || style.name_en)}</span>
              </button>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
  attachStyleListHandlers();
  dom.detailPanel.classList.add('open');
}

function showStyleDetails(style) {
  const details = style.details || {};
  const stats = parseVitalStats(details.vital_statistics || '');
  const related = dedupeRelatedStyles(state.relatedByStyle.get(style.id) || []);
  const tagContent = classifyTagContent(details.tags);
  dom.panelContent.innerHTML = `
    <div class="panel-hero" style="--panel-color:${style.color}">
      <div class="hero-kicker">BJCP ${escapeHtml(style.code)}</div>
      <h2>${escapeHtml(style.name_zh || style.name_en)}</h2>
      <p>${escapeHtml(style.name_en || '')}</p>
    </div>
    ${stats ? buildStatsGrid(stats) : ''}
    ${DETAIL_SECTIONS.map(([key, label]) => buildDetailSection(label, details[key])).join('')}
    ${buildTagSection(tagContent.tags)}
    ${buildSupplementSection(tagContent.supplement)}
    ${buildRelatedSection(related)}
  `;
  attachStyleListHandlers();
  dom.detailPanel.classList.add('open');
}

function buildStatsGrid(stats) {
  return `
    <div class="panel-grid">
      ${Object.entries(stats)
        .map(([key, value]) => `<div class="panel-stat"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
        .join('')}
    </div>
  `;
}

function buildDetailSection(label, content) {
  if (!content) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">${escapeHtml(label)}</div>
      <div class="detail-section-body">${escapeHtml(content)}</div>
    </div>
  `;
}

function buildTagSection(tagsValue) {
  if (!tagsValue?.length) return '';
  const title = '标签';
  return `
    <div class="detail-section">
      <div class="detail-section-title">${title}</div>
      <div class="detail-chip-list">${tagsValue.map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
  `;
}

function buildSupplementSection(content) {
  if (!content?.length) return '';
  const title = '补充说明';
  return `
    <div class="detail-section">
      <div class="detail-section-title">${title}</div>
      <div class="detail-section-body detail-section-body-supplement">${content.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</div>
    </div>
  `;
}

function buildRelatedSection(related) {
  if (!related.length) return '';
  return `
    <div class="detail-section">
      <div class="detail-section-title">关联风格</div>
      <div class="detail-list">
        ${related
          .map(
            (item) => `
              <button class="detail-list-item" data-style-id="${escapeHtml(item.node.id)}">
                <span class="detail-list-code">${escapeHtml(item.node.code)}</span>
                <span>${escapeHtml(item.node.name_zh || item.node.name_en)}</span>
                <span class="detail-list-meta">${escapeHtml(relTypeLabel(item.type))}</span>
              </button>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

function attachCategoryChipHandlers() {
  dom.panelContent.querySelectorAll('[data-category-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = state.categoryMap.get(button.dataset.categoryId);
      if (!category) return;
      state.selectedCategory = category.id;
      updateCategoryFocus();
      zoomToCategory(category);
      showCategoryDetails(category);
    });
  });
}

function attachStyleListHandlers() {
  dom.panelContent.querySelectorAll('[data-style-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const style = state.styleMap.get(button.dataset.styleId);
      if (!style) return;
      state.selectedStyle = style.id;
      state.selectedCategory = style.category;
      updateCategoryFocus();
      updateStyleFocus();
      zoomToStyle(style);
      showStyleDetails(style);
    });
  });
}

function showWelcomePanel() {
  dom.panelContent.innerHTML = `
    <div class="panel-placeholder">
      <div class="placeholder-icon">◎</div>
      <h2>从大陆到风格</h2>
      <p>缩小时先看超类分布，放大到类别，再继续钻取具体风格与关系线。</p>
    </div>
  `;
}

function showTooltip(event, style) {
  const summary = style.details?.overall_impression || style.details?.history || '';
  dom.tooltip.innerHTML = `
    <div class="tooltip-name">${escapeHtml(style.name_zh || style.name_en)}</div>
    <div class="tooltip-meta">${escapeHtml(style.code)} · ${escapeHtml(style.name_en || '')}</div>
    ${summary ? `<div class="tooltip-desc">${escapeHtml(summary.slice(0, 92))}${summary.length > 92 ? '...' : ''}</div>` : ''}
  `;
  dom.tooltip.classList.add('visible');

  const rect = dom.tooltip.getBoundingClientRect();
  let left = event.clientX + 18;
  let top = event.clientY + 18;
  if (left + rect.width > window.innerWidth) left = event.clientX - rect.width - 18;
  if (top + rect.height > window.innerHeight) top = event.clientY - rect.height - 18;
  dom.tooltip.style.left = `${left}px`;
  dom.tooltip.style.top = `${top}px`;
}

function hideTooltip() {
  dom.tooltip.classList.remove('visible');
}

function buildCurve(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const curve = Math.max(60, Math.abs(dx) * 0.36);
  const sway = dy * 0.16;
  return `M${source.x},${source.y} C${source.x + curve},${source.y + sway} ${target.x - curve},${target.y - sway} ${target.x},${target.y}`;
}

function parseVitalStats(text) {
  if (!text) return null;
  const patterns = [
    ['OG', /OG[：:]\s*([\d.]+(?:-[\d.]+)?)/i],
    ['FG', /FG[：:]\s*([\d.]+(?:-[\d.]+)?)/i],
    ['IBU', /IBU[sS]?[：:]\s*([\d.]+(?:-[\d.]+)?)/i],
    ['SRM', /SRM[：:]\s*([\d.]+(?:-[\d.]+)?)/i],
    ['ABV', /ABV[：:]\s*([\d.]+(?:-[\d.]+)?%?)/i],
  ];
  const output = {};
  patterns.forEach(([label, regex]) => {
    const match = text.match(regex);
    if (match) output[label] = match[1];
  });
  return Object.keys(output).length ? output : null;
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(/[、，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifyTagContent(value) {
  const rawItems = splitList(value);
  const tags = [];
  const supplement = [];

  rawItems.forEach((item) => {
    if (looksLikeTag(item)) tags.push(item);
    else supplement.push(item);
  });

  return { tags, supplement };
}

function looksLikeTag(value) {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;
  if (/[\r\n]/.test(normalized)) return false;
  if (/[???:??!???()]/.test(normalized)) return false;
  if (normalized.length > 18) return false;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount > 4) return false;

  return true;
}

function dedupeRelatedStyles(relations) {
  const seen = new Set();
  return relations
    .map((relation) => {
      const node = relation.source.id === state.selectedStyle ? relation.target : relation.source;
      return { node, type: relation.type };
    })
    .filter((item) => {
      const key = `${item.node.id}-${item.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function relTypeLabel(type) {
  return {
    related: '相关',
    compared_to: '对比',
    influenced_by: '受影响',
    influenced: '影响了',
  }[type] || type;
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function hideLoader() {
  window.setTimeout(() => {
    dom.loader?.classList.add('hidden');
    showWelcomePanel();
  }, 500);
}
