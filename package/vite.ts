import esbuild from 'esbuild';
import externalizeAllPackagesExcept from 'esbuild-plugin-noexternal';
import MagicString from 'magic-string';
import nodeEval from 'eval';
import path from 'path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import postcssScss from 'postcss-scss';
import { simple as walk } from 'acorn-walk';
import type { Program, TaggedTemplateExpression } from 'estree';
import type { Plugin, ResolvedConfig } from 'vite';

import hash from './hash.js';

type Options = {
	/**
	 * Should expressions (including other class names) inside template literals be evaluated?
	 *
	 * Note: This will only work for top-level expressions within the project. It does not look inside components and
	 * also ignores npm packages. If you need to use npm packages, see the `resolvePackages` option.
	 *
	 * @default true
	 */
	evaluateExpressions?: boolean;
	/**
	 * By default, packages are not resolved (everything is "external"-ized) because it is faster this way.
	 * To use an npm package, you can pass its name in an array here.
	 *
	 * @experimental This feature may not work perfectly.
	 *
	 * @example
	 * export default defineConfig({
	 * 	plugins: [ecsstatic({ resolvePackages: ['open-props'] })],
	 * });
	 */
	resolvePackages?: string[];
};

/**
 * Returns the vite plugin for ecsstatic.
 *
 * @example
 * import { ecsstatic } from '@acab/ecsstatic/vite';
 *
 * export default defineConfig({
 * 	plugins: [ecsstatic()],
 * });
 */
export function ecsstatic(options: Options = {}) {
	const { evaluateExpressions = true, resolvePackages = [] } = options;

	const cssList = new Map<string, string>();
	let viteConfigObj: ResolvedConfig;

	return <Plugin>{
		name: 'ecsstatic',

		configResolved(_config: ResolvedConfig) {
			viteConfigObj = _config;
		},

		buildStart() {
			cssList.clear();
		},

		buildEnd() {
			cssList.clear();
		},

		resolveId(id, importer) {
			if (!importer) return;

			if (id.endsWith('css')) {
				// relative to absolute
				if (id.startsWith('.')) id = normalizePath(path.join(path.dirname(importer), id));

				if (!cssList.has(id)) {
					// sometimes we need to resolve it based on the root
					id = normalizePath(path.join(viteConfigObj.root, id.startsWith('/') ? id.slice(1) : id));
				}

				if (cssList.has(id)) {
					return id;
				}
			}
			return null;
		},

		load(id) {
			if (cssList.has(id)) {
				const css = cssList.get(id);
				return css;
			}
		},

		async transform(code, id) {
			[id] = id.split('?'); // remove ?extra-shit from the end
			if (/node_modules/.test(id)) return;
			if (!/\.(c|m)?(j|t)s(x)?$/.test(id)) return;

			const parsedAst = this.parse(code) as Program;

			const {
				cssImportName,
				scssImportName,
				statements: ecsstaticImportStatements,
			} = findEcsstaticImports(parsedAst);
			if (ecsstaticImportStatements.length === 0) return;

			const importNames = [cssImportName, scssImportName].filter(Boolean) as string[];

			const cssTemplateLiterals = findCssTaggedTemplateLiterals(parsedAst, importNames);
			if (cssTemplateLiterals.length === 0) return;

			const magicCode = new MagicString(code);
			let inlinedVars = '';

			for (const node of cssTemplateLiterals) {
				const { start, end, quasi, tag } = node;
				const isScss = tag.type === 'Identifier' && tag.name === scssImportName;

				// lazy populate inlinedVars until we need it, to delay problems that come with this mess
				if (quasi.expressions.length && evaluateExpressions && !inlinedVars) {
					inlinedVars = await inlineVarsUsingEsbuild(id, { noExternal: resolvePackages });
				}

				const rawTemplate = code.slice(quasi.start, quasi.end).trim();
				const templateContents =
					evaluateExpressions && quasi.expressions.length
						? processTemplateLiteral(rawTemplate, { inlinedVars })
						: rawTemplate.slice(1, rawTemplate.length - 2);
				const [css, className] = processCss(templateContents, isScss);

				// add processed css to a .css file
				const extension = isScss ? 'scss' : 'css';
				const cssFilename = `${className}.acab.${extension}`.toLowerCase();
				magicCode.append(`import "./${cssFilename}";\n`);
				const fullCssPath = normalizePath(path.join(path.dirname(id), cssFilename));
				cssList.set(fullCssPath, css);

				// replace the tagged template literal with the generated className
				magicCode.update(start, end, `"${className}"`);
			}

			// remove ecsstatic imports, we don't need them anymore
			ecsstaticImportStatements.forEach(({ start, end }) => magicCode.update(start, end, ''));

			return {
				code: magicCode.toString(),
				map: magicCode.generateMap(),
			};
		},
	};
}

/**
 * processes template strings using postcss and
 * returns it along with a hashed classname based on the string contents.
 */
