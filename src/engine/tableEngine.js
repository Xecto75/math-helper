/**
 * Table Engine — drives TableDisplay (SVG grid).
 * All functions receive tableRef (ref to TableDisplay) as first arg.
 */

const registry = new Map()

const SVG_W = 800
const SVG_H = 600
const PAD_X = 70
const PAD_Y = 70

// ── Layout helpers ─────────────────────────────────────────────────────────────

function computeLayout(cols, rows) {
  const maxW  = SVG_W - PAD_X * 2
  const maxH  = SVG_H - PAD_Y * 2
  const cellW = Math.min(Math.floor(maxW / cols), 200)
  const cellH = Math.min(Math.floor(maxH / rows), 90)
  const totalW = cellW * cols
  const totalH = cellH * rows
  const x0 = Math.round((SVG_W - totalW) / 2)
  const y0 = Math.round((SVG_H - totalH) / 2)
  return { x0, y0, cellW, cellH, totalW, totalH }
}

function cellId(gid, col, row) { return `${gid}_c${col}_${row}` }

// Build all cell objects for a given grid layout (cx/cy stored for surgical animation)
function buildCells(gid, cols, rows, values, headerRow, layout) {
  const { x0, y0, cellW, cellH } = layout
  const map = {}
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = cellId(gid, col, row)
      map[id] = {
        col, row,
        cx: x0 + col * cellW + cellW / 2,
        cy: y0 + row * cellH + cellH / 2,
        value: values[row]?.[col] ?? '',
        opacity: 0,
        isHeader: headerRow && row === 0,
      }
    }
  }
  return map
}

// Build all line objects at progress=1 (fully drawn)
function buildLines(gid, cols, rows, layout, color, borderW = 2, sepW = 1.5) {
  const { x0, y0, cellW, cellH, totalW, totalH } = layout
  const x1 = x0 + totalW
  const y1 = y0 + totalH
  const map = {}

  map[`${gid}_top`] = { x1: x0, y1: y0, x2: x1, y2: y0, progress: 1, color, strokeWidth: borderW }

  for (let i = 0; i <= cols; i++) {
    const lx = x0 + i * cellW
    map[`${gid}_v${i}`] = { x1: lx, y1: y0, x2: lx, y2: y1, progress: 1, color,
      strokeWidth: (i === 0 || i === cols) ? borderW : sepW }
  }

  for (let j = 1; j <= rows; j++) {
    const ly = y0 + j * cellH
    map[`${gid}_h${j}`] = { x1: x0, y1: ly, x2: x1, y2: ly, progress: 1, color,
      strokeWidth: j === rows ? borderW : sepW }
  }

  return map
}

// Collect all line IDs for a grid
function allLineIds(gid, cols, rows) {
  return [
    `${gid}_top`,
    ...Array.from({ length: cols + 1 }, (_, i) => `${gid}_v${i}`),
    ...Array.from({ length: rows },     (_, j) => `${gid}_h${j + 1}`),
  ]
}

// Collect all cell IDs for a grid
function allCellIds(gid, cols, rows) {
  const ids = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++)
      ids.push(cellId(gid, col, row))
  return ids
}

// Parse "val1,val2|val3,val4" into 2D array, or a flat row "a,b,c" into [['a','b','c']]
export function parseValues(str) {
  if (!str || !str.trim()) return []
  const rowSep = str.includes('|') ? '|' : '\n'
  return str.split(rowSep).map(row => row.split(',').map(v => v.trim()))
}

// Parse a single row string "a,b,c" into ['a','b','c']
export function parseRow(str) {
  return (str ?? '').split(',').map(v => v.trim())
}

// ── Engine functions ──────────────────────────────────────────────────────────

