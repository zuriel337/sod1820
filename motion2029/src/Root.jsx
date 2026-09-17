import React from 'react';
import {Composition} from 'remotion';
import {BrandSting2029} from './BrandSting2029.jsx';

export const RemotionRoot = () => (
  <>
    <Composition
      id="BrandSting2029"
      component={BrandSting2029}
      durationInFrames={210}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        locale: 'he',
        identity: 'סוד 1820',
        expression: "כי לה׳ המלוכה",
        englishExpression: 'KINGDOM RISE',
      }}
    />
  </>
);
