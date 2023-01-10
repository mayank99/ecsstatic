import esbuild from 'esbuild';
import MagicString from 'magic-string';
import nodeEval from 'eval';
import path from 'path';
import postcss from 'postcss';
import postcssNested from 'postcss-nested';
import postcssScss from 'postcss-scss';
import type { Identifier, Program, TaggedTemplateExpression, VariableDeclaration } from 'estree';
import type { Plugin } from 'vite';

import hash from './hash.js';

/**
 * Returns the vite plugin for ecsstatic.
 *
 * @example
 * import { ecsstaticVite } from '@acab/ecsstatic';
 *
 * export default defineConfig({
 * 	plugins: [ecsstaticVite()],
 * });
 */
export const ecsstatic = () => {
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

		transform(code, id) {
			[id] = id.split('?');
			if (!id.endsWith('.tsx')) return;

			const parsedAst = this.parse(code) as Program;
			const magicCode = new MagicString(code);

			const ecsstaticImports = processImports(parsedAst);
			if (ecsstaticImports.length === 0) return;

			const cssTemplateDeclarations = parsedAst.body.filter(
				(node) =>
					node.type === 'VariableDeclaration' && isCssTaggedTemplateLiteral(node, ecsstaticImports)
			) as VariableDeclaration[];

			if (cssTemplateDeclarations?.length === 0) return;

			const inlinedVars = findAllVariablesUsingEsbuild(id, {
				parseFn: this.parse,
				ecsstaticImports,
			});

			cssTemplateDeclarations.forEach((node) => {
				const originalName = (node.declarations[0].id as Identifier).name;
				const { start, end, quasi, tag } = node.declarations[0].init as TaggedTemplateExpression;

				const { isScss } = ecsstaticImports.find(
					({ importName }) => tag.type === 'Identifier' && importName === tag.name
				)!;

				let templateContents = '';
				quasi.quasis.forEach((_quasi, index) => {
					templateContents += _quasi.value.raw;
					if (index < quasi.quasis.length - 1) {
						const expression = quasi.expressions[index];
						templateContents += evalWithEsbuild(
							code.slice(expression.start, expression.end),
							id,
							inlinedVars
						);
					}
				});

				const [css, className] = processCss(templateContents, originalName, isScss);

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
 * processes template strings using postcss-nested and
 * returns it along with a hashed classname based on the string contents.
 */
function processCss(templateContents: string, originalName: string, isScss = false) {
	const isImportOrUse = (line: string) =>
		line.trim().startsWith('@import') || line.trim().startsWith('@use');

	const importsAndUses = templateContents.split('\n').filter(isImportOrUse).join('\n').trim();
	const codeWithoutImportsAndUses = templateContents
		.split('\n')
		.filter((line) => !isImportOrUse(line))
		.join('\n');

	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `${importsAndUses}\n.${className}{${codeWithoutImportsAndUses}}`;

	const plugins = !isScss ? [postcssNested()] : [];
	const options = isScss ? { parser: postcssScss } : {};
	const { css } = postcss(plugins).process(unprocessedCss, options);

	return [css, className];
}

/** parses ast and returns a list of all css/scss ecsstatic imports */
function processImports(ast: Program) {
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
function evalWithEsbuild(expression: string, filename: string, allVarDeclarations = '') {
	const treeshaked = esbuild.transformSync(
		`${allVarDeclarations}\n
		module.exports = (${expression});`,
		{ format: 'cjs', treeShaking: true }
	);

	return nodeEval(treeshaked.code, filename);
}

/**
 * uses esbuild.build to inline all imports, then returns all variable declarations.
 * this can be passed to `evalWithEsbuild` where inline expressions will be resolved correctly.
 */
function findAllVariablesUsingEsbuild(
	fileId: string,
	options: {
		parseFn: (code: string) => unknown;
		ecsstaticImports: ReturnType<typeof processImports>;
	}
) {
	const { parseFn, ecsstaticImports } = options;

	// this code will have all the imports inlined
	const processedCode = esbuild.buildSync({
		entryPoints: [fileId],
		bundle: true,
		format: 'esm',
		write: false,
		platform: 'node',
		packages: 'external', // don't resolve packages
	}).outputFiles[0].text;

	const ast = parseFn(processedCode) as Program;

	const varDeclarations = ast.body.filter(
		(node) =>
			node.type === 'VariableDeclaration' && !isCssTaggedTemplateLiteral(node, ecsstaticImports)
	) as VariableDeclaration[];

	let returnValue = '';

	varDeclarations.forEach(({ start, end }) => {
		returnValue += processedCode.slice(start, end);
	});

	return returnValue;
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
	ecsstaticImports: ReturnType<typeof processImports>
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
