import { createUnplugin } from 'unplugin';
import postcssNested from 'postcss-nested';
import hash from './hash.js';
import MagicString from 'magic-string';
import postcss from 'postcss';

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
			const parsedAst = this.parse(code);
			const magicCode = new MagicString(code);

			const [importName, importStart, importEnd] = processImport(parsedAst);
			if (!importName) return;

			const cssTemplateDeclarations = (parsedAst as any).body.filter(
				(node: any) =>
					node.type === 'VariableDeclaration' &&
					node.declarations?.[0]?.init?.type === 'TaggedTemplateExpression' &&
					node.declarations?.[0]?.init?.tag?.name === importName
			);
			if (cssTemplateDeclarations?.length === 0) return;

			cssTemplateDeclarations.forEach((node: any) => {
				const originalName = node.declarations[0].id.name;
				const { start, end, quasi } = node.declarations[0].init;

				let templateContents = '';
				quasi.quasis.forEach((_quasi: any, index: number) => {
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

function processImport(ast: any) {
	let importName = '';

	for (const node of ast.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.source.value === '@acab/ecsstatic') {
				if (node.specifiers[0].imported.name === 'css') {
					importName = node.specifiers[0].local.name;
					return [importName, node.start, node.end];
				}
			}
		}
	}

	return [importName];
}

// eval()-ish for small inline expressions
function evalish(expression: string) {
	return new Function('', `return ${expression}`)();
}
