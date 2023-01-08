import * as ESTree from 'estree';

declare module 'estree' {
	interface BaseNodeWithoutComments {
		start: number;
		end: number;
	}
}
