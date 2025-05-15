import * as monaco from 'monaco-editor';

function definition(): monaco.languages.IMonarchLanguage {
    return {
        ignoreCase: true,
        defaultToken: 'invalid',
        keywords: [
            'sub',
            'function',
            'end',
            'declare',
            'dim',
            'print',
            'if',
            'then',
            'else',
            'for',
            'to',
            'next',
            'exit',
            'do',
            'loop',
            'while',
            'until',
        ],
        types: '%&!#$@',
        operators: ['>', '<', '>=', '<=', '=', '<>', '+', '-', '*', '/'],
        functions: ['len', 'stringconcat', 'stringcopy', 'stringlength'],
        subroutines: ['print', 'stringfree'],

        symbols: /[=><+\-*/]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

        tokenizer: {
            root: [
                [/^\s*#\s*include/, {token: 'keyword.directive.include', next: '@include'}],
                // Preprocessor directive
                [/^\s*#\s*\w+/, 'keyword.directive'],
                // identify type
                [/@types/, 'type'],
                // identifiers and keywords
                [
                    /[a-zA-Z]\w*/,
                    {
                        cases: {
                            '@keywords': 'keyword',
                            '@functions': 'keyword',
                            '@subroutines': 'keyword',
                            '@default': 'identifier',
                        },
                    },
                ],
                // comments
                [/!.*$/, 'comment'],
                // whitespace
                {include: '@whitespace'},
                [/[{}()[\]]/, '@brackets'],
                [
                    /@symbols/,
                    {
                        cases: {
                            '@operators': 'operator',
                            '@default': '',
                        },
                    },
                ],
                // numbers
                [/\d*\.\d+([eEdD][-+]?\d+)?/, 'number.float'],
                [/\d/, 'number'],
                [/[,.]/, 'delimiter'],
                // strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                [/"/, 'string', '@string'],
            ],
            whitespace: [[/[ \t\r\n]+/, 'white']],
            comment: [[/'/, 'comment']],
            string: [
                [/[^\\"]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop'],
            ],
            include: [
                [
                    /(\s*)(<)([^<>]*)(>)/,
                    [
                        '',
                        'keyword.directive.include.begin',
                        'string.include.identifier',
                        {token: 'keyword.directive.include.end', next: '@pop'},
                    ],
                ],
                [
                    /(\s*)(")([^"]*)(")/,
                    [
                        '',
                        'keyword.directive.include.begin',
                        'string.include.identifier',
                        {token: 'keyword.directive.include.end', next: '@pop'},
                    ],
                ],
            ],
        },
    };
}

const config: monaco.languages.LanguageConfiguration = {
    comments: {
        lineComment: "'",
    },
    brackets: [
        ['{', '}'],
        ['(', ')'],
    ],
    autoClosingPairs: [
        {open: '{', close: '}'},
        {open: '(', close: ')'},
        {open: "'", close: "'", notIn: ['string', 'comment']},
        {open: '"', close: '"', notIn: ['string']},
    ],
    surroundingPairs: [
        {open: '{', close: '}'},
        {open: '(', close: ')'},
        {open: '"', close: '"'},
        {open: "'", close: "'"},
    ],
};

const def = definition();
monaco.languages.register({id: 'tbasic'});
monaco.languages.setMonarchTokensProvider('tbasic', def);
monaco.languages.setLanguageConfiguration('tbasic', config);
export default def;
