package com.game.controller;

import com.game.model.dto.DashboardMetricPointResponse;
import com.game.model.dto.DashboardResponse;
import com.game.model.dto.PopularRoomTemplateResponse;
import com.game.model.dto.TopPlayerBalanceResponse;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.service.dashboard.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getDashboard(parseToUtcLocalDateTime(start, "start"), parseToUtcLocalDateTime(end, "end"), bucketMinutes);
    }

    @GetMapping("/active-players")
    public List<DashboardMetricPointResponse> getActivePlayersTimeline(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getActivePlayersTimeline(parseToUtcLocalDateTime(start, "start"), parseToUtcLocalDateTime(end, "end"), bucketMinutes);
    }

    @GetMapping("/rooms")
    public List<DashboardMetricPointResponse> getRoomCountTimeline(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getRoomCountTimeline(parseToUtcLocalDateTime(start, "start"), parseToUtcLocalDateTime(end, "end"), bucketMinutes);
    }

    @GetMapping("/popular-templates")
    public List<PopularRoomTemplateResponse> getPopularTemplates() {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getPopularTemplates();
    }

    @GetMapping("/top-balances")
    public List<TopPlayerBalanceResponse> getTopBalances() {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getTopBalances();
    }

    private LocalDateTime parseToUtcLocalDateTime(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDateTime.parse(value);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException(fieldName + " must be ISO-8601 datetime, for example 2026-04-23T10:00:00Z");
            }
        }
    }
}
