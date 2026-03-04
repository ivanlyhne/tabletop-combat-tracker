package com.gm.combat.repository;

import com.gm.combat.entity.Encounter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EncounterRepository extends JpaRepository<Encounter, UUID> {
    List<Encounter> findByCampaignIdAndCampaignUserEmail(UUID campaignId, String email);
    Optional<Encounter> findByIdAndCampaignUserEmail(UUID id, String email);
}
