const svg = d3.select("#map");
const tooltip = document.getElementById("tooltip");
const legend = document.getElementById("legend");
const details = document.getElementById("details");
const searchInput = document.getElementById("searchInput");
let categoryLookup = new Map();

const width = 1200;
const height = 800;

const zoomLayer = svg.append("g").attr("class", "zoom-layer");
const linkLayer = zoomLayer.append("g").attr("class", "links");
const nodeLayer = zoomLayer.append("g").attr("class", "nodes");
const axisLayer = svg.append("g").attr("class", "axis-layer");

const zoom = d3.zoom().scaleExtent([0.6, 2.8]).on("zoom", (event) => {
  zoomLayer.attr("transform", event.transform);
});

svg.call(zoom);

document.getElementById("zoomIn").addEventListener("click", () => {
  svg.transition().duration(200).call(zoom.scaleBy, 1.2);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  svg.transition().duration(200).call(zoom.scaleBy, 0.8);
});

document.getElementById("resetView").addEventListener("click", () => {
  svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
});

fetch("data.json")
  .then((response) => response.json())
  .then((data) => {
    const categories = withCategoryColors(data.categories || []);
    renderLegend(categories);
    renderMap({ ...data, categories });
    bindSearch(data.styles || data.nodes || []);
  })
  .catch(() => {
    details.innerHTML = `<div class="details-title">Data missing</div>
      <div class="details-body">Unable to load data.json.</div>`;
  });

function renderLegend(categories) {
  legend.innerHTML = "";
  categories.forEach((cat) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-dot" style="background:${cat.color}"></span>
      <span>${cat.name_zh || cat.name}</span>
    `;
    legend.appendChild(item);
  });
}

function renderMap(data) {
  const categories = withCategoryColors(data.categories || []);
  const nodes = normalizeNodes(data.styles || data.nodes || [], categories);
  const links = data.relations || data.links || [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  categoryLookup = categoryMap;

  renderAxes();

  linkLayer
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", "link")
    .attr("data-type", (d) => d.type || "related")
    .attr("d", (d) => {
      const source = nodes.find((n) => n.id === d.source || n.code === d.source);
      const target = nodes.find((n) => n.id === d.target || n.code === d.target);
      if (!source || !target) return "";
      return `M${source.x},${source.y} C${source.x + 60},${source.y} ${target.x - 60},${target.y} ${target.x},${target.y}`;
    });

  const node = nodeLayer
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x},${d.y})`);

  node
    .append("circle")
    .attr("r", 16)
    .attr("fill", (d) => categoryMap.get(d.category)?.color || "#999");

  node
    .append("text")
    .attr("x", 0)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text((d) => d.name_zh || d.name);

  node
    .on("mouseenter", (event, d) => {
      showTooltip(event, d);
      updateDetails(d);
      node.classed("focused", (n) => n.id === d.id);
    })
    .on("mouseleave", () => {
      hideTooltip();
    })
    .on("click", (event, d) => {
      updateDetails(d);
      node.classed("focused", (n) => n.id === d.id);
    });
}

function renderAxes() {
  const fermentationOrder = ["下层发酵", "上层发酵", "混合发酵", "自然发酵", "任意发酵方式"];
  const colorOrder = ["淡色", "琥珀", "深色", "黑色"];
  const baseX = 140;
  const baseY = 120;
  const colGap = 220;
  const rowGap = 160;

  axisLayer.selectAll("*").remove();

  axisLayer
    .selectAll("text.x-label")
    .data(fermentationOrder)
    .join("text")
    .attr("class", "axis-label x-label")
    .attr("x", (_, i) => baseX + i * colGap)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text((d) => d);

  axisLayer
    .selectAll("text.y-label")
    .data(colorOrder)
    .join("text")
    .attr("class", "axis-label y-label")
    .attr("x", 24)
    .attr("y", (_, i) => baseY + i * rowGap)
    .attr("text-anchor", "start")
    .text((d) => d);
}

function showTooltip(event, d) {
  tooltip.style.opacity = "1";
  const primary = d.name_zh || d.name;
  const secondary = d.name_en ? ` (${d.name_en})` : "";
  const summary = d.summary ? `<br/>${d.summary}` : "";
  tooltip.innerHTML = `<strong>${primary}${secondary}</strong>${summary}`;
  const offset = 16;
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;
}

