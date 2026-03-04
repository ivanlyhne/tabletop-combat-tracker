package com.gm.combat.controller;

import com.gm.combat.dto.character.CharacterRequest;
import com.gm.combat.dto.character.CharacterResponse;
import com.gm.combat.security.SecurityUtils;
import com.gm.combat.service.CharacterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/characters")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;

    @GetMapping
    public List<CharacterResponse> getAll(@PathVariable UUID campaignId) {
        return characterService.findAll(campaignId, SecurityUtils.currentUserEmail());
    }

    @GetMapping("/{id}")
    public CharacterResponse getById(@PathVariable UUID campaignId, @PathVariable UUID id) {
        return characterService.findById(campaignId, id, SecurityUtils.currentUserEmail());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CharacterResponse create(@PathVariable UUID campaignId,
                                    @Valid @RequestBody CharacterRequest req) {
        return characterService.create(campaignId, req, SecurityUtils.currentUserEmail());
    }

    @PutMapping("/{id}")
    public CharacterResponse update(@PathVariable UUID campaignId,
                                    @PathVariable UUID id,
                                    @Valid @RequestBody CharacterRequest req) {
        return characterService.update(campaignId, id, req, SecurityUtils.currentUserEmail());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID campaignId, @PathVariable UUID id) {
        characterService.delete(campaignId, id, SecurityUtils.currentUserEmail());
    }
}
