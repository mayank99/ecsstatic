import { useState } from 'react';
import { css } from '@acab/ecsstatic/modules';
import { Logo } from './Logo.js';
import { Button } from './Button.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<div className={styles.wrapper}>
			<Logo />
			<Button onClick={() => setCount((c) => c + 1)}>count is {count}</Button>
			<p>
				Edit any <code className={styles.code}>.tsx</code> file to test HMR
			</p>
		</div>
	);
};

const styles = css`
	.wrapper {
		display: grid;
		place-items: center;
	}

	.code {
		font-size: 0.9em;
		font-family: ui-monospace, monospace;
	}
`;
