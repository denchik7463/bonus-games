package com.game.controller;

import com.game.dto.SelectWinnerRequest;
import com.game.dto.SelectWinnerResponse;
import com.game.service.game.WinnerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final WinnerService winnerService;

    public GameController(WinnerService winnerService) {
        this.winnerService = winnerService;
    }

    @PostMapping("/winner")
    public SelectWinnerResponse selectWinner(@Valid @RequestBody SelectWinnerRequest request) {
        return winnerService.selectWinner(request);
    }
}
