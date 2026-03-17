export const API_ENDPOINTS = {
  ASSETS: '/api/equipment',
  ASSET_DETAIL: (id: string | number) => `/api/equipment/${id}`,
  ASSET_STATS: '/api/equipment/stats',
  ASSET_ATTACHMENTS: (id: string | number) => `/api/equipment/${id}/attachments`,
  ASSET_HISTORY: (id: string | number) => `/api/equipment/${id}/history`,
  EQUIPMENT_STATUS_CHANGE: '/api/equipment-status/change',
  ATTACHMENTS_UPLOAD: '/api/attachments/upload',

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
  },

  USERS: '/api/users',
  USER_DETAIL: (uuid: string) => `/api/users/${uuid}`,

  PROJECTS: '/api/projects',
  MHESI: '/api/mhesi',

  AUTH: {
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
};
