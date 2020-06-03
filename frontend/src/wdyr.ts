import React from 'react';
import { Icon } from 'semantic-ui-react';

if (process.env.NODE_ENV === 'development') {
    const whyDidYouRender = require('@welldone-software/why-did-you-render');
    whyDidYouRender(React, {
        trackAllPureComponents: true,
        exlude: [/^Icon/]
    });
}