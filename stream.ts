import { Controller, Post, Body, Res, HttpStatus, ValidationPipe } from '@nestjs/common';
import { IsArray, IsString, IsNumber, IsBoolean, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// DTO classes for request validation
class MessageContent {
  @IsString()
  type: string;

  @IsString()
  text: string;
}

class Message {
  @IsString()
  role: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageContent)
  content?: MessageContent[];

  @IsString()
  content?: string;
}

class StreamOptions {
  @IsBoolean()
  include_usage: boolean;
}

class ChatCompletionDto {
  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Message)
  messages: Message[];

  @IsNumber()
  temperature: number;

  @IsBoolean()
  stream: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => StreamOptions)
  stream_options: StreamOptions;
}

@Controller('api/chat')
export class ChatCompletionController {
  @Post('completions')
  async streamCompletion(
    @Body(new ValidationPipe()) chatCompletionDto: ChatCompletionDto,
    @Res() response: Response,
  ) {
    try {
      // Set headers for streaming response
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');

      // Generate a unique ID for this completion
      const completionId = uuidv4();
      const timestamp = Math.floor(Date.now() / 1000);

      // Mock usage metrics
      const usageMetrics = {
        prompt_tokens: 47,
        completion_tokens: 19,
        total_tokens: 66,
      };

      // Create the response object
      const responseObject = {
        id: `chatcmpl-${completionId}`,
        object: 'chat.completion',
        created: timestamp,
        model: chatCompletionDto.model.split('/').pop(),
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '{ "joke": "What do you call a fake noodle?" }',
            },
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
        usage: usageMetrics,
        system_fingerprint: chatCompletionDto.model.split('/').pop(),
      };

      // If streaming is enabled, send the response in chunks
      if (chatCompletionDto.stream) {
        // Send response in chunks
        response.write(`data: ${JSON.stringify(responseObject)}\n\n`);
        
        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Send final chunk
        response.write('data: [DONE]\n\n');
        response.end();
      } else {
        // Send complete response at once
        response.json(responseObject);
      }
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: {
          message: 'An error occurred during completion',
          type: 'internal_server_error',
        },
      });
    }
  }
}

// Service class for handling the actual completion logic
@Injectable()
export class ChatCompletionService {
  private tokenize(text: string): number {
    // Implement your tokenization logic here
    // This is a simple mock implementation
    return text.split(' ').length;
  }

  private calculateUsage(prompt: string, completion: string) {
    const promptTokens = this.tokenize(prompt);
    const completionTokens = this.tokenize(completion);
    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
  }
}
