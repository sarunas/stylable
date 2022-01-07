import { parse, AnyNode } from 'postcss';
import { parseCSSValue, stringifyCSSValue } from '@tokey/css-value-parser';

export function formatCSS(css: string) {
    const ast = parse(css);
    const NL = getLineEnding(css);
    const indent = '    ';
    const indentLevel = 0;
    ast.nodes.forEach((node, i) => formatAst(node, i, { NL, indent, indentLevel }));
    const outputCSS = ast.toString();
    return outputCSS.endsWith('\n') || outputCSS.length === 0 ? outputCSS : outputCSS + NL;
}

type FormatOptions = {
    NL: string;
    indent: string;
    indentLevel: number;
};

function formatAst(ast: AnyNode, index: number, options: FormatOptions) {
    const { NL, indent, indentLevel } = options;
    if (ast.type === 'atrule') {
        // TODO: handle case the raws contains comments
        // TODO: handle params

        /* The postcss type does not represent the reality there are atRules without nodes */
        const childrenLen = ast.nodes?.length ?? -1;
        ast.raws.before = index !== 0 || indentLevel > 0 ? NL + indent.repeat(indentLevel) : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.afterName = ast.params.length ? ' ' : '';
        ast.raws.between = childrenLen === -1 ? '' : ' ';
    } else if (ast.type === 'rule') {
        const childrenLen = ast.nodes.length;
        // TODO: handle case the raws contains comments
        ast.raws.before = index !== 0 || indentLevel > 0 ? NL + indent.repeat(indentLevel) : '';
        ast.raws.after = childrenLen ? NL + indent.repeat(indentLevel) : '';
        ast.raws.between = ' ';
        ast.raws.semicolon = childrenLen ? true : false;
        ast.selector = formatSelectors(ast.selectors);
    } else if (ast.type === 'decl') {
        ast.raws.before = NL + indent.repeat(indentLevel);
        if (ast.variable) {
            // TODO: handle case the raws contains comments
            ast.raws.between =
                ast.raws.between?.trimStart() ||
                ':' /* no space here! css vars are space sensitive */;
        } else {
            const valueGroups = groupMultipleValuesSeparatedByComma(parseCSSValue(ast.value));

            // TODO: handle case the raws contains comments
            ast.raws.between = ': ';

            const warpLineIndentSize =
                ast.prop.length + ast.raws.before.length - 1 /* -1 NL */ + ast.raws.between.length;

            const strs = valueGroups.map((valueAst) => stringifyCSSValue(valueAst));
            const newValue2 = groupBySize(strs).join(`,\n${' '.repeat(warpLineIndentSize)}`);

            ast.value = newValue2;
            if (ast.raws.value /* The postcss type does not represent the reality */) {
                delete (ast.raws as any).value;
            }
        }
    } else if (ast.type === 'comment') {
        /* TODO */
    }
    if ('nodes' in ast) {
        ast.nodes.forEach((node, i) =>
            formatAst(node, i, { NL, indent, indentLevel: indentLevel + 1 })
        );
    }
}

function groupMultipleValuesSeparatedByComma(ast: ReturnType<typeof parseCSSValue>) {
    const groups = [];
    let currentGroup = [];
    for (const node of ast) {
        if (node.type === 'literal' && node.value === ',') {
            groups.push(currentGroup);
            currentGroup = [];
        } else {
            currentGroup.push(node);
        }
    }
    if (currentGroup.length) {
        groups.push(currentGroup);
    }
    return groups;
}

function formatSelectors(selectors: string[]) {
    // sort selectors by length from short to long
    selectors.sort((a, b) => a.length - b.length);
    const selectorsFormatted = groupBySize(selectors);
    return selectorsFormatted.join(',\n');
}

function groupBySize(parts: string[], joinWith = ', ') {
    const maxLength = 50;
    const grouped = [];
    let currentGroup = [];
    let currentGroupLength = 0;
    for (const part of parts) {
        currentGroup.push(part);
        currentGroupLength += part.length;
        if (currentGroupLength >= maxLength) {
            grouped.push(currentGroup);
            currentGroup = [];
            currentGroupLength = 0;
        }
    }
    if (currentGroup.length) {
        grouped.push(currentGroup);
    }
    const formatted = [];
    for (const group of grouped) {
        formatted.push(group.join(joinWith));
    }
    return formatted;
}

function getLineEnding(css: string) {
    // naive implementation
    for (const ch of css) {
        if (ch === '\r') {
            return '\r\n';
        }
        if (ch === '\n') {
            return '\n';
        }
    }
    return '\n';
}
