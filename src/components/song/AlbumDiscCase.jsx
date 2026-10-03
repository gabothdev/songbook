import React, { useId, useState } from 'react';
import { Disc, Music2, Sparkles } from 'lucide-react';
import { parseImageFraming, reportBrokenImage } from '../../services/artworkService';

/**
 * AlbumDiscCase Component
 * Renders an authentic CD jewel case and front booklet using the vector artwork from cd-2.svg.
 * Injects the album cover photo directly into the <path id="photo-disc"> booklet slot,
 * preserving the jewel case spine, corner booklet latches, and the transparent acrylic surface glare.
 */
export default function AlbumDiscCase({
  albumCover = null,
  albumName = '',
  songTitle = '',
  artistName = '',
  onClick = null,
  className = '',
  isHoverable = true,
  canEdit = true,
}) {
  const cdClipId = useId();
  const radGrad1 = useId();
  const linGrad1 = useId();
  const linGradGlare = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const framing = parseImageFraming(albumCover);
  const actualUrl = framing.url;
  const hasCover = Boolean(actualUrl) && !imageError;

  return (
    <div
      className={`relative group select-none transition-transform duration-300 ${
        isHoverable ? 'hover:scale-[1.03]' : ''
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={canEdit ? 'Haz clic para cambiar o ver carátula del disco' : (albumName || songTitle)}
    >
      <svg
        version="1.1"
        viewBox="0 0 1307.8 1164.9"
        className="w-full h-auto filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.55)]"
        style={{ enableBackground: 'new 0 0 1307.8 1164.9' }}
        xmlSpace="preserve"
      >
        <defs>
          {/* Jewel box radial gradient for backplate */}
          <radialGradient
            id={radGrad1}
            cx="531.4326"
            cy="261.6578"
            r="639.42"
            gradientTransform="matrix(0.8873 0.5123 0.4348 -0.7531 187.021 615.0009)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#5F5F5F" />
            <stop offset="1" stopColor="#A4A4A4" />
          </radialGradient>

          {/* Spine linear gradient */}
          <linearGradient
            id={linGrad1}
            gradientUnits="userSpaceOnUse"
            x1="-429.236"
            y1="605.4542"
            x2="-311.8029"
            y2="605.4542"
            gradientTransform="matrix(0.9783 0 0 -1.0002 240.0659 1180.8091)"
          >
            <stop offset="0" stopColor="#000000" />
            <stop offset="0.0425" stopColor="#111111" />
            <stop offset="0.8516" stopColor="#111111" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>

          {/* Acrylic glare linear gradient */}
          <linearGradient
            id={linGradGlare}
            gradientUnits="userSpaceOnUse"
            x1="531.1718"
            y1="1153.5701"
            x2="203.3218"
            y2="585.7201"
            gradientTransform="matrix(0.9783 0 0 -0.9783 237.2769 1165.556)"
          >
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3478" />
            <stop offset="0.96" stopColor="#FFFFFF" stopOpacity="0.2696" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.1391" />
          </linearGradient>

          {/* EXACT BOOKLET CLIP PATH from photo-disc in cd-2.svg */}
          <clipPath id={cdClipId}>
            <path d="M-47.2,35.1c-3.8,0-6.8,3.4-6.8,7.6v1066c0,4.2,3.1,7.6,6.8,7.6h1096.4 c3.8,0,6.8-3.4,6.8-7.6V42.7c0-4.2-3.1-7.6-6.8-7.6L-47.2,35.1z" />
          </clipPath>
        </defs>

        <g id="layer1" transform="translate(227.86 -13.322)">
          <g id="g3865" transform="translate(-2.7592 3.2254)">
            {/* Jewel Case Soft Drop Shadow */}
            <path
              id="rect4092"
              opacity="0.5814"
              fill="#000000"
              d="M-191.7,40.1H1044c4.2,0,7.7,3.5,7.7,7.8v1095.6c0,4.3-3.4,7.8-7.7,7.8H-191.7 c-4.2,0-7.7-3.5-7.7-7.8V47.9C-199.4,43.6-196,40.1-191.7,40.1z"
            />

            {/* Jewel Case Backplate */}
            <path
              id="rect2998"
              fill={`url(#${radGrad1})`}
              stroke="#6A5555"
              strokeWidth="0.9783"
              d="M-171.6,20.1c-4.3,0-7.7,3.5-7.7,7.8v1095.6c0,4.3,3.4,7.8,7.7,7.8h1234.7 c4.3,0,7.7-3.5,7.7-7.8V27.9c0-4.3-3.4-7.8-7.7-7.8L-171.6,20.1z"
            />

            {/* ================= PHOTO-DISC SLOT (FRONT BOOKLET / COVER) ================= */}
            {hasCover ? (
              <image
                id="photo-disc"
                href={actualUrl}
                x={-47.2 + (framing.x || 0)}
                y={35.1 + (framing.y || 0)}
                width={1096.4 * (framing.zoom || 1)}
                height={1066 * (framing.zoom || 1)}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${cdClipId})`}
                onError={() => {
                  setImageError(true);
                  reportBrokenImage({
                    type: 'album',
                    name: artistName,
                    songTitle,
                    url: actualUrl,
                  });
                }}
              />
            ) : (
              /* Analog Vinyl / Booklet Placeholder */
              <g id="photo-disc" clipPath={`url(#${cdClipId})`}>
                <rect x="-47.2" y="35.1" width="1096.4" height="1066" fill="#181310" />
                <circle cx={-47.2 + 1096.4 / 2} cy={35.1 + 1066 / 2} r="380" fill="none" stroke="#2a2019" strokeWidth="6" />
                <circle cx={-47.2 + 1096.4 / 2} cy={35.1 + 1066 / 2} r="260" fill="none" stroke="#251c16" strokeWidth="4" />
                <circle cx={-47.2 + 1096.4 / 2} cy={35.1 + 1066 / 2} r="140" fill="none" stroke="#2a2019" strokeWidth="4" />
                <text
                  x={-47.2 + 1096.4 / 2}
                  y={35.1 + 1066 / 2 - 35}
                  textAnchor="middle"
                  fill="#d4af37"
                  fontSize="52"
                  fontFamily="serif"
                  fontWeight="bold"
                >
                  {songTitle || albumName || 'Álbum Musical'}
                </text>
                <text
                  x={-47.2 + 1096.4 / 2}
                  y={35.1 + 1066 / 2 + 35}
                  textAnchor="middle"
                  fill="#a89a8c"
                  fontSize="36"
                  fontFamily="sans-serif"
                >
                  {artistName || 'Disco Oficial'}
                </text>
              </g>
            )}

            {/* Inner Border Stroke around booklet */}
            <path
              fill="none"
              stroke="#332a24"
              strokeWidth="1.2"
              d="M-47.2,35.1c-3.8,0-6.8,3.4-6.8,7.6v1066c0,4.2,3.1,7.6,6.8,7.6h1096.4 c3.8,0,6.8-3.4,6.8-7.6V42.7c0-4.2-3.1-7.6-6.8-7.6L-47.2,35.1z"
            />

            {/* Left Case Spine */}
            <path
              id="path3815"
              fill={`url(#${linGrad1})`}
              stroke="#000000"
              strokeWidth="0.989"
              d="M-173.7,29.9c-3.1,0-5.6,2.6-5.6,5.8v1079.2c0,3.2,2.5,5.7,5.6,5.8h102.7 c3.1,0,5.6-2.6,5.6-5.8V35.6c0-3.2-2.5-5.7-5.6-5.8H-173.7z"
            />

            {/* Vertical Spine Ribs */}
            <g id="g3924" transform="matrix(.97825 0 0 .97825 9.3288 12.891)">
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-175,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-165,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-145,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-135,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-125,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-105,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-155,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-115,17.8v1115" />
              <path stroke="#000000" strokeWidth="3.1878" fill="#151515" d="M-95,17.8v1115" />
            </g>

            {/* Plastic Corner Latches Holding Booklet (from cd-2.svg g4464) */}
            <g id="g4464" transform="matrix(.97825 0 0 .97825 9.3288 12.891)" opacity="0.6">
              <path fill="#C8C8C8" stroke="#FFFFFF" strokeWidth="2.93" d="M166.4,10.7c0,23.7-19.4,42.9-43.4,42.9c-24,0-43.4-19.2-43.4-42.9v0l43.4,0L166.4,10.7z" />
              <path fill="#C8C8C8" stroke="#FFFFFF" strokeWidth="2.93" d="M912.9,10.7c0,23.7-19.4,42.9-43.4,42.9c-24,0-43.4-19.2-43.4-42.9v0l43.4,0L912.9,10.7z" />
              <path fill="#C8C8C8" stroke="#FFFFFF" strokeWidth="2.93" d="M166.4,1139.8c0-23.7-19.4-42.9-43.4-42.9c-24,0-43.4,19.2-43.4,42.9l0,0H123H166.4z" />
              <path fill="#C8C8C8" stroke="#FFFFFF" strokeWidth="2.93" d="M912.9,1139.8c0-23.7-19.4-42.9-43.4-42.9c-24,0-43.4,19.2-43.4,42.9l0,0h43.4H912.9z" />
            </g>

            {/* Transparent Acrylic Jewel Case Surface Glare (diagonal glossy sheen) */}
            <path
              id="glare"
              fill={`url(#${linGradGlare})`}
              opacity="0.293"
              pointerEvents="none"
              d="M-172.1,20.5h1235.6c4.2,0,7.7,3.5,7.7,7.8V1124c0,4.3-3.4,7.8-7.7,7.8H-172.1 c-4.2,0-7.7-3.5-7.7-7.8V28.3C-179.8,24-176.4,20.5-172.1,20.5z"
            />
          </g>
        </g>
      </svg>

      {/* Hover badge to edit/change album cover (Admin only) */}
      {canEdit && isHoverable && isHovered && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/85 text-amber-200 text-[10px] font-sans font-bold rounded-full shadow-lg backdrop-blur-sm border border-amber-400/40 animate-fade-in">
            <Disc className="w-3 h-3 text-amber-300" />
            <span>{hasCover ? 'Cambiar Carátula' : 'Añadir Disco'}</span>
          </span>
        </div>
      )}
    </div>
  );
}
