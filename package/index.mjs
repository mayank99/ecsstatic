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
				// const cssImport = parsedAst.body.find(
				// 	(node) => node.type === 'ImportDeclaration' && node.source.value === '@acab/ecsstatic'
				// );

				// if (cssImport) {
				// 	const { start: s, end: e } = cssImport;
				// }

				const cssTemplateDeclarations = parsedAst.body.filter(
					(node) =>
						node.type === 'VariableDeclaration' &&
						node.declarations?.[0]?.init?.type === 'TaggedTemplateExpression' &&
						node.declarations?.[0]?.init?.tag?.name === 'css'
				);

				cssTemplateDeclarations.forEach((node) => {
					const id = nanoid(8);
					const init = node.declarations[0].init;
					let css = init.quasi.quasis[0].value.raw;
					css = postcss([nested()]).process(`.${id}{${css}}`).css;

					const start = init.tag.start;
					const end = init.quasi.end;
					code = code.replace(code.slice(start, end), `"${id}"`);
					cssList.set(`${id}.css`, css);
					code = `${code}\nimport "${id}.css";\n`;
				});

				return { code };
			}
		},
	};
}
