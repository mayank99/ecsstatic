import type { Plugin } from 'vite';
import esbuild from 'esbuild';
import postcssNested from 'postcss-nested';
import hash from './hash.js';
import MagicString from 'magic-string';
import postcss from 'postcss';
import type { Identifier, Program, TaggedTemplateExpression, VariableDeclaration } from 'estree';

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
	const cssList = new Map();

	return <Plugin>{
		name: 'ecsstatic',

		resolveId(id) {
			if (cssList.has(id)) return id;
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

			const [ecsstaticImportName, importStart, importEnd] = processImport(parsedAst);
			if (!ecsstaticImportName) return;

			const cssTemplateDeclarations = parsedAst.body.filter(
				(node) =>
					node.type === 'VariableDeclaration' &&
					isCssTaggedTemplateLiteral(node, ecsstaticImportName)
			) as VariableDeclaration[];

			if (cssTemplateDeclarations?.length === 0) return;

			const inlinedVars = findAllVariablesUsingEsbuild(id, {
				parseFn: this.parse,
				ecsstaticImportName,
			});

			cssTemplateDeclarations.forEach((node) => {
				const originalName = (node.declarations[0].id as Identifier).name;
				const { start, end, quasi } = node.declarations[0].init as TaggedTemplateExpression;

				let templateContents = '';
				quasi.quasis.forEach((_quasi, index) => {
					templateContents += _quasi.value.raw;
					if (index < quasi.quasis.length - 1) {
						const expression = quasi.expressions[index];
						templateContents += evalWithEsbuild(
							code.slice(expression.start, expression.end),
							inlinedVars
						);
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
};

/**
 * processes template strings using postcss-nested and
 * returns it along with a hashed classname based on the string contents.
 */
function processCss(templateContents = '', originalName = '') {
	const className = `${originalName}-${hash(templateContents)}`;
	const unprocessedCss = `.${className}{${templateContents}}`;

	const { css } = postcss([postcssNested()]).process(unprocessedCss);
	return [css, className];
}

/** parses ast and returns the name of the ecsstatic import and its start/end indexes */
function processImport(ast: Program) {
	let importName = '';

	for (const node of ast.body) {
		if (node.type === 'ImportDeclaration') {
			if (node.source.value === '@acab/ecsstatic') {
				const importSpecifier = node.specifiers[0];
				if (importSpecifier.type === 'ImportSpecifier' && importSpecifier.imported.name === 'css') {
					importName = importSpecifier.local.name;
					const { start, end } = node;
					return [importName, start, end] as const;
				}
			}
		}
	}

	return [importName, 0, 0] as const;
}

/**
 * uses esbuild.transform to tree-shake unused var declarations
 * before evaluating it inside the Function constructor
 */
function evalWithEsbuild(expression: string, allVarDeclarations = '') {
	const transformed = esbuild.transformSync(
		`${allVarDeclarations}\n
		export const __dontTreeshakeThisForEcsstatic = () => (${expression});`,
		{
			format: 'esm',
			treeShaking: true,
		}
	);
	const treeshakedDeclarations = transformed.code.substring(
		0,
		transformed.code.indexOf('const __dontTreeshakeThisForEcsstatic')
	);

	return new Function(`${treeshakedDeclarations};\nreturn (${expression})`)();
}

/**
 * uses esbuild.build to inline all imports, then returns all variable declarations.
 * this can be passed to `evalWithEsbuild` where inline expressions will be resolved correctly.
 */
function findAllVariablesUsingEsbuild(
	fileId: string,
	options: {
		parseFn: (code: string) => unknown;
		ecsstaticImportName?: string;
	}
) {
	const { parseFn, ecsstaticImportName = 'css' } = options;

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
			node.type === 'VariableDeclaration' && !isCssTaggedTemplateLiteral(node, ecsstaticImportName)
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
 * ```
 */
function isCssTaggedTemplateLiteral(node: VariableDeclaration, ecsstaticImportName = 'css') {
	return (
		node.declarations[0].init?.type === 'TaggedTemplateExpression' &&
		node.declarations[0].init.tag.type === 'Identifier' &&
		node.declarations[0].init.tag.name === ecsstaticImportName
	);
}
