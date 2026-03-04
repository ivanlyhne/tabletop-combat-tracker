package com.gm.combat.controller;

import com.gm.combat.dto.map.AnnotationRequest;
import com.gm.combat.dto.map.AnnotationResponse;
import com.gm.combat.dto.map.MapRequest;
import com.gm.combat.dto.map.MapResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.MapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MapController {

    private final MapService mapService;

    // ── Campaign-scoped map endpoints ─────────────────────────────────────────

    @GetMapping("/api/campaigns/{campaignId}/maps")
    public List<MapResponse> getAllByCampaign(@PathVariable UUID campaignId) {
        return mapService.findAllByCampaign(campaignId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/maps")
    @ResponseStatus(HttpStatus.CREATED)
    public MapResponse create(@PathVariable UUID campaignId,
                              @Valid @RequestBody MapRequest req) {
        return mapService.create(campaignId, req, SecurityUtils.currentUserEmail());
    }

    // ── Map CRUD ──────────────────────────────────────────────────────────────

    @GetMapping("/api/maps/{id}")
    public MapResponse getById(@PathVariable UUID id) {
        return mapService.findById(id, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/api/maps/{id}")
    public MapResponse update(@PathVariable UUID id,
                              @Valid @RequestBody MapRequest req) {
        return mapService.update(id, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/api/maps/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        mapService.delete(id, SecurityUtils.currentUserEmail());
    }

    @PostMapping(value = "/api/maps/{id}/background", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MapResponse uploadBackground(@PathVariable UUID id,
                                        @RequestParam("file") MultipartFile file) {
        return mapService.uploadBackground(id, file, SecurityUtils.currentUserEmail());
    }

    // ── Encounter-scoped annotation endpoints ─────────────────────────────────

    @GetMapping("/api/encounters/{encounterId}/annotations")
    public List<AnnotationResponse> getAnnotations(@PathVariable UUID encounterId) {
        return mapService.findAnnotations(encounterId, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/encounters/{encounterId}/annotations")
    @ResponseStatus(HttpStatus.CREATED)
    public AnnotationResponse createAnnotation(@PathVariable UUID encounterId,
                                               @Valid @RequestBody AnnotationRequest req) {
        return mapService.createAnnotation(encounterId, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/api/encounters/{encounterId}/annotations/{annotationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAnnotation(@PathVariable UUID encounterId,
                                 @PathVariable UUID annotationId) {
        mapService.deleteAnnotation(encounterId, annotationId, SecurityUtils.currentUserEmail());
    }
}
