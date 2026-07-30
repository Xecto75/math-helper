/**
 * Text Box Engine — drives TextBoxDisplay.
 * Each box: { id, title, items, isList, color }
 * Items are strings; $...$ in any string is rendered as inline LaTeX.
 */

const registry = new Map()

export function createBox(ref, id, opts = {}) {
  const box = {
    id,
    title:  opts.title  ?? null,
    items:  opts.items  ?? [],
    isList: opts.isList ?? false,
    color:  opts.color  || null,
  }
  registry.set(id, { ...box })
  ref?.current?.addBox(box)
}

export function removeBox(ref, id) {
  registry.delete(id)
  ref?.current?.removeBox(id)
}

export function addItem(ref, id, text) {
  const entry = registry.get(id)
  if (!entry) return
  entry.items = [...entry.items, text]
  ref?.current?.addItem(id, text)
}

export function removeItem(ref, id, index) {
  const entry = registry.get(id)
  if (!entry) return
  const idx = index < 0 ? entry.items.length + index : index
  entry.items = entry.items.filter((_, i) => i !== idx)
  ref?.current?.removeItem(id, idx)
}

export function updateTitle(ref, id, title) {
  const entry = registry.get(id)
  if (!entry) return
  entry.title = title
  ref?.current?.updateTitle(id, title)
}

export function replaceItems(ref, id, items) {
  const entry = registry.get(id)
  if (!entry) return
  entry.items = [...items]
  ref?.current?.replaceItems(id, [...items])
}

export function updateBoxColor(ref, id, color) {
  const entry = registry.get(id)
  if (!entry) return
  entry.color = color
  ref?.current?.updateBoxColor(id, color)
}

// Page teardown: instant. Everything else on the canvas is being wiped in the
// same breath, and a lingering fade would overlap the next page's build.
export function clearAll(ref) {
  registry.clear()
  ref?.current?.clearAllNow?.()
}

// The authored "clear the text panel" step, mid-lesson — that one the viewer
// watches happen, so the cards fade out the way they faded in.
export function clearAllAnimated(ref) {
  registry.clear()
  ref?.current?.clearAll()
}

export function getBoxIds() {
  return [...registry.keys()]
}

export function serializeRegistry() {
  const out = {}
  for (const [id, entry] of registry) {
    out[id] = { ...entry, items: [...entry.items] }
  }
  return out
}

export function restoreRegistryOnly(data) {
  registry.clear()
  for (const [id, entry] of Object.entries(data)) {
    registry.set(id, { ...entry, items: [...entry.items] })
  }
}

export function restoreAll(ref, data) {
  registry.clear()
  ref?.current?.clearAll()
  for (const [id, entry] of Object.entries(data)) {
    const box = { ...entry, items: [...entry.items] }
    registry.set(id, box)
    ref?.current?.addBox(box)
  }
}
