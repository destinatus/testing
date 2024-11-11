m// elasticsearch.config.ts
import { RegisterAs } from '@nestjs/config';

export const elasticsearchConfig = RegisterAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  },
}));

// memory.types.ts
export interface AgentMemory {
  userId: string;
  sessionId: string;
  timestamp: string;
  context: {
    currentTask: string;
    taskStatus: 'active' | 'completed' | 'failed';
    taskPriority: number;
  };
  workingMemory: {
    currentFocus: string;
    activeGoals: string[];
    attentionPoints: string[];
  };
  episodicMemory: {
    interactions: Array<{
      thoughtContent: string;
      actionType: string;
      observation: string;
      timestamp: string;
    }>;
  };
}

// memory.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AgentMemory } from './memory.types';

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly INDEX_NAME = 'agent-memories';
  
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createIndex();
  }

  private async createIndex() {
    const indexExists = await this.elasticsearchService.indices.exists({
      index: this.INDEX_NAME,
    });

    if (!indexExists) {
      await this.elasticsearchService.indices.create({
        index: this.INDEX_NAME,
        body: {
          mappings: {
            properties: {
              userId: { type: 'keyword' },
              sessionId: { type: 'keyword' },
              timestamp: { type: 'date' },
              context: {
                properties: {
                  currentTask: { type: 'text' },
                  taskStatus: { type: 'keyword' },
                  taskPriority: { type: 'integer' }
                }
              },
              workingMemory: {
                properties: {
                  currentFocus: { type: 'text' },
                  activeGoals: { type: 'text' },
                  attentionPoints: { type: 'text' }
                }
              },
              episodicMemory: {
                properties: {
                  interactions: {
                    type: 'nested',
                    properties: {
                      thoughtContent: { type: 'text' },
                      actionType: { type: 'keyword' },
                      observation: { type: 'text' },
                      timestamp: { type: 'date' }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }
  }

  async createMemory(userId: string): Promise<string> {
    const sessionId = uuidv4();
    const memory: AgentMemory = {
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      context: {
        currentTask: '',
        taskStatus: 'active',
        taskPriority: 1,
      },
      workingMemory: {
        currentFocus: '',
        activeGoals: [],
        attentionPoints: [],
      },
      episodicMemory: {
        interactions: [],
      },
    };

    await this.elasticsearchService.index({
      index: this.INDEX_NAME,
      body: memory,
    });

    return sessionId;
  }

  async updateMemory(userId: string, sessionId: string, interaction: {
    thought: string;
    action: string;
    observation: string;
  }) {
    const now = new Date().toISOString();

    await this.elasticsearchService.update({
      index: this.INDEX_NAME,
      id: sessionId,
      body: {
        script: {
          source: `
            ctx._source.episodicMemory.interactions.add(params.interaction);
            ctx._source.timestamp = params.timestamp;
          `,
          params: {
            interaction: {
              thoughtContent: interaction.thought,
              actionType: interaction.action,
              observation: interaction.observation,
              timestamp: now,
            },
            timestamp: now,
          },
        },
      },
    });
  }

  async searchRelevantMemories(userId: string, query: string) {
    const response = await this.elasticsearchService.search({
      index: this.INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [
              { match: { userId } },
              {
                multi_match: {
                  query,
                  fields: [
                    'context.currentTask',
                    'workingMemory.currentFocus',
                    'workingMemory.activeGoals',
                    'episodicMemory.interactions.thoughtContent',
                    'episodicMemory.interactions.observation'
                  ],
                }
              }
            ]
          }
        },
        sort: [
          { timestamp: { order: 'desc' } }
        ],
      }
    });

    return response.hits.hits;
  }

  async getUserSessions(userId: string) {
    const response = await this.elasticsearchService.search({
      index: this.INDEX_NAME,
      body: {
        query: {
          match: { userId }
        },
        sort: [
          { timestamp: { order: 'desc' } }
        ],
      }
    });

    return response.hits.hits;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.elasticsearchService.deleteByQuery({
      index: this.INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [
              { match: { userId } },
              { match: { sessionId } }
            ]
          }
        }
      }
    });
  }
}

// memory.module.ts
import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { elasticsearchConfig } from './elasticsearch.config';

@Module({
  imports: [
    ConfigModule.forFeature(elasticsearchConfig),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('elasticsearch'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
