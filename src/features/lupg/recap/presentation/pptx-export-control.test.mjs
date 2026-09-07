import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real component handlers with a small hook/element harness, no DOM dependency.
function mountControl(props, activePalette = 'sage-green') {
  const path = new URL('./pptx-export-control.tsx', import.meta.url)
  assert.ok(existsSync(path), 'reusable export control must exist')
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  let cursor = 0
  const slots = [],
    notices = []
  const hooks = {
    useState(initial) {
      const i = cursor++
      if (!(i in slots))
        slots[i] = typeof initial === 'function' ? initial() : initial
      return [
        slots[i],
        (v) => {
          slots[i] = typeof v === 'function' ? v(slots[i]) : v
        },
      ]
    },
    useRef(initial) {
      const i = cursor++
      return (slots[i] ??= { current: initial })
    },
    useId() {
      return 'theme-label'
    },
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id === 'react') return hooks
      if (id === 'react/jsx-runtime')
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        }
      if (id.includes('palette-provider'))
        return {
          usePalette: () => ({
            palette: activePalette,
            setPalette() {
              assert.fail('export must not change app palette')
            },
          }),
        }
      if (id === 'sonner')
        return {
          toast: Object.fromEntries(
            ['success', 'warning', 'error'].map((kind) => [
              kind,
              (...args) => notices.push({ kind, args }),
            ])
          ),
        }
      return new Proxy({}, { get: (_, name) => name })
    },
  })
  const render = () => {
    cursor = 0
    return exports.PptxExportControl(props)
  }
  const find = (type, node = render()) => {
    if (!node || typeof node !== 'object') return
    if (node.type === type) return node
    for (const child of [node.props?.children].flat(Infinity)) {
      if (!child) continue
      const found = find(type, child)
      if (found) return found
    }
  }
  return { render, find, notices }
}

test('theme defaults to active palette, stays local, and export awaits completion without duplicates', async () => {
  let finish,
    calls = 0,
    received
  const h = mountControl({
    onExport: (palette) => {
      calls++
      received = palette
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  assert.equal(h.find('ToggleGroup').props.value, 'sage-green')
  h.find('ToggleGroup').props.onValueChange('anthropic-claude')
  assert.equal(h.find('ToggleGroup').props.value, 'anthropic-claude')
  h.find('ToggleGroup').props.onValueChange('')
  assert.equal(h.find('ToggleGroup').props.value, 'anthropic-claude')
  const click = h.find('Button').props.onClick
  const pending = click()
  await click()
  assert.equal(calls, 1)
  assert.equal(received, 'anthropic-claude')
  assert.equal(h.find('Button').props.disabled, true)
  assert.equal(h.find('ToggleGroup').props.disabled, true)
  assert.deepEqual(h.notices, [])
  finish({ warnings: [] })
  await pending
  assert.equal(h.find('Button').props.disabled, false)
  assert.equal(h.notices[0].kind, 'success')
})

test('warnings and fatal failures restore controls and report the correct outcome', async () => {
  let fail = false
  const h = mountControl({
    onExport: async () => {
      if (fail) throw new Error('write failed')
      return { warnings: ['photo missing', 'photo expired'] }
    },
  })
  await h.find('Button').props.onClick()
  assert.equal(h.notices[0].kind, 'warning')
  assert.match(JSON.stringify(h.notices[0]), /2/)
  fail = true
  await h.find('Button').props.onClick()
  assert.equal(h.notices[1].kind, 'error')
  assert.match(JSON.stringify(h.notices[1]), /write failed/i)
  assert.equal(h.find('Button').props.disabled, false)
})

test('capture progress is exposed while the export is pending', async () => {
  let finish
  const h = mountControl({
    onExport: (_palette, onProgress) => {
      assert.equal(typeof onProgress, 'function')
      onProgress({ phase: 'capture', completed: 3, total: 12 })
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  const pending = h.find('Button').props.onClick()
  assert.ok(JSON.stringify(h.render()).includes('3/12'))
  finish({ warnings: [] })
  await pending
})

test('disabled picker cannot export and compact player exposes a chooser', async () => {
  const h = mountControl({
    disabled: true,
    onExport: () => assert.fail('unresolved scope exported'),
  })
  assert.equal(h.find('Button').props.disabled, true)
  await h.find('Button').props.onClick()
  const compact = mountControl({
    compact: true,
    onExport: async () => ({ warnings: [] }),
  })
  assert.ok(compact.find('Popover'))
  assert.ok(compact.find('PopoverTrigger'))
  assert.equal(
    compact.find('PopoverContent').props['data-presentation-no-navigation'],
    true
  )
})