export async function createGrid(tableRef, gid, cols, rows, values = [], opts = {}) {
  const d = tableRef?.current
  if (!d?.isReady?.()) return

  // Erase any existing grid with this id before drawing a new one
  if (registry.has(gid)) await eraseGrid(tableRef, gid)

  const layout  = computeLayout(cols, rows)
  const color   = opts.color ?? 'rgba(255,255,255,0.38)'
  const headerRow = opts.headerRow ?? false
  const { x0, y0, cellW, cellH, totalW, totalH } = layout
  const x1 = x0 + totalW
  const y1 = y0 + totalH

  d.setGrid({ cols, rows, x0, y0, cellW, cellH })

  // ── 1. Top border ──────────────────────────────────────────────────────────
  d.addLines({ [`${gid}_top`]: { x1: x0, y1: y0, x2: x1, y2: y0, progress: 0, color, strokeWidth: 2 } })
  await d.animateLine(`${gid}_top`, 320)

  // ── 2. Vertical lines (left border + column separators + right border) ─────
  const vertMap = {}
  for (let i = 0; i <= cols; i++) {
    const lx = x0 + i * cellW
    vertMap[`${gid}_v${i}`] = {
      x1: lx, y1: y0, x2: lx, y2: y1, progress: 0, color,
      strokeWidth: (i === 0 || i === cols) ? 2 : 1.5,
    }
  }
  d.addLines(vertMap)
  await d.animateLinesStaggered(
    Array.from({ length: cols + 1 }, (_, i) => `${gid}_v${i}`),
    270, 55
  )

  // ── 3. Horizontal row separators + bottom border ───────────────────────────
  const horizMap = {}
  for (let j = 1; j <= rows; j++) {
    const ly = y0 + j * cellH
    horizMap[`${gid}_h${j}`] = {
      x1: x0, y1: ly, x2: x1, y2: ly, progress: 0, color,
      strokeWidth: j === rows ? 2 : 1.5,
    }
  }
  d.addLines(horizMap)
  await d.animateLinesStaggered(
    Array.from({ length: rows }, (_, j) => `${gid}_h${j + 1}`),
    270, 50
  )

  // ── 4. Fade in cell values ─────────────────────────────────────────────────
  const cells = buildCells(gid, cols, rows, values, headerRow, layout)
  d.addCells(cells)
  await d.fadeInCells(Object.keys(cells), 400)

  registry.set(gid, { cols, rows, values: values.map(r => [...(r ?? [])]), layout, color, headerRow })
}

export async function eraseGrid(tableRef, gid) {
  const d = tableRef?.current
  if (!d || !registry.has(gid)) return

  // Erase by prefix — catches every element ever added to this grid,
  // regardless of how many add/remove operations happened.
  const prefix = `${gid}_`
  const lineIds = Object.keys(d.getLines()).filter(id => id.startsWith(prefix))
  const cellIds = Object.keys(d.getCells()).filter(id => id.startsWith(prefix))

  await Promise.all([
    lineIds.length ? d.fadeOutLines(lineIds, 320) : Promise.resolve(),
    cellIds.length ? d.fadeOutCells(cellIds, 320) : Promise.resolve(),
    clearRowHighlight(tableRef, gid),
  ])
  registry.delete(gid)
}

// ── addColumn ─────────────────────────────────────────────────────────────────
// Surgical: keeps existing grid intact, extends lines and adds new column.
export async function addColumn(tableRef, gid, colValues = []) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e) return

  const { cols, rows, values, layout, color, headerRow } = e
  const { y0, cellW, cellH, totalH } = layout
  // Re-center horizontally for new column count
  const newX0     = Math.round((SVG_W - (cols + 1) * cellW) / 2)
  const newRightX = newX0 + (cols + 1) * cellW

  // Downgrade old right border to separator weight
  d.updateLines({ [`${gid}_v${cols}`]: { strokeWidth: 1.5 } })

  // Add new right-border line (undrawn, already at its final centered position)
  d.addLines({
    [`${gid}_v${cols + 1}`]: {
      x1: newRightX, y1: y0, x2: newRightX, y2: y0 + totalH,
      progress: 0, color, strokeWidth: 2,
    },
  })

  // All moves: shift existing verticals + extend horizontals — everything centered
  const lineMoves = {}
  for (let i = 0; i <= cols; i++) {
    const nx = newX0 + i * cellW
    lineMoves[`${gid}_v${i}`] = { x1: nx, x2: nx }
  }
  lineMoves[`${gid}_top`] = { x1: newX0, x2: newRightX }
  for (let j = 1; j <= rows; j++) lineMoves[`${gid}_h${j}`] = { x1: newX0, x2: newRightX }

  // Shift all existing cells to new centered positions
  const cellMoves = {}
  for (let col = 0; col < cols; col++)
    for (let row = 0; row < rows; row++)
      cellMoves[cellId(gid, col, row)] = { cx: newX0 + col * cellW + cellW / 2 }

  await Promise.all([
    d.animateManyLineProps(lineMoves, 260),
    Object.keys(cellMoves).length ? d.animateCellPositions(cellMoves, 260) : Promise.resolve(),
    d.animateLine(`${gid}_v${cols + 1}`, 260),
  ])

  // Fade in new column cells at their centered positions
  const newValues = values.map((row, ri) => [...row, colValues[ri] ?? ''])
  const newCells = {}
  for (let row = 0; row < rows; row++) {
    const id = cellId(gid, cols, row)
    newCells[id] = {
      col: cols, row,
      cx: newX0 + cols * cellW + cellW / 2,
      cy: y0 + row * cellH + cellH / 2,
      value: colValues[row] ?? '',
      opacity: 0,
      isHeader: headerRow && row === 0,
    }
  }
  d.addCells(newCells)
  await d.fadeInCells(Object.keys(newCells), 350)

  registry.set(gid, {
    ...e,
    cols: cols + 1,
    values: newValues,
    layout: { ...layout, x0: newX0, totalW: (cols + 1) * cellW },
  })
}