function hideTooltip() {
  tooltip.style.opacity = "0";
}

function updateDetails(d) {
  const category = d.category ? categoryLookup.get(d.category) : null;
  const categoryLabel = category
    ? `${category.id} ${category.name_zh || category.name_en || ""}`.trim()
    : d.category || "";
  const sections = [];
  const detailsMap = d.details || {};
  const labelMap = {
    overall_impression: "整体印象",
    aroma: "香气",
    appearance: "外观",
    flavor: "风味",
    mouthfeel: "口感",
    comments: "注释",
    history: "历史",
    ingredients: "特色成分",
    comparison: "风格对比",
    vital_statistics: "关键数据",
    commercial_examples: "商业案例",
    tags: "标签"
  };

  Object.keys(labelMap).forEach((key) => {
    if (detailsMap[key]) {
      sections.push(
        `<div class="detail-section"><strong>${labelMap[key]}:</strong> ${detailsMap[key]}</div>`
      );
    }
  });

  const fallback = d.summary || d.history || "From BJCP 2021 guidelines.";
  details.innerHTML = `
    <div class="details-title">${d.name_zh || d.name}${d.name_en ? ` (${d.name_en})` : ""}</div>
    <div class="details-body">
      <div><strong>Code:</strong> ${d.code || d.id || "-"}</div>
      <div><strong>Category:</strong> ${categoryLabel}</div>
      ${sections.length ? sections.join("") : `<div><strong>Notes:</strong> ${fallback}</div>`}
    </div>
  `;
}

function bindSearch(nodes) {
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value.trim().toLowerCase();
    const selection = nodeLayer.selectAll("g.node");

    if (!value) {
      selection.attr("opacity", 1);
      return;
    }

    selection.attr("opacity", (d) => {
      const zh = (d.name_zh || d.name || "").toLowerCase();
      const en = (d.name_en || "").toLowerCase();
      return zh.includes(value) || en.includes(value) ? 1 : 0.2;
    });
  });
}

function withCategoryColors(categories) {
  const palette = [
    "#d1a24a",
    "#7a4e2a",
    "#4f7d4b",
    "#c4512e",
    "#d9c89d",
    "#3c6e71",
    "#8f5d5d",
    "#6b705c",
    "#b08968",
    "#e07a5f"
  ];
  return categories.map((cat, idx) => ({
    ...cat,
    color: cat.color || palette[idx % palette.length]
  }));
}

function normalizeNodes(nodes, categories) {
  const hasPositions = nodes.every((n) => typeof n.x === "number" && typeof n.y === "number");
  if (hasPositions) return nodes;

  const fermentationOrder = ["下层发酵", "上层发酵", "混合发酵", "自然发酵", "任意发酵方式"];
  const colorOrder = ["淡色", "琥珀", "深色", "黑色"];
  const strengthOrder = ["社交强度", "标准强度", "高强度", "超高"];

  const ferX = new Map(fermentationOrder.map((v, i) => [v, i]));
  const colorY = new Map(colorOrder.map((v, i) => [v, i]));
  const strengthOffset = new Map(strengthOrder.map((v, i) => [v, i]));

  const baseX = 140;
  const baseY = 120;
  const colGap = 220;
  const rowGap = 160;

  const buckets = new Map();
  function getBucketKey(f, c) {
    return `${f || "unknown"}|${c || "unknown"}`;
  }

  return nodes.map((node) => {
    const tags = node.details?.tags || "";
    const fer = fermentationOrder.find((t) => tags.includes(t)) || "任意发酵方式";
    const col = colorOrder.find((t) => tags.includes(t)) || "淡色";
    const strength = strengthOrder.find((t) => tags.includes(t)) || "标准强度";

    const bx = baseX + (ferX.get(fer) ?? 4) * colGap;
    const by = baseY + (colorY.get(col) ?? 0) * rowGap;
    const offset = strengthOffset.get(strength) ?? 1;

    const key = getBucketKey(fer, col);
    const index = buckets.get(key) || 0;
    buckets.set(key, index + 1);

    const localCol = index % 4;
    const localRow = Math.floor(index / 4);

    return {
      ...node,
      x: bx + (localCol - 1.5) * 44 + offset * 6,
      y: by + localRow * 34 + offset * 4
    };
  });
}
