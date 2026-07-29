// ── Full API transcript, on disk ─────────────────────────────────────────────
// The console truncates long system prompts, wraps badly, and is gone the next
// time the server restarts. Every custom-prompt run therefore also writes a
// plain-text transcript to logs/ containing the COMPLETE request and response
// of every Anthropic call it made — system prompt, user message, raw output,
// usage, stop reason — and opens it in the default text editor when it is done.
//
// Set LESSON_TRACE=0 to stop writing them, or LESSON_TRACE_OPEN=0 to keep
// writing but stop auto-opening.
import fs   from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { costOf, rateFor } from './pricing.js'

const DIR       = path.join(process.cwd(), 'logs')
const ENABLED   = process.env.LESSON_TRACE      !== '0'
const AUTO_OPEN = process.env.LESSON_TRACE_OPEN !== '0'

const RULE = '='.repeat(78)
const rule = '-'.repeat(78)

function stamp(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
         `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

// A system prompt is either a plain string or an array of content blocks with
// cache_control; a user message likewise. Flatten both to readable text rather
// than dumping JSON, since the whole point is to read the prompt.
function flatten(content) {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(b => {
      if (typeof b === 'string') return b
      const cached = b.cache_control ? '  [cache_control: ' + b.cache_control.type + ']' : ''
      return (b.text ?? JSON.stringify(b)) + cached
    }).join('\n')
  }
  return JSON.stringify(content, null, 2)
}

export function textOf(message) {
  return (message?.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
}

// Opening the file is best-effort: a failure here must never break generation.
function openFile(file) {
  const cmd = process.platform === 'win32'  ? `start "" "${file}"`
            : process.platform === 'darwin' ? `open "${file}"`
            :                                 `xdg-open "${file}"`
  exec(cmd, err => { if (err) console.warn('  trace: could not auto-open —', err.message) })
}

export function startTrace(prompt, lang) {
  const started = new Date()
  const parts   = []
  let   nCalls  = 0
  let   total   = 0

  const trace = {
    file: path.join(DIR, `lesson-${stamp(started)}.txt`),
    enabled: ENABLED,

    section(title, body) {
      parts.push(`\n${RULE}\n${title}\n${RULE}\n${body}\n`)
    },

    note(line) {
      parts.push(line + '\n')
    },

    // Every Anthropic call goes through here, so nothing can be logged
    // partially or forgotten.
    call(label, params, message, ms) {
      nCalls++
      const u = message?.usage ?? {}
      const usage = Object.entries(u)
        .map(([k, v]) => `${k}=${v !== null && typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('  ')
      // Split in/out so it is obvious which half of the bill a long system
      // prompt is actually driving.
      const rate    = rateFor(params.model)
      const costIn  = costOf(params.model, { ...u, output_tokens: 0 })
      const costOut = ((u.output_tokens ?? 0) * rate.out) / 1_000_000
      const cost    = costIn + costOut
      total += cost

      trace.section(`CALL ${nCalls} — ${label}`,
        [
          `model:       ${params.model}`,
          `max_tokens:  ${params.max_tokens}`,
          `duration:    ${ms}ms`,
          `stop_reason: ${message?.stop_reason ?? '—'}`,
          `usage:       ${usage || '—'}`,
          `cost:        in $${costIn.toFixed(5)} + out $${costOut.toFixed(5)}` +
          ` = $${cost.toFixed(5)}   (running total $${total.toFixed(5)})`,
          '',
          `${rule}\nINPUT — system (${flatten(params.system).length} chars)\n${rule}`,
          flatten(params.system) || '(none)',
          '',
          `${rule}\nINPUT — messages\n${rule}`,
          (params.messages ?? []).map(m => `[${m.role}]\n${flatten(m.content)}`).join('\n\n'),
          '',
          `${rule}\nOUTPUT — raw text (${textOf(message).length} chars)\n${rule}`,
          textOf(message) || '(empty)',
        ].join('\n'))
    },

    finish() {
      if (!ENABLED) return null
      try {
        fs.mkdirSync(DIR, { recursive: true })
        const header =
          `LESSON GENERATION TRACE\n${started.toISOString()}\n` +
          `${nCalls} API call(s), ${Date.now() - started.getTime()}ms, ` +
          `TOTAL COST $${total.toFixed(5)}\n`
        fs.writeFileSync(trace.file, header + parts.join(''), 'utf8')
        console.log(`  trace → ${trace.file}`)
        if (AUTO_OPEN) openFile(trace.file)
        return trace.file
      } catch (e) {
        console.warn('  trace: could not write —', e.message)
        return null
      }
    },
  }

  trace.section('USER PROMPT', `lang: ${lang}\n\n${prompt}`)
  return trace
}
