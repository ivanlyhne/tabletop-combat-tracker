package com.gm.combat.repository;

import com.gm.combat.entity.Character;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CharacterRepository extends JpaRepository<Character, UUID> {
    List<Character> findByCampaignId(UUID campaignId);
    Optional<Character> findByIdAndCampaignId(UUID id, UUID campaignId);
}
