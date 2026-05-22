import { buildMiniMap, findMiniMapNodeAt, getGroupDetail } from '../../utils/beer-model.js';

Page({
  data: {
    groupId: '',
    group: null,
    categories: [],
    relationCount: 0,
    showLinks: true,
    linkToggleText: '隐藏线',
    selectedNodeId: '',
    selectedNodeName: '',
    canvasStyle: 'width: 320px; height: 430px;',
  },

  onLoad(options) {
    const groupId = options.groupId || 'american';
    const detail = getGroupDetail(groupId);
    wx.setNavigationBarTitle({ title: detail.group.name });
    this.setData({
      groupId,
      group: detail.group,
      categories: detail.categories,
      relationCount: detail.relations.length,
    });
  },

  onReady() {
    this.prepareCanvas();
  },

  toggleLinks() {
    const showLinks = !this.data.showLinks;
    this.setData(
      {
        showLinks,
        linkToggleText: showLinks ? '隐藏线' : '显示线',
      },
      () => this.drawMiniMap(),
    );
  },

  resetMap() {
    this.setData(
      {
        selectedNodeId: '',
        selectedNodeName: '',
      },
      () => this.drawMiniMap(),
    );
  },

  openStyle(event) {
    const { styleId } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/style/index?styleId=${styleId}` });
  },

  onCanvasTap(event) {
    if (!this.miniMap) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const node = findMiniMapNodeAt(this.miniMap, touch.x, touch.y);
    if (!node) {
      this.resetMap();
      return;
    }
    this.setData(
      {
        selectedNodeId: node.id,
        selectedNodeName: node.label,
      },
      () => this.drawMiniMap(),
    );
  },

  openSelectedStyle() {
    if (!this.data.selectedNodeId) return;
    wx.navigateTo({ url: `/pages/style/index?styleId=${this.data.selectedNodeId}` });
  },

  prepareCanvas() {
    const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.canvasWidth = Math.max(300, Math.min(560, windowInfo.windowWidth - 64));
    this.canvasHeight = Math.round(this.canvasWidth * 1.32);
    this.ctx = wx.createCanvasContext('miniMap', this);
    this.miniMap = buildMiniMap(this.data.groupId, {
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
    this.setData(
      {
        canvasStyle: `width: ${this.canvasWidth}px; height: ${this.canvasHeight}px;`,
      },
      () => this.drawMiniMap(),
    );
  },

  drawMiniMap() {
    if (!this.ctx || !this.miniMap) return;
    const ctx = this.ctx;
    const { width, height, links, nodes } = this.miniMap;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#111820';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = this.data.group.color;
    drawRoundRect(ctx, width * 0.08, height * 0.12, width * 0.84, height * 0.76, 96);
    ctx.fill();
    ctx.restore();

    if (this.data.showLinks) {
      links.forEach((link) => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = relationColor(link.type);
        ctx.globalAlpha = 0.62;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    nodes.forEach((node) => {
      const selected = node.id === this.data.selectedNodeId;
      const x = node.x - node.width / 2;
      const y = node.y - node.height / 2;
      drawRoundRect(ctx, x, y, node.width, node.height, node.radius);
      ctx.fillStyle = selected ? '#f8fafc' : node.color;
      ctx.fill();
      ctx.lineWidth = selected ? 2.4 : 1;
      ctx.strokeStyle = selected ? '#f6ad55' : 'rgba(255,255,255,0.5)';
      ctx.stroke();
      ctx.fillStyle = selected ? '#111820' : '#0f1720';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x, node.y, node.width - 14);
    });
    ctx.draw();
  },
});

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function relationColor(type) {
  if (type === 'influenced_by') return '#f6ad55';
  if (type === 'compared_to') return '#7db8ff';
  return '#9aa8bb';
}
