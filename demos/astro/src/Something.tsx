import * as React from 'react';
import { css } from '@acab/ecsstatic';

export default () => {
	return <div className={poo}>Hi</div>;
};

const poo = css`
	@layer A {
		color: hotpink;
	}
	@layer B {
		color: rebeccapurple;
	}
`;
