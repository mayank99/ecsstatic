import { css } from '@acab/ecsstatic';
import { accent } from './constants.js';

export const Logo = () => {
	return (
		<>
			<div className={logo}>🎈</div>
			<h1 className={h1}>
				e<span>css</span>tatic
			</h1>
		</>
	);
};

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
