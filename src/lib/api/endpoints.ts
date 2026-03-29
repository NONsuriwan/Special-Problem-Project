export const API_ENDPOINTS = {
  ASSETS: '/api/equipment',
  ASSET_DETAIL: (id: string | number) => `/api/equipment/${id}`,
  ASSET_STATS: '/api/equipment/stats',
  ASSET_ACTIVITY_STATS: '/api/equipment/stats/activity',
  ASSET_ATTACHMENTS: (id: string | number) => `/api/equipment/${id}/attachments`,
  ASSET_ATTACHMENTS_BULK: '/api/equipment/attachments',
  ASSET_HISTORY: (id: string | number) => `/api/equipment/${id}/history`,
  EQUIPMENT_STATUS_CHANGE: '/api/equipment-status/change',
  ATTACHMENTS_UPLOAD: '/api/attachments/upload',
  ATTACHMENT_DETAIL: (id: number) => `/api/attachments/${id}`,

  MASTERS: {
    DEPARTMENTS: '/api/masters/departments',
    ACTIVITIES: '/api/masters/activities',
    FUNDS: '/api/masters/funds',
    ASSET_TYPES: '/api/masters/equipment-types',
    ACQUISITION_SOURCES: '/api/masters/acquisition-sources',
    ACQUISITION_METHODS: '/api/masters/acquisition-methods',
    BUILDINGS: '/api/masters/buildings',
    ROOMS: '/api/masters/rooms',
    SUPPORT_UNITS: '/api/masters/support-units',
    PROJECT_TYPES: '/api/masters/project-types',
    PLAN_SECTIONS: '/api/masters/plan-sections',
  },

  USERS: '/api/users',
  USER_DETAIL: (uuid: string) => `/api/users/${uuid}`,

  PROJECTS: '/api/projects',
  MHESI: '/api/mhesi',
  MHESI_DETAIL: (uuid: string) => `/api/mhesi/${uuid}`,
  MHESI_HISTORY: (uuid: string) => `/api/mhesi/${uuid}/history`,

  REPORTS_SURVEY: '/api/reports/survey',

  AUTH: {
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    GOOGLE: 'http://localhost:3000/api/auth/google',
  },
};
