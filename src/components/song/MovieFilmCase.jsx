import React, { useId, useState } from 'react';
import { Film, Clapperboard, Sparkles } from 'lucide-react';
import { parseImageFraming, reportBrokenImage } from '../../services/artworkService';

/**
 * MovieFilmCase Component
 * Renders an authentic 35mm cinema film frame using the vector artwork from movie.svg.
 * Injects the movie scene or studio session photo into the <rect id="photo"> area (x: 311.8, y: 412.4, w: 2958.4, h: 1975.2).
 * Perfect for songs marked as 'soundtrack' (Banda Sonora / Escena de Película) or 'session' (Sesión de Estudio / Ensayo).
 */
export default function MovieFilmCase({
  albumCover = null,
  songTitle = '',
  artistName = '',
  albumName = '',
  releaseYear = null,
  versionDetails = '',
  versionType = 'soundtrack', // 'soundtrack' | 'session'
  onClick = null,
  className = '',
  isHoverable = true,
  canEdit = true,
}) {
  const clipId = useId();
  const gradId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const framing = parseImageFraming(albumCover);
  const actualUrl = framing.url;
  const hasCover = Boolean(actualUrl) && !imageError;
  const isSoundtrack = versionType === 'soundtrack';

  return (
    <div
      className={`relative group select-none transition-transform duration-300 ${
        isHoverable ? 'hover:scale-[1.03]' : ''
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={
        canEdit
          ? isSoundtrack
            ? 'Haz clic para cambiar o ver fotograma de la película'
            : 'Haz clic para cambiar o ver foto de la sesión'
          : (versionDetails || albumName || `${songTitle} (${isSoundtrack ? 'Banda Sonora' : 'Sesión'})`)
      }
    >
      <svg
        version="1.1"
        viewBox="0 0 3582 2800"
        className="w-full h-auto filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.65)]"
        style={{ enableBackground: 'new 0 0 3582 2800' }}
        xmlSpace="preserve"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="311.8" y="412.4" width="2958.4" height="1975.2" rx="16" />
          </clipPath>

          <linearGradient
            id={gradId}
            gradientUnits="userSpaceOnUse"
            x1="195.4999"
            y1="-197.6101"
            x2="3386.5"
            y2="2993.3896"
            gradientTransform="matrix(1 0 0 -1 0 2797.8899)"
          >
            <stop offset="0" stopColor="#0a0a0a" />
            <stop offset="0.2985" stopColor="#1f180d" />
            <stop offset="0.5625" stopColor="#3d2f16" />
            <stop offset="0.696" stopColor="#261d0f" />
            <stop offset="1" stopColor="#080808" />
          </linearGradient>
        </defs>

        {/* ================= PHOTO AREA (movie.svg id="photo") ================= */}
        {hasCover ? (
          <image
            id="photo"
            href={actualUrl}
            x={311.8 + (framing.x || 0)}
            y={412.4 + (framing.y || 0)}
            width={2958.4 * (framing.zoom || 1)}
            height={1975.2 * (framing.zoom || 1)}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            onError={() => {
              setImageError(true);
              reportBrokenImage({
                type: versionType,
                name: artistName,
                songTitle,
                url: actualUrl,
              });
            }}
          />
        ) : (
          /* Cinematic Widescreen Film Placeholder */
          <g id="photo" clipPath={`url(#${clipId})`}>
            <rect x="311.8" y="412.4" width="2958.4" height="1975.2" fill="#120f0d" />
            <rect
              x="361.8"
              y="462.4"
              width="2858.4"
              height="1875.2"
              fill="none"
              stroke="#d4af37"
              strokeWidth="4"
              strokeDasharray="20,15"
              opacity="0.4"
            />
            {/* Clapperboard / Film icon banner */}
            <text
              x="1791"
              y="980"
              textAnchor="middle"
              fill="#d4af37"
              fontSize="120"
              fontFamily="sans-serif"
              fontWeight="900"
              letterSpacing="28"
            >
              {isSoundtrack ? 'CINEMA SOUNDTRACK' : 'LIVE STUDIO SESSION'}
            </text>
            <text
              x="1791"
              y="1260"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="160"
              fontFamily="serif"
              fontWeight="bold"
            >
              {songTitle || 'Banda Sonora Original'}
            </text>
            <text
              x="1791"
              y="1460"
              textAnchor="middle"
              fill="#e0c097"
              fontSize="110"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {artistName || 'Intérprete'}
            </text>
            <text
              x="1791"
              y="1720"
              textAnchor="middle"
              fill="#a89a8c"
              fontSize="85"
              fontFamily="sans-serif"
            >
              {versionDetails || albumName || (isSoundtrack ? 'Banda Sonora Oficial' : 'Sesión de Grabación')}
            </text>
            {releaseYear && (
              <text
                x="1791"
                y="1920"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="90"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ★ {releaseYear} ★
              </text>
            )}
          </g>
        )}

        {/* Vintage Film Strip Overlay with Sprocket Holes and Borders */}
        <g pointerEvents="none">
          {/* Authentic Film Grain / Texture Overlay */}
          <image
            style={{ overflow: 'visible', opacity: 0.72, enableBackground: 'new' }}
            width="16058"
            height="12800"
            href="/57E67BC6.png"
            transform="matrix(0.2399 0 0 0.2399 -109.9026 -95.16)"
          />

          {/* Film Borders and Sprocket Perforations */}
          <path
            fill={`url(#${gradId})`}
            d="M3582,412.4V0H2148.1c-62.5,40.7-146.9,65.6-239.8,65.6S1731.1,40.7,1668.6,0H0v412.4h165.8v1975.2H0V2800
              h3582v-412.4h-165.8V412.4H3582z M3420.4,161.5c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V161.5z M161.6,310.1c0,22.1-17.9,40-40,40H41c-22.1,0-40-17.9-40-40V161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310.1z M161.6,2638.5c0,22.1-17.9,40-40,40H41c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V2638.5z M3420.4,2489.9c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40v148.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2489.9z M2798.7,161.5c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V161.5z M2487.8,161.5c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V161.5z M2177,161.5c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40H2217
              c-22.1,0-40-17.9-40-40V161.5z M3243.2,412.4v1975.2H338.8V412.4H3243.2z M1866.1,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M1555.3,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M1244.4,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M933.6,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M622.7,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M311.9,161.5c0-22.1,17.9-40,40-40h80.6
              c22.1,0,40,17.9,40,40V310c0,22.1-17.9,40-40,40h-80.6c-22.1,0-40-17.9-40-40V161.5z M472.4,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M783.3,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M1094.2,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M1405,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M1715.9,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M2026.7,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M2337.6,2638.5c0,22.1-17.9,40-40,40H2217
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M2648.4,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M2959.3,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M3270.2,2638.5c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V2490c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V2638.5z M3270.2,310.1c0,22.1-17.9,40-40,40h-80.6
              c-22.1,0-40-17.9-40-40V161.5c0-22.1,17.9-40,40-40h80.6c22.1,0,40,17.9,40,40V310.1z"
          />

          {/* 35mm Edge Codes */}
          <text
            x="1791"
            y="235"
            textAnchor="middle"
            fill="#d4af37"
            fontSize="52"
            fontFamily="monospace"
            letterSpacing="18"
            opacity="0.8"
          >
            KODAK 5219 • 35MM CINEMA FILM • {isSoundtrack ? 'SOUNDTRACK' : 'SESSION'}
          </text>
          <text
            x="1791"
            y="2590"
            textAnchor="middle"
            fill="#d4af37"
            fontSize="52"
            fontFamily="monospace"
            letterSpacing="18"
            opacity="0.8"
          >
            FRAME 24 FPS • {releaseYear ? `AÑO ${releaseYear} • ` : ''}SCENE TAKE
          </text>
        </g>
      </svg>

      {/* Hover badge to edit/change movie frame */}
      {canEdit && isHoverable && isHovered && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/85 text-amber-200 text-[10px] font-sans font-bold rounded-full shadow-lg backdrop-blur-sm border border-amber-400/40 animate-fade-in">
            <Film className="w-3 h-3 text-amber-300" />
            <span>{hasCover ? (isSoundtrack ? 'Cambiar Fotograma' : 'Cambiar Foto') : (isSoundtrack ? 'Añadir Película' : 'Añadir Sesión')}</span>
          </span>
        </div>
      )}
    </div>
  );
}
