import * as React from 'react';
import { scss } from '@acab/ecsstatic';

export default (props: React.ComponentProps<'button'>) => {
	return <button className={button} {...props} />;
};

const button = scss`
	@use 'open-props-scss' as op;

	all: unset;
	font: inherit;
	color: op.$purple-9;
	border: 1px solid;
	border-radius: 4px;
	padding: 0.5rem 1rem;
	transition: color 0.2s;

	&:hover {
		color: op.$purple-6;
	}
`;
