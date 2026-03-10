export const API_ENDPOINTS = {
  ASSETS: '/api/equipment',
  ASSET_DETAIL: (id: number) => `/api/equipment/${id}`,

  MASTERS: {
    DEPARTMENTS: '/api/masters/departments',
    ACTIVITIES: '/api/masters/activities',
    FUNDS: '/api/masters/funds',
    ASSET_TYPES: '/api/masters/equipment-types',
    ACQUISITION_SOURCES: '/api/masters/acquisition-sources',
    ACQUISITION_METHODS: '/api/masters/acquisition-methods',
    BUILDINGS: '/api/masters/buildings',
    ROOMS: '/api/masters/rooms',
  },

  PROJECTS: '/api/projects',
  MHESI: '/api/mhesi',
};
