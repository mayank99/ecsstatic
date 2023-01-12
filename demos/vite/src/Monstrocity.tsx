import { scss } from '@acab/ecsstatic';
import { useState } from 'react';
// @ts-ignore
import { Indigo } from 'open-props/src/colors';

import Button from './Button';

export default () => {
	const [count, setCount] = useState(0);

	return (
		<>
			<span>{count}</span>
			<div className={poo}>Hi</div>
			<Button onClick={() => setCount(count + 1)}>+</Button>
		</>
	);
};

const poo = scss`
	@use 'open-props-scss' as op;

	@layer component {
		--test: ${Indigo['--indigo-0']};
		color: op.$purple-9;

		&:hover {
			color: op.$purple-8;
		}
	}
`;
