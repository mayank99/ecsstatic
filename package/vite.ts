import esbuild from 'esbuild';
import externalizeAllPackagesExcept from 'esbuild-plugin-noexternal';
import MagicString from 'magic-string';
import path from 'path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import postcssScss from 'postcss-scss';
import { ancestor as walk } from 'acorn-walk';
import autoprefixer from 'autoprefixer';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type * as ESTree from 'estree';
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
	 * By default,  npm packages are not processed (they are "external"-ized) before evaluating expressions.
	 * This requires the package to be compatible with Node ESM. If it doesn't work, then you can pass its name
	 * to `resolvePackages` to force it to be processed before evaluating expressions.
	 *
	 * @example
	 * export default defineConfig({
	 * 	plugins: [ecsstatic({ resolvePackages: ['some-non-esm-pkg'] })],
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
		enforce: 'post',

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
			if (!/\.[cm]?[jt]sx?$/.test(id)) return;

			const parsedAst = this.parse(code) as ESTree.Program;

			const ecsstaticImports = findEcsstaticImports(parsedAst);
			if (ecsstaticImports.size === 0) return;

			const importNames = [...ecsstaticImports.keys()];

			const cssTemplateLiterals = findCssTaggedTemplateLiterals(parsedAst, importNames);
			if (cssTemplateLiterals.length === 0) return;

			const magicCode = new MagicString(code);
			let inlinedVars = '';

			for (const node of cssTemplateLiterals) {
				const { start, end, quasi, tag, _originalName } = node;
				const isScss = tag.type === 'Identifier' && ecsstaticImports.get(tag.name)?.isScss;

				// lazy populate inlinedVars until we need it, to delay problems that come with this mess
				if (quasi.expressions.length && evaluateExpressions && !inlinedVars) {
					inlinedVars = await inlineVarsUsingEsbuild(id, { noExternal: resolvePackages });
				}

				const rawTemplate = code.slice(quasi.start, quasi.end).trim();
				const templateContents =
					evaluateExpressions && quasi.expressions.length
						? await processTemplateLiteral(rawTemplate, { inlinedVars })
						: rawTemplate.slice(1, rawTemplate.length - 2);
				const [css, className] = processCss(templateContents, isScss);

				// add processed css to a .css file
				const extension = isScss ? 'scss' : 'css';
				const cssFilename = `${className}.acab.${extension}`.toLowerCase();
				magicCode.append(`import "./${cssFilename}";\n`);
				const fullCssPath = normalizePath(path.join(path.dirname(id), cssFilename));
				cssList.set(fullCssPath, css);

				// add the original variable name in DEV mode
				let _className = `"${className}"`;
				if (_originalName && viteConfigObj.command === 'serve') {
					_className = `"🎈-${_originalName} ${className}"`;
				}

				// replace the tagged template literal with the generated className
				magicCode.update(start, end, _className);
			}

			// remove ecsstatic imports, we don't need them anymore
			for (const { start, end } of ecsstaticImports.values()) magicCode.remove(start, end);

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

	const plugins = !isScss
		? [postcssNested(), autoprefixer(autoprefixerOptions)]
		: [autoprefixer(autoprefixerOptions)];
	const options = isScss ? { parser: postcssScss } : {};
	const { css } = postcss(plugins).process(unprocessedCss, options);

	return [css, className];
}

/** resolves all expressions in the template literal and returns a plain string */
async function processTemplateLiteral(rawTemplate: string, { inlinedVars = '' }) {
	try {
		const processedTemplate = (await evalWithEsbuild(rawTemplate, inlinedVars)) as string;
		return processedTemplate;
	} catch (err) {
		console.error('Unable to resolve expression in template literal');
		throw err;
	}
}

/** parses ast and returns info about all css/scss ecsstatic imports */
function findEcsstaticImports(ast: ESTree.Program) {
	const statements = new Map<string, { isScss: boolean; start: number; end: number }>();

	for (const node of ast.body.filter((node) => node.type === 'ImportDeclaration')) {
		if (
			node.type === 'ImportDeclaration' &&
			node.source.value?.toString().startsWith('@acab/ecsstatic')
		) {
			const { start, end } = node;
			node.specifiers.forEach((specifier) => {
				if (
					specifier.type === 'ImportSpecifier' &&
					['css', 'scss'].includes(specifier.imported.name)
				) {
					const tagName = specifier.local.name;
					const isScss = specifier.imported.name === 'scss';
					statements.set(tagName, { isScss, start, end });
				}
			});
		}
	}

	return statements;
}

/**
 * uses esbuild.transform to tree-shake unused var declarations
 * before evaluating it in a node child_process
 */
async function evalWithEsbuild(expression: string, allVarDeclarations = '') {
	// strip all console logs
	const withoutConsole = esbuild.transformSync(allVarDeclarations, {
		format: 'esm',
		loader: 'jsx',
		drop: ['console'],
	});
	// add console log for the expression we want to evaluate
	const treeshaked = esbuild.transformSync(`${withoutConsole.code}\nconsole.log(${expression});`, {
		format: 'esm',
		loader: 'jsx',
		treeShaking: false,
	});

	return nodeEval(treeshaked.code);
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
			plugins: [
				loadDummyEcsstatic(),
				externalizeAllPackagesExcept(noExternal),
				ignoreUnknownExtensions(),
			],
		})
	).outputFiles[0].text;

	return processedCode;
}

