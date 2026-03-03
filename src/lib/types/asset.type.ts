export type Asset = {
  id: number;
  assetCode: string;
  assetName: string;
  assetNumber?: string | null;
  assetTypeId: number | null;
  departmentId?: number | null;
  activityId?: number | null;
  fundId?: number | null;
  fiscalYearId?: number | null;
  status: string;
  acquisitionDate: string | null;
  acquisitionSourceId?: number | null;
  acquisitionMethodId?: number | null;
  price: string | null;
  company?: string | null;
  sizeDetail?: string | null;
  buildingId: number | null;
  roomId: number | null;
  projectId?: number | null;
  note?: string | null;
};

export type MasterData = {
  id: number;
  name: string;
};

export type Room = MasterData & {
  buildingId: number;
};
