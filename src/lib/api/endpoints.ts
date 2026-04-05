export const API_ENDPOINTS = {
  ASSETS:                '/api/equipment',
  ASSET_DETAIL:          (uuid: string) => `/api/equipment/${uuid}`,
  ASSET_STATS:           '/api/equipment/stats',
  ASSET_ACTIVITY_STATS:  '/api/equipment/stats/activity',
  ASSET_ATTACHMENTS:     (uuid: string) => `/api/equipment/${uuid}/attachments`,
  ASSET_ATTACHMENTS_BULK:'/api/equipment/attachments',
  ASSET_HISTORY:         (uuid: string) => `/api/equipment/${uuid}/history`,

  EQUIPMENT_STATUS_CHANGE: '/api/equipment-status/change',
  EQUIPMENT_BORROWS:       '/api/equipment-status/borrows',
  EQUIPMENT_REPAIRS:       '/api/equipment-status/repairs',
  EQUIPMENT_DISPOSALS:     '/api/equipment-status/disposals',

  ATTACHMENTS_UPLOAD: '/api/attachments/upload',
  ATTACHMENT_FILE:    (id: number) => `/api/attachments/${id}/file`,
  ATTACHMENT_DETAIL:  (id: number) => `/api/attachments/${id}`,

  MASTERS: {
    DEPARTMENTS:         '/api/masters/departments',
    FUNDS:               '/api/masters/funds',
    ASSET_TYPES:         '/api/masters/equipment-types',
    ACQUISITION_SOURCES: '/api/masters/acquisition-sources',
    ACQUISITION_METHODS: '/api/masters/acquisition-methods',
    BUILDINGS:           '/api/masters/buildings',
    ROOMS:               '/api/masters/rooms',
    ROOMS_BY_BUILDING:   (buildingId: number) => `/api/masters/rooms/building/${buildingId}`,
    PLAN_SECTIONS:       '/api/masters/plan-sections',
  },

  USERS:       '/api/users',
  USER_DETAIL: (uuid: string) => `/api/users/${uuid}`,

  PROJECTS:       '/api/projects',
  PROJECT_DETAIL: (uuid: string) => `/api/projects/${uuid}`,

  MHESI:              '/api/mhesi',
  MHESI_DETAIL:       (uuid: string) => `/api/mhesi/${uuid}`,
  MHESI_HISTORY:      (uuid: string) => `/api/mhesi/${uuid}/history`,
  MHESI_ATTACHMENTS:  (uuid: string) => `/api/mhesi/${uuid}/attachments`,

  REPORTS_DEPRECIATION: '/api/reports/depreciation',
  REPORTS_SURVEY:       '/api/reports/survey',

  AUTH: {
    ME:      '/api/auth/me',
    LOGOUT:  '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    GOOGLE:  'http://localhost:3000/api/auth/google',
  },
};