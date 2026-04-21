package com.game.model.dto;

import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;
import java.util.List;

@Value
@Builder
public class DashboardResponse {
    OffsetDateTime generatedAt;
    Long currentActivePlayers;
    Long currentActiveRooms;
    List<DashboardMetricPointResponse> activePlayersTimeline;
    List<DashboardMetricPointResponse> roomCountTimeline;
    List<PopularRoomTemplateResponse> popularTemplates;
    List<TopPlayerBalanceResponse> topBalances;
}
