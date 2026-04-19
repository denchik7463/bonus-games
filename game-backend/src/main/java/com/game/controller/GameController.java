package com.game.controller;

import com.game.dto.SelectWinnerRequest;
import com.game.dto.SelectWinnerResponse;
import com.game.model.dto.CreateGameResultRequest;
import com.game.model.dto.GameResultResponse;
import com.game.model.dto.RoundEventResponse;
import com.game.model.entity.User;
import com.game.model.enums.UserRole;
import com.game.security.RoleGuard;
import com.game.service.game.GameResultService;
import com.game.service.game.RoundEventLogService;
import com.game.service.game.WinnerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final WinnerService winnerService;
    private final GameResultService gameResultService;
    private final RoundEventLogService roundEventLogService;

    public GameController(WinnerService winnerService,
                          GameResultService gameResultService,
                          RoundEventLogService roundEventLogService) {
        this.winnerService = winnerService;
        this.gameResultService = gameResultService;
        this.roundEventLogService = roundEventLogService;
    }

    @PostMapping("/winner")
    public SelectWinnerResponse selectWinner(@Valid @RequestBody SelectWinnerRequest request) {
        RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return winnerService.selectWinner(request);
    }

    @PostMapping("/journal")
    @ResponseStatus(HttpStatus.CREATED)
    public GameResultResponse createJournalEntry(@Valid @RequestBody CreateGameResultRequest request) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return gameResultService.create(request);
    }

    @GetMapping("/journal")
    public List<GameResultResponse> getJournal(@RequestParam(required = false) UUID roomId) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return gameResultService.getJournal(roomId);
    }

    @GetMapping("/journal/me")
    public List<GameResultResponse> getMyJournal() {
        User user = RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return gameResultService.getMyHistory(user);
    }

    @GetMapping("/journal/me/{id}")
    public GameResultResponse getMyJournalEntry(@PathVariable UUID id) {
        User user = RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        return gameResultService.getMyHistoryEntry(id, user);
    }

    @GetMapping("/journal/me/{id}/events")
    public List<RoundEventResponse> getMyJournalEvents(@PathVariable UUID id) {
        User user = RoleGuard.requireAny(UserRole.USER, UserRole.EXPERT, UserRole.ADMIN);
        gameResultService.ensureUserParticipated(id, user);
        return roundEventLogService.getByGameResultId(id);
    }

    @GetMapping("/journal/{id}")
    public GameResultResponse getJournalEntry(@PathVariable UUID id) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return gameResultService.getById(id);
    }

    @GetMapping("/journal/{id}/events")
    public List<RoundEventResponse> getJournalEvents(@PathVariable UUID id) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return roundEventLogService.getByGameResultId(id);
    }

    @GetMapping("/journal/events/by-room")
    public List<RoundEventResponse> getRoomEvents(@RequestParam UUID roomId) {
        RoleGuard.requireAny(UserRole.EXPERT, UserRole.ADMIN);
        return roundEventLogService.getByRoomId(roomId);
    }
}