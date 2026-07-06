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
  return data.lesson
}