// ── removeColumn ──────────────────────────────────────────────────────────────
export async function removeColumn(tableRef, gid, colIndex = -1) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e || e.cols <= 1) return

  const { cols, rows, values, layout, color, headerRow } = e
  const { y0, cellW, cellH } = layout
  const ci = colIndex < 0 ? cols - 1 : Math.min(colIndex, cols - 1)

  // 1. Fade out target column cells
  const colCellIds = Array.from({ length: rows }, (_, row) => cellId(gid, ci, row))
  await d.fadeOutCells(colCellIds, 180)

  // 2. Fade out the separator on the right of the removed column
  await d.fadeOutLines([`${gid}_v${ci + 1}`], 140)

  // 3. Re-center for new column count
  const newX0     = Math.round((SVG_W - (cols - 1) * cellW) / 2)
  const newRightX = newX0 + (cols - 1) * cellW

  // Promote new right border if needed
  if (ci === cols - 1) d.updateLines({ [`${gid}_v${ci}`]: { strokeWidth: 2 } })

  // 4. Animate all lines to centered positions
  const lineMoves = {}
  lineMoves[`${gid}_top`] = { x1: newX0, x2: newRightX }
  for (let j = 1; j <= rows; j++) lineMoves[`${gid}_h${j}`] = { x1: newX0, x2: newRightX }
  // Verticals left of removed col: just re-center
  for (let i = 0; i <= ci; i++) {
    const nx = newX0 + i * cellW
    lineMoves[`${gid}_v${i}`] = { x1: nx, x2: nx }
  }
  // Verticals right of removed col: re-center + shift left by one slot
  for (let i = ci + 2; i <= cols; i++) {
    const nx = newX0 + (i - 1) * cellW
    lineMoves[`${gid}_v${i}`] = { x1: nx, x2: nx }
  }

  // 5. Animate cells to new centered positions (column indices also shift for cols > ci)
  const cellMoves = {}
  for (let col = 0; col < cols; col++) {
    if (col === ci) continue
    const newCol = col < ci ? col : col - 1
    for (let row = 0; row < rows; row++)
      cellMoves[cellId(gid, col, row)] = { cx: newX0 + newCol * cellW + cellW / 2 }
  }

  await Promise.all([
    d.animateManyLineProps(lineMoves, 250),
    Object.keys(cellMoves).length ? d.animateCellPositions(cellMoves, 250) : Promise.resolve(),
  ])

  // 6. Rename IDs for consistency
  const cellRenames = {}
  for (let col = ci + 1; col < cols; col++)
    for (let row = 0; row < rows; row++)
      cellRenames[cellId(gid, col, row)] = cellId(gid, col - 1, row)
  if (Object.keys(cellRenames).length) d.renameCells(cellRenames)

  const lineRenames = {}
  for (let i = ci + 2; i <= cols; i++) lineRenames[`${gid}_v${i}`] = `${gid}_v${i - 1}`
  if (Object.keys(lineRenames).length) d.renameLines(lineRenames)

  const newValues = values.map(row => row.filter((_, i) => i !== ci))
  registry.set(gid, {
    ...e,
    cols: cols - 1,
    values: newValues,
    layout: { ...layout, x0: newX0, totalW: (cols - 1) * cellW },
  })
}

