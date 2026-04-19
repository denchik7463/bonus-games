package com.game.repository;

import com.game.model.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;


public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByStatus(String status);

    List<Room> findByStatusIn(List<String> statuses);

}
