package com.gm.combat.repository;

import com.gm.combat.entity.MapEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MapRepository extends JpaRepository<MapEntity, UUID> {

    List<MapEntity> findByCampaignId(UUID campaignId);

    /** Verify the campaign belongs to the given user while fetching maps. */
    @Query("""
        SELECT m FROM MapEntity m
        JOIN Campaign c ON c.id = m.campaignId
        WHERE m.campaignId = :campaignId AND c.user.email = :email
        """)
    List<MapEntity> findByCampaignIdAndUserEmail(UUID campaignId, String email);

    /** Fetch a single map ensuring the owning campaign belongs to the user. */
    @Query("""
        SELECT m FROM MapEntity m
        JOIN Campaign c ON c.id = m.campaignId
        WHERE m.id = :id AND c.user.email = :email
        """)
    Optional<MapEntity> findByIdAndUserEmail(UUID id, String email);
}
