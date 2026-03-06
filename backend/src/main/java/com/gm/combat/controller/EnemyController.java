package com.gm.combat.controller;

import com.gm.combat.dto.enemy.EnemyRequest;
import com.gm.combat.dto.enemy.EnemyResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.EnemyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class EnemyController {

    private final EnemyService enemyService;

    @GetMapping("/api/campaigns/{campaignId}/enemies")
    public List<EnemyResponse> getByCampaign(@PathVariable UUID campaignId) {
        return enemyService.findByCampaign(campaignId, SecurityUtils.currentUserEmail());
    }

    @GetMapping("/api/enemies/global")
    public List<EnemyResponse> getGlobal() {
        return enemyService.findGlobal();
    }

    @GetMapping("/api/enemies/global/{id}")
    public EnemyResponse getGlobalById(@PathVariable UUID id) {
        return enemyService.findGlobalById(id);
    }

    @PostMapping("/api/enemies/global")
    @ResponseStatus(HttpStatus.CREATED)
    public EnemyResponse createGlobal(@Valid @RequestBody EnemyRequest req) {
        return enemyService.createGlobal(req);
    }

    @PutMapping("/api/enemies/global/{id}")
    public EnemyResponse updateGlobal(@PathVariable UUID id,
                                       @Valid @RequestBody EnemyRequest req) {
        return enemyService.updateGlobal(id, req);
    }

    @DeleteMapping("/api/enemies/global/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGlobal(@PathVariable UUID id) {
        enemyService.deleteGlobal(id);
    }

    @GetMapping("/api/campaigns/{campaignId}/enemies/{id}")
    public EnemyResponse getById(@PathVariable UUID campaignId, @PathVariable UUID id) {
        return enemyService.findById(campaignId, id, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/enemies")
    @ResponseStatus(HttpStatus.CREATED)
    public EnemyResponse create(@PathVariable UUID campaignId,
                                @Valid @RequestBody EnemyRequest req) {
        return enemyService.create(campaignId, req, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/api/campaigns/{campaignId}/enemies/{id}")
    public EnemyResponse update(@PathVariable UUID campaignId,
                                @PathVariable UUID id,
                                @Valid @RequestBody EnemyRequest req) {
        return enemyService.update(campaignId, id, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/api/campaigns/{campaignId}/enemies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID campaignId, @PathVariable UUID id) {
        enemyService.delete(campaignId, id, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/enemies/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public List<EnemyResponse> duplicate(@PathVariable UUID campaignId,
                                         @PathVariable UUID id,
                                         @RequestParam(defaultValue = "1") int count) {
        return enemyService.duplicate(campaignId, id, count, SecurityUtils.currentUserEmail());
    }
}
