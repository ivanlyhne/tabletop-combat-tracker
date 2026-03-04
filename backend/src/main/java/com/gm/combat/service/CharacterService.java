package com.gm.combat.service;

import com.gm.combat.dto.character.CharacterRequest;
import com.gm.combat.dto.character.CharacterResponse;
import com.gm.combat.entity.Campaign;
import com.gm.combat.entity.Character;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.CharacterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CharacterService {

    private final CharacterRepository characterRepository;
    private final CampaignRepository campaignRepository;

    private Campaign requireCampaign(UUID campaignId, String userEmail) {
        return campaignRepository.findByIdAndUserEmail(campaignId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    @Transactional(readOnly = true)
    public List<CharacterResponse> findAll(UUID campaignId, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return characterRepository.findByCampaignId(campaignId)
                .stream().map(CharacterResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CharacterResponse findById(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        return characterRepository.findByIdAndCampaignId(id, campaignId)
                .map(CharacterResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found"));
    }

    public CharacterResponse create(UUID campaignId, CharacterRequest req, String userEmail) {
        Campaign campaign = requireCampaign(campaignId, userEmail);
        Character character = Character.builder()
                .campaign(campaign)
                .name(req.name())
                .characterType(req.characterType() != null ? req.characterType() : "PC")
                .ruleset(req.ruleset() != null ? req.ruleset() : "DND_5E")
                .initiativeModifier(req.initiativeModifier())
                .armorClass(req.armorClass() > 0 ? req.armorClass() : 10)
                .maxHp(req.maxHp())
                .currentHp(req.maxHp())
                .tempHp(0)
                .speed(req.speed() > 0 ? req.speed() : 30)
                .passivePerception(req.passivePerception())
                .notes(req.notes())
                .externalId(req.externalId())
                .extraAttributes(req.extraAttributes() != null ? req.extraAttributes() : new HashMap<>())
                .build();
        return CharacterResponse.from(characterRepository.save(character));
    }

    public CharacterResponse update(UUID campaignId, UUID id, CharacterRequest req, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Character character = characterRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found"));
        character.setName(req.name());
        if (req.characterType() != null) character.setCharacterType(req.characterType());
        if (req.ruleset() != null) character.setRuleset(req.ruleset());
        character.setInitiativeModifier(req.initiativeModifier());
        if (req.armorClass() > 0) character.setArmorClass(req.armorClass());
        if (req.maxHp() > 0) {
            int delta = req.maxHp() - character.getMaxHp();
            character.setMaxHp(req.maxHp());
            character.setCurrentHp(Math.min(character.getMaxHp(), character.getCurrentHp() + delta));
        }
        if (req.speed() > 0) character.setSpeed(req.speed());
        character.setPassivePerception(req.passivePerception());
        character.setNotes(req.notes());
        character.setExternalId(req.externalId());
        if (req.extraAttributes() != null) character.setExtraAttributes(req.extraAttributes());
        return CharacterResponse.from(characterRepository.save(character));
    }

    public void delete(UUID campaignId, UUID id, String userEmail) {
        requireCampaign(campaignId, userEmail);
        Character character = characterRepository.findByIdAndCampaignId(id, campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found"));
        characterRepository.delete(character);
    }
}
