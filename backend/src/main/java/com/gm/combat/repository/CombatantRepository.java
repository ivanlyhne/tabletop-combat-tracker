package com.gm.combat.repository;

import com.gm.combat.entity.Combatant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CombatantRepository extends JpaRepository<Combatant, UUID> {
    List<Combatant> findByEncounterId(UUID encounterId);
    Optional<Combatant> findByIdAndEncounterId(UUID id, UUID encounterId);
}
