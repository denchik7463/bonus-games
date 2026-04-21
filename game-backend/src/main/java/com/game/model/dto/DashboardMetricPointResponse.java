package com.game.model.dto;

import lombok.Value;

import java.time.LocalDateTime;

@Value
public class DashboardMetricPointResponse {
    LocalDateTime time;
    Long count;
}
