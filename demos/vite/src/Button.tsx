import { scss } from '@acab/ecsstatic';
import { useState } from 'react';
// @ts-ignore
import { Indigo } from 'open-props/src/colors';

export default () => {
	const [count, setCount] = useState(0);

	return (
		<>
			<span>{count}</span>
			<div className={poo}>Hi</div>
			<button onClick={() => setCount(count + 1)}>+</button>
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
