import { nanoid } from 'nanoid';
import postcss from 'postcss';
import nested from 'postcss-nested';

export function css() {
	throw new Error(
		'If you are seeing this error, it means your bundler is not configured correctly.'
	);
}

/** @returns {import('vite').Plugin} */
export function vitePlugin() {
	const cssList = new Map();

	return {
		enforce: 'pre',
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
				let parsedAst = this.parse(code);

				const importName = getImportNameFromTree(parsedAst);
				if (!importName) {
					return;
				}

				const cssTemplateDeclarations = parsedAst.body.filter(
					(node) =>
						node.type === 'VariableDeclaration' &&
						node.declarations?.[0]?.init?.type === 'TaggedTemplateExpression' &&
						node.declarations?.[0]?.init?.tag?.name === importName
				);

				cssTemplateDeclarations.forEach((node) => {
					const init = node.declarations[0].init;
					const templateContents = init.quasi.quasis[0].value.raw;
					const [css, id] = processCss(templateContents);

					const start = init.tag.start;
					const end = init.quasi.end;
					code = code.replace(code.slice(start, end), `"${id}"`);
					cssList.set(`${id}.css`, css);
					code = `import "${id}.css";\n${code}\n`;
				});

				return { code };
			}
		},
	};
}

const processCss = (templateContents = '') => {
	const id = nanoid(8);
	const { css } = postcss([nested()]).process(`.${id}{${templateContents}}`);

	return [css, id];
};

const getImportNameFromTree = (ast) => {
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
};
