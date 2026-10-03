import React from 'react';
import AlbumDiscCase from './AlbumDiscCase';
import TicketStubCase from './TicketStubCase';
import MovieFilmCase from './MovieFilmCase';

/**
 * SongReleaseArtifact Component
 * Unified renderer for song release artifacts according to user specification:
 * - 'studio' and 'acoustic' -> cd-2.svg (AlbumDiscCase)
 * - 'live'                  -> ticket.svg (TicketStubCase)
 * - 'soundtrack' & 'session'-> movie.svg (MovieFilmCase)
 */
export default function SongReleaseArtifact({
  versionType = 'studio',
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
  const normType = (versionType || 'studio').toLowerCase();

  if (normType === 'live') {
    return (
      <TicketStubCase
        albumCover={albumCover}
        songTitle={songTitle}
        artistName={artistName}
        albumName={albumName}
        releaseYear={releaseYear}
        versionDetails={versionDetails}
        onClick={onClick}
        className={className}
        isHoverable={isHoverable}
        canEdit={canEdit}
      />
    );
  }

  if (normType === 'soundtrack' || normType === 'session') {
    return (
      <MovieFilmCase
        albumCover={albumCover}
        songTitle={songTitle}
        artistName={artistName}
        albumName={albumName}
        releaseYear={releaseYear}
        versionDetails={versionDetails}
        versionType={normType}
        onClick={onClick}
        className={className}
        isHoverable={isHoverable}
        canEdit={canEdit}
      />
    );
  }

  // Default: 'studio' and 'acoustic' (cd-2.svg)
  return (
    <AlbumDiscCase
      albumCover={albumCover}
      songTitle={songTitle}
      artistName={artistName}
      albumName={albumName}
      onClick={onClick}
      className={className}
      isHoverable={isHoverable}
      canEdit={canEdit}
    />
  );
}
