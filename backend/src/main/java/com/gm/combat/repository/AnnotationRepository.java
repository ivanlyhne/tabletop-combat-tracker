package com.gm.combat.repository;

import com.gm.combat.entity.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnnotationRepository extends JpaRepository<Annotation, UUID> {

    List<Annotation> findByEncounterId(UUID encounterId);

    Optional<Annotation> findByIdAndEncounterId(UUID id, UUID encounterId);
}
