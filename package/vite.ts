import esbuild from 'esbuild';
import externalizeAllPackagesExcept from 'esbuild-plugin-noexternal';
import MagicString from 'magic-string';
import nodeEval from 'eval';
import path from 'path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import postcssScss from 'postcss-scss';
import type {
	Identifier,
	Program,
	TaggedTemplateExpression,
	TemplateLiteral,
	VariableDeclaration,
} from 'estree';
import type { Plugin } from 'vite';

import hash from './hash.js';

type Options = {
	/**
	 * Array of packages that will be resolved when evaluating expressions inside template strings.
	 *
	 * By default, ecsstatic will only try to resolve relative imports; no packages are resolved
	 * (everything is "external"-ized) because it is faster this way.
	 *
	 * @example
	 * export default defineConfig({
	 * 	plugins: [ecsstatic({ resolvePackages: ['open-props'] })],
	 * });
	 */
	resolvePackages?: string[];
};

/**
 * will use `:where` to keep specificity flat when nesting classnames like this:
 * ```
 * const foo = css`...`;
 * const bar = css`
 *   ${foo} & {
 *     // ...
 *   }
 * `;
 * ```
 */
const useWhere = true;

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
export const ecsstatic = (options?: Options) => {
	const esbuildNoExternals = options?.resolvePackages ?? [];
	const cssList = new Map<string, string>();

	return <Plugin>{
		name: 'ecsstatic',

		buildStart() {
			cssList.clear();
		},

		buildEnd() {
			cssList.clear();
		},

		resolveId(id, importer) {
			if (!importer) return;

			if (id.endsWith('css')) {
				if (id.startsWith('.')) id = normalizePath(new URL(id, importer).href);
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
			[id] = id.split('?');
			if (/node_modules/.test(id)) return;
			if (!/(c|m)*(j|t)s(x)*$/.test(id)) return;

			const parsedAst = this.parse(code) as Program;
			const magicCode = new MagicString(code);

			const ecsstaticImports = findEcsstaticImports(parsedAst);
			if (ecsstaticImports.length === 0) return;

			const cssTemplateDeclarations = findCssTaggedTemplateLiterals(parsedAst, ecsstaticImports);
			if (cssTemplateDeclarations.length === 0) return;

			const inlinedVars = await findAllVariablesUsingEsbuild(id, {
				parseFn: this.parse,
				ecsstaticImports,
				noExternal: esbuildNoExternals,
			});

			const generatedClassses = new Map<string, string>();

			cssTemplateDeclarations.forEach((node) => {
				const originalName = (node.declarations[0].id as Identifier).name;
				const { start, end, quasi, tag } = node.declarations[0].init as TaggedTemplateExpression;

				const { isScss } = ecsstaticImports.find(
					({ importName }) => tag.type === 'Identifier' && importName === tag.name
				)!;

				const templateContents = processTemplateLiteral(quasi, {
					inlinedVars,
					originalCode: code,
					generatedClases: Object.fromEntries(generatedClassses),
				});
				const [css, className] = processCss(templateContents, originalName, isScss);

				// save all classes generated so far in this file but use `:where` by default
				generatedClassses.set(originalName, useWhere ? `:where(.${className})` : `.${className}`);

				// add processed css to a .css file
				const extension = isScss ? 'scss' : 'css';
				const cssFilename = `${className}.acab.${extension}`.toLowerCase();
				magicCode.append(`import "./${cssFilename}";\n`);
				const fullCssPath = normalizePath(path.join(path.dirname(id), cssFilename));
				cssList.set(fullCssPath, css);

				// replace the tagged template literal with the generated className
				magicCode.update(start, end, `"${className}"`);
			});

			// remove ecsstatic imports, we don't need them anymore
			ecsstaticImports.forEach(({ start, end }) => magicCode.update(start, end, ''));

			return {
				code: magicCode.toString(),
				map: magicCode.generateMap(),
			};
		},
	};
};

/**
 * processes template strings using postcss and
 * returns it along with a hashed classname based on the string contents.
 */
function processCss(templateContents: string, originalName: string, isScss = false) {
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

	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `${importsAndUses}\n.${className}{${codeWithoutImportsAndUses}}`;

	const plugins = !isScss ? [postcssNested()] : [];
	const options = isScss ? { parser: postcssScss } : {};
	const { css } = postcss(plugins).process(unprocessedCss, options);

	return [css, className];
}

/** resolves all expressions in the template literal and returns a plain string */
function processTemplateLiteral(
	quasi: TemplateLiteral,
	{ inlinedVars = '', originalCode = '', generatedClases = {} }
) {
	try {
		const rawTemplate = originalCode.slice(quasi.start, quasi.end);
		const processedTemplate = evalWithEsbuild(rawTemplate, inlinedVars, generatedClases) as string;
		return processedTemplate;
	} catch (err) {
		console.error('Unable to resolve expression in template literal');
		throw err;
	}
}

/** parses ast and returns a list of all css/scss ecsstatic imports */
function findEcsstaticImports(ast: Program) {
	const ecsstaticImports: Array<{
		importName: string;
		start: number;
		end: number;
		isScss: boolean;
	}> = [];

	for (const node of ast.body.filter((node) => node.type === 'ImportDeclaration')) {
		if (node.type === 'ImportDeclaration' && node.source.value === '@acab/ecsstatic') {
			const importSpecifier = node.specifiers[0];
			if (
				importSpecifier.type === 'ImportSpecifier' &&
				['css', 'scss'].includes(importSpecifier.imported.name)
			) {
				const importName = importSpecifier.local.name;
				const isScss = importSpecifier.imported.name === 'scss';
				const { start, end } = node;

				ecsstaticImports.push({ importName, start, end, isScss });
			}
		}
	}

	return ecsstaticImports;
}

/**
 * uses esbuild.transform to tree-shake unused var declarations
 * before evaluating it with node_eval
 */
function evalWithEsbuild(expression: string, allVarDeclarations = '', generatedClases = {}) {
	const treeshaked = esbuild.transformSync(
		`${allVarDeclarations}\n
		module.exports = (${expression});`,
		{ format: 'cjs', treeShaking: true }
	);

	return nodeEval(treeshaked.code, hash(expression), generatedClases, true);
}

/**
 * uses esbuild.build to inline all imports, then returns all variable declarations.
 * this can be passed to `evalWithEsbuild` where inline expressions will be resolved correctly.
 */
async function findAllVariablesUsingEsbuild(
	fileId: string,
	options: {
		parseFn: (code: string) => unknown;
		ecsstaticImports: ReturnType<typeof findEcsstaticImports>;
		noExternal?: string[];
	}
) {
	const { parseFn, ecsstaticImports, noExternal = [] } = options;

	// this code will have all the imports inlined
	const processedCode = (
		await esbuild.build({
			entryPoints: [fileId],
			bundle: true,
			format: 'esm',
			write: false,
			platform: 'node',
			...(noExternal.length > 0
				? { plugins: [externalizeAllPackagesExcept(noExternal)] }
				: { packages: 'external' }),
		})
	).outputFiles[0].text;

	const ast = parseFn(processedCode) as Program;

	const varDeclarations = ast.body.filter(
		(node) =>
			node.type === 'VariableDeclaration' && !isCssTaggedTemplateLiteral(node, ecsstaticImports)
	) as VariableDeclaration[];

	return varDeclarations.map(({ start, end }) => processedCode.slice(start, end)).join('');
}

/** filters the ast to all variable declarations matching `isCssTaggedTemplateLiteral` */
function findCssTaggedTemplateLiterals(
	ast: Program,
	ecsstaticImports: ReturnType<typeof findEcsstaticImports>
) {
	return ast.body.flatMap((node) => {
		const _node = node.type === 'ExportNamedDeclaration' ? node.declaration : node;

		if (
			_node!.type === 'VariableDeclaration' &&
			isCssTaggedTemplateLiteral(_node, ecsstaticImports)
		) {
			return [_node];
		}

		return [];
	}) as VariableDeclaration[];
}

/**
 * true if a variable declaration matches this format:
 * ```
 * const x = css`...`;
 * const y = scss`...`;
 * ```
 */
function isCssTaggedTemplateLiteral(
	node: VariableDeclaration,
	ecsstaticImports: ReturnType<typeof findEcsstaticImports>
) {
	const importNames = ecsstaticImports.map(({ importName }) => importName);

	return (
		node.declarations[0].init?.type === 'TaggedTemplateExpression' &&
		node.declarations[0].init.tag.type === 'Identifier' &&
		importNames.includes(node.declarations[0].init.tag.name)
	);
}

function normalizePath(original: string) {
	return original.replace(/\\/g, '/').toLowerCase();
}
