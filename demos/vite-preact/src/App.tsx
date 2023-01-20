import { useState } from 'preact/hooks';
import { css } from '@acab/ecsstatic';
import { Logo } from './Logo';
import { Button } from './Button';

export function App() {
	const [count, setCount] = useState(0);

	return (
		<div class={wrapper}>
			<Logo />
			<Button onClick={() => setCount((count) => count + 1)}>count is {count}</Button>
			<p>
				Edit any <code class={code}>.tsx</code> file to test HMR
			</p>
		</div>
	);
}

const wrapper = css`
	display: grid;
	place-items: center;
`;

const code = css`
	font-size: 0.9em;
	font-family: ui-monospace, monospace;
`;
