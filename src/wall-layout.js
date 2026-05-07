export const WALL_LAYOUT = {
  x: 246,
  y: 214,
  width: 1708,
  height: 324,
  gap: 18,
  headerHeight: 86,
  footerHeight: 28,
  categoryGap: 12,
  categorySidePadding: 14,
};

export function buildWallBoards(superGenres, styleCountBySuper) {
  const total = superGenres.length;
  const innerWidth = WALL_LAYOUT.width - WALL_LAYOUT.gap * (total - 1);
  const baseWidth = innerWidth / total;
  const countValues = [...styleCountBySuper.values()];
  const maxCount = Math.max(...countValues, 1);
  const boards = [];
  let cursorX = WALL_LAYOUT.x;

  superGenres.forEach((group, index) => {
    const count = styleCountBySuper.get(group.id) || 0;
    const emphasis = count / maxCount;
    const width = baseWidth;
    const height = WALL_LAYOUT.height - (index % 2 === 0 ? 0 : 10);
    boards.push({
      id: group.id,
      x: cursorX + width / 2,
      y: WALL_LAYOUT.y + height / 2,
      top: WALL_LAYOUT.y,
      left: cursorX,
      width,
      height,
      innerLeft: cursorX + 12,
      innerTop: WALL_LAYOUT.y + 12,
      innerWidth: width - 24,
      innerHeight: height - 24,
      headerHeight: WALL_LAYOUT.headerHeight,
      footerHeight: WALL_LAYOUT.footerHeight,
    });
    cursorX += width + WALL_LAYOUT.gap;
  });

  return boards;
}

export function layoutBoardCategories(categories, board) {
  if (!categories.length) return [];

  const availableHeight = board.innerHeight - board.headerHeight - board.footerHeight;
  const count = categories.length;
  const gap = WALL_LAYOUT.categoryGap;
  const slotHeight = Math.max(24, Math.min(40, (availableHeight - gap * (count - 1)) / count));
  const slotWidth = board.innerWidth - WALL_LAYOUT.categorySidePadding * 2;
  const contentTop = board.innerTop + board.headerHeight;
  const usedHeight = slotHeight * count + gap * (count - 1);
  const startY = contentTop + Math.max(0, (availableHeight - usedHeight) / 2) + slotHeight / 2;

  return categories.map((category, index) => ({
    id: category.id,
    x: board.x,
    y: startY + index * (slotHeight + gap),
    width: slotWidth,
    height: slotHeight,
  }));
}

export function layoutCategoryStyles(styles, category) {
  if (!styles.length) return [];

  const cols = styles.length <= 4 ? 2 : styles.length <= 9 ? 3 : 4;
  const cellX = 74;
  const cellY = 54;
  const totalRows = Math.ceil(styles.length / cols);
  const originY = category.y + category.height * 0.9;

  return styles.map((style, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowWidth = Math.min(cols, styles.length - row * cols);
    const x = category.x + (col - (rowWidth - 1) / 2) * cellX;
    const y = originY + (row - (totalRows - 1) / 2) * cellY;
    return { id: style.id, x, y };
  });
}
