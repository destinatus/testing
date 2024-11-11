@Injectable()
export class AgentService {
  constructor(
    private memoryService: MemoryService,
    private llmService: OpenAIService,
  ) {}

  async startSession(userId: string) {
    return this.memoryService.createMemory(userId);
  }

  async processStep(userId: string, sessionId: string, input: string) {
    // Get relevant memories for context
    const relevantMemories = await this.memoryService.searchRelevantMemories(
      userId,
      input
    );

    // Process with LLM
    const llmResponse = await this.llmService.processStep({
      input,
      context: relevantMemories,
    });

    // Update memory
    await this.memoryService.updateMemory(userId, sessionId, llmResponse);

    return llmResponse;
  }
}
