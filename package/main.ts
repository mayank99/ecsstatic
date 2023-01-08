import { createUnplugin } from 'unplugin';
import postcssNested from 'postcss-nested';
import hash from './hash.js';
import MagicString from 'magic-string';
import postcss from 'postcss';
import type { Identifier, Program, TaggedTemplateExpression, VariableDeclaration } from 'estree';

export const plugin = createUnplugin(() => {
	const cssList = new Map();

	return {
		name: 'ecsstatic',

		resolveId(id) {
			if (cssList.has(id)) return id;
			return null;
		},

		loadInclude(id) {
			return cssList.has(id);
		},

		load(id) {
			if (cssList.has(id)) {
				const css = cssList.get(id);
				return css;
			}
		},

		transformInclude(id) {
			return id.endsWith('.tsx');
		},

		transform(code) {
			const parsedAst = this.parse(code) as Program;
			const magicCode = new MagicString(code);

			const [importName, importStart, importEnd] = processImport(parsedAst);
			if (!importName) return;

			const cssTemplateDeclarations = parsedAst.body.filter(
				(node) =>
					node.type === 'VariableDeclaration' &&
					node.declarations[0].init?.type === 'TaggedTemplateExpression' &&
					node.declarations[0].init.tag.type === 'Identifier' &&
					node.declarations[0].init.tag.name === importName
			) as VariableDeclaration[];
			if (cssTemplateDeclarations?.length === 0) return;

			cssTemplateDeclarations.forEach((node) => {
				const originalName = (node.declarations[0].id as Identifier).name;
				const { start, end, quasi } = node.declarations[0].init as TaggedTemplateExpression;

				let templateContents = '';
				quasi.quasis.forEach((_quasi, index) => {
					templateContents += _quasi.value.raw;
					if (index < quasi.quasis.length - 1) {
						const expression = quasi.expressions[index];
						templateContents += evalish(code.slice(expression.start, expression.end));
					}
				});

				const [css, className] = processCss(templateContents, originalName);

				// add processed css to a .css file
				const cssFileName = `${className}.css`;
				cssList.set(cssFileName, css);
				magicCode.append(`import "${cssFileName}";\n`);

				// replace the tagged template literal with the generated className
				magicCode.update(start, end, `"${className}"`);
			});

			// remove ecsstatic import, we don't need it anymore
			magicCode.update(importStart, importEnd, '');

			return {
				code: magicCode.toString(),
				map: magicCode.generateMap(),
			};
		},
	};
});

function processCss(templateContents = '', originalName = '') {
	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `.${className}{${templateContents}}`;

	const { css } = postcss([postcssNested()]).process(unprocessedCss);
	return [css, className];
}

function processImport(ast: Program) {
	let importName = '';

	for (const node of ast.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.source.value === '@acab/ecsstatic') {
				const importSpecifier = node.specifiers[0];
				if (importSpecifier.type === 'ImportSpecifier' && importSpecifier.imported.name === 'css') {
					importName = importSpecifier.local.name;
					const { start, end } = node;
					return [importName, start, end] as const;
				}
			}
		}
	}

	return [importName, 0, 0] as const;
}

// eval()-ish for small inline expressions
function evalish(expression: string) {
	return new Function('', `return ${expression}`)();
}
