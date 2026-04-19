package com.game.service.room;

import com.game.dto.BalanceResponse;
import com.game.dto.ReservationResponse;
import com.game.dto.SelectWinnerRequest;
import com.game.dto.SelectWinnerResponse;
import com.game.exception.NotFoundException;
import com.game.model.dto.CreateRoomRequest;
import com.game.model.dto.FinishRoomRequest;
import com.game.model.dto.FinishRoomResponse;
import com.game.model.dto.BoostActivationResponse;
import com.game.model.dto.JoinByTemplateRequest;
import com.game.model.dto.JoinRoomRequest;
import com.game.model.dto.JoinRoomResponse;
import com.game.model.dto.RoomPlayerResponse;
import com.game.model.dto.RoomResponse;
import com.game.model.dto.RoomStateResponse;
import com.game.model.entity.GameResult;
import com.game.model.entity.GameResultPlayer;
import com.game.model.entity.Room;
import com.game.model.entity.RoomConfig;
import com.game.model.entity.RoomPlayer;
import com.game.model.entity.User;
import com.game.repository.GameResultRepository;
import com.game.repository.RoomConfigRepository;
import com.game.repository.RoomPlayerRepository;
import com.game.repository.RoomRepository;
import com.game.service.game.RoundEventLogService;
import com.game.service.game.WinnerService;
import com.game.service.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int ROOM_TIMER_SECONDS = 60;
    private static final String STATUS_WAITING = "WAITING";
    private static final String STATUS_FULL = "FULL";
    private static final String STATUS_FINISHED = "FINISHED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final RoomConfigRepository roomConfigRepository;
    private final GameResultRepository gameResultRepository;
    private final WalletService walletService;
    private final WinnerService winnerService;
    private final RoundEventLogService roundEventLogService;

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        Room saved = roomRepository.save(newRoomFromTemplate(request.getTemplateId()));
        roundEventLogService.logSystemEvent(
                saved.getId(),
                null,
                "ROOM_CREATED",
                "Комната создана",
                "Создана новая игровая комната.",
                "{\"maxPlayers\":" + saved.getMaxPlayers()
                        + ",\"entryCost\":" + saved.getEntryCost()
                        + ",\"boostAllowed\":" + saved.getBoostAllowed()
                        + ",\"timerSeconds\":" + saved.getTimerSeconds() + "}"
        );

        return toResponse(saved);
    }

    @Transactional
    public JoinRoomResponse joinByTemplate(JoinByTemplateRequest request, User user) {
        UUID templateId = request.getTemplateId();
        Room room = roomRepository.findJoinableWaitingRoomsByTemplateIdForUpdate(templateId, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElseGet(() -> roomRepository.save(newRoomFromTemplate(templateId)));

        return joinRoom(room.getId(), user, null);
    }

    @Transactional
    public BoostActivationResponse activateBoost(UUID roomId, User user) {
        Room room = findRoom(roomId);
        if (STATUS_FINISHED.equals(room.getStatus()) || STATUS_CANCELLED.equals(room.getStatus())) {
            throw new IllegalArgumentException("Room is already closed");
        }
        if (!Boolean.TRUE.equals(room.getBoostAllowed())) {
            throw new IllegalArgumentException("Boost is not allowed in this room");
        }
        if (room.getTemplateId() == null) {
            throw new IllegalArgumentException("Room template is not linked");
        }

        RoomPlayer roomPlayer = roomPlayerRepository.findByRoomIdAndUserIdForUpdate(roomId, user.getId())
                .orElseThrow(() -> new NotFoundException("User is not in this room"));
        if (Boolean.TRUE.equals(roomPlayer.getBoostUsed())) {
            return BoostActivationResponse.builder()
                    .roomId(roomId)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .boostUsed(true)
                    .boostPrice(0)
                    .boostWeight(0)
                    .balance(walletService.getBalanceByUserId(user.getId()))
                    .build();
        }

        RoomConfig template = roomConfigRepository.findById(room.getTemplateId())
                .orElseThrow(() -> new NotFoundException("Room template not found: " + room.getTemplateId()));
        if (!Boolean.TRUE.equals(template.getBonusEnabled())) {
            throw new IllegalArgumentException("Bonus is disabled in this template");
        }
        if (template.getBonusPrice() == null || template.getBonusPrice() <= 0) {
            throw new IllegalArgumentException("Bonus price must be > 0");
        }

        BalanceResponse balance = walletService.chargeBoost(
                user.getId(),
                template.getBonusPrice(),
                "room-boost:" + roomId + ":" + user.getId(),
                "Boost activation in room " + roomId
        );

        roomPlayer.setBoostUsed(true);
        roomPlayerRepository.save(roomPlayer);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "BOOST_ACTIVATED",
                "Буст активирован",
                "Игрок активировал буст в комнате.",
                "{\"userId\":\"" + user.getId()
                        + "\",\"username\":\"" + escapeJson(user.getUsername())
                        + "\",\"boostPrice\":" + template.getBonusPrice()
                        + ",\"boostWeight\":" + template.getBonusWeight() + "}"
        );

        return BoostActivationResponse.builder()
                .roomId(room.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .boostUsed(true)
                .boostPrice(template.getBonusPrice())
                .boostWeight(template.getBonusWeight())
                .balance(balance)
                .build();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomById(UUID id) {
        return toResponse(findRoom(id));
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getWaitingRooms() {
        return roomRepository.findByStatus(STATUS_WAITING).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RoomStateResponse getRoomState(UUID roomId) {
        Room room = findRoom(roomId);
        List<RoomPlayerResponse> players = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId)
                .stream()
                .map(this::toPlayerResponse)
                .toList();

        return RoomStateResponse.builder()
                .roomId(room.getId())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(room.getPrizeFund())
                .timerSeconds(room.getTimerSeconds())
                .createdAt(room.getCreatedAt())
                .firstPlayerJoinedAt(room.getFirstPlayerJoinedAt())
                .startedAt(room.getStartedAt())
                .finishedAt(room.getFinishedAt())
                .players(players)
                .build();
    }

    @Transactional
    public JoinRoomResponse joinRoom(UUID roomId, User user, JoinRoomRequest request) {
        Room room = findRoom(roomId);

        if (STATUS_FINISHED.equals(room.getStatus()) || STATUS_CANCELLED.equals(room.getStatus())) {
            throw new IllegalArgumentException("Room is already closed");
        }
        if (room.getCurrentPlayers() >= room.getMaxPlayers()) {
            throw new IllegalStateException("Room is full");
        }
        if (roomPlayerRepository.existsByRoom_IdAndUserId(roomId, user.getId())) {
            throw new IllegalArgumentException("User already joined this room");
        }

        boolean boostUsed = request != null && Boolean.TRUE.equals(request.getBoostUsed());
        if (boostUsed && !Boolean.TRUE.equals(room.getBoostAllowed())) {
            throw new IllegalArgumentException("Boost is not allowed in this room");
        }

        boolean firstPlayer = room.getCurrentPlayers() == 0;
        if (firstPlayer) {
            room.startWaitingTimer();
        }

        String roundId = buildRoundId(room.getId());
        String reserveOperationId = "room-join-reserve:" + room.getId() + ":" + user.getId() + ":" + UUID.randomUUID();
        ReservationResponse reservation = walletService.reserveForRoomJoin(
                user,
                room.getId().toString(),
                roundId,
                room.getEntryCost().longValue(),
                OffsetDateTime.now().plusMinutes(15),
                reserveOperationId
        );

        int nextOrder = room.getCurrentPlayers() + 1;
        RoomPlayer roomPlayer = RoomPlayer.builder()
                .room(room)
                .userId(user.getId())
                .username(user.getUsername())
                .walletReservationId(reservation.getReservationId())
                .boostUsed(boostUsed)
                .roundId(roundId)
                .playerOrder(nextOrder)
                .winner(false)
                .joinTime(LocalDateTime.now())
                .status("JOINED")
                .build();

        room.addPlayer(roomPlayer);
        room.setCurrentPlayers(nextOrder);
        room.setPrizeFund(room.getPrizeFund() + room.getEntryCost());
        room.setStatus(nextOrder >= room.getMaxPlayers() ? STATUS_FULL : STATUS_WAITING);

        roomPlayerRepository.save(roomPlayer);
        roomRepository.save(room);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "PLAYER_JOINED",
                "Игрок вошёл в комнату",
                "Игрок успешно вошел и entryCost зарезервирован.",
                "{\"userId\":\"" + user.getId()
                        + "\",\"username\":\"" + escapeJson(user.getUsername())
                        + "\",\"reservationId\":\"" + reservation.getReservationId()
                        + "\",\"currentPlayers\":" + room.getCurrentPlayers()
                        + ",\"prizeFund\":" + room.getPrizeFund() + "}"
        );

        return JoinRoomResponse.builder()
                .roomId(room.getId())
                .roomStatus(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost().longValue())
                .roundId(roundId)
                .reservationId(reservation.getReservationId())
                .balance(reservation.getBalance())
                .build();
    }

    @Transactional
    public FinishRoomResponse finishRoom(UUID roomId, FinishRoomRequest request) {
        Room room = findRoom(roomId);
        if (STATUS_FINISHED.equals(room.getStatus())) {
            throw new IllegalArgumentException("Room already finished");
        }
        if (STATUS_CANCELLED.equals(room.getStatus())) {
            throw new IllegalArgumentException("Room was cancelled");
        }

        List<RoomPlayer> players = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId);
        if (players.isEmpty()) {
            throw new IllegalArgumentException("Room has no players");
        }

        SelectWinnerRequest winnerRequest = new SelectWinnerRequest();
        List<SelectWinnerRequest.PlayerInput> winnerPlayers = new ArrayList<>();
        for (RoomPlayer p : players) {
            SelectWinnerRequest.PlayerInput input = new SelectWinnerRequest.PlayerInput();
            input.setName(p.getUsername());
            input.setBoost(Boolean.TRUE.equals(p.getBoostUsed()));
            winnerPlayers.add(input);
        }
        winnerRequest.setPlayers(winnerPlayers);
        if (request != null) {
            winnerRequest.setBaseWeight(request.getBaseWeight());
            winnerRequest.setBoostBonus(request.getBoostBonus());
        }

        SelectWinnerResponse winner = winnerService.selectWinner(winnerRequest);
        int winnerIndex = winner.getWinnerIndex();
        RoomPlayer winnerPlayer = players.get(winnerIndex);
        Map<UUID, Long> balanceBeforeByUserId = new HashMap<>();

        List<FinishRoomResponse.RoomPlayerSettlement> settlements = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            RoomPlayer p = players.get(i);
            boolean isWinner = i == winnerIndex;
            BalanceResponse beforeBalance = walletService.getBalanceByUserId(p.getUserId());
            balanceBeforeByUserId.put(p.getUserId(), beforeBalance.getTotal());

            String commitOperation = "room-commit:" + room.getId() + ":" + p.getWalletReservationId();
            walletService.commitSystem(
                    p.getWalletReservationId(),
                    commitOperation,
                    "Commit room entry for room " + room.getId()
            );

            if (isWinner) {
                p.setWinner(true);
                p.setStatus("WINNER");
            } else {
                p.setWinner(false);
                p.setStatus("LOST");
            }
            roomPlayerRepository.save(p);
        }

        long prizeFund = room.getPrizeFund() == null || room.getPrizeFund() <= 0
                ? (long) room.getEntryCost() * players.size()
                : room.getPrizeFund();

        walletService.creditWin(
                winnerPlayer.getUserId(),
                prizeFund,
                "room-win:" + room.getId() + ":" + winnerPlayer.getUserId(),
                "Prize payout for room " + room.getId()
        );

        for (int i = 0; i < players.size(); i++) {
            RoomPlayer p = players.get(i);
            BalanceResponse balance = walletService.getBalanceByUserId(p.getUserId());
            settlements.add(FinishRoomResponse.RoomPlayerSettlement.builder()
                    .userId(p.getUserId())
                    .username(p.getUsername())
                    .reservationId(p.getWalletReservationId())
                    .reservationStatus("COMMITTED")
                    .balanceAfter(balance.getTotal())
                    .winner(i == winnerIndex)
                    .build());
        }

        LocalDateTime now = LocalDateTime.now();
        room.setStatus(STATUS_FINISHED);
        if (room.getStartedAt() == null) {
            room.setStartedAt(now);
        }
        room.setFinishedAt(now);
        roomRepository.save(room);

        GameResult gameResult = saveGameResult(
                room,
                players,
                winner,
                winnerIndex,
                balanceBeforeByUserId
        );

        roundEventLogService.logSystemEvent(
                room.getId(),
                gameResult.getId(),
                "ROOM_FINISHED",
                "Раунд завершен",
                "Комната завершена, выбран победитель и начислен призовой фонд.",
                "{\"winnerUserId\":\"" + winnerPlayer.getUserId()
                        + "\",\"winnerUsername\":\"" + escapeJson(winnerPlayer.getUsername())
                        + "\",\"winnerIndex\":" + winnerIndex
                        + ",\"roll\":" + winner.getRoll()
                        + ",\"totalWeight\":" + winner.getTotalWeight()
                        + ",\"prizeFund\":" + prizeFund
                        + ",\"randomHash\":\"" + escapeJson(winner.getRandomHash()) + "\"}"
        );

        return FinishRoomResponse.builder()
                .roomId(room.getId())
                .roomStatus(room.getStatus())
                .winnerUsername(winnerPlayer.getUsername())
                .winnerUserId(winnerPlayer.getUserId())
                .winnerIndex(winnerIndex)
                .roll(winner.getRoll())
                .totalWeight(winner.getTotalWeight())
                .randomHash(winner.getRandomHash())
                .randomSeed(winner.getRandomSeed())
                .prizeFund(prizeFund)
                .players(settlements)
                .build();
    }

    @Transactional
    public void cancelRoom(UUID roomId, String reason) {
        Room room = findRoom(roomId);
        if (STATUS_FINISHED.equals(room.getStatus()) || STATUS_CANCELLED.equals(room.getStatus())) {
            return;
        }

        List<RoomPlayer> players = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId);
        for (RoomPlayer p : players) {
            walletService.releaseSystem(
                    p.getWalletReservationId(),
                    "room-cancel-release:" + room.getId() + ":" + p.getWalletReservationId(),
                    "Release due to room cancellation"
            );
            p.setWinner(false);
            p.setStatus("RELEASED");
            roomPlayerRepository.save(p);
        }

        room.setStatus(STATUS_CANCELLED);
        room.setFinishedAt(LocalDateTime.now());
        roomRepository.save(room);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "ROOM_CANCELLED",
                "Комната отменена",
                reason == null ? "Комната отменена" : reason,
                null
        );
    }

    @Transactional
    public int cancelTimedOutWaitingRooms() {
        List<Room> waitingRooms = roomRepository.findByStatusIn(List.of(STATUS_WAITING, STATUS_FULL));
        int processed = 0;

        for (Room room : waitingRooms) {
            if (room.hasTimedOut()) {
                if (STATUS_FULL.equals(room.getStatus())) {
                    finishRoom(room.getId(), null);
                } else {
                    cancelRoom(room.getId(), "Таймер истек: комната не заполнилась, резервации освобождены.");
                }
                processed++;
            }
        }

        return processed;
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> filterRooms(Integer maxPlayers, Integer entryCost, Boolean boostAllowed) {
        return roomRepository.findAll()
                .stream()
                .filter(room -> (maxPlayers == null || room.getMaxPlayers().equals(maxPlayers))
                        && (entryCost == null || room.getEntryCost().equals(entryCost))
                        && (boostAllowed == null || room.getBoostAllowed().equals(boostAllowed)))
                .map(this::toResponse)
                .toList();
    }

    private Room findRoom(UUID roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found: " + roomId));
    }

    private String buildRoundId(UUID roomId) {
        return "room-" + roomId + "-round-1";
    }

    private RoomPlayerResponse toPlayerResponse(RoomPlayer player) {
        return RoomPlayerResponse.builder()
                .userId(player.getUserId())
                .username(player.getUsername())
                .walletReservationId(player.getWalletReservationId())
                .boostUsed(player.getBoostUsed())
                .roundId(player.getRoundId())
                .playerOrder(player.getPlayerOrder())
                .winner(player.getWinner())
                .status(player.getStatus())
                .joinTime(player.getJoinTime())
                .build();
    }

    private RoomResponse toResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .templateId(room.getTemplateId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(room.getPrizeFund())
                .boostAllowed(room.getBoostAllowed())
                .timerSeconds(room.getTimerSeconds())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .botCount(room.getBotCount())
                .createdAt(room.getCreatedAt())
                .build();
    }

    private Room newRoomFromTemplate(UUID templateId) {
        RoomConfig template = roomConfigRepository.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Room template not found: " + templateId));
        if (!Boolean.TRUE.equals(template.getActive())) {
            throw new IllegalArgumentException("Room template is not active: " + templateId);
        }

        return Room.builder()
                .id(UUID.randomUUID())
                .templateId(template.getId())
                .maxPlayers(template.getMaxPlayers())
                .entryCost(template.getEntryCost())
                .prizeFund(0)
                .boostAllowed(template.getBonusEnabled())
                .timerSeconds(ROOM_TIMER_SECONDS)
                .status(STATUS_WAITING)
                .currentPlayers(0)
                .botCount(0)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private GameResult saveGameResult(Room room,
                                      List<RoomPlayer> players,
                                      SelectWinnerResponse winner,
                                      int winnerIndex,
                                      Map<UUID, Long> balanceBeforeByUserId) {
        GameResult result = GameResult.builder()
                .id(UUID.randomUUID())
                .roomId(room.getId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(room.getPrizeFund())
                .boostAllowed(room.getBoostAllowed())
                .botCount(room.getBotCount())
                .roomStatus(room.getStatus())
                .winnerPlayerExternalId(players.get(winnerIndex).getUserId().toString())
                .winnerPlayerName(players.get(winnerIndex).getUsername())
                .winnerPositionIndex(winnerIndex)
                .baseWeight(null)
                .boostBonus(null)
                .totalWeight(winner.getTotalWeight())
                .roll(winner.getRoll())
                .randomHash(winner.getRandomHash())
                .randomSeed(String.valueOf(winner.getRandomSeed()))
                .createdAt(OffsetDateTime.now())
                .build();

        for (int i = 0; i < players.size(); i++) {
            RoomPlayer player = players.get(i);
            long before = balanceBeforeByUserId.getOrDefault(player.getUserId(), 0L);
            long after = walletService.getBalanceByUserId(player.getUserId()).getTotal();

            int finalWeight = 0;
            if (winner.getPlayers() != null && i < winner.getPlayers().size()) {
                finalWeight = winner.getPlayers().get(i).getWeight();
            }

            GameResultPlayer participant = GameResultPlayer.builder()
                    .positionIndex(i)
                    .playerExternalId(player.getUserId().toString())
                    .username(player.getUsername())
                    .bot(false)
                    .boostUsed(Boolean.TRUE.equals(player.getBoostUsed()))
                    .finalWeight(finalWeight)
                    .balanceBefore(before)
                    .balanceAfter(after)
                    .balanceDelta(after - before)
                    .status(player.getStatus())
                    .winner(i == winnerIndex)
                    .build();

            result.addParticipant(participant);
        }

        return gameResultRepository.save(result);
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