function processCss(templateContents: string, isScss = false) {
	const isImportOrUse = (line: string) =>
		line.trim().startsWith('@import') || line.trim().startsWith('@use');

	const importsAndUses = templateContents
		.split(/\r\n|\r|\n/g)
		.filter(isImportOrUse)
		.join('\n')
		.trim();
	const codeWithoutImportsAndUses = templateContents
		.split(/\r\n|\r|\n/g)
		.filter((line) => !isImportOrUse(line))
		.join('\n');

	const className = `🎈-${hash(templateContents.trim())}`;
	const unprocessedCss = `${importsAndUses}\n.${className}{${codeWithoutImportsAndUses}}`;

	const plugins = !isScss ? [postcssNested()] : [];
	const options = isScss ? { parser: postcssScss } : {};
	const { css } = postcss(plugins).process(unprocessedCss, options);

	return [css, className];
}

/** resolves all expressions in the template literal and returns a plain string */
function processTemplateLiteral(rawTemplate: string, { inlinedVars = '' }) {
	try {
		const processedTemplate = evalWithEsbuild(rawTemplate, inlinedVars) as string;
		return processedTemplate;
	} catch (err) {
		console.error('Unable to resolve expression in template literal');
		throw err;
	}
}

/** parses ast and returns info about all css/scss ecsstatic imports */
function findEcsstaticImports(ast: Program) {
	let cssImportName: string | undefined;
	let scssImportName: string | undefined;
	let statements: Array<{ start: number; end: number }> = [];

	for (const node of ast.body.filter((node) => node.type === 'ImportDeclaration')) {
		if (node.type === 'ImportDeclaration' && node.source.value === '@acab/ecsstatic') {
			const { start, end } = node;
			if (node.specifiers.some(({ imported }: any) => ['css', 'scss'].includes(imported.name))) {
				statements.push({ start, end });
			}
			node.specifiers.forEach((specifier) => {
				if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'css') {
					cssImportName = specifier.local.name;
				}
				if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'scss') {
					scssImportName = specifier.local.name;
				}
			});
		}
	}

	return { cssImportName, scssImportName, statements };
}

/**
 * uses esbuild.transform to tree-shake unused var declarations
 * before evaluating it with node_eval
 */
function evalWithEsbuild(expression: string, allVarDeclarations = '') {
	const treeshaked = esbuild.transformSync(
		`${allVarDeclarations}\n
		module.exports = (${expression});`,
		{ format: 'cjs', target: 'node14', treeShaking: true }
	);

	return nodeEval(treeshaked.code, hash(expression), {}, true);
}

/** uses esbuild.build to resolve all imports and return the "bundled" code */
async function inlineVarsUsingEsbuild(fileId: string, options: { noExternal?: string[] }) {
	const { noExternal = [] } = options;

	const processedCode = (
		await esbuild.build({
			entryPoints: [fileId],
			bundle: true,
			format: 'esm',
			write: false,
			platform: 'node',
			logLevel: 'error',
			loader: {
				'.css': 'empty',
				'.svg': 'empty',
			},
			keepNames: true,
			plugins: [loadDummyEcsstatic(), externalizeAllPackagesExcept(noExternal)],
		})
	).outputFiles[0].text;

	return processedCode;
}

/** walks the ast to find all tagged template literals that look like (css`...`) */
function findCssTaggedTemplateLiterals(ast: Program, tagNames: string[]) {
	let nodes: Array<TaggedTemplateExpression> = [];

	walk(ast as any, {
		TaggedTemplateExpression(node) {
			const _node = node as TaggedTemplateExpression;
			if (!(_node.tag.type === 'Identifier' && tagNames.includes(_node.tag.name))) return;
			nodes.push(_node);
		},
	});

	return nodes;
}

/**
 * esbuild plugin that resolves and loads a dummy version of ecsstatic.
 * the returned css/scss functions generate hashes but don't emit css.
 */
function loadDummyEcsstatic() {
	const hashStr = hash.toString();
	const getHashFromTemplateStr = getHashFromTemplate.toString();
	const contents = `${hashStr}\n${getHashFromTemplateStr}\n
	  export const css = getHashFromTemplate;
	  export const scss = getHashFromTemplate;
	`;

	return <esbuild.Plugin>{
		name: 'load-dummy-ecsstatic',
		setup(build) {
			build.onResolve({ filter: /^@acab\/ecsstatic$/ }, (args) => {
				return {
					namespace: 'ecsstatic',
					path: args.path,
				};
			});
			build.onLoad({ filter: /(.*)/, namespace: 'ecsstatic' }, () => {
				return {
					contents,
					loader: 'js',
				};
			});
		},
	};
}

/**
 * this is like an actual "runtime" version of the css/scss functions.
 *
 * we will use it to generate hashed classes for use inside expressions.
 * these classes will be wrapped with `:where()` to keep specficity flat.
 */
function getHashFromTemplate(templates: TemplateStringsArray, ...args: Array<string | number>) {
	let str = '';
	templates.forEach((template, index) => {
		str += template;
		if (index < args.length - 1) {
			str += args[index];
		}
	});
	return `:where(.🎈-${hash(str.trim())})`;
}

function normalizePath(original: string) {
	return original.replace(/\\/g, '/').toLowerCase();
}