/** walks the ast to find all tagged template literals that look like (css`...`) */
function findCssTaggedTemplateLiterals(ast: ESTree.Program, tagNames: string[]) {
	type TaggedTemplateWithName = ESTree.TaggedTemplateExpression & { _originalName?: string };

	let nodes: Array<TaggedTemplateWithName> = [];

	walk(ast as any, {
		TaggedTemplateExpression(node, ancestors) {
			const _node = node as TaggedTemplateWithName;

			if (_node.tag.type === 'Identifier' && tagNames.includes(_node.tag.name)) {
				// last node is the current node, so we look at the second last node to find a name
				const prevNode = (ancestors as any[]).at(-2) as ESTree.Node;

				switch (prevNode?.type) {
					case 'VariableDeclarator': {
						if (
							prevNode.id.type === 'Identifier' &&
							prevNode.init?.start === _node.start &&
							prevNode.init?.end === _node.end
						) {
							_node._originalName = prevNode.id.name;
						}
						break;
					}
					case 'Property': {
						if (
							prevNode.type === 'Property' &&
							prevNode.value.start === _node.start &&
							prevNode.value.end === _node.end &&
							prevNode.key.type === 'Identifier'
						) {
							_node._originalName = prevNode.key.name;
						}
						break;
					}
				}

				nodes.push(_node);
			}
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

/** esbuild plugin that loads an empty string for any non JS/TS file */
function ignoreUnknownExtensions() {
	return <esbuild.Plugin>{
		name: 'ignore-unknown-exports',
		setup(build) {
			build.onResolve({ filter: /.*/ }, (args) => {
				if (!/\.[cm]?[jt]sx?$/.test(args.path) && path.extname(args.path)) {
					return { path: 'this-doesnt-matter', namespace: 'ignore-load' };
				}
			});
			build.onLoad({ filter: /.*/, namespace: 'ignore-load' }, () => ({ contents: '' }));
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

/**
 * specifically target only last 2 versions of the major browsers.
 * this keeps the autoprefixing to what is absolutely necessary.
 * anything extra can be done in the user's vite config.
 */
const autoprefixerOptions = {
	overrideBrowserslist: [
		'last 2 Chrome versions',
		'last 2 ChromeAndroid versions',
		'last 2 Firefox versions',
		'last 2 Safari major versions and >0.5%',
		'last 2 iOS major versions and >0.5%',
	],
};

/** runs code using `node --eval` in a `child_process` and returns console output */
async function nodeEval(code: string) {
	const args = ['--eval', code, '--input-type=module'];
	try {
		const { stdout, stderr } = await promisify(execFile)('node', args);
		if (stderr) throw 'fuck!';
		return stdout;
	} catch {
		throw 'fuck!';
	}
}
