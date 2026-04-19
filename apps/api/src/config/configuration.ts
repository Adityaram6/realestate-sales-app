export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  corsOrigin: string;
  useMockAi: boolean;
  /** Which real LLM to call when useMockAi=false. "anthropic" | "groq". */
  aiProvider: "anthropic" | "groq";
  anthropicApiKey?: string;
  claudeModel: string;
  groqApiKey?: string;
  groqModel: string;
  aiRateLimits: {
    dailyRequestLimit: number;
    dailyTokenLimit: number;
  };
  redis: {
    /** Full connection URL. Preferred — set this to an Upstash `rediss://…` URL for TLS. */
    url?: string;
    host: string;
    port: number;
    password?: string;
  };
  meta: {
    appId?: string;
    appSecret?: string;
    graphVersion: string;
  };
  sms: {
    provider: string;
    msg91AuthKey?: string;
    msg91SenderId?: string;
    msg91TemplateId?: string;
  };
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  apiPrefix: process.env.API_PREFIX ?? "api",
  databaseUrl: required("DATABASE_URL"),
  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    refreshSecret: required("JWT_REFRESH_SECRET"),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
  },
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  useMockAi: process.env.USE_MOCK_AI !== "false",
  aiProvider: (process.env.AI_PROVIDER === "groq"
    ? "groq"
    : "anthropic") as "anthropic" | "groq",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5",
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  aiRateLimits: {
    dailyRequestLimit: parseInt(
      process.env.AI_DAILY_REQUEST_LIMIT ?? "50",
      10,
    ),
    dailyTokenLimit: parseInt(
      process.env.AI_DAILY_TOKEN_LIMIT ?? "50000",
      10,
    ),
  },
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    graphVersion: process.env.META_GRAPH_VERSION ?? "v21.0",
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? "msg91",
    msg91AuthKey: process.env.MSG91_AUTH_KEY,
    msg91SenderId: process.env.MSG91_SENDER_ID,
    msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
  },
});

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}
