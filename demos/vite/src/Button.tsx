import { scss } from '@acab/ecsstatic';
import { useState } from 'react';

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
		color: op.$purple-9;

		&:hover {
			color: op.$purple-8;
		}
	}
`;
