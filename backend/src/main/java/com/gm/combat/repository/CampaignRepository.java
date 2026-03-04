package com.gm.combat.repository;

import com.gm.combat.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
    List<Campaign> findByUserEmail(String email);
    Optional<Campaign> findByIdAndUserEmail(UUID id, String email);
}
