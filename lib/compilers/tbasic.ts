import type {PreliminaryCompilerInfo} from '../../types/compiler.interfaces.js';
import type {ParseFiltersAndOutputOptions} from '../../types/features/filters.interfaces.js';
import type {ResultLine} from '../../types/resultline/resultline.interfaces.js';
import {BaseCompiler} from '../base-compiler.js';
import {CompilationEnvironment} from '../compilation-env.js';
import {TBasicAstParser} from '../tbasic-ast.js';

export class TBasicCompiler extends BaseCompiler {
    protected tbasicAst: TBasicAstParser;

    static get key() {
        return 'tbasic';
    }

    constructor(compilerInfo: PreliminaryCompilerInfo & {disabledFilters?: string[]}, env: CompilationEnvironment) {
        super(compilerInfo, env);
        this.tbasicAst = new TBasicAstParser(this.compilerProps);
    }

    override optionsForFilter(filters: ParseFiltersAndOutputOptions, outputFilename: string, userOptions?: string[]) {
        return [];
    }

    override async generateAST(inputFilename: string, options: string[]): Promise<ResultLine[]> {
        const newOptions = options.filter(option => option !== '-fcolor-diagnostics').concat(['--ast-dump']);

        const execOptions = this.getDefaultExecOptions();
        // A higher max output is needed for when the user includes headers
        execOptions.maxOutput = 1024 * 1024 * 1024;

        return this.tbasicAst.processAst(
            await this.runCompiler(this.compiler.exe, newOptions, this.filename(inputFilename), execOptions),
        );
    }

    override couldSupportASTDump(version: string) {
        return true;
    }
}
