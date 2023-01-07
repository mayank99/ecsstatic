import { createUnplugin } from 'unplugin';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import hash from './hash.js';

export const plugin = createUnplugin(() => {
	const cssList = new Map();

	return {
		enforce: 'post',
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

			const [importName, importStart, importEnd] = processImport(parsedAst);
			if (!importName) return;

			const cssTemplateDeclarations = parsedAst.body.filter(
				(node) =>
					node.type === 'VariableDeclaration' &&
					node.declarations?.[0]?.init?.type === 'TaggedTemplateExpression' &&
					node.declarations?.[0]?.init?.tag?.name === importName
			);
			if (cssTemplateDeclarations?.length === 0) return;

			cssTemplateDeclarations.forEach(async (node) => {
				const originalName = node.declarations[0].id.name;
				const { start, end, quasi } = node.declarations[0].init;

				const templateContentsFullRaw = code.slice(quasi.start, quasi.end);
				const templateContents = templateContentsFullRaw.substring(
					0,
					templateContentsFullRaw.length - 2
				);

				const [css, className] = processCss(templateContents, originalName);

				// add processed css to a .css file
				const cssFileName = `virtual:${className}.css`;
				cssList.set(cssFileName, css);
				code = `${code}\nimport "${cssFileName}";\n`;

				// replace the tagged template literal with the generated className
				code = code.replace(code.slice(start, end), `"${className}"`);
			});

			// remove ecsstatic import, we don't need it anymore
			code = code.replace(code.slice(importStart, importEnd), '');

			return { code };
		},
	};
});

function processCss(templateContents = '', originalName = '') {
	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `.${className}{${templateContents}}`;

	const { css } = postcss([postcssNested()]).process(unprocessedCss);
	return [css, className];
}

function processImport(ast) {
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
