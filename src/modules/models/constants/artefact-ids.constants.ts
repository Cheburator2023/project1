/**
 * Constants for artefact ID mappings
 * Maps artefact technical labels to their database IDs.
 * Split per source to avoid accidental cross-source ID usage.
 */

// For SUM database
export const SUM_ARTEFACT_ID_MAPPINGS = {
  // Timestamp priority artefacts
  rfd: 803,
} as const;

// For SUM-RM database
export const MRM_ARTEFACT_ID_MAPPINGS = {
  // Timestamp priority artefacts
  rfd: 2073,
} as const;

// Backward compatibility: keep a combined mapping if any legacy code still imports it
export const ARTEFACT_ID_MAPPINGS = {
  rfd: MRM_ARTEFACT_ID_MAPPINGS.rfd,
} as const;

/**
 * Reverse mapping from artefact ID to technical label
 */
export const ARTEFACT_ID_TO_LABEL_MAPPINGS: Record<number, string> = {
  803: 'rfd',
  2073: 'rfd',
} as const;
