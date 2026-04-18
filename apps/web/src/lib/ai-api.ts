import { apiClient } from "@/lib/api-client";
import type { AiIntent, AiTone } from "@realestate/shared";
import type {
  MessageVariation,
  ScoreOutput,
  StrategyOutput,
} from "@/lib/ai-mock";

export interface GenerateMessageRequest {
  leadId: string;
  opportunityId?: string;
  intent: AiIntent;
  tone: AiTone;
}

export interface GenerateMessageResponse {
  variations: MessageVariation[];
  suggestedIntent: AiIntent;
  storedInteractionId: string;
}

export interface StrategyRequest {
  leadId: string;
  opportunityId?: string;
}

export interface ScoreRequest {
  leadId: string;
}

export const aiApi = {
  generateMessage: async (
    payload: GenerateMessageRequest,
  ): Promise<GenerateMessageResponse> => {
    const { data } = await apiClient.post<GenerateMessageResponse>(
      "/ai/generate-message",
      payload,
    );
    return data;
  },
  strategy: async (payload: StrategyRequest): Promise<StrategyOutput> => {
    const { data } = await apiClient.post<StrategyOutput>(
      "/ai/recommendation",
      payload,
    );
    return data;
  },
  score: async (payload: ScoreRequest): Promise<ScoreOutput> => {
    const { data } = await apiClient.post<ScoreOutput>(
      "/ai/score-lead",
      payload,
    );
    return data;
  },
};
