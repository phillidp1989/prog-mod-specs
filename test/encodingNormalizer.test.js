const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeString,
  normalizeDeep,
} = require('../utils/encodingNormalizer');

test('round-trips smart punctuation to ASCII equivalents', () => {
  // en dash, em dash, curly single quotes, curly double quotes
  const input = 'a – b — c ‘d’ “e”';
  assert.equal(normalizeString(input), 'a - b - c \'d\' "e"');
});

test('converts mangled " ? " dash to a hyphen', () => {
  assert.equal(
    normalizeString('legacies of the past ? across'),
    'legacies of the past - across'
  );
  assert.equal(normalizeString('1880 ? 1953'), '1880 - 1953');
});

test('fixes question-mark contractions', () => {
  assert.equal(normalizeString('don?t'), "don't");
  assert.equal(normalizeString('student?s'), "student's");
  assert.equal(normalizeString('we?ll'), "we'll");
});

test('converts ? between digits to a hyphen (numeric range)', () => {
  assert.equal(normalizeString('1880?1960'), '1880-1960');
  assert.equal(normalizeString('The British Symphony, 1880?1960'), 'The British Symphony, 1880-1960');
  // mid-word letter apostrophe still works alongside the digit rule
  assert.equal(normalizeString('o?clock'), "o'clock");
});

test('converts line-start ? to a list marker', () => {
  assert.equal(normalizeString('? item'), '- item');
  assert.equal(normalizeString('intro\n? item'), 'intro\n- item');
});

test('leaves legitimate text unchanged', () => {
  assert.equal(normalizeString('plain ASCII text'), 'plain ASCII text');
  // a question mark attached to a word is genuine punctuation
  assert.equal(normalizeString('really?'), 'really?');
  assert.equal(normalizeString('Is this correct?'), 'Is this correct?');
});

test('normalizeDeep recurses objects and arrays, leaves non-strings intact', () => {
  const input = {
    title: 'Past ? present',
    count: 42,
    active: true,
    missing: null,
    tags: ['a – b', 'don?t'],
    nested: { aims: 'we?ve learned' },
  };
  const out = normalizeDeep(input);
  assert.equal(out.title, 'Past - present');
  assert.equal(out.count, 42);
  assert.equal(out.active, true);
  assert.equal(out.missing, null);
  assert.deepEqual(out.tags, ['a - b', "don't"]);
  assert.equal(out.nested.aims, "we've learned");
});
