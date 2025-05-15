import type {CompilationResult} from '../types/compilation/compilation.interfaces.js';
import type {ResultLine} from '../types/resultline/resultline.interfaces.js';

import type {PropertyGetter} from './properties.interfaces.js';

type Point = {
    line: number | null;
    col: number | null;
};

export class TBasicAstParser {
    maxAstLines: number;

    // Almost every line of AST includes a span of related source lines:
    // In different forms like <line:a:b, line:c:d>
    static readonly locTypes = {
        NONE: 'none', // No location specified
        POINT: 'point', // A single location: beginning of a token
        SPAN: 'span', // Two locations: first token to last token (beginning)
    } as const;

    constructor(compilerProps: PropertyGetter) {
        this.maxAstLines = 500;
        if (compilerProps) {
            this.maxAstLines = compilerProps('maxLinesOfAst', this.maxAstLines);
        }
    }

    // Accepts "line:a:b" and "col:b"
    parsePoint(ptLine: string, lastLineNo: number | null): Point {
        const lineRegex = /line:(\d+)/;
        const colRegex = /col:(\d+)$/;
        const lineMatch = ptLine.match(lineRegex);
        const colMatch = ptLine.match(colRegex);
        const line = lineMatch ? Number(lineMatch[1]) : lastLineNo;
        const col = colMatch ? Number(colMatch[1]) : null; // Does not happen for well-formed strings
        return {line, col};
    }

    // Accepts "<X, X>" and "<X>", where
    // X can be "col:a" or "line:a:b"
    // lastLineNo - the line number of the previous node,
    // reused when only a column specified.
    parseSpan(
        line: string,
        lastLineNo: number | null,
    ):
        | {type: typeof TBasicAstParser.locTypes.SPAN; begin: Point; end: Point}
        | {type: typeof TBasicAstParser.locTypes.POINT; loc: Point}
        | {type: typeof TBasicAstParser.locTypes.NONE} {
        const spanRegex = /<(line:\d, col:\d)>/;
        const m = line.match(spanRegex);
        if (m) {
            const span = m[1];
            return {type: TBasicAstParser.locTypes.POINT, loc: this.parsePoint(span, lastLineNo)};
        }
        return {type: TBasicAstParser.locTypes.NONE};
    }

    // Link the AST lines with spans of source locations (lines+columns)
    parseAndSetSourceLines(astDump: ResultLine[]) {
        let lfrom: any = {line: null, loc: null};
        let lto: any = {line: null, loc: null};
        for (const line of astDump) {
            const span = this.parseSpan(line.text, lfrom.line);
            switch (span.type) {
                case TBasicAstParser.locTypes.NONE: {
                    break;
                }
                case TBasicAstParser.locTypes.POINT: {
                    lfrom = span.loc;
                    lto = span.loc;
                    break;
                }
                case TBasicAstParser.locTypes.SPAN: {
                    lfrom = span.begin;
                    lto = span.end;
                    break;
                }
            }
            if (span.type !== TBasicAstParser.locTypes.NONE) {
                // TODO: ResultLineSource doesn't have to/from
                (line.source as any) = {from: lfrom, to: lto};
            }
        }
    }

    processAst(result: CompilationResult): ResultLine[] {
        const output = result.stdout;
        // Remove all AST nodes which aren't directly from the user's source code
        this.parseAndSetSourceLines(output);
        return output;
    }
}
