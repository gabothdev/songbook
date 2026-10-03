import React, { useId, useState } from 'react';
import { Ticket, Sparkles } from 'lucide-react';
import { parseImageFraming, reportBrokenImage } from '../../services/artworkService';

/**
 * TicketStubCase Component
 * Renders an authentic vintage concert admission ticket using the vector artwork from ticket.svg.
 * Injects the live performance photo into the <rect id="photo"> area (x: 80.9, y: 13, w: 356.9, h: 238.3).
 * Perfect for songs marked as 'live' (En Vivo / Concierto).
 */
export default function TicketStubCase({
  albumCover = null,
  songTitle = '',
  artistName = '',
  albumName = '',
  releaseYear = null,
  versionDetails = '',
  onClick = null,
  className = '',
  isHoverable = true,
  canEdit = true,
}) {
  const clipId = useId();
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
      title={canEdit ? 'Haz clic para cambiar o ver foto del recital / entrada' : (versionDetails || albumName || `${songTitle} (En Vivo)`)}
    >
      <svg
        version="1.1"
        viewBox="0 0 517.4 265.2"
        className="w-full h-auto filter drop-shadow-[0_12px_22px_rgba(0,0,0,0.55)]"
        style={{ enableBackground: 'new 0 0 517.4 265.2' }}
        xmlSpace="preserve"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="80.9" y="13" width="356.9" height="238.3" />
          </clipPath>
        </defs>

        <g>
          {/* Ticket Base Outline with Perforated Scalloped Edges */}
          <path
            fill="#EA624A"
            d="M516.4,225.2c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1V206c-0.3,0-0.6,0.1-1,0.1
              c-3.8,0-6.9-3.1-6.9-6.9c0-3.8,3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-5.5c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9
              c0-3.8,3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-5.5c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9c0-3.8,3.1-6.9,6.9-6.9
              c0.3,0,0.7,0.1,1,0.1v-5.5c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-5.5
              c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-5.5c-0.3,0-0.6,0.1-1,0.1
              c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-5.7c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9
              c0.3,0,0.7,0.1,1,0.1v-5.5c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1V53
              c-0.3,0-0.6,0.1-1,0.1c-3.8,0-6.9-3.1-6.9-6.9s3.1-6.9,6.9-6.9c0.3,0,0.7,0.1,1,0.1v-6.5c-18.2,0-32.9-14.7-32.9-32.9H32.9
              c0,18.2-14.7,32.9-32.9,32.9v6.5c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9C0.8,53.1,0.4,53,0,53v5.6
              c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1
              c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1V97c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9
              s-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9
              c-0.5,0-0.9,0-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1v5.6
              c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9c0,3.8-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1
              c3.8,0,6.9,3.1,6.9,6.9c0,3.8-3.1,6.9-6.9,6.9c-0.5,0-0.9,0-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9
              c0,3.8-3.1,6.9-6.9,6.9c-0.5,0-0.9-0.1-1.3-0.1v5.6c0.4-0.1,0.9-0.1,1.3-0.1c3.8,0,6.9,3.1,6.9,6.9s-3.1,6.9-6.9,6.9
              c-0.5,0-0.9-0.1-1.3-0.1v6.5c18.2,0,32.9,14.7,32.9,32.9h451.6c0-18.2,14.7-32.9,32.9-32.9v-6.5
              C517,225.2,516.7,225.2,516.4,225.2z"
          />

          {/* ================= PHOTO AREA (ticket.svg id="photo") ================= */}
          {hasCover ? (
            <image
              id="photo"
              href={actualUrl}
              x={80.9 + (framing.x || 0)}
              y={13 + (framing.y || 0)}
              width={356.9 * (framing.zoom || 1)}
              height={238.3 * (framing.zoom || 1)}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
              onError={() => {
                setImageError(true);
                reportBrokenImage({
                  type: 'live',
                  name: artistName,
                  songTitle,
                  url: actualUrl,
                });
              }}
            />
          ) : (
            /* Vintage Concert Ticket Center Placeholder */
            <g id="photo" clipPath={`url(#${clipId})`}>
              <rect x="80.9" y="13" width="356.9" height="238.3" fill="#2b1a16" />
              <rect x="86.9" y="19" width="344.9" height="226.3" fill="none" stroke="#e07a5f" strokeWidth="1.5" strokeDasharray="4,4" />
              <text
                x="259"
                y="65"
                textAnchor="middle"
                fill="#f4a261"
                fontSize="18"
                fontFamily="sans-serif"
                fontWeight="900"
                letterSpacing="4"
              >
                ★ EN VIVO ★
              </text>
              <text
                x="259"
                y="110"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="20"
                fontFamily="serif"
                fontWeight="bold"
              >
                {songTitle || 'Recital en Directo'}
              </text>
              <text
                x="259"
                y="140"
                textAnchor="middle"
                fill="#e07a5f"
                fontSize="15"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {artistName || 'Concierto'}
              </text>
              <text
                x="259"
                y="185"
                textAnchor="middle"
                fill="#f4d06f"
                fontSize="12"
                fontFamily="sans-serif"
              >
                {versionDetails || albumName || 'Grabación Oficial en Concierto'}
              </text>
              {releaseYear && (
                <text
                  x="259"
                  y="215"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {releaseYear}
                </text>
              )}
            </g>
          )}

          {/* Ticket Inner Border */}
          <path
            fill="none"
            stroke="#4F342D"
            strokeWidth="4.5"
            strokeMiterlimit="10"
            d="M497.6,41.5c-11.7-5.6-20.8-15.9-24.5-28.5H42.3c-3.7,12.3-12.5,22.5-23.9,28.1v182
              c11.4,5.6,20.2,15.8,23.9,28.1h430.8c3.8-12.6,12.8-22.9,24.5-28.5V41.5z"
          />

          {/* Perforation Lines */}
          <line
            fill="none"
            stroke="#4F342D"
            strokeWidth="3.5"
            strokeMiterlimit="10"
            strokeDasharray="5,4"
            x1="80.9"
            y1="13.3"
            x2="80.9"
            y2="251.3"
          />
          <line
            fill="none"
            stroke="#4F342D"
            strokeWidth="3.5"
            strokeMiterlimit="10"
            strokeDasharray="5,4"
            x1="437.8"
            y1="13.1"
            x2="437.8"
            y2="251.3"
          />

          {/* Left Stub Typographic Accents */}
          <g>
            <text
              transform="matrix(0 -1 1 0 54 185)"
              fill="#4F342D"
              fontSize="14"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="2"
            >
              EN VIVO
            </text>
            <text
              transform="matrix(0 -1 1 0 34 200)"
              fill="#4F342D"
              fontSize="9"
              fontFamily="sans-serif"
              fontWeight="bold"
              letterSpacing="1"
            >
              ADMIT ONE
            </text>
          </g>

          {/* Right Stub Serial & Details */}
          <g>
            <text
              transform="matrix(0 1 -1 0 464 65)"
              fill="#4F342D"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="1"
            >
              № 094821
            </text>
            <text
              transform="matrix(0 1 -1 0 484 75)"
              fill="#4F342D"
              fontSize="9"
              fontFamily="sans-serif"
              fontWeight="bold"
            >
              {releaseYear ? `AÑO ${releaseYear}` : 'LIVE TICKET'}
            </text>
          </g>
        </g>
      </svg>

      {/* Hover badge to edit/change live ticket photo */}
      {canEdit && isHoverable && isHovered && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/85 text-amber-200 text-[10px] font-sans font-bold rounded-full shadow-lg backdrop-blur-sm border border-amber-400/40 animate-fade-in">
            <Ticket className="w-3 h-3 text-amber-300" />
            <span>{hasCover ? 'Cambiar Foto En Vivo' : 'Añadir Foto Recital'}</span>
          </span>
        </div>
      )}
    </div>
  );
}
