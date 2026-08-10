import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every scroll container is a positioning context, or it does not clip what it claims to.
 *
 * ## The defect this exists to refuse
 *
 * `.sr-only` and `.visually-hidden` both compute to `position: absolute`. An element with
 * `overflow-x: auto` and `position: static` is **not a containing block**, so an absolutely
 * positioned descendant lays itself out against a further ancestor and is not clipped by the
 * scroller at all. The Student rail shipped exactly that: at 390 the page's `scrollWidth` was
 * 1246 against a 390 viewport, and a child could swipe the whole screen 856 pixels into blank
 * space. Proven both directions in the live page — hiding the screen-reader spans, or setting
 * `position: relative` on the `<ol>`, each dropped it back to 390.
 *
 * The accessibility text ADR-0004 requires is what broke the phone layout. Both rules are
 * right; their interaction was the bug.
 *
 * ## Why it is a source scan and not a render test
 *
 * jsdom has no layout engine, so it computes no `scrollWidth` and cannot see this at all. It
 * also cannot see the cascade, so it cannot tell that `.sr-only` is absolute. The rule is
 * about what the markup says, so the markup is what is read.
 *
 * ## Why it is stricter than the defect
 *
 * The bug needs a scroller *and* an absolutely positioned descendant. This asks every
 * scroller for a positioning context whether or not it currently holds one, because the span
 * that reintroduces the bug is added six months later, three components down, by somebody
 * who has never read this file. Adding `relative` to a scroller costs nothing.
 */

const COMPONENTS = resolve(process.cwd(), 'web/components')

/** Enough to establish a containing block for an absolutely positioned child. */
const POSITIONED = /\b(relative|absolute|fixed|sticky)\b/

/** The utilities that make an element scroll. `overflow-hidden` clips without scrolling. */
const SCROLLS = /\boverflow(-[xy])?-(auto|scroll)\b/

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...tsxFiles(full))
      continue
    }
    if (full.endsWith('.tsx') && !full.endsWith('.test.tsx')) out.push(full)
  }
  return out
}

/**
 * Every quoted or backticked run of class names in a file, with its line.
 *
 * Deliberately every string literal rather than only `className=`: these class lists are
 * routinely built in a `cn(...)` call or held in a variable, and a scanner that only read the
 * attribute would miss the two places on the Scope that do exactly that.
 */
function classStrings(source: string): readonly { readonly line: number; readonly text: string }[] {
  const found: { line: number; text: string }[] = []
  source.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(/(['"`])([^'"`\n]*)\1/g)) {
      const text = match[2] ?? ''
      if (SCROLLS.test(text)) found.push({ line: index + 1, text })
    }
  })
  return found
}

describe('a scroll container is a positioning context', () => {
  it('holds for every scroller in the components', () => {
    const offenders: string[] = []

    for (const file of tsxFiles(COMPONENTS)) {
      const source = readFileSync(file, 'utf8')
      for (const { line, text } of classStrings(source)) {
        if (POSITIONED.test(text)) continue
        offenders.push(`${relative(process.cwd(), file)}:${line} — ${text.trim()}`)
      }
    }

    expect(
      offenders,
      'A scroller with no positioning context does not clip an absolutely positioned\n' +
        'descendant, and `.sr-only` is absolutely positioned. Add `relative`.\n' +
        offenders.join('\n'),
    ).toEqual([])
  })

  /* The scanner has to be able to fail, or a green run says nothing. */
  it('would catch a scroller that lost its positioning context', () => {
    const bad = classStrings('<ol className="m-0 flex overflow-x-auto p-0">')
    expect(bad).toHaveLength(1)
    expect(POSITIONED.test(bad[0]!.text)).toBe(false)

    const good = classStrings('<ol className="relative m-0 flex overflow-x-auto p-0">')
    expect(POSITIONED.test(good[0]!.text)).toBe(true)
  })

  /* Clipping without scrolling cannot leak, so it is not asked for a context. */
  it('says nothing about overflow-hidden', () => {
    expect(classStrings('<div className="overflow-hidden">')).toEqual([])
  })
})
