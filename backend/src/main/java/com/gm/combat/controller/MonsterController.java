package com.gm.combat.controller;

import com.gm.combat.dto.monster.MonsterRequest;
import com.gm.combat.dto.monster.MonsterResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.MonsterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MonsterController {

    private final MonsterService monsterService;

    @GetMapping("/api/campaigns/{campaignId}/monsters")
    public List<MonsterResponse> getByCampaign(@PathVariable UUID campaignId) {
        return monsterService.findByCampaign(campaignId, SecurityUtils.currentUserEmail());
    }

    @GetMapping("/api/monsters/global")
    public List<MonsterResponse> getGlobal() {
        return monsterService.findGlobal();
    }

    @GetMapping("/api/campaigns/{campaignId}/monsters/{id}")
    public MonsterResponse getById(@PathVariable UUID campaignId, @PathVariable UUID id) {
        return monsterService.findById(campaignId, id, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/monsters")
    @ResponseStatus(HttpStatus.CREATED)
    public MonsterResponse create(@PathVariable UUID campaignId,
                                  @Valid @RequestBody MonsterRequest req) {
        return monsterService.create(campaignId, req, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/api/campaigns/{campaignId}/monsters/{id}")
    public MonsterResponse update(@PathVariable UUID campaignId,
                                  @PathVariable UUID id,
                                  @Valid @RequestBody MonsterRequest req) {
        return monsterService.update(campaignId, id, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/api/campaigns/{campaignId}/monsters/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID campaignId, @PathVariable UUID id) {
        monsterService.delete(campaignId, id, SecurityUtils.currentUserEmail());
    }

    @PostMapping("/api/campaigns/{campaignId}/monsters/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public List<MonsterResponse> duplicate(@PathVariable UUID campaignId,
                                           @PathVariable UUID id,
                                           @RequestParam(defaultValue = "1") int count) {
        return monsterService.duplicate(campaignId, id, count, SecurityUtils.currentUserEmail());
    }
}