// ── addRow ────────────────────────────────────────────────────────────────────
export async function addRow(tableRef, gid, rowValues = []) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e) return

  const { cols, rows, values, layout, color, headerRow } = e
  const { x0, cellW, cellH, totalW } = layout
  // Re-center vertically for new row count
  const newY0       = Math.round((SVG_H - (rows + 1) * cellH) / 2)
  const newBottomY  = newY0 + (rows + 1) * cellH

  // Downgrade old bottom border to separator weight
  d.updateLines({ [`${gid}_h${rows}`]: { strokeWidth: 1.5 } })

  // Add new bottom-border line (undrawn, at final centered position)
  d.addLines({
    [`${gid}_h${rows + 1}`]: {
      x1: x0, y1: newBottomY, x2: x0 + totalW, y2: newBottomY,
      progress: 0, color, strokeWidth: 2,
    },
  })

  // Shift all verticals to new top + extend downward; shift all horizontals up
  const lineMoves = {}
  for (let i = 0; i <= cols; i++) lineMoves[`${gid}_v${i}`] = { y1: newY0, y2: newBottomY }
  lineMoves[`${gid}_top`] = { y1: newY0, y2: newY0 }
  for (let j = 1; j <= rows; j++) {
    const ny = newY0 + j * cellH
    lineMoves[`${gid}_h${j}`] = { y1: ny, y2: ny }
  }

  // Shift all existing cells up
  const cellMoves = {}
  for (let col = 0; col < cols; col++)
    for (let row = 0; row < rows; row++)
      cellMoves[cellId(gid, col, row)] = { cy: newY0 + row * cellH + cellH / 2 }

  await Promise.all([
    d.animateManyLineProps(lineMoves, 260),
    Object.keys(cellMoves).length ? d.animateCellPositions(cellMoves, 260) : Promise.resolve(),
    d.animateLine(`${gid}_h${rows + 1}`, 260),
  ])

  // Fade in new row cells at centered positions
  const newRow = Array.from({ length: cols }, (_, ci) => rowValues[ci] ?? '')
  const newValues = [...values, newRow]
  const newCells = {}
  for (let col = 0; col < cols; col++) {
    const id = cellId(gid, col, rows)
    newCells[id] = {
      col, row: rows,
      cx: x0 + col * cellW + cellW / 2,
      cy: newY0 + rows * cellH + cellH / 2,
      value: rowValues[col] ?? '',
      opacity: 0,
      isHeader: false,
    }
  }
  d.addCells(newCells)
  await d.fadeInCells(Object.keys(newCells), 350)

  registry.set(gid, {
    ...e,
    rows: rows + 1,
    values: newValues,
    layout: { ...layout, y0: newY0, totalH: (rows + 1) * cellH },
  })
}

// ── removeRow ─────────────────────────────────────────────────────────────────
export async function removeRow(tableRef, gid, rowIndex = -1) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e || e.rows <= 1) return

  const { cols, rows, values, layout, color, headerRow } = e
  const { x0, cellW, cellH } = layout
  const ri = rowIndex < 0 ? rows - 1 : Math.min(rowIndex, rows - 1)

  // 1. Fade out target row cells
  const rowCellIds = Array.from({ length: cols }, (_, col) => cellId(gid, col, ri))
  await d.fadeOutCells(rowCellIds, 180)

  // 2. Fade out the separator below the removed row
  await d.fadeOutLines([`${gid}_h${ri + 1}`], 140)

  // 3. Re-center for new row count
  const newY0      = Math.round((SVG_H - (rows - 1) * cellH) / 2)
  const newBottomY = newY0 + (rows - 1) * cellH

  // Promote new bottom border if needed
  if (ri === rows - 1) d.updateLines({ [`${gid}_h${ri}`]: { strokeWidth: 2 } })

  // 4. Animate all lines to new centered positions
  const lineMoves = {}
  for (let i = 0; i <= cols; i++) lineMoves[`${gid}_v${i}`] = { y1: newY0, y2: newBottomY }
  lineMoves[`${gid}_top`] = { y1: newY0, y2: newY0 }
  // Horizontals above removed row: re-center
  for (let j = 1; j <= ri; j++) {
    const ny = newY0 + j * cellH
    lineMoves[`${gid}_h${j}`] = { y1: ny, y2: ny }
  }
  // Horizontals below removed row: re-center + shift up one slot
  for (let j = ri + 2; j <= rows; j++) {
    const ny = newY0 + (j - 1) * cellH
    lineMoves[`${gid}_h${j}`] = { y1: ny, y2: ny }
  }

  // 5. Animate cells to new centered positions
  const cellMoves = {}
  for (let row = 0; row < rows; row++) {
    if (row === ri) continue
    const newRow = row < ri ? row : row - 1
    for (let col = 0; col < cols; col++)
      cellMoves[cellId(gid, col, row)] = { cy: newY0 + newRow * cellH + cellH / 2 }
  }

  await Promise.all([
    d.animateManyLineProps(lineMoves, 250),
    Object.keys(cellMoves).length ? d.animateCellPositions(cellMoves, 250) : Promise.resolve(),
  ])

  // 6. Rename IDs for consistency
  const cellRenames = {}
  for (let row = ri + 1; row < rows; row++)
    for (let col = 0; col < cols; col++)
      cellRenames[cellId(gid, col, row)] = cellId(gid, col, row - 1)
  if (Object.keys(cellRenames).length) d.renameCells(cellRenames)

  const lineRenames = {}
  for (let j = ri + 2; j <= rows; j++) lineRenames[`${gid}_h${j}`] = `${gid}_h${j - 1}`
  if (Object.keys(lineRenames).length) d.renameLines(lineRenames)

  const newValues = values.filter((_, i) => i !== ri)
  registry.set(gid, {
    ...e,
    rows: rows - 1,
    values: newValues,
    layout: { ...layout, y0: newY0, totalH: (rows - 1) * cellH },
  })
}

