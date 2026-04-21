export type DashboardMetricPointDto = {
  time: string;
  count: number;
};

export type PopularRoomTemplateDto = {
  templateId: string;
  templateName: string;
  roomCount: number;
  maxPlayers: number;
  entryCost: number;
  bonusEnabled: boolean;
};

export type TopPlayerBalanceDto = {
  userId: string;
  username: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
};

export type DashboardResponseDto = {
  generatedAt: string;
  currentActivePlayers: number;
  currentActiveRooms: number;
  activePlayersTimeline: DashboardMetricPointDto[];
  roomCountTimeline: DashboardMetricPointDto[];
  popularTemplates: PopularRoomTemplateDto[];
  topBalances: TopPlayerBalanceDto[];
};

export type DashboardQueryParams = {
  start?: string;
  end?: string;
  bucketMinutes?: number;
};
