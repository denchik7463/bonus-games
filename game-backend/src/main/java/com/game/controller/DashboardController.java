package com.game.controller;

import com.game.model.dto.DashboardMetricPointResponse;
import com.game.model.dto.DashboardResponse;
import com.game.model.dto.PopularRoomTemplateResponse;
import com.game.model.dto.TopPlayerBalanceResponse;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.service.dashboard.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getDashboard(start, end, bucketMinutes);
    }

    @GetMapping("/active-players")
    public List<DashboardMetricPointResponse> getActivePlayersTimeline(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getActivePlayersTimeline(start, end, bucketMinutes);
    }

    @GetMapping("/rooms")
    public List<DashboardMetricPointResponse> getRoomCountTimeline(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Integer bucketMinutes
    ) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return dashboardService.getRoomCountTimeline(start, end, bucketMinutes);
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
}
