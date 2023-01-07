import hash from './hash.mjs';
// import { nanoid } from 'nanoid';
// import * as lightningCss from 'lightningcss';

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

				const importName = getImportNameFromTree(parsedAst);
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

				return { code };
			}
		},
	};
}

function processCss(templateContents = '', originalName = '') {
	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `.${className}{${templateContents}}`;

	// const css = lightningCss.transform({
	// 	filename: `${fileNameWithoutExt}.acab.css`,
	// 	code: Buffer.from(unprocessedCss),
	// 	minify: true,
	// 	nesting: true,
	// 	visitor: {
	// 		Rule(rule) {
	// 			console.log(rule);
	// 		},
	// 	},
	// });

	return [unprocessedCss, className];
}

function getImportNameFromTree(ast) {
	let importName = '';

	for (const node of ast.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.source.value === '@acab/ecsstatic') {
				if (node.specifiers[0].imported.name === 'css') {
					importName = node.specifiers[0].local.name;
					break;
				}
			}
		}
	}

	return importName;
}
