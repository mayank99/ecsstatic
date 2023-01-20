import type { ComponentProps } from 'preact';
import { css } from '@acab/ecsstatic';

export const Button = (props: ComponentProps<'button'>) => {
	return <button class={button} {...props} />;
};

const button = css`
	border-radius: 8px;
	border: 1px solid transparent;
	padding: 0.6em 1.2em;
	font: inherit;
	background-color: #1a1a1a;
	cursor: pointer;
	transition: border-color 0.25s;
	display: inline-grid;
	place-items: center;

	@media (prefers-color-scheme: light) {
		background-color: #f9f9f9;
	}

	&:hover {
		border-color: #a93c3c;
	}

	&:focus {
		outline-width: 4px;
	}

	&:disabled {
		opacity: 0.5;
	}
`;
