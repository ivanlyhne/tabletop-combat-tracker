package com.gm.combat.dto.map;

import com.gm.combat.entity.Annotation;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AnnotationResponse(
        UUID id,
        UUID encounterId,
        String annotationType,
        String label,
        Map<String, Object> position,
        String color,
        Instant createdAt
) {
    public static AnnotationResponse from(Annotation a) {
        return new AnnotationResponse(
                a.getId(), a.getEncounterId(), a.getAnnotationType(),
                a.getLabel(), a.getPosition(), a.getColor(), a.getCreatedAt()
        );
    }
}
