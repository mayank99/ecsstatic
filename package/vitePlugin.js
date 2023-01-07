import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import hash from './hash.js';

/** @returns {import('vite').Plugin} */
export function vitePlugin() {
	const cssList = new Map();

	return {
		enforce: 'post',
		name: 'ecsstatic',

		resolveId(id) {
			if (cssList.has(id)) return id;
			return null;
		},

		load(id) {
			if (cssList.has(id)) {
				return cssList.get(id);
			}
		},

		transform(code, id) {
			if (id.endsWith('.tsx')) {
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

				cssTemplateDeclarations.forEach((node) => {
					const originalName = node.declarations[0].id.name;
					const init = node.declarations[0].init;
					const templateContents = init.quasi.quasis[0].value.raw;

					const [css, className] = processCss(templateContents, originalName);

					// add processed css to a .css file
					const cssFileName = `${className}.css`;
					cssList.set(cssFileName, css);
					code = `${code}\nimport "${cssFileName}";\n`;

					// replace the tagged template literal with the generated className
					const start = init.tag.start;
					const end = init.quasi.end;
					code = code.replace(code.slice(start, end), `"${className}"`);
				});

				// remove ecsstatic import, we don't need it anymore
				code = code.replace(code.slice(importStart, importEnd), '');

				return { code };
			}
		},
	};
}

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
