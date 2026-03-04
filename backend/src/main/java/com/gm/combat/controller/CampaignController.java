package com.gm.combat.controller;

import com.gm.combat.dto.campaign.CampaignRequest;
import com.gm.combat.dto.campaign.CampaignResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;

    @GetMapping
    public List<CampaignResponse> getAll() {
        return campaignService.findAll(SecurityUtils.currentUserEmail());
    }

    @GetMapping("/{id}")
    public CampaignResponse getById(@PathVariable UUID id) {
        return campaignService.findById(id, SecurityUtils.currentUserEmail());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampaignResponse create(@Valid @RequestBody CampaignRequest req) {
        return campaignService.create(req, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/{id}")
    public CampaignResponse update(@PathVariable UUID id, @Valid @RequestBody CampaignRequest req) {
        return campaignService.update(id, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        campaignService.delete(id, SecurityUtils.currentUserEmail());
    }
}
