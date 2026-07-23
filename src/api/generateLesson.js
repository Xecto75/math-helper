const STATUS_FALLBACK = {
  'off-topic': "I'm focused on math only — try a question about algebra, geometry, trigonometry, calculus…",
  clarify:     'Which math topic? (e.g. algebra, geometry, trigonometry…)',
  trivial:     "That's already a one-line answer — try a topic worth a full lesson.",
}

export async function generateLesson(prompt) {
  const res = await fetch('/api/generate-lesson', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (!res.ok) {
    if (data.rawOutput) {
      console.group('%c[generateLesson] raw API output (parse failed)', 'color:#f87171;font-weight:bold')
      console.log(data.rawOutput)
      console.groupEnd()
    }
    const err = new Error(data.error ?? `Server error ${res.status}`)
    err.rawOutput = data.rawOutput ?? null
    throw err
  }
  if (data.status && data.status !== 'ok') {
    const err = new Error(data.message ?? STATUS_FALLBACK[data.status] ?? 'Could not generate a lesson for that.')
    err.status = data.status
    throw err
  }
  return data.lesson
}