// ── changeValue ───────────────────────────────────────────────────────────────
export async function changeValue(tableRef, gid, col, row, newValue) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e) return
  const id = cellId(gid, col, row)
  await d.updateCell(id, newValue)
  if (!e.values[row]) e.values[row] = []
  e.values[row][col] = newValue
}

// ── changeValues ──────────────────────────────────────────────────────────────
// changes: [{ col, row, value }, ...]
export async function changeValues(tableRef, gid, changes) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e) return
  await Promise.all(changes.map(({ col, row, value }) => {
    if (!e.values[row]) e.values[row] = []
    e.values[row][col] = value
    return d.updateCell(cellId(gid, col, row), value)
  }))
}

// ── highlightRow ────────────────────────────────────────────────────────────
// One movable highlight bar per grid — calling this again just slides the
// same bar to the new row (see animateRowHighlight), which is exactly what
// "walk through a calculation row by row" wants: no separate clear step
// needed between rows.
export async function highlightRow(tableRef, gid, rowIndexRaw, colorRaw) {
  const d = tableRef?.current
  if (!d) return
  const e = registry.get(gid)
  if (!e) return
  const { x0, y0, cellW, cellH, totalW } = e.layout
  const rowIndex = Math.max(0, Math.min(Math.round(rowIndexRaw ?? 0), e.rows - 1))
  const color = colorRaw ?? '#eab308'
  const id = `${gid}_rowhl`
  const rect = { x: x0, y: y0 + rowIndex * cellH, width: totalW, height: cellH, color }

  if (d.getRowHighlight(id)) {
    await d.animateRowHighlight(id, rect)
  } else {
    d.setRowHighlight(id, { ...rect, opacity: 0 })
    await d.fadeRowHighlight(id, 1, 260)
  }
}

// ── clearRowHighlight ────────────────────────────────────────────────────────
export async function clearRowHighlight(tableRef, gid) {
  const d = tableRef?.current
  if (!d) return
  const id = `${gid}_rowhl`
  if (d.getRowHighlight(id)) await d.fadeRowHighlight(id, 0, 220, true)
}

export function getGridIds() {
  return [...registry.keys()]
}

// Live value getter for valueRefs.js's `[gridId]r<row>c<col>` token — both
// 0-indexed to match the authored `data` matrix directly, including changes
// made afterwards via table-change-value/table-change-values.
export function getCellValue(gid, row, col) {
  const v = registry.get(gid)?.values?.[row]?.[col]
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return isFinite(n) ? n : v
}

export function clearAll(tableRef) {
  registry.clear()
  tableRef?.current?.clearAll()
}

export function serializeRegistry() {
  const out = {}
  for (const [id, entry] of registry) {
    out[id] = { ...entry, values: entry.values.map(r => [...r]) }
  }
  return out
}

export function instantRestoreAll(tableRef, displayState, registryData) {
  registry.clear()
  for (const [id, entry] of Object.entries(registryData)) {
    registry.set(id, { ...entry, values: entry.values.map(r => [...r]) })
  }
  tableRef?.current?.instantRestore(displayState)
}
