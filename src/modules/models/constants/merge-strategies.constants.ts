/**
 * Constants for database merge strategies when combining SUM and SUM-RM data
 * This is specific to the models module and how it handles artefact merging
 */

export const MERGE_STRATEGIES = {
  /** Current default: SUM-RM values take priority over SUM values */
  MRM_PRIORITY: 'mrm_priority',
  
  /** New strategy: Use the value with the most recent effective_from timestamp */
  TIMESTAMP_PRIORITY: 'timestamp_priority',
  
  /** Future strategy: SUM values take priority over SUM-RM values */
  SUM_PRIORITY: 'sum_priority'
} as const;

/**
 * Artefacts that use timestamp-based priority (newest effective_from wins)
 * Only artefacts in this list will use timestamp priority, all others use MRM priority
 * 
 * This is specific to the models module and how it merges artefact data
 */
export const TIMESTAMP_PRIORITY_ARTEFACTS = [
  'rfd'  // RFD artefact uses timestamp priority
] as const;

/**
 * Type for artefact technical labels that use timestamp priority
 */
export type TimestampPriorityArtefact = typeof TIMESTAMP_PRIORITY_ARTEFACTS[number]; 