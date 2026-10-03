/**
 * Tipos canónicos del dominio SongBook v2
 * Este archivo provee tipado ambiental y contratos para componentes React, hooks y APIs.
 */

export type VersionType = 'studio' | 'live' | 'acoustic' | 'soundtrack' | 'session';

export type UserRole = 'ADMIN' | 'PRO' | 'FREE' | 'GUEST';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSongPreference {
  id: string;
  userId: string;
  songId: string;
  transpose: number;
  chordVariants?: Record<string, number> | string | null;
  customContent?: string | null;
  isCustom: boolean;
  isFavorite: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Artist {
  id: string;
  name: string;
  photo?: string | null;
  bio?: string | null;
}

export interface Album {
  id: string;
  title: string;
  cover?: string | null;
  releaseYear?: number | null;
  versionType?: VersionType;
  versionDetails?: string | null;
  artistId?: string | null;
  artist?: Artist | null;
}

export interface ScoreRecording {
  title: string;
  performer: string;
  year?: number | string;
  audioUrl: string;
  type?: string;
}

export interface ScoreTrack {
  id?: number | string;
  name: string;
  instrument?: string;
  program?: number;
  tuning?: string;
}

export interface ScoreSheet {
  id: string | number;
  songId?: string | null;
  title: string;
  artist?: string;
  composer?: string;
  source: 'songsterr' | 'todotango' | 'custom';
  alphaTex?: string;
  musicXml?: string;
  gpUrl?: string;
  rhythm?: string;
  tracks?: ScoreTrack[];
  recordings?: ScoreRecording[];
  _source?: string;
  type?: string;
}

export interface BeatCell {
  chord: string;
  bass?: string;
  time?: number;
  duration?: number;
}

export interface Compas {
  id?: string | number;
  number?: number;
  time?: number;
  secTime?: number;
  beats: Array<string | BeatCell>;
  section?: string;
  isDownbeat?: boolean;
}

export interface SectionBlock {
  id: string;
  title: string;
  startTime?: number;
  compases: Compas[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artists?: Array<{ name: string; photo?: string } | string>;
  artistId?: string | null;
  artistPhoto?: string | null;
  album?: string | null;
  albumId?: string | null;
  albumCover?: string | null;
  releaseYear?: number | null;
  versionType?: VersionType;
  versionDetails?: string | null;
  key?: string | null;
  capo?: number | null;
  tempo?: number | null;
  timeSignature?: string | null;
  content: string;
  customContent?: string | null;
  isCustom?: boolean;
  isFavorite?: boolean;
  transpose: number;
  chordVariants?: Record<string, number>;
  uniqueChords?: string[];
  youtubeId?: string | null;
  syncData?: string | null;
  compases?: Compas[];
  source?: string | null;
  scores?: ScoreSheet[];
}

export interface SetlistSong {
  id: string;
  songId: string;
  setlistId: string;
  order: number;
  song: Song;
}

export interface Setlist {
  id: string;
  name: string;
  description?: string | null;
  userId?: string | null;
  songs?: Song[] | SetlistSong[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchVersion {
  title?: string;
  artist?: string;
  url: string;
  rating?: number;
  votes?: number;
  type?: string;
  source?: 'Ultimate Guitar' | 'Cifra Club' | 'Chordify';
  youtubeId?: string;
}

export interface SearchResult {
  title: string;
  artist: string;
  versions?: SearchVersion[];
}
