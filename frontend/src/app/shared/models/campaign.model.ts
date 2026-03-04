export interface Campaign {
  id: string;
  name: string;
  description?: string;
  ruleset: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRequest {
  name: string;
  description?: string;
  ruleset: string;
}
