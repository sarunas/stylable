import type { UrlNode } from 'css-selector-tokenizer';
import type { StylableMeta } from '@stylable/core';
import { isAsset, makeAbsolute } from '@stylable/core/dist/index-internal';
import { processDeclarationFunctions } from '@stylable/core/dist/process-declaration-functions';
import { dirname } from 'path';

function defaultFilter() {
    return true;
}

export function processUrlDependencies(
    meta: StylableMeta,
    rootContext: string,
    filter: (url: string, context: string) => boolean = defaultFilter
) {
    const importerDir = dirname(meta.source);
    const urls: string[] = [];
    const onUrl = (node: UrlNode) => {
        const { url } = node;
        if (url && isAsset(url) && filter(url, importerDir)) {
            node.stringType = '"';
            delete node.innerSpacingBefore;
            delete node.innerSpacingAfter;
            node.url = `__stylable_url_asset_${urls.length}__`;
            urls.push(makeAbsolute(url, rootContext, importerDir));
        }
    };

    meta.targetAst!.walkDecls((node) => {
        processDeclarationFunctions(
            node,
            (functionNode) => {
                if (functionNode.type === 'url') {
                    onUrl(functionNode);
                }
            },
            true
        );
    });
    return urls;
}
