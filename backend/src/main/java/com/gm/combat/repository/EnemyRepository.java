package com.gm.combat.repository;

import com.gm.combat.entity.Enemy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnemyRepository extends JpaRepository<Enemy, UUID> {
    List<Enemy> findByCampaignId(UUID campaignId);
    List<Enemy> findByCampaignIsNull();
    Optional<Enemy> findByIdAndCampaignId(UUID id, UUID campaignId);
}
