'use strict';

/**
 * Local ESLint plugin for ChoirHub.
 *
 * `no-magic-tokens` — every color, radius, spacing, and font size must come
 * from packages/ui/src/tokens.ts (Design System v1.0.0). This rule errors on:
 *   - raw color literals (hex `#4f46e5`, `rgb()/rgba()`, `hsl()/hsla()`)
 *   - raw numeric px values assigned to size/spacing style properties
 *
 * tokens.ts itself is exempted in eslint.config.js — it is the one place
 * raw values are allowed to live.
 */

const COLOR_LITERAL = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\brgba?\(|\bhsla?\(/;

const PX_PROPERTIES = new Set([
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'marginHorizontal',
  'marginVertical',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingEnd',
  'paddingHorizontal',
  'paddingVertical',
  'top',
  'bottom',
  'left',
  'right',
  'gap',
  'rowGap',
  'columnGap',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderWidth',
  'fontSize',
  'lineHeight',
  'letterSpacing',
]);

const noMagicTokens = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow raw color and px values; use tokens from @choirhub/ui (packages/ui/src/tokens.ts)',
    },
    messages: {
      rawColor:
        'Raw color "{{value}}" is not allowed. Use a color token from @choirhub/ui tokens.ts (add the token first if it is missing).',
      rawPx:
        'Raw px value {{value}} for "{{property}}" is not allowed. Use a spacing/radius/font token from @choirhub/ui tokens.ts.',
    },
    schema: [],
  },

  create(context) {
    function propertyName(property) {
      if (property.key.type === 'Identifier' && !property.computed) {
        return property.key.name;
      }
      if (property.key.type === 'Literal') {
        return String(property.key.value);
      }
      return null;
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string' && COLOR_LITERAL.test(node.value)) {
          context.report({
            node,
            messageId: 'rawColor',
            data: { value: node.value },
          });
        }
      },

      TemplateLiteral(node) {
        const raw = node.quasis.map((q) => q.value.raw).join('');
        if (COLOR_LITERAL.test(raw)) {
          context.report({
            node,
            messageId: 'rawColor',
            data: { value: raw },
          });
        }
      },

      Property(node) {
        const name = propertyName(node);
        if (name === null || !PX_PROPERTIES.has(name)) {
          return;
        }
        let value = node.value;
        if (
          value.type === 'UnaryExpression' &&
          value.operator === '-' &&
          value.argument.type === 'Literal'
        ) {
          value = value.argument;
        }
        if (value.type === 'Literal' && typeof value.value === 'number' && value.value !== 0) {
          context.report({
            node: node.value,
            messageId: 'rawPx',
            data: { value: String(node.value.value ?? value.value), property: name },
          });
        }
      },
    };
  },
};

module.exports = {
  meta: {
    name: 'eslint-plugin-choirhub',
    version: '0.1.0',
  },
  rules: {
    'no-magic-tokens': noMagicTokens,
  },
};
