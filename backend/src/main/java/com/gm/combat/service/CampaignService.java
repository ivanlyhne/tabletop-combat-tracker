package com.gm.combat.service;

import com.gm.combat.dto.campaign.CampaignRequest;
import com.gm.combat.dto.campaign.CampaignResponse;
import com.gm.combat.entity.Campaign;
import com.gm.combat.entity.User;
import com.gm.combat.repository.CampaignRepository;
import com.gm.combat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CampaignResponse> findAll(String userEmail) {
        return campaignRepository.findByUserEmail(userEmail)
                .stream().map(CampaignResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CampaignResponse findById(UUID id, String userEmail) {
        return campaignRepository.findByIdAndUserEmail(id, userEmail)
                .map(CampaignResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    public CampaignResponse create(CampaignRequest req, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Campaign campaign = Campaign.builder()
                .user(user)
                .name(req.name())
                .description(req.description())
                .ruleset(req.ruleset() != null ? req.ruleset() : "DND_5E")
                .build();
        return CampaignResponse.from(campaignRepository.save(campaign));
    }

    public CampaignResponse update(UUID id, CampaignRequest req, String userEmail) {
        Campaign campaign = campaignRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
        campaign.setName(req.name());
        campaign.setDescription(req.description());
        if (req.ruleset() != null) campaign.setRuleset(req.ruleset());
        return CampaignResponse.from(campaignRepository.save(campaign));
    }

    public void delete(UUID id, String userEmail) {
        Campaign campaign = campaignRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found"));
        campaignRepository.delete(campaign);
    }
}
