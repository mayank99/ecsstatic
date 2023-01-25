import { useState } from 'react';
import { css } from '@acab/ecsstatic';
import { Logo } from './Logo.js';
import { Button } from './Button.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<div className={wrapper}>
			<Logo />
			<Button onClick={() => setCount((c) => c + 1)}>count is {count}</Button>
			<p>
				Edit any <code className={code}>.tsx</code> file to test HMR
			</p>
		</div>
	);
};

const wrapper = css`
	display: grid;
	place-items: center;
`;

const code = css`
	font-size: 0.9em;
	font-family: ui-monospace, monospace;
`;
