import test from 'node:test';
import assert from 'node:assert/strict';

import { WALL_LAYOUT, buildWallBoards, getNearestBoardId, getOverviewFocusPoint, layoutBoardCategories } from '../src/wall-layout.js';

test('buildWallBoards keeps every board inside the wall frame', () => {
  const genres = [
    { id: 'a' },
    { id: 'b' },
    { id: 'c' },
    { id: 'd' },
  ];
  const counts = new Map([
    ['a', 12],
    ['b', 4],
    ['c', 9],
    ['d', 7],
  ]);

  const boards = buildWallBoards(genres, counts);

  assert.equal(boards.length, genres.length);
  assert.ok(boards[0].left >= WALL_LAYOUT.x);
  assert.ok(boards.at(-1).left + boards.at(-1).width <= WALL_LAYOUT.x + WALL_LAYOUT.width + 0.001);
});

test('layoutBoardCategories places category rows inside the board inner area', () => {
  const board = buildWallBoards([{ id: 'a' }], new Map([['a', 8]]))[0];
  const slots = layoutBoardCategories(
    [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
    board,
  );

  assert.equal(slots.length, 5);
  slots.forEach((slot) => {
    assert.ok(slot.x >= board.left);
    assert.ok(slot.y - slot.height / 2 >= board.innerTop + board.headerHeight);
    assert.ok(slot.y + slot.height / 2 <= board.innerTop + board.innerHeight - board.footerHeight + 0.001);
  });
});

test('getOverviewFocusPoint targets the visual center of the menu wall', () => {
  const focus = getOverviewFocusPoint();

  assert.equal(focus.x, WALL_LAYOUT.x + WALL_LAYOUT.width / 2);
  assert.ok(focus.y > WALL_LAYOUT.y + WALL_LAYOUT.height / 2);
  assert.ok(focus.y < WALL_LAYOUT.y + WALL_LAYOUT.height);
});

test('getNearestBoardId returns the board closest to the current focus x', () => {
  const boards = buildWallBoards([{ id: 'a' }, { id: 'b' }, { id: 'c' }], new Map([['a', 3], ['b', 8], ['c', 5]]));

  assert.equal(getNearestBoardId(boards, boards[0].x + 10), 'a');
  assert.equal(getNearestBoardId(boards, boards[1].x), 'b');
  assert.equal(getNearestBoardId(boards, boards[2].x - 12), 'c');
});
