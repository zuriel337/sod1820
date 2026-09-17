import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

export const BrandSting2029 = ({
  locale = 'he',
  identity = 'סוד 1820',
  expression = "כי לה׳ המלוכה",
  englishExpression = 'KINGDOM RISE',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rtl = locale === 'he' || locale === 'ar';

  const crownIn = interpolate(frame, [10, 46], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const ringIn = interpolate(frame, [20, 82], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const textIn = interpolate(frame, [58, 100], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const exit = interpolate(frame, [5.8 * fps, 6.8 * fps], [1, 0], {
    ...clamp,
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 50% 44%, rgba(13,52,122,0.42) 0%, rgba(5,12,31,0.92) 34%, #02050b 72%)',
        overflow: 'hidden',
        fontFamily: 'serif',
        opacity: exit,
      }}
    >
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 650 + i * 150,
              height: 650 + i * 150,
              borderRadius: '50%',
              border: '1px solid rgba(218,178,72,0.28)',
              opacity: ringIn * (0.8 - i * 0.18),
              scale: interpolate(frame, [20 + i * 5, 115], [0.72, 1.04 + i * 0.02], clamp),
              rotate: `${interpolate(frame, [0, 210], [i * 12, i * 12 + (i % 2 === 0 ? 10 : -8)], clamp)}deg`,
              boxShadow: '0 0 32px rgba(49,105,255,0.08)',
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            width: 3,
            height: 860,
            background: 'linear-gradient(180deg, transparent, rgba(246,226,122,0.8), transparent)',
            opacity: interpolate(frame, [0, 50, 130], [0, 0.9, 0.25], clamp),
            filter: 'blur(1px)',
          }}
        />

        <Img
          src={staticFile('master-crown-2029.png')}
          style={{
            position: 'absolute',
            width: 560,
            height: 560,
            objectFit: 'contain',
            opacity: crownIn,
            scale: interpolate(frame, [10, 52, 125], [0.72, 1.03, 1], {
              ...clamp,
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: `0px ${interpolate(frame, [10, 75], ['34px', '-34px'], clamp)}`,
            filter: 'drop-shadow(0 0 32px rgba(41,101,255,0.32)) drop-shadow(0 0 18px rgba(237,189,70,0.28))',
          }}
        />

        <div
          dir={rtl ? 'rtl' : 'ltr'}
          style={{
            position: 'absolute',
            top: 710,
            width: '100%',
            textAlign: 'center',
            opacity: textIn,
            translate: `0px ${interpolate(frame, [58, 105], ['18px', '0px'], clamp)}`,
          }}
        >
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: rtl ? 0 : 8,
              fontWeight: 700,
              color: '#f4d579',
              textShadow: '0 0 20px rgba(224,181,73,0.2)',
            }}
          >
            {locale === 'en' ? englishExpression : expression}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 30,
              letterSpacing: rtl ? 2 : 7,
              color: 'rgba(235,240,255,0.82)',
            }}
          >
            {identity}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
