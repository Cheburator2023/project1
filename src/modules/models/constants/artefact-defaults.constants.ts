/**
 * Default artefact values to apply on model create when user hasn't provided them
 * Extendable for future artefacts.
 */
export const DEFAULT_ARTEFACTS_ON_CREATE: Array<{
  artefact_tech_label: string;
  default_string_value: string;
  // Whether to skip inserting if an active record already exists in DB (e.g., copied from parent)
  skip_if_exists: boolean;
}> = [
  { artefact_tech_label: 'rfd', default_string_value: 'Нет', skip_if_exists: true },
];


