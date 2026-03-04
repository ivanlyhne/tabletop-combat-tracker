package com.gm.combat.repository;

import com.gm.combat.entity.Monster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MonsterRepository extends JpaRepository<Monster, UUID> {
    List<Monster> findByCampaignId(UUID campaignId);
    List<Monster> findByCampaignIsNull();
    Optional<Monster> findByIdAndCampaignId(UUID id, UUID campaignId);
}
