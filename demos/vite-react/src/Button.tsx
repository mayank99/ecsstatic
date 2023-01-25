import type { ComponentProps } from 'react';
import { css } from '@acab/ecsstatic';
import clsx from 'clsx';
import { accent } from './constants';

export const Button = (props: ComponentProps<'button'>) => {
	return <button {...props} className={clsx(button, props.className)} />;
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
		border-color: ${accent};
	}

	&:focus {
		outline-width: 4px;
	}

	&:disabled {
		opacity: 0.5;
	}
`;
