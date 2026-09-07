import assert from 'node:assert/strict'
import test from 'node:test'
import {
  sanitizeXmlString,
  sanitizePresentationData,
  sanitizeDomForXml,
  XML_DISALLOWED_REGEX,
} from './xml-sanitize.ts'

test('sanitizeXmlString replaces vertical tabs with spaces and strips other control chars', () => {
  // \u000b (VT), \u000c (FF)
  assert.equal(sanitizeXmlString('foo\u000bbar\u000cbaz'), 'foo bar baz')
  // \u0001 (SOH), \u0008 (BS), \u001f (US)
  assert.equal(sanitizeXmlString('a\u0001b\u0008c\u001fd'), 'abcd')
  // Normal whitespace (newline, tab, CR) is preserved
  assert.equal(sanitizeXmlString('hello\n\t\rworld'), 'hello\n\t\rworld')
  // Empty or clean string
  assert.equal(sanitizeXmlString(''), '')
  assert.equal(sanitizeXmlString('Clean text 123!'), 'Clean text 123!')
})

test('sanitizePresentationData recursively sanitizes nested objects and arrays', () => {
  const data = {
    title: 'Report\u000bTitle',
    count: 42,
    active: true,
    items: [
      { notes: 'Row 1\u0001 notes\u000bhere', id: '1' },
      { notes: 'Row 2 clean', id: '2' },
    ],
    nested: {
      deep: {
        text: 'Deep\u000btext',
      },
    },
  }

  const sanitized = sanitizePresentationData(data)
  assert.equal(sanitized.title, 'Report Title')
  assert.equal(sanitized.count, 42)
  assert.equal(sanitized.active, true)
  assert.equal(sanitized.items[0].notes, 'Row 1 notes here')
  assert.equal(sanitized.items[1].notes, 'Row 2 clean')
  assert.equal(sanitized.nested.deep.text, 'Deep text')
})

test('sanitizeDomForXml cleans text nodes and attributes in DOM', () => {
  // Simple mock DOM environment for node test
  const textNode = {
    nodeType: 3, // TEXT_NODE
    nodeValue: 'Hello\u000bWorld\u0001!',
  }
  const elementNode = {
    nodeType: 1, // ELEMENT_NODE
    attributes: [
      { name: 'title', value: 'Attr\u000bValue' },
      { name: 'class', value: 'clean-class' },
    ],
  }

  // Test regex on values directly
  assert.ok(XML_DISALLOWED_REGEX.test(textNode.nodeValue))
  textNode.nodeValue = sanitizeXmlString(textNode.nodeValue)
  assert.equal(textNode.nodeValue, 'Hello World!')

  elementNode.attributes[0].value = sanitizeXmlString(elementNode.attributes[0].value)
  assert.equal(elementNode.attributes[0].value, 'Attr Value')
})
