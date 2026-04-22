package com.game.service.room;

import com.game.exception.ConflictException;
import com.game.exception.NotFoundException;
import com.game.model.dto.RoomTemplateRequest;
import com.game.model.dto.RoomTemplateResponse;
import com.game.model.entity.RoomConfig;
import com.game.repository.RoomConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomConfigService {

    private final RoomConfigRepository roomConfigRepository;

    public RoomTemplateResponse createTemplate(RoomTemplateRequest request) {
        String templateName = normalizeTemplateName(request.getTemplateName());
        validateUniqueTemplateName(templateName);

        LocalDateTime now = LocalDateTime.now();
        RoomConfig roomConfig = RoomConfig.builder()
                .id(UUID.randomUUID())
                .templateName(templateName)
                .active(request.getActive())
                .entryCost(request.getEntryCost())
                .bonusEnabled(request.getBonusEnabled())
                .bonusPrice(normalizeBonusPrice(request))
                .bonusWeight(normalizeBonusWeight(request))
                .maxPlayers(request.getMaxPlayers())
                .winnerPercent(request.getWinnerPercent())
                .gameMechanic(normalizeGameMechanic(request.getGameMechanic()))
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toResponse(roomConfigRepository.save(roomConfig));
    }

    public RoomTemplateResponse updateTemplate(UUID id, RoomTemplateRequest request) {
        RoomConfig roomConfig = roomConfigRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Room template not found: " + id));

        String templateName = normalizeTemplateName(request.getTemplateName());
        if (roomConfigRepository.existsByTemplateNameIgnoreCaseAndIdNot(templateName, id)) {
            throw new ConflictException("Room template with name '" + templateName + "' already exists");
        }

        roomConfig.setTemplateName(templateName);
        roomConfig.setActive(request.getActive());
        roomConfig.setEntryCost(request.getEntryCost());
        roomConfig.setBonusEnabled(request.getBonusEnabled());
        roomConfig.setBonusPrice(normalizeBonusPrice(request));
        roomConfig.setBonusWeight(normalizeBonusWeight(request));
        roomConfig.setMaxPlayers(request.getMaxPlayers());
        roomConfig.setWinnerPercent(request.getWinnerPercent());
        roomConfig.setGameMechanic(normalizeGameMechanic(request.getGameMechanic()));
        roomConfig.setUpdatedAt(LocalDateTime.now());

        return toResponse(roomConfigRepository.save(roomConfig));
    }

    public void deleteTemplate(UUID id) {
        RoomConfig roomConfig = roomConfigRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Room template not found: " + id));
        if (!Boolean.TRUE.equals(roomConfig.getActive())) {
            return;
        }
        roomConfig.setActive(false);
        roomConfig.setUpdatedAt(LocalDateTime.now());
        roomConfigRepository.save(roomConfig);
    }

    public RoomTemplateResponse getTemplateById(UUID id) {
        return roomConfigRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Room template not found: " + id));
    }

    public List<RoomTemplateResponse> getAllTemplates() {
        return roomConfigRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(roomConfig -> Boolean.TRUE.equals(roomConfig.getActive()))
                .map(this::toResponse)
                .toList();
    }

    public List<Integer> getTemplateEntryCosts() {
        return roomConfigRepository.findDistinctEntryCosts();
    }

    private void validateUniqueTemplateName(String templateName) {
        if (roomConfigRepository.existsByTemplateNameIgnoreCase(templateName)) {
            throw new ConflictException("Room template with name '" + templateName + "' already exists");
        }
    }

    private String normalizeTemplateName(String templateName) {
        return templateName == null ? null : templateName.trim();
    }

    private Integer normalizeBonusPrice(RoomTemplateRequest request) {
        return Boolean.TRUE.equals(request.getBonusEnabled()) ? request.getBonusPrice() : 0;
    }

    private Integer normalizeBonusWeight(RoomTemplateRequest request) {
        return Boolean.TRUE.equals(request.getBonusEnabled()) ? request.getBonusWeight() : 0;
    }

    private String normalizeGameMechanic(String gameMechanic) {
        return gameMechanic == null ? null : gameMechanic.trim();
    }

    private RoomTemplateResponse toResponse(RoomConfig roomConfig) {
        return RoomTemplateResponse.builder()
                .id(roomConfig.getId())
                .templateName(roomConfig.getTemplateName())
                .active(roomConfig.getActive())
                .entryCost(roomConfig.getEntryCost())
                .bonusEnabled(roomConfig.getBonusEnabled())
                .bonusPrice(roomConfig.getBonusPrice())
                .bonusWeight(roomConfig.getBonusWeight())
                .maxPlayers(roomConfig.getMaxPlayers())
                .winnerPercent(roomConfig.getWinnerPercent())
                .prizeFund(calculatePrizeFund(roomConfig))
                .gameMechanic(roomConfig.getGameMechanic())
                .createdAt(roomConfig.getCreatedAt())
                .updatedAt(roomConfig.getUpdatedAt())
                .build();
    }

    private Integer calculatePrizeFund(RoomConfig roomConfig) {
        if (roomConfig.getEntryCost() == null || roomConfig.getMaxPlayers() == null || roomConfig.getWinnerPercent() == null) {
            return 0;
        }
        long totalPool = (long) roomConfig.getEntryCost() * roomConfig.getMaxPlayers();
        long prizeFund = Math.floorDiv(totalPool * roomConfig.getWinnerPercent(), 100);
        return Math.toIntExact(prizeFund);
    }
}
