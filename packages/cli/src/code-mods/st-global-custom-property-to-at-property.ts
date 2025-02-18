import { CSSVarSymbol, Diagnostics, validateCustomPropertyName } from '@stylable/core';
import { CSSCustomProperty } from '@stylable/core/dist/features';
import type { AtRule } from 'postcss';
import type { CodeMod } from './types';

export const stGlobalCustomPropertyToAtProperty: CodeMod = ({ ast, diagnostics, postcss }) => {
    let changed = false;
    ast.walkAtRules('st-global-custom-property', (atRule) => {
        const properties = parseStGlobalCustomProperty(atRule, diagnostics);

        if (!diagnostics.reports.length) {
            for (const property of properties) {
                atRule.before(
                    postcss.atRule({
                        name: 'property',
                        params: `st-global(${property.name})`,
                    })
                );
            }
            atRule.remove();
            changed = true;
        }
    });

    return {
        changed,
    };
};

function parseStGlobalCustomProperty(atRule: AtRule, diagnostics: Diagnostics): CSSVarSymbol[] {
    const cssVars: CSSVarSymbol[] = [];
    const cssVarsByComma = atRule.params.split(',');
    const cssVarsBySpacing = atRule.params
        .trim()
        .split(/\s+/g)
        .filter((s) => s !== ',');

    if (cssVarsBySpacing.length > cssVarsByComma.length) {
        diagnostics.warn(
            atRule,
            CSSCustomProperty.diagnostics.GLOBAL_CSS_VAR_MISSING_COMMA(atRule.params),
            {
                word: atRule.params,
            }
        );
        return cssVars;
    }

    for (const entry of cssVarsByComma) {
        const cssVar = entry.trim();

        if (validateCustomPropertyName(cssVar)) {
            cssVars.push({
                _kind: 'cssVar',
                name: cssVar,
                global: true,
                alias: undefined,
            });
        } else {
            diagnostics.warn(atRule, CSSCustomProperty.diagnostics.ILLEGAL_GLOBAL_CSS_VAR(cssVar), {
                word: cssVar,
            });
        }
    }

    return cssVars;
}
