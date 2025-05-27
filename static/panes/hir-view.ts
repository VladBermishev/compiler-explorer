// Copyright (c) 2021, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {Container} from 'golden-layout';
import $ from 'jquery';
import * as monaco from 'monaco-editor';
import _ from 'underscore';

import {HirState} from './hir-view.interfaces.js';
import {MonacoPaneState} from './pane.interfaces.js';
import {MonacoPane} from './pane.js';

import {unwrap} from '../assert';
import {CompilationResult} from '../compilation/compilation.interfaces.js';
import {CompilerInfo} from '../compiler.interfaces.js';
import * as Components from '../components';
import {Hub} from '../hub.js';
import {extendConfig} from '../monaco-config.js';

export class Hir extends MonacoPane<monaco.editor.IStandaloneCodeEditor, HirState> {
    //private hirCode?: any[] = undefined;
    private cfgButton: JQuery;

    constructor(hub: Hub, container: Container, state: HirState & MonacoPaneState) {
        super(hub, container, state);
        if (state.hirOutput) {
            this.showHirResults(state.hirOutput);
        }
    }

    override getInitialHTML(): string {
        return $('#hir').html();
    }

    override createEditor(editorRoot: HTMLElement): void {
        this.editor = monaco.editor.create(
            editorRoot,
            extendConfig({
                language: 'plainText',
                readOnly: true,
                glyphMargin: true,
                lineNumbersMinChars: 3,
            }),
        );
    }

    override getPrintName() {
        return 'HIR Output';
    }

    override getDefaultPaneName(): string {
        return 'HIR Viewer';
    }

    override registerButtons(state: HirState) {
        super.registerButtons(state);
        this.cfgButton = this.domRoot.find('.cfg');
        const createCfgView = () => {
            return Components.getCfgViewWith(
                this.compilerInfo.compilerId,
                this.compilerInfo.editorId ?? 0,
                this.compilerInfo.treeId ?? 0,
                false,
            );
        };
        this.container.layoutManager.createDragSource(this.cfgButton, createCfgView as any);
        this.cfgButton.on('click', () => {
            const insertPoint =
                this.hub.findParentRowOrColumn(this.container.parent) ||
                this.container.layoutManager.root.contentItems[0];
            insertPoint.addChild(createCfgView());
        });
    }

    override registerCallbacks(): void {
        const throttleFunction = _.throttle(
            (event: monaco.editor.ICursorSelectionChangedEvent) => this.onDidChangeCursorSelection(event),
            500,
        );
        this.eventHub.on('compileResult', this.onCompileResult.bind(this));
        this.editor.onDidChangeCursorSelection(event => throttleFunction(event));
        this.eventHub.emit('hirViewOpened', this.compilerInfo.compilerId);
        this.eventHub.emit('requestSettings');
    }

    override onCompileResult(compilerId: number, compiler: CompilerInfo, result: CompilationResult): void {
        if (this.compilerInfo.compilerId !== compilerId) return;
        if (result.hirOutput) {
            this.showHirResults(unwrap(result.hirOutput).asm);
        } else if (compiler.supportsHirView) {
            this.showHirResults([{text: '<No output>'}]);
        }
    }

    override onCompiler(
        compilerId: number,
        compiler: CompilerInfo | null,
        options: string,
        editorId?: number,
        treeId?: number,
    ): void {
        if (this.compilerInfo.compilerId === compilerId) {
            this.compilerInfo.compilerName = compiler ? compiler.name : '';
            this.compilerInfo.editorId = editorId;
            this.compilerInfo.treeId = treeId;
            this.updateTitle();
            if (compiler && !compiler.supportsHirView) {
                this.showHirResults([
                    {
                        text: '<HIR output is not supported for this compiler>',
                    },
                ]);
            }
        }
    }

    showHirResults(result: any): void {
        if (result && Array.isArray(result)) {
            //this.hirCode = result;
            this.editor
                .getModel()
                ?.setValue(result.length ? _.pluck(result, 'text').join('\n') : '<No LLVM IR generated>');
        }

        if (!this.isAwaitingInitialResults) {
            if (this.selection) {
                this.editor.setSelection(this.selection);
                this.editor.revealLinesInCenter(this.selection.startLineNumber, this.selection.endLineNumber);
            }
            this.isAwaitingInitialResults = true;
        }
    }

    override close(): void {
        this.eventHub.unsubscribe();
        this.eventHub.emit('hirViewClosed', this.compilerInfo.compilerId);
        this.editor.dispose();
    }
}
