export const INTEGRATED_STUDY_NAME_KEYS = {
  study1: 'integrated_study_sc_mouse',
  study2: 'integrated_study_st_mouse',
  study3: 'integrated_study_sc_human',
  study4: 'integrated_study_st_human',
};

export function integratedStudyBaseId(value) {
  return String(value || '').split('.')[0];
}

export function integratedStudyName(value, t) {
  const key = INTEGRATED_STUDY_NAME_KEYS[integratedStudyBaseId(value)];
  return key && typeof t === 'function' ? t(key) : value;
}
