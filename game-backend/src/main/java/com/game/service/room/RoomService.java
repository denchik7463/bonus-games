package com.game.service.room;

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
import com.game.realtime.RoomEventPublisher;
import com.game.service.game.RoundEventLogService;
import com.game.service.game.WinnerService;
import com.game.service.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import com.game.repository.WalletReservationRepository;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final int ROOM_TIMER_SECONDS = 60;
    private static final long MIN_TIME_LEFT_TO_JOIN_MS = 5_000L;
    private static final String STATUS_WAITING = "WAITING";
    private static final String STATUS_FULL = "FULL";
    private static final String STATUS_FINISHED = "FINISHED";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final List<String> ACTIVE_STATUSES = List.of(STATUS_WAITING, STATUS_FULL);

    private final RoomRepository roomRepository;
    private final RoomPlayerRepository roomPlayerRepository;
    private final RoomConfigRepository roomConfigRepository;
    private final GameResultRepository gameResultRepository;
    private final RoomEventPublisher roomEventPublisher;
    private final WalletService walletService;
    private final WalletReservationRepository walletReservationRepository;
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

        publishRoomRealtime(saved.getId());

        return toResponse(saved);
    }

    @Transactional
    public RoomResponse joinByTemplate(JoinByTemplateRequest request) {
        RoomConfig template = resolveTemplateForMatching(request);
        RequestedSeatSelection selection = resolveRequestedSeatSelection(
                request.getSeats(),
                request.getSeatsCount(),
                template.getMaxPlayers()
        );
        UUID templateId = template.getId();
        Room room = roomRepository.findJoinableWaitingRoomsByTemplateIdForUpdate(templateId, PageRequest.of(0, 50))
                .stream()
                .filter(this::hasMoreThanFiveSecondsLeft)
                .filter(candidate -> hasEnoughFreeSeats(candidate.getId(), selection))
                .findFirst()
                .orElseGet(() -> {
                    Room created = roomRepository.save(newRoomFromTemplate(templateId));
                    roundEventLogService.logSystemEvent(
                            created.getId(),
                            null,
                            "ROOM_CREATED",
                            "Комната создана",
                            "Создана новая игровая комната.",
                            "{\"maxPlayers\":" + created.getMaxPlayers()
                                    + ",\"entryCost\":" + created.getEntryCost()
                                    + ",\"boostAllowed\":" + created.getBoostAllowed()
                                    + ",\"timerSeconds\":" + created.getTimerSeconds() + "}"
                    );
                    publishRoomRealtime(created.getId());
                    return created;
                });
        return toResponse(room);
    }

    @Transactional
    public BoostActivationResponse activateBoost(UUID roomId, User user, Integer seatNumber) {
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
        if (seatNumber == null || seatNumber < 1) {
            throw new IllegalArgumentException("seatNumber must be >= 1");
        }

        RoomPlayer userSeat = roomPlayerRepository
                .findByRoomIdAndUserIdAndPlayerOrderForUpdate(roomId, user.getId(), seatNumber)
                .orElseThrow(() -> new NotFoundException("User does not own seat " + seatNumber + " in this room"));

        if (Boolean.TRUE.equals(userSeat.getBoostUsed())) {
            return BoostActivationResponse.builder()
                    .roomId(roomId)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .seatNumber(seatNumber)
                    .boostReservationId(userSeat.getBoostReservationId())
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

        String boostReserveOperationId = "room-boost-reserve:" + roomId + ":" + user.getId() + ":seat-" + seatNumber;
        ReservationResponse boostReservation = walletService.reserveForRoomJoin(
                user,
                room.getId().toString(),
                userSeat.getRoundId(),
                template.getBonusPrice(),
                OffsetDateTime.now().plusMinutes(15),
                boostReserveOperationId
        );

        userSeat.setBoostUsed(true);
        userSeat.setBoostReservationId(boostReservation.getReservationId());
        roomPlayerRepository.save(userSeat);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "BOOST_ACTIVATED",
                "Буст активирован для места",
                "Игрок активировал буст для конкретного места в комнате (резервация создана).",
                "{\"userId\":\"" + user.getId()
                        + "\",\"username\":\"" + escapeJson(user.getUsername())
                        + "\",\"seatNumber\":" + seatNumber
                        + ",\"boostReservationId\":\"" + boostReservation.getReservationId() + "\""
                        + ",\"boostPrice\":" + template.getBonusPrice()
                        + ",\"boostWeight\":" + template.getBonusWeight() + "}"
        );

        publishRoomRealtime(room.getId());

        return BoostActivationResponse.builder()
                .roomId(room.getId())
                .userId(user.getId())
                .username(user.getUsername())
                .seatNumber(seatNumber)
                .boostReservationId(boostReservation.getReservationId())
                .boostUsed(true)
                .boostPrice(template.getBonusPrice())
                .boostWeight(template.getBonusWeight())
                .balance(boostReservation.getBalance())
                .build();
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomById(UUID id) {
        return toResponse(findRoom(id));
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomByShortId(String shortId) {
        return toResponse(findRoomByShortId(shortId));
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
    public List<RoomResponse> getMySimilarRooms(User user, Integer priceDelta, Integer limit) {
        int normalizedPriceDelta = normalizePriceDelta(priceDelta);
        int normalizedLimit = normalizeRecommendationLimit(limit);

        Room referenceRoom = getLastPlayedRoom(user);

        int minEntryCost = Math.max(0, referenceRoom.getEntryCost() - normalizedPriceDelta);
        int maxEntryCost = referenceRoom.getEntryCost() + normalizedPriceDelta;

        return roomRepository.findSimilarWaitingRooms(
                        referenceRoom.getEntryCost(),
                        minEntryCost,
                        maxEntryCost,
                        PageRequest.of(0, Math.max(normalizedLimit * 3, 20))
                ).stream()
                .filter(room -> !room.getId().equals(referenceRoom.getId()))
                .filter(this::hasMoreThanFiveSecondsLeft)
                .limit(normalizedLimit)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getMyRiskierRoom(User user) {
        Room referenceRoom = getLastPlayedRoom(user);

        return roomRepository.findRiskierWaitingRooms(
                        referenceRoom.getEntryCost(),
                        PageRequest.of(0, 50)
                ).stream()
                .filter(room -> !room.getId().equals(referenceRoom.getId()))
                .filter(this::hasMoreThanFiveSecondsLeft)
                .findFirst()
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("No riskier room available for current user"));
    }

    @Transactional(readOnly = true)
    public RoomStateResponse getRoomState(UUID roomId) {
        Room room = findRoom(roomId);
        List<RoomPlayer> roomPlayers = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId);
        BoostContext boostContext = resolveBoostContext(room);
        RoomChanceSummary chanceSummary = calculateRoomChanceSummary(room.getMaxPlayers(), boostContext);
        List<RoomPlayerResponse> players = roomPlayers.stream()
                .map(this::toPlayerResponse)
                .toList();

        return RoomStateResponse.builder()
                .roomId(room.getId())
                .shortId(room.getShortId())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(Math.toIntExact(resolveRoomPrizeFund(room)))
                .boostPrice(boostContext.boostPrice())
                .boostWeight(boostContext.boostWeight())
                .currentChancePercent(chanceSummary.currentChancePercent())
                .chanceWithBoostPercent(chanceSummary.chanceWithBoostPercent())
                .boostAbsoluteGainPercent(chanceSummary.boostAbsoluteGainPercent())
                .timerSeconds(room.getTimerSeconds())
                .remainingSeconds(remainingSeconds(room))
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
        if (request == null) {
            throw new IllegalArgumentException("Join request is required");
        }
        RequestedSeatSelection selection = resolveRequestedSeatSelection(
                request.getSeats(),
                request.getSeatsCount(),
                room.getMaxPlayers()
        );
        List<Integer> requestedSeats = resolveSeatsForJoin(room.getId(), selection);

        if (STATUS_FINISHED.equals(room.getStatus()) || STATUS_CANCELLED.equals(room.getStatus())) {
            throw new IllegalArgumentException("Room is already closed");
        }
        if (!hasMoreThanFiveSecondsLeft(room)) {
            throw new IllegalArgumentException("Cannot join room: less than 5 seconds left before timeout");
        }
        if (room.getCurrentPlayers() + requestedSeats.size() > room.getMaxPlayers()) {
            throw new IllegalStateException("Room does not have enough seats");
        }
        long alreadyOwnedSeats = roomPlayerRepository.countByRoom_IdAndUserId(roomId, user.getId());
        long maxSeatsForUser = maxSeatsPerUser(room.getMaxPlayers());
        if (alreadyOwnedSeats + requestedSeats.size() > maxSeatsForUser) {
            throw new IllegalArgumentException("User cannot buy more than 50% of seats in this room");
        }
        Set<Integer> occupiedSeatsSet = findOccupiedSeats(roomId);
        List<Integer> occupiedRequestedSeats = requestedSeats.stream()
                .filter(occupiedSeatsSet::contains)
                .sorted()
                .toList();
        if (!occupiedRequestedSeats.isEmpty()) {
            String occupiedSeats = occupiedRequestedSeats.stream()
                    .map(String::valueOf)
                    .collect(java.util.stream.Collectors.joining(","));
            throw new IllegalArgumentException("Seat(s) already occupied: " + occupiedSeats);
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
                room.getEntryCost().longValue() * requestedSeats.size(),
                OffsetDateTime.now().plusMinutes(15),
                reserveOperationId
        );

        LocalDateTime joinTime = LocalDateTime.now();
        for (Integer seat : requestedSeats) {
            RoomPlayer roomPlayer = RoomPlayer.builder()
                    .room(room)
                    .userId(user.getId())
                    .username(user.getUsername())
                    .walletReservationId(reservation.getReservationId())
                    .bot(false)
                    .boostUsed(false)
                    .roundId(roundId)
                    .playerOrder(seat)
                    .winner(false)
                    .joinTime(joinTime)
                    .status("JOINED")
                    .build();
            room.addPlayer(roomPlayer);
            roomPlayerRepository.save(roomPlayer);
        }

        int nextPlayersCount = room.getCurrentPlayers() + requestedSeats.size();
        room.setCurrentPlayers(nextPlayersCount);
        room.setStatus(nextPlayersCount >= room.getMaxPlayers() ? STATUS_FULL : STATUS_WAITING);
        roomRepository.save(room);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "PLAYER_JOINED",
                "Игрок вошёл в комнату",
                "Игрок успешно вошел и места зарезервированы.",
                "{\"userId\":\"" + user.getId()
                        + "\",\"username\":\"" + escapeJson(user.getUsername())
                        + "\",\"seats\":\"" + requestedSeats
                        + "\",\"reservationId\":\"" + reservation.getReservationId()
                        + "\",\"currentPlayers\":" + room.getCurrentPlayers()
                        + ",\"prizeFund\":" + room.getPrizeFund() + "}"
        );

        publishRoomRealtime(room.getId());

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
    public JoinRoomResponse joinRoomByShortId(String shortId, User user, JoinRoomRequest request) {
        Room room = findRoomByShortId(shortId);
        return joinRoom(room.getId(), user, request);
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

        List<FinishRoomResponse.RoomPlayerSettlement> settlements = new ArrayList<>();
        for (int i = 0; i < players.size(); i++) {
            RoomPlayer p = players.get(i);
            boolean isWinner = i == winnerIndex;
            if (!isBot(p)) {
                String commitOperation = "room-commit:" + room.getId() + ":" + p.getWalletReservationId();
                walletService.commitSystem(
                        p.getWalletReservationId(),
                        commitOperation,
                        "Commit room entry for room " + room.getId()
                );

                if (p.getBoostReservationId() != null) {
                    walletService.commitSystem(
                            p.getBoostReservationId(),
                            "room-boost-commit:" + room.getId() + ":" + p.getBoostReservationId(),
                            "Commit boost reservation for room " + room.getId() + ", seat " + p.getPlayerOrder()
                    );
                }
            }

            if (isWinner) {
                p.setWinner(true);
                p.setStatus("WINNER");
            } else {
                p.setWinner(false);
                p.setStatus("LOST");
            }
            roomPlayerRepository.save(p);
        }

        long totalPool = resolveBasePool(room);
        int winnerPercent = resolveWinnerPercent(room);
        long winnerPayout = resolveRoomPrizeFund(room);

        if (!isBot(winnerPlayer)) {
            walletService.creditWin(
                    winnerPlayer.getUserId(),
                    winnerPayout,
                    "room-win:" + room.getId() + ":" + winnerPlayer.getUserId(),
                    "Prize payout for room " + room.getId()
            );
        }

        for (int i = 0; i < players.size(); i++) {
            RoomPlayer p = players.get(i);
            Long balanceAfter = isBot(p) ? 0L : walletService.getBalanceByUserId(p.getUserId()).getTotal();
            settlements.add(FinishRoomResponse.RoomPlayerSettlement.builder()
                    .userId(p.getUserId())
                    .username(p.getUsername())
                    .bot(isBot(p))
                    .reservationId(p.getWalletReservationId())
                    .reservationStatus(isBot(p) ? "BOT_VIRTUAL" : "COMMITTED")
                    .balanceAfter(balanceAfter)
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
                winnerPayout
        );

        roundEventLogService.logSystemEvent(
                room.getId(),
                gameResult.getId(),
                "ROOM_FINISHED",
                "Раунд завершен",
                "Комната завершена, выбран победитель и начислен призовой фонд.",
                "{\"winnerUserId\":\"" + winnerPlayer.getUserId()
                        + "\",\"winnerUsername\":\"" + escapeJson(winnerPlayer.getUsername())
                        + "\",\"winnerBot\":" + isBot(winnerPlayer)
                        + "\",\"winnerIndex\":" + winnerIndex
                        + ",\"roll\":" + winner.getRoll()
                        + ",\"totalWeight\":" + winner.getTotalWeight()
                        + ",\"winnerPercent\":" + winnerPercent
                        + ",\"totalPool\":" + totalPool
                        + ",\"winnerPayout\":" + winnerPayout
                        + ",\"randomHash\":\"" + escapeJson(winner.getRandomHash()) + "\"}"
        );

        publishRoomRealtime(room.getId());

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
                .prizeFund(winnerPayout)
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
            if (!isBot(p)) {
                walletService.releaseSystem(
                        p.getWalletReservationId(),
                        "room-cancel-release:" + room.getId() + ":" + p.getWalletReservationId(),
                        "Release due to room cancellation"
                );
                if (p.getBoostReservationId() != null) {
                    walletService.releaseSystem(
                            p.getBoostReservationId(),
                            "room-boost-cancel-release:" + room.getId() + ":" + p.getBoostReservationId(),
                            "Release boost reservation due to room cancellation"
                    );
                }
            }
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

        publishRoomRealtime(room.getId());
    }

    @Transactional
    public int cancelTimedOutWaitingRooms() {
        List<Room> waitingRooms = roomRepository.findByStatusIn(List.of(STATUS_WAITING, STATUS_FULL));
        int processed = 0;

        for (Room room : waitingRooms) {
            if (room.hasTimedOut()) {
                if (!STATUS_FULL.equals(room.getStatus())) {
                    fillRoomWithBots(room);
                }
                finishRoom(room.getId(), null);
                processed++;
            }
        }

        return processed;
    }

    private int fillRoomWithBots(Room room) {
        List<Integer> freeSeats = findFreeSeats(room.getId());
        if (freeSeats.isEmpty()) {
            return 0;
        }

        List<RoomPlayer> existingPlayers = roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(room.getId());
        boolean botsUseBoost = false;

        String roundId = buildRoundId(room.getId());
        LocalDateTime joinTime = LocalDateTime.now();
        int existingBotCount = room.getBotCount() == null ? 0 : room.getBotCount();
        int addedBots = 0;

        for (Integer seat : freeSeats) {
            int botNumber = existingBotCount + addedBots + 1;
            RoomPlayer bot = RoomPlayer.builder()
                    .room(room)
                    .userId(UUID.randomUUID())
                    .username(botName(botNumber))
                    .walletReservationId(UUID.randomUUID())
                    .bot(true)
                    .boostUsed(false)
                    .roundId(roundId)
                    .playerOrder(seat)
                    .winner(false)
                    .joinTime(joinTime)
                    .status("BOT_JOINED")
                    .build();
            room.addPlayer(bot);
            roomPlayerRepository.save(bot);
            addedBots++;
        }

        room.setBotCount(existingBotCount + addedBots);
        room.setCurrentPlayers(existingPlayers.size() + addedBots);
        room.setStatus(STATUS_FULL);
        roomRepository.save(room);

        roundEventLogService.logSystemEvent(
                room.getId(),
                null,
                "BOTS_FILLED",
                "Bots filled room",
                "Timed-out room was filled with bot seats.",
                "{\"botCount\":" + addedBots
                        + ",\"boostUsed\":" + botsUseBoost
                        + ",\"currentPlayers\":" + room.getCurrentPlayers()
                        + ",\"prizeFund\":" + room.getPrizeFund() + "}"
        );
        publishRoomRealtime(room.getId());

        return addedBots;
    }

    private String botName(int botNumber) {
        return "Бот №" + botNumber;
    }

    private boolean isBot(RoomPlayer player) {
        return Boolean.TRUE.equals(player.getBot());
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

    private long resolveBoostCostForHistory(RoomPlayer player) {
        if (player.getBoostReservationId() == null) {
            return 0L;
        }

        return walletReservationRepository.findById(player.getBoostReservationId())
                .map(reservation -> reservation.getAmount())
                .orElse(0L);
    }

    private Room getLastPlayedRoom(User user) {
        return roomPlayerRepository.findByUserIdOrderByJoinTimeDescIdDesc(user.getId())
                .stream()
                .findFirst()
                .map(RoomPlayer::getRoom)
                .orElseThrow(() -> new NotFoundException("User has no played rooms"));
    }

    private int normalizePriceDelta(Integer priceDelta) {
        if (priceDelta == null) {
            return 200;
        }
        if (priceDelta < 50 || priceDelta > 5000) {
            throw new IllegalArgumentException("priceDelta must be between 50 and 5000");
        }
        return priceDelta;
    }

    private int normalizeRecommendationLimit(Integer limit) {
        if (limit == null) {
            return 10;
        }
        if (limit < 1 || limit > 20) {
            throw new IllegalArgumentException("limit must be between 1 and 20");
        }
        return limit;
    }

    private Room findRoom(UUID roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found: " + roomId));
    }

    private Room findRoomByShortId(String shortId) {
        String normalized = normalizeShortId(shortId);
        return roomRepository.findByShortIdAndStatusIn(normalized, ACTIVE_STATUSES)
                .orElseThrow(() -> new NotFoundException("Room not found by shortId: " + normalized));
    }

    private String normalizeShortId(String shortId) {
        if (shortId == null) {
            throw new IllegalArgumentException("shortId is required");
        }
        String normalized = shortId.trim();
        if (!normalized.matches("\\d{6}")) {
            throw new IllegalArgumentException("shortId must be exactly 6 digits");
        }
        return normalized;
    }

    private String buildRoundId(UUID roomId) {
        return "room-" + roomId + "-round-1";
    }

    private RoomPlayerResponse toPlayerResponse(RoomPlayer player) {
        return RoomPlayerResponse.builder()
                .userId(player.getUserId())
                .username(player.getUsername())
                .walletReservationId(player.getWalletReservationId())
                .bot(isBot(player))
                .boostUsed(player.getBoostUsed())
                .roundId(player.getRoundId())
                .playerOrder(player.getPlayerOrder())
                .winner(player.getWinner())
                .status(player.getStatus())
                .joinTime(player.getJoinTime())
                .build();
    }

    private RoomChanceSummary calculateRoomChanceSummary(Integer maxPlayers, BoostContext boostContext) {
        if (maxPlayers == null || maxPlayers <= 0) {
            return new RoomChanceSummary(0.0d, 0.0d, 0.0d);
        }
        int baseWeight = Math.max(1, boostContext.baseWeight());
        int boostWeight = Math.max(0, boostContext.boostWeight());
        double currentChance = 100.0d / (double) maxPlayers;
        double chanceWithBoost;
        if (!boostContext.boostAllowed()) {
            chanceWithBoost = currentChance;
        } else {
            int denominator = (baseWeight * (maxPlayers - 1)) + (baseWeight + boostWeight);
            chanceWithBoost = denominator <= 0
                    ? 0.0d
                    : ((double) (baseWeight + boostWeight) * 100.0d / (double) denominator);
        }
        double absoluteGain = chanceWithBoost - currentChance;
        return new RoomChanceSummary(
                round4(currentChance),
                round4(chanceWithBoost),
                round4(absoluteGain)
        );
    }

    private BoostContext resolveBoostContext(Room room) {
        int boostWeight = 10;
        Integer boostPrice = null;
        boolean boostAllowed = Boolean.TRUE.equals(room.getBoostAllowed());

        if (room.getTemplateId() != null) {
            RoomConfig template = roomConfigRepository.findById(room.getTemplateId()).orElse(null);
            if (template != null) {
                boostWeight = template.getBonusWeight() == null ? 10 : template.getBonusWeight();
                boostPrice = template.getBonusPrice();
                boostAllowed = Boolean.TRUE.equals(template.getBonusEnabled()) && boostWeight > 0;
            }
        }
        return new BoostContext(boostAllowed, 100, Math.max(0, boostWeight), boostPrice);
    }

    private double round4(double value) {
        return Math.round(value * 10_000.0d) / 10_000.0d;
    }

    private RoomResponse toResponse(Room room) {
        BoostContext boostContext = resolveBoostContext(room);
        RoomChanceSummary chanceSummary = calculateRoomChanceSummary(room.getMaxPlayers(), boostContext);
        return RoomResponse.builder()
                .id(room.getId())
                .shortId(room.getShortId())
                .templateId(room.getTemplateId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(Math.toIntExact(resolveRoomPrizeFund(room)))
                .boostAllowed(room.getBoostAllowed())
                .boostPrice(boostContext.boostPrice())
                .boostWeight(boostContext.boostWeight())
                .currentChancePercent(chanceSummary.currentChancePercent())
                .chanceWithBoostPercent(chanceSummary.chanceWithBoostPercent())
                .boostAbsoluteGainPercent(chanceSummary.boostAbsoluteGainPercent())
                .timerSeconds(room.getTimerSeconds())
                .status(room.getStatus())
                .currentPlayers(room.getCurrentPlayers())
                .botCount(room.getBotCount())
                .createdAt(room.getCreatedAt())
                .remainingSeconds(remainingSeconds(room))
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
                .shortId(generateUniqueShortRoomId())
                .templateId(template.getId())
                .maxPlayers(template.getMaxPlayers())
                .entryCost(template.getEntryCost())
                .prizeFund(Math.toIntExact(calculatePrizeFund(template.getEntryCost(), template.getMaxPlayers(), template.getWinnerPercent())))
                .boostAllowed(template.getBonusEnabled())
                .timerSeconds(ROOM_TIMER_SECONDS)
                .status(STATUS_WAITING)
                .currentPlayers(0)
                .botCount(0)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private String generateUniqueShortRoomId() {
        for (int i = 0; i < 32; i++) {
            String shortId = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            if (!roomRepository.existsByShortIdAndStatusIn(shortId, ACTIVE_STATUSES)) {
                return shortId;
            }
        }
        throw new IllegalStateException("Unable to generate unique room shortId");
    }

    private GameResult saveGameResult(Room room,
                                      List<RoomPlayer> players,
                                      SelectWinnerResponse winner,
                                      int winnerIndex,
                                      long winnerPayout) {
        GameResult result = GameResult.builder()
                .id(UUID.randomUUID())
                .roomId(room.getId())
                .maxPlayers(room.getMaxPlayers())
                .entryCost(room.getEntryCost())
                .prizeFund(Math.toIntExact(winnerPayout))
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
            long after = isBot(player) ? 0L : walletService.getBalanceByUserId(player.getUserId()).getTotal();
            long boostCost = isBot(player) ? 0L : resolveBoostCostForHistory(player);
            long payout = (!isBot(player) && i == winnerIndex) ? winnerPayout : 0L;
            long delta = payout - room.getEntryCost().longValue() - boostCost;
            long before = isBot(player) ? 0L : after - delta;

            int finalWeight = 0;
            if (winner.getPlayers() != null && i < winner.getPlayers().size()) {
                finalWeight = winner.getPlayers().get(i).getWeight();
            }

            GameResultPlayer participant = GameResultPlayer.builder()
                    .positionIndex(i)
                    .playerExternalId(player.getUserId().toString())
                    .username(player.getUsername())
                    .bot(isBot(player))
                    .boostUsed(Boolean.TRUE.equals(player.getBoostUsed()))
                    .finalWeight(finalWeight)
                    .balanceBefore(before)
                    .balanceAfter(after)
                    .balanceDelta(delta)
                    .status(player.getStatus())
                    .winner(i == winnerIndex)
                    .build();

            result.addParticipant(participant);
        }

        return gameResultRepository.save(result);
    }

    private int resolveWinnerPercent(Room room) {
        if (room.getTemplateId() == null) {
            return 100;
        }
        return roomConfigRepository.findById(room.getTemplateId())
                .map(RoomConfig::getWinnerPercent)
                .filter(p -> p != null && p > 0)
                .orElse(100);
    }

    private long resolveBasePool(Room room) {
        if (room.getEntryCost() == null || room.getMaxPlayers() == null) {
            return 0L;
        }
        return (long) room.getEntryCost() * room.getMaxPlayers();
    }

    private long resolveRoomPrizeFund(Room room) {
        return calculatePrizeFund(room.getEntryCost(), room.getMaxPlayers(), resolveWinnerPercent(room));
    }

    private long calculatePrizeFund(Integer entryCost, Integer maxPlayers, Integer winnerPercent) {
        if (entryCost == null || maxPlayers == null || winnerPercent == null || winnerPercent <= 0) {
            return 0L;
        }
        long totalPool = (long) entryCost * maxPlayers;
        return Math.floorDiv(totalPool * winnerPercent, 100);
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private record BoostContext(boolean boostAllowed, int baseWeight, int boostWeight, Integer boostPrice) {
    }

    private record RoomChanceSummary(double currentChancePercent,
                                     double chanceWithBoostPercent,
                                     double boostAbsoluteGainPercent) {
    }

    private RoomConfig resolveTemplateForMatching(JoinByTemplateRequest request) {
        Integer requestedBoostPrice = request.getBoostPrice();
        if (request.getTemplateId() != null) {
            RoomConfig template = roomConfigRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new NotFoundException("Room template not found: " + request.getTemplateId()));
            if (!Boolean.TRUE.equals(template.getActive())) {
                throw new IllegalArgumentException("Room template is not active: " + request.getTemplateId());
            }
            if (!template.getMaxPlayers().equals(request.getMaxPlayers())
                    || !template.getEntryCost().equals(request.getEntryCost())
                    || !template.getBonusEnabled().equals(request.getBoostAllowed())) {
                throw new IllegalArgumentException("Template parameters do not match requested room parameters");
            }
            if (requestedBoostPrice != null && !requestedBoostPrice.equals(template.getBonusPrice())) {
                throw new IllegalArgumentException("Template boostPrice does not match requested boostPrice");
            }
            return template;
        }

        if (requestedBoostPrice != null) {
            return roomConfigRepository
                    .findFirstByActiveTrueAndMaxPlayersAndEntryCostAndBonusEnabledAndBonusPriceOrderByCreatedAtDesc(
                            request.getMaxPlayers(),
                            request.getEntryCost(),
                            request.getBoostAllowed(),
                            requestedBoostPrice
                    )
                    .orElseThrow(() -> new NotFoundException("Active room template for requested parameters and boostPrice not found"));
        }

        return roomConfigRepository
                .findFirstByActiveTrueAndMaxPlayersAndEntryCostAndBonusEnabledOrderByCreatedAtDesc(
                        request.getMaxPlayers(),
                        request.getEntryCost(),
                        request.getBoostAllowed()
                )
                .orElseThrow(() -> new NotFoundException("Active room template for requested parameters not found"));
    }

    private List<Integer> normalizeSeats(List<Integer> seats, int maxPlayers) {
        if (seats == null || seats.isEmpty()) {
            throw new IllegalArgumentException("Seats are required");
        }
        Set<Integer> unique = new HashSet<>(seats);
        if (unique.size() != seats.size()) {
            throw new IllegalArgumentException("Seat numbers must be unique");
        }
        int maxSeatsForUser = maxSeatsPerUser(maxPlayers);
        if (seats.size() > maxSeatsForUser) {
            throw new IllegalArgumentException("User cannot request more than " + maxSeatsForUser + " seat(s)");
        }

        List<Integer> normalized = new ArrayList<>(seats);
        Collections.sort(normalized);
        for (Integer seat : normalized) {
            if (seat == null || seat < 1 || seat > maxPlayers) {
                throw new IllegalArgumentException("Seat number must be between 1 and " + maxPlayers);
            }
        }
        return normalized;
    }

    private RequestedSeatSelection resolveRequestedSeatSelection(List<Integer> seats, Integer seatsCount, int maxPlayers) {
        boolean hasExplicitSeats = seats != null && !seats.isEmpty();
        boolean hasSeatsCount = seatsCount != null;
        if (hasExplicitSeats == hasSeatsCount) {
            throw new IllegalArgumentException("Provide either 'seats' or 'seatsCount'");
        }

        if (hasExplicitSeats) {
            List<Integer> normalizedSeats = normalizeSeats(seats, maxPlayers);
            return RequestedSeatSelection.ofExplicit(normalizedSeats);
        }

        int normalizedCount = normalizeSeatsCount(seatsCount, maxPlayers);
        return RequestedSeatSelection.ofCount(normalizedCount);
    }

    private int normalizeSeatsCount(Integer seatsCount, int maxPlayers) {
        if (seatsCount == null || seatsCount <= 0) {
            throw new IllegalArgumentException("seatsCount must be > 0");
        }
        int maxSeatsForUser = maxSeatsPerUser(maxPlayers);
        if (seatsCount > maxSeatsForUser) {
            throw new IllegalArgumentException("User cannot request more than " + maxSeatsForUser + " seat(s)");
        }
        return seatsCount;
    }

    private List<Integer> resolveSeatsForJoin(UUID roomId, RequestedSeatSelection selection) {
        if (selection.explicitSeats() != null) {
            return selection.explicitSeats();
        }
        List<Integer> freeSeats = findFreeSeats(roomId);
        if (freeSeats.size() < selection.seatsCount()) {
            throw new IllegalArgumentException(
                    "Not enough free seats in room: requested=" + selection.seatsCount() + ", available=" + freeSeats.size()
            );
        }
        Collections.shuffle(freeSeats, ThreadLocalRandom.current());
        List<Integer> picked = new ArrayList<>(freeSeats.subList(0, selection.seatsCount()));
        Collections.sort(picked);
        return picked;
    }

    private boolean hasEnoughFreeSeats(UUID roomId, RequestedSeatSelection selection) {
        if (selection.explicitSeats() != null) {
            Set<Integer> occupied = findOccupiedSeats(roomId);
            return selection.explicitSeats().stream().noneMatch(occupied::contains);
        }
        return findFreeSeats(roomId).size() >= selection.seatsCount();
    }

    private List<Integer> findFreeSeats(UUID roomId) {
        Room room = findRoom(roomId);
        Set<Integer> occupied = findOccupiedSeats(roomId);
        List<Integer> free = new ArrayList<>();
        for (int seat = 1; seat <= room.getMaxPlayers(); seat++) {
            if (!occupied.contains(seat)) {
                free.add(seat);
            }
        }
        return free;
    }

    private Set<Integer> findOccupiedSeats(UUID roomId) {
        return roomPlayerRepository.findByRoom_IdOrderByPlayerOrderAsc(roomId)
                .stream()
                .map(RoomPlayer::getPlayerOrder)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
    }

    private int maxSeatsPerUser(int maxPlayers) {
        return Math.max(1, maxPlayers / 2);
    }

    private record RequestedSeatSelection(List<Integer> explicitSeats, Integer seatsCount) {
        private static RequestedSeatSelection ofExplicit(List<Integer> explicitSeats) {
            return new RequestedSeatSelection(explicitSeats, explicitSeats.size());
        }

        private static RequestedSeatSelection ofCount(Integer seatsCount) {
            return new RequestedSeatSelection(null, seatsCount);
        }
    }

    private boolean hasMoreThanFiveSecondsLeft(Room room) {
        return remainingMillis(room) > MIN_TIME_LEFT_TO_JOIN_MS;
    }

    private Long remainingSeconds(Room room) {
        if (room.getFirstPlayerJoinedAt() == null) {
            return null;
        }
        long millis = remainingMillis(room);
        if (millis <= 0) {
            return 0L;
        }
        return (long) Math.ceil(millis / 1000.0d);
    }

    private long remainingMillis(Room room) {
        if (room.getTimerSeconds() == null) {
            return 0L;
        }
        if (room.getFirstPlayerJoinedAt() == null) {
            return Long.MAX_VALUE;
        }
        LocalDateTime timeoutAt = room.getFirstPlayerJoinedAt().plusSeconds(room.getTimerSeconds());
        long millisLeft = java.time.Duration.between(LocalDateTime.now(), timeoutAt).toMillis();
        return Math.max(0L, millisLeft);
    }

    private void publishRoomRealtime(UUID roomId) {
        RoomStateResponse roomState = getRoomState(roomId);
        roomEventPublisher.publishRoomState(roomState);
        roomEventPublisher.publishRoomEvents(roomId, roundEventLogService.getByRoomId(roomId));
    }
}
