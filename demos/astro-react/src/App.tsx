import { useState } from 'react';
import { css } from '@acab/ecsstatic';
import { Red } from 'open-props/src/props.colors.js';

export const App = () => {
	const [count, setCount] = useState(0);

	return (
		<div className={wrapper}>
			<div className={logo}>🎈</div>
			<h1 className={h1}>
				e<span>css</span>tatic
			</h1>
			<button className={button} onClick={() => setCount((c) => c + 1)}>
				count is {count}
			</button>
			<p>
				Edit any <code className={code}>.tsx</code> file to test HMR
			</p>
		</div>
	);
};
export default App;

const accent = Red['--red-6'];

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

const logo = css`
	font-size: 6rem;
	line-height: 1;
	will-change: filter;
	transition: filter 300ms;

	&:hover {
		filter: drop-shadow(0 0 1em ${accent});
	}
`;

const h1 = css`
	font-style: italic;
	font-weight: 400;
	font-size: 4rem;
	line-height: 1;
	margin-block: 1rem 2rem;

	span {
		color: ${accent};
	}
`;

const wrapper = css`
	display: grid;
	place-items: center;
`;

const code = css`
	font-size: 0.9em;
	font-family: ui-monospace, monospace;
`;
