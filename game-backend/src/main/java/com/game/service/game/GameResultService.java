package com.game.service.game;

import com.game.exception.ForbiddenException;
import com.game.exception.NotFoundException;
import com.game.model.dto.CreateGameResultRequest;
import com.game.model.dto.GameResultResponse;
import com.game.model.entity.GameResult;
import com.game.model.entity.GameResultPlayer;
import com.game.model.entity.User;
import com.game.repository.GameResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameResultService {

    private final GameResultRepository gameResultRepository;
    private final RoundEventLogService roundEventLogService;

    @Transactional
    public GameResultResponse create(CreateGameResultRequest request) {
        validateRequest(request);

        CreateGameResultRequest.PlayerInput winnerInput = null;
        int winnerIndex = -1;

        for (int i = 0; i < request.getParticipants().size(); i++) {
            CreateGameResultRequest.PlayerInput participant = request.getParticipants().get(i);
            if (Boolean.TRUE.equals(participant.getWinner())) {
                winnerInput = participant;
                winnerIndex = i;
                break;
            }
        }

        if (winnerInput == null) {
            throw new IllegalArgumentException("В журнале раунда должен быть ровно один победитель.");
        }

        GameResult gameResult = GameResult.builder()
                .id(UUID.randomUUID())
                .roomId(request.getRoomId())
                .maxPlayers(request.getMaxPlayers())
                .entryCost(request.getEntryCost())
                .prizeFund(request.getPrizeFund())
                .boostAllowed(request.getBoostAllowed())
                .botCount(request.getBotCount())
                .roomStatus(request.getRoomStatus().trim())
                .winnerPlayerExternalId(winnerInput.getPlayerExternalId().trim())
                .winnerPlayerName(winnerInput.getUsername().trim())
                .winnerPositionIndex(winnerIndex)
                .baseWeight(request.getBaseWeight())
                .boostBonus(request.getBoostBonus())
                .totalWeight(request.getTotalWeight())
                .roll(request.getRoll())
                .randomHash(trimToNull(request.getRandomHash()))
                .randomSeed(trimToNull(request.getRandomSeed()))
                .createdAt(OffsetDateTime.now())
                .build();

        for (int i = 0; i < request.getParticipants().size(); i++) {
            CreateGameResultRequest.PlayerInput participant = request.getParticipants().get(i);

            GameResultPlayer entity = GameResultPlayer.builder()
                    .positionIndex(i)
                    .playerExternalId(participant.getPlayerExternalId().trim())
                    .username(participant.getUsername().trim())
                    .bot(Boolean.TRUE.equals(participant.getBot()))
                    .boostUsed(Boolean.TRUE.equals(participant.getBoostUsed()))
                    .finalWeight(participant.getFinalWeight())
                    .balanceBefore(participant.getBalanceBefore())
                    .balanceAfter(participant.getBalanceAfter())
                    .balanceDelta(participant.getBalanceDelta())
                    .status(trimToNull(participant.getStatus()))
                    .winner(Boolean.TRUE.equals(participant.getWinner()))
                    .build();

            gameResult.addParticipant(entity);
        }

        GameResult saved = gameResultRepository.save(gameResult);

        roundEventLogService.logSystemEvent(
                saved.getRoomId(),
                saved.getId(),
                "ROUND_RESULT_SAVED",
                "Результат раунда сохранён",
                "В журнал зафиксирован итог раунда и выбранный победитель.",
                "{\"winner\":\"" + escapeJson(saved.getWinnerPlayerName())
                        + "\",\"winnerPositionIndex\":" + saved.getWinnerPositionIndex()
                        + ",\"roll\":" + valueOrNull(saved.getRoll())
                        + ",\"totalWeight\":" + valueOrNull(saved.getTotalWeight()) + "}"
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<GameResultResponse> getJournal(UUID roomId) {
        List<GameResult> results = roomId == null
                ? gameResultRepository.findAllByOrderByCreatedAtDesc()
                : gameResultRepository.findByRoomIdOrderByCreatedAtDesc(roomId);

        return results.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameResultResponse getById(UUID id) {
        GameResult result = gameResultRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Game result not found: " + id));

        return toResponse(result);
    }

    @Transactional(readOnly = true)
    public List<GameResultResponse> getMyHistory(User user) {
        return gameResultRepository.findUserHistory(user.getId().toString(), user.getUsername())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameResultResponse getMyHistoryEntry(UUID id, User user) {
        ensureUserParticipated(id, user);

        GameResult result = gameResultRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Game result not found: " + id));

        return toResponse(result);
    }

    @Transactional(readOnly = true)
    public void ensureUserParticipated(UUID gameResultId, User user) {
        boolean participated = gameResultRepository.existsUserParticipation(
                gameResultId,
                user.getId().toString(),
                user.getUsername()
        );

        if (!participated) {
            throw new ForbiddenException("У пользователя нет доступа к этому раунду.");
        }
    }

    private void validateRequest(CreateGameResultRequest request) {
        if (request.getMaxPlayers() == null || request.getMaxPlayers() < 1) {
            throw new IllegalArgumentException("maxPlayers должен быть больше 0.");
        }

        if (request.getEntryCost() == null || request.getEntryCost() < 0) {
            throw new IllegalArgumentException("entryCost не может быть отрицательным.");
        }

        if (request.getPrizeFund() == null || request.getPrizeFund() < 0) {
            throw new IllegalArgumentException("prizeFund не может быть отрицательным.");
        }

        if (request.getBotCount() == null || request.getBotCount() < 0) {
            throw new IllegalArgumentException("botCount не может быть отрицательным.");
        }

        if (request.getParticipants() == null || request.getParticipants().isEmpty()) {
            throw new IllegalArgumentException("participants не должен быть пустым.");
        }

        long winnersCount = request.getParticipants().stream()
                .filter(p -> Boolean.TRUE.equals(p.getWinner()))
                .count();

        if (winnersCount != 1) {
            throw new IllegalArgumentException("В журнале раунда должен быть ровно один победитель.");
        }

        for (CreateGameResultRequest.PlayerInput participant : request.getParticipants()) {
            if (participant.getFinalWeight() == null || participant.getFinalWeight() <= 0) {
                throw new IllegalArgumentException("У каждого участника finalWeight должен быть больше 0.");
            }
        }
    }

    private GameResultResponse toResponse(GameResult gameResult) {
        return GameResultResponse.builder()
                .id(gameResult.getId())
                .roomId(gameResult.getRoomId())
                .maxPlayers(gameResult.getMaxPlayers())
                .entryCost(gameResult.getEntryCost())
                .prizeFund(gameResult.getPrizeFund())
                .boostAllowed(gameResult.getBoostAllowed())
                .botCount(gameResult.getBotCount())
                .roomStatus(gameResult.getRoomStatus())
                .winnerPlayerExternalId(gameResult.getWinnerPlayerExternalId())
                .winnerPlayerName(gameResult.getWinnerPlayerName())
                .winnerPositionIndex(gameResult.getWinnerPositionIndex())
                .baseWeight(gameResult.getBaseWeight())
                .boostBonus(gameResult.getBoostBonus())
                .totalWeight(gameResult.getTotalWeight())
                .roll(gameResult.getRoll())
                .randomHash(gameResult.getRandomHash())
                .randomSeed(gameResult.getRandomSeed())
                .createdAt(gameResult.getCreatedAt())
                .participants(gameResult.getParticipants().stream()
                        .map(player -> GameResultResponse.PlayerResultResponse.builder()
                                .positionIndex(player.getPositionIndex())
                                .playerExternalId(player.getPlayerExternalId())
                                .username(player.getUsername())
                                .bot(player.getBot())
                                .boostUsed(player.getBoostUsed())
                                .finalWeight(player.getFinalWeight())
                                .balanceBefore(player.getBalanceBefore())
                                .balanceAfter(player.getBalanceAfter())
                                .balanceDelta(player.getBalanceDelta())
                                .status(player.getStatus())
                                .winner(player.getWinner())
                                .build())
                        .toList())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String valueOrNull(Integer value) {
        return value == null ? "null" : value.toString();
    }
}