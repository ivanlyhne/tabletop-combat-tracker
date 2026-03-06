package com.gm.combat.service;

import com.gm.combat.dto.map.AnnotationRequest;
import com.gm.combat.dto.map.AnnotationResponse;
import com.gm.combat.dto.map.MapRequest;
import com.gm.combat.dto.map.MapResponse;
import com.gm.combat.entity.Annotation;
import com.gm.combat.entity.MapEntity;
import com.gm.combat.repository.AnnotationRepository;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.EncounterRepository;
import com.gm.combat.repository.MapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class MapService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_MIME_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp");

    @Value("${app.upload-dir}") private String uploadDirPath;

    private final MapRepository mapRepository;
    private final AnnotationRepository annotationRepository;
    private final CampaignRepository campaignRepository;
    private final EncounterRepository encounterRepository;

    // ── Map CRUD ──────────────────────────────────────────────────────────────

    public List<MapResponse> findAllByCampaign(UUID campaignId, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return mapRepository.findByCampaignId(campaignId).stream()
                .map(MapResponse::from)
                .toList();
    }

    public MapResponse create(UUID campaignId, MapRequest req, String userEmail) {
        requireCampaign(campaignId, userEmail);
        MapEntity map = MapEntity.builder()
                .campaignId(campaignId)
                .name(req.name())
                .widthCells(req.widthCells() != null ? req.widthCells() : 20)
                .heightCells(req.heightCells() != null ? req.heightCells() : 20)
                .cellSizePx(req.cellSizePx() != null ? req.cellSizePx() : 60)
                .cellSizeFt(req.cellSizeFt() != null ? req.cellSizeFt() : 5)
                .gridType(req.gridType() != null ? req.gridType() : "SQUARE")
                .gridColor(req.gridColor() != null ? req.gridColor() : "#cccccc80")
                .build();
        return MapResponse.from(mapRepository.save(map));
    }

    public MapResponse findById(UUID mapId, String userEmail) {
        return MapResponse.from(requireMap(mapId, userEmail));
    }

    public MapResponse update(UUID mapId, MapRequest req, String userEmail) {
        MapEntity map = requireMap(mapId, userEmail);
        map.setName(req.name());
        if (req.widthCells() != null) map.setWidthCells(req.widthCells());
        if (req.heightCells() != null) map.setHeightCells(req.heightCells());
        if (req.cellSizePx() != null) map.setCellSizePx(req.cellSizePx());
        if (req.cellSizeFt() != null) map.setCellSizeFt(req.cellSizeFt());
        if (req.gridType() != null) map.setGridType(req.gridType());
        if (req.gridColor() != null) map.setGridColor(req.gridColor());
        return MapResponse.from(mapRepository.save(map));
    }

    public void delete(UUID mapId, String userEmail) {
        MapEntity map = requireMap(mapId, userEmail);
        mapRepository.delete(map);
    }

    public MapResponse uploadBackground(UUID mapId, MultipartFile file, String userEmail) {
        MapEntity map = requireMap(mapId, userEmail);

        // Validate extension against whitelist
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null || !ALLOWED_EXTENSIONS.contains(ext.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPG, PNG and WEBP images are allowed.");
        }

        // Validate MIME type (independent of filename)
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_MIME_TYPES.contains(mime.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid image content type: " + mime);
        }

        try {
            Path uploadDir = Path.of(uploadDirPath);
            Files.createDirectories(uploadDir);
            // Use only the sanitised extension — never trust the original filename
            String filename = mapId + "_bg." + ext.toLowerCase();
            Files.write(uploadDir.resolve(filename), file.getBytes());
            map.setBackgroundImageUrl("/uploads/" + filename);
            return MapResponse.from(mapRepository.save(map));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store background image");
        }
    }

    // ── Annotation CRUD ───────────────────────────────────────────────────────

    public List<AnnotationResponse> findAnnotations(UUID encounterId, String userEmail) {
        requireEncounter(encounterId, userEmail);
        return annotationRepository.findByEncounterId(encounterId).stream()
                .map(AnnotationResponse::from)
                .toList();
    }

    public AnnotationResponse createAnnotation(UUID encounterId, AnnotationRequest req, String userEmail) {
        requireEncounter(encounterId, userEmail);
        Annotation annotation = Annotation.builder()
                .encounterId(encounterId)
                .annotationType(req.annotationType())
                .label(req.label())
                .position(req.position())
                .color(req.color() != null ? req.color() : "#ff6b35")
                .build();
        return AnnotationResponse.from(annotationRepository.save(annotation));
    }

    public void deleteAnnotation(UUID encounterId, UUID annotationId, String userEmail) {
        requireEncounter(encounterId, userEmail);
        Annotation annotation = annotationRepository.findByIdAndEncounterId(annotationId, encounterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found"));
        annotationRepository.delete(annotation);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void requireCampaign(UUID campaignId, String userEmail) {
        campaignRepository.findByIdAndUserEmail(campaignId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private MapEntity requireMap(UUID mapId, String userEmail) {
        return mapRepository.findByIdAndUserEmail(mapId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Map not found"));
    }

    private void requireEncounter(UUID encounterId, String userEmail) {
        encounterRepository.findByIdAndCampaignUserEmail(encounterId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Encounter not found"));
    }
}
