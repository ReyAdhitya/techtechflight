import { describe, expect, it } from 'vitest'
import { swatchForLabel } from './detection-palette.ts'

describe('swatchForLabel', () => {
  it('gives person a purple fill so it is distinct from furniture', () => {
    const person = swatchForLabel('person')
    expect(person.fill.toLowerCase()).toBe('#7c3aed')
    expect(person.text).toBe('#ffffff')
  })

  it('gives laptop a different fill from person', () => {
    expect(swatchForLabel('laptop').fill).not.toBe(swatchForLabel('person').fill)
  })

  it('is stable for an unknown label', () => {
    expect(swatchForLabel('widget-x').fill).toBe(swatchForLabel('widget-x').fill)
  })
})
