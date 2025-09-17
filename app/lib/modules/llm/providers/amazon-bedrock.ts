import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

interface AWSBedRockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export default class AmazonBedrockProvider extends BaseProvider {
  name = 'AmazonBedrock';
  getApiKeyLink = 'https://console.aws.amazon.com/iam/home';

  config = {
    apiTokenKey: 'AWS_BEDROCK_CONFIG',
  };

  staticModels: ModelInfo[] = [
    // Claude Sonnet 4 with 200K context (using inference profile)
    {
      name: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      label: 'Claude Sonnet 4 (200K) (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 200000,
      maxCompletionTokens: 65536, // 64K max completion tokens
      maxTokens: 65536, // Also set maxTokens for compatibility
    },
    // Claude 3.5 Sonnet - Latest stable version with 200K context
    {
      name: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      label: 'Claude 3.5 Sonnet (200K context) (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 200000,
      maxCompletionTokens: 4096,
    },
    // Claude 3.5 Sonnet v2 - Newer version (may require inference profile)
    {
      name: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      label: 'Claude 3.5 Sonnet v2 (200K) (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 200000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'anthropic.claude-3-sonnet-20240229-v1:0',
      label: 'Claude 3 Sonnet (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 4096,
    },
    {
      name: 'anthropic.claude-3-haiku-20240307-v1:0',
      label: 'Claude 3 Haiku (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 4096,
    },
    {
      name: 'amazon.nova-pro-v1:0',
      label: 'Amazon Nova Pro (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 5120,
    },
    {
      name: 'amazon.nova-lite-v1:0',
      label: 'Amazon Nova Lite (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 5120,
    },
    {
      name: 'mistral.mistral-large-2402-v1:0',
      label: 'Mistral Large 24.02 (Bedrock)',
      provider: 'AmazonBedrock',
      maxTokenAllowed: 8192,
    },
  ];

  private _parseAndValidateConfig(apiKey: string): AWSBedRockConfig {
    let parsedConfig: AWSBedRockConfig;

    try {
      parsedConfig = JSON.parse(apiKey);
    } catch {
      throw new Error(
        'Invalid AWS Bedrock configuration format. Please provide a valid JSON string containing region, accessKeyId, and secretAccessKey.',
      );
    }

    const { region, accessKeyId, secretAccessKey, sessionToken } = parsedConfig;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required AWS credentials. Configuration must include region, accessKeyId, and secretAccessKey.',
      );
    }

    return {
      region,
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken }),
    };
  }

  getModelInstance(options: {
    model: string;
    serverEnv: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    let config: AWSBedRockConfig;

    // First, check for individual environment variables
    const envRegion = serverEnv?.AWS_BEDROCK_REGION || process.env.AWS_BEDROCK_REGION;
    const envAccessKeyId = serverEnv?.AWS_BEDROCK_ACCESS_KEY_ID || process.env.AWS_BEDROCK_ACCESS_KEY_ID;
    const envSecretAccessKey = serverEnv?.AWS_BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_BEDROCK_SECRET_ACCESS_KEY;
    const envSessionToken = serverEnv?.AWS_BEDROCK_SESSION_TOKEN || process.env.AWS_BEDROCK_SESSION_TOKEN;

    if (envRegion && envAccessKeyId && envSecretAccessKey) {
      // Use environment variables directly
      config = {
        region: envRegion,
        accessKeyId: envAccessKeyId,
        secretAccessKey: envSecretAccessKey,
        ...(envSessionToken && { sessionToken: envSessionToken }),
      };
    } else {
      // Fall back to JSON config or UI-provided credentials
      const { apiKey } = this.getProviderBaseUrlAndKey({
        apiKeys,
        providerSettings: providerSettings?.[this.name],
        serverEnv: serverEnv as any,
        defaultBaseUrlKey: '',
        defaultApiTokenKey: 'AWS_BEDROCK_CONFIG',
      });

      if (!apiKey) {
        // If no UI credentials and no env vars, check if we have a default model set
        if (!envRegion || !envAccessKeyId || !envSecretAccessKey) {
          throw new Error(`Missing AWS Bedrock credentials. Please set environment variables or provide credentials in the UI.`);
        }
      }

      config = this._parseAndValidateConfig(apiKey);
    }
    
    // Add headers for specific models if needed
    const headers: Record<string, string> = {};
    // Remove the beta header for now since we're using standard models
    
    const bedrock = createAmazonBedrock({
      ...config,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    return bedrock(model);
  }
}
