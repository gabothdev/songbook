import React, { useId, useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Edit3 } from 'lucide-react';
import { parseImageFraming, reportBrokenImage } from '../../services/artworkService';

/**
 * ArtistPolaroid Component
 * Renders an authentic analog Polaroid photograph using the vector artwork from polaroid.svg.
 * Injects the artist's photo into the <rect id="photo"> slot with glossy shine overlay
 * and handwritten artist caption at the bottom margin.
 */
export default function ArtistPolaroid({
  artistImage = null,
  artistName = '',
  songTitle = '',
  onClick = null,
  className = '',
  isHoverable = true,
  canEdit = true,
}) {
  const clipId = useId();
  const filterId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const framing = parseImageFraming(artistImage);
  const actualUrl = framing.url;
  const hasPhoto = Boolean(actualUrl) && !imageError;

  return (
    <div
      className={`relative group select-none transition-transform duration-300 ${
        isHoverable ? 'hover:scale-[1.03]' : ''
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={canEdit ? 'Haz clic para cambiar o ver foto del artista' : artistName}
    >
      <svg
        version="1.1"
        viewBox="0 0 350 380"
        className="w-full h-auto filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
        style={{ enableBackground: 'new 0 0 350 380' }}
        xmlSpace="preserve"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="3.4782385" />
          </filter>

          {/* Photo clip path for 300.3 x 300.3 photo slot */}
          <clipPath id={clipId}>
            <rect x="428" y="331.1" width="300.3" height="300.3" rx="1.5" />
          </clipPath>
        </defs>

        <g id="layer1" transform="translate(-413.06 -322.28)">
          <g id="g3271" transform="translate(9.9102 9.3779)">
            {/* Blurred drop shadow */}
            <g id="rect2893" style={{ filter: `url(#${filterId})` }}>
              <path
                d="M413.1,322.3h330.2v365.5c0,0-82.5-7.2-165.1-7.2c-82.5,0-165.1,7.2-165.1,7.2L413.1,322.3L413.1,322.3z"
                fill="#000000"
                opacity="0.35"
              />
            </g>

            {/* White Polaroid Paper Frame */}
            <rect
              id="rect2889"
              x="413.1"
              y="318"
              fill="#F4F2EC"
              stroke="#D6D1C4"
              strokeWidth="0.8"
              width="330.2"
              height="362.2"
              rx="2.5"
            />

            {/* Inner Dark Bevel */}
            <rect
              id="rect2916"
              x="424.9"
              y="328.2"
              fill="#D1CBC0"
              opacity="0.55"
              width="306.5"
              height="308.6"
            />

            {/* PHOTO SLOT (<rect id="photo">) */}
            {hasPhoto ? (
              <image
                href={actualUrl}
                x={428 + (framing.x || 0)}
                y={331.1 + (framing.y || 0)}
                width={300.3 * (framing.zoom || 1)}
                height={300.3 * (framing.zoom || 1)}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
                onError={() => {
                  setImageError(true);
                  reportBrokenImage({
                    type: 'artist',
                    name: artistName,
                    songTitle,
                    url: actualUrl,
                  });
                }}
              />
            ) : (
              /* Analog Polaroid Placeholder */
              <g clipPath={`url(#${clipId})`}>
                <rect x="428" y="331.1" width="300.3" height="300.3" fill="#292019" />
                <circle cx={428 + 150.15} cy={331.1 + 120} r="46" fill="#47372c" />
                <path
                  d={`M ${428 + 70} ${331.1 + 250} A 80 80 0 0 1 ${428 + 230} ${331.1 + 250} Z`}
                  fill="#47372c"
                />
                <text
                  x={428 + 150.15}
                  y={331.1 + 268}
                  textAnchor="middle"
                  fill="#cbb39e"
                  fontSize="17"
                  fontFamily="'Caveat', cursive, sans-serif"
                  fontWeight="bold"
                >
                  {artistName || 'Foto del Artista'}
                </text>
              </g>
            )}

            {/* Outer photo border stroke */}
            <rect
              id="photo"
              x="428"
              y="331.1"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.8"
              width="300.3"
              height="300.3"
            />

            {/* Glossy Photopaper Sheen Overlay (rect3250) */}
            <path
              id="rect3250"
              fill="#FFFFFF"
              opacity="0.1991"
              d="M427.6,330.8h300.3c0,0-47.3,61.4-122.4,103 C530.4,475.3,427.6,497,427.6,497V330.8z"
              pointerEvents="none"
            />

            {/* Handwritten Artist Caption in the classic Polaroid bottom margin */}
            <text
              x={428 + 150.15}
              y="657"
              textAnchor="middle"
              fill="#261b14"
              fontSize={artistName && artistName.length > 24 ? "14" : artistName && artistName.length > 18 ? "16" : "19"}
              fontFamily="'Caveat', 'Segoe Print', 'Brush Script MT', cursive, sans-serif"
              fontWeight="700"
              letterSpacing="0.4"
              style={{
                filter: 'drop-shadow(0 1px 0.5px rgba(0,0,0,0.12))',
              }}
            >
              {artistName || 'Artista'}
            </text>
          </g>
        </g>
      </svg>

      {/* Hover badge to edit/change photo (Admin only) */}
      {canEdit && isHoverable && isHovered && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/80 text-amber-200 text-[10px] font-sans font-bold rounded-full shadow-lg backdrop-blur-sm border border-amber-400/40 animate-fade-in">
            <Camera className="w-3 h-3 text-amber-300" />
            <span>{hasPhoto ? 'Cambiar Foto' : 'Añadir Foto'}</span>
          </span>
        </div>
      )}
    </div>
  );
}
