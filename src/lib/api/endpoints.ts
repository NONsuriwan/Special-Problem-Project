export const API_ENDPOINTS = {
  ASSETS: '/api/assets',
  ASSET_DETAIL: (id: number) => `/api/assets/${id}`,

  MASTERS: {
    DEPARTMENTS: '/api/masters/departments',
    ACTIVITIES: '/api/masters/activities',
    FUNDS: '/api/masters/funds',
    ASSET_TYPES: '/api/masters/asset-types',
    ACQUISITION_SOURCES: '/api/masters/acquisition-sources',
    ACQUISITION_METHODS: '/api/masters/acquisition-methods',
    BUILDINGS: '/api/masters/buildings',
    ROOMS: '/api/masters/rooms',
  },

  PROJECTS: '/api/projects',
  MHESI: '/api/mhesi',
};
