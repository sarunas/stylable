import { expect } from 'chai';
import {
    createSubsetAst,
    scopeSelector,
} from '@stylable/core/dist/deprecated/deprecated-stylable-utils';
import { cssParse } from '@stylable/core';

describe('deprecated/selector-utils', () => {
    describe('scopeSelector', () => {
        const tests: Array<{ root: string; child: string; selector: string; only?: boolean }> = [
            {
                root: '.a',
                child: '.x',
                selector: '.a .x',
            },
            {
                root: '.a',
                child: '.x:hover',
                selector: '.a .x:hover',
            },
            {
                root: '.a',
                child: '&',
                selector: '.a',
            },
            {
                root: '.a:hover',
                child: '&',
                selector: '.a:hover',
            },
            {
                root: '.a.x',
                child: '&',
                selector: '.a.x',
            },
            {
                root: '.a.x .b:hover',
                child: '&',
                selector: '.a.x .b:hover',
            },
            {
                root: '.a',
                child: '&.x',
                selector: '.a.x',
            },
            {
                root: '.a',
                child: '&.x .y',
                selector: '.a.x .y',
            },
            {
                root: '.a .b',
                child: '&.x .y',
                selector: '.a .b.x .y',
            },
            {
                root: '.a',
                child: '& &',
                selector: '.a .a',
            },
            {
                root: '.a, .b',
                child: '& & &',
                selector: '.a .a .a, .b .b .b',
            },
            {
                root: '.a:hover, .b:focus',
                child: '& & &',
                selector: '.a:hover .a:hover .a:hover, .b:focus .b:focus .b:focus',
            },
            {
                root: '.a',
                child: ':global(.x) &',
                selector: ':global(.x) .a',
            },
        ];

        for (const { only, root, selector, child } of tests) {
            const test = only ? it.only : it;
            test(`apply "${root}" on "${child}" should output "${selector}"`, () => {
                const res = scopeSelector(root, child);
                expect(res.selector).to.equal(selector);
            });
        }
    });
    describe('createSubsetAst', () => {
        function testMatcher(expected: any[], actualNodes: any[]) {
            expected.forEach((expectedMatch, i) => {
                const { nodes, ...match } = expectedMatch;
                const actual = actualNodes[i];
                expect(actual).to.contain(match);
                if (nodes) {
                    testMatcher(nodes, actual.nodes);
                }
            });
            expect(actualNodes.length).to.equal(expected.length);
        }

        it('should extract all selectors that has given prefix in the first chunk', () => {
            const res = createSubsetAst(
                cssParse(`
                .i .x{}
                .i::x{}
                .i[data]{}
                .i:hover{}
                .x,.i{}
                .i,.x{}
                .i.x{}
                .x.i{}

                /*more complex*/
                .x.y::i.z:hover.i{}
                .x,.i:hover .y{}
                .i .y,.x{}
                .i:not(.x){}
                .i .x:hover.i{}
                .x.i.y{}

                .i.i{}

                /*extracted as decl on root*/
                .i{color: red}

                /*not extracted*/
                .x .i{}
                :not(.i) .i{}
            `),
                '.i'
            );

            const expected = [
                { selector: '& .x' },
                { selector: '&::x' },
                { selector: '&[data]' },
                { selector: '&:hover' },
                { selector: '&' },
                { selector: '&' },
                { selector: '&.x' },
                { selector: '&.x' },
                { selector: '&.x.y::i.z:hover' },
                { selector: '&:hover .y' },
                { selector: '& .y' },
                { selector: '&:not(.x)' },
                { selector: '& &.x:hover' },
                { selector: '&.x.y' },
                { selector: '&&' }, // TODO: check if possible
                { selector: '&' },
            ];

            testMatcher(expected, res.nodes);
        });

        it('should extract global when creating root chunk', () => {
            const res = createSubsetAst(
                cssParse(`
                :global(.x){}
                :global(.x) .root{}
            `),
                '.root',
                undefined,
                true
            );

            const expected = [{ selector: ':global(.x)' }, { selector: ':global(.x) &' }];

            testMatcher(expected, res.nodes);
        });

        it('should parts under @media', () => {
            const res = createSubsetAst(
                cssParse(`
                .i {color: red}
                .i:hover {}
                @media (max-width: 300px) {
                    .i {}
                    .i:hover {}
                }
            `),
                '.i'
            );

            const expected = [
                { selector: '&' },
                { selector: '&:hover' },
                {
                    type: 'atrule',
                    params: '(max-width: 300px)',
                    nodes: [{ selector: '&' }, { selector: '&:hover' }],
                },
            ];

            testMatcher(expected, res.nodes);
        });

        it('should not append empty media', () => {
            const res = createSubsetAst(
                cssParse(`
                .i {}
                @media (max-width: 300px) {
                    .x {}
                }
            `),
                '.i'
            );

            const expected = [{ selector: '&' }];

            testMatcher(expected, res.nodes);
        });
    });
});
