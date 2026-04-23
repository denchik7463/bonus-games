package com.game.model.dto;

import lombok.Value;

import java.time.OffsetDateTime;

@Value
public class DashboardMetricPointResponse {
    OffsetDateTime time;
    Long count;
}
