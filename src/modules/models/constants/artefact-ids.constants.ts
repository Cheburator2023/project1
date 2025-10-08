/**
 * Constants for artefact ID mappings
 * Maps artefact technical labels to their database IDs.
 * Split per source to avoid accidental cross-source ID usage.
 */

// For SUM database
export const SUM_ARTEFACT_ID_MAPPINGS = {
  // Timestamp priority artefacts
  rfd: 803,
  developing_model_reason: 69,
  output_table: 914,
  allocation_assessment_class: 915,
  allocation_assessment_parameters: 916
} as const

// For SUM-RM database
export const MRM_ARTEFACT_ID_MAPPINGS = {
  // Timestamp priority artefacts
  rfd: 2073,
  developing_model_reason: 2104,
  output_table: 2660,
  allocation_assessment_class: 2661,
  allocation_assessment_parameters: 2662
} as const

// Backward compatibility: keep a combined mapping if any legacy code still imports it
export const ARTEFACT_ID_MAPPINGS = {
  rfd: MRM_ARTEFACT_ID_MAPPINGS.rfd,
  developing_model_reason: MRM_ARTEFACT_ID_MAPPINGS.developing_model_reason,
  output_table: MRM_ARTEFACT_ID_MAPPINGS.output_table,
  allocation_assessment_class:
    MRM_ARTEFACT_ID_MAPPINGS.allocation_assessment_class,
  allocation_assessment_parameters:
    MRM_ARTEFACT_ID_MAPPINGS.allocation_assessment_parameters
} as const

/**
 * Reverse mapping from artefact ID to technical label
 */
export const ARTEFACT_ID_TO_LABEL_MAPPINGS: Record<number, string> = {
  803: 'rfd',
  2073: 'rfd',
  69: 'developing_model_reason',
  2104: 'developing_model_reason',
  914: 'output_table',
  2660: 'output_table',
  915: 'allocation_assessment_class',
  2661: 'allocation_assessment_class',
  916: 'allocation_assessment_parameters',
  2662: 'allocation_assessment_parameters'
} as const
