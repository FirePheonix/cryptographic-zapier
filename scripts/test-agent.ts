/**
 * Test script for AI Agent execution using Vercel AI SDK
 * Run with: npx tsx scripts/test-agent.ts
 * 
 * Uses jsonSchema() from AI SDK for tool parameters to ensure proper format.
 */

import 'dotenv/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema } from 'ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           🧪 AI AGENT TEST SCRIPT (Vercel AI SDK)           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('API Key exists:', !!OPENAI_API_KEY);
console.log('API Key prefix:', OPENAI_API_KEY?.substring(0, 15) + '...');

if (!OPENAI_API_KEY) {
  console.error('❌ No OPENAI_API_KEY found in .env!');
  process.exit(1);
}

// Create OpenAI client for Decision Maker
const openai = createOpenAI({ 
  apiKey: OPENAI_API_KEY,
  compatibility: 'strict',
});
const decisionMakerModel = openai.chat('gpt-4o-mini');

// Define tools using jsonSchema() wrapper from AI SDK
const tools: Record<string, any> = {
  openai_generate: {
    description: 'Generate text content using OpenAI. Use this for writing, summarizing, or any text generation task.',
    parameters: jsonSchema({
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The prompt for text generation' },
        systemPrompt: { type: 'string', description: 'Optional system prompt' },
      },
      required: ['prompt'],
    }),
    execute: async ({ prompt, systemPrompt }: { prompt: string; systemPrompt?: string }) => {
      console.log('\n  🔧 [Tool: openai_generate] Executing...');
      console.log('     Prompt:', prompt.substring(0, 100) + '...');
      
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      
      const result = await generateText({
        model: openai.chat('gpt-4o-mini'),
        messages,
      });
      
      console.log('     Result:', result.text.substring(0, 100) + '...');
      return { text: result.text, model: 'gpt-4o-mini' };
    },
  },
  
  http_request: {
    description: 'Make HTTP requests to external APIs. Use this to fetch data from URLs.',
    parameters: jsonSchema({
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to request' },
        method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method' },
      },
      required: ['url'],
    }),
    execute: async ({ url, method = 'GET' }: { url: string; method?: string }) => {
      console.log('\n  🔧 [Tool: http_request] Executing...');
      console.log('     URL:', url);
      console.log('     Method:', method);
      
      try {
        const response = await fetch(url, { method });
        const text = await response.text();
        console.log('     Status:', response.status);
        return { status: response.status, body: text.substring(0, 500) };
      } catch (err) {
        return { error: String(err) };
      }
    },
  },
  
  gmail_send: {
    description: 'Send an email via Gmail. Use this when you need to send emails.',
    parameters: jsonSchema({
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body' },
      },
      required: ['to', 'subject', 'body'],
    }),
    execute: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      console.log('\n  🔧 [Tool: gmail_send] Executing...');
      console.log('     To:', to);
      console.log('     Subject:', subject);
      console.log('     Body:', body.substring(0, 100) + '...');
      return { success: true, message: `Email sent to ${to}`, simulated: true };
    },
  },
};

async function runAgent(userInput: string, maxIterations = 5) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 USER INPUT:', userInput);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const systemPrompt = `You are an autonomous AI agent with access to tools.

Your job is to accomplish the user's task by:
1. THINKING about what needs to be done
2. ACTING by calling the appropriate tool
3. OBSERVING the result
4. REPEATING until the task is complete

Available tools:
- openai_generate: Generate text content (use for writing, summarizing)
- http_request: Make HTTP requests (use to fetch data from URLs)
- gmail_send: Send emails (use when asked to send emails)

When the task is complete, provide a final answer WITHOUT calling any more tools.
Be concise and efficient.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ];
  
  const toolCalls: Array<{ tool: string; input: any; output: any }> = [];
  
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n🔄 ITERATION ${iteration}/${maxIterations}`);
    console.log('─────────────────────────────────────');
    
    try {
      const result = await generateText({
        model: decisionMakerModel,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        tools,
        temperature: 0.7,
      } as any);
      
      const resultToolCalls = (result as any).toolCalls || [];
      const resultToolResults = (result as any).toolResults || [];
      
      if (resultToolCalls.length > 0) {
        console.log('🛠️  Decision Maker chose to use tool(s):');
        
        for (const tc of resultToolCalls) {
          console.log(`   → ${tc.toolName}(${JSON.stringify(tc.args).substring(0, 80)}...)`);
          
          const matchingResult = resultToolResults.find((r: any) => r.toolCallId === tc.toolCallId);
          
          toolCalls.push({
            tool: tc.toolName,
            input: tc.args,
            output: matchingResult?.result,
          });
          
          // Add to conversation
          messages.push({
            role: 'assistant',
            content: `Using tool: ${tc.toolName}`,
          });
          
          if (matchingResult) {
            messages.push({
              role: 'tool',
              name: tc.toolName,
              content: JSON.stringify(matchingResult.result),
            });
          }
        }
      }
      
      // Check if we have a final answer (no tool calls)
      if (result.text && resultToolCalls.length === 0) {
        console.log('\n✅ FINAL ANSWER:');
        console.log('─────────────────────────────────────');
        console.log(result.text);
        console.log('─────────────────────────────────────');
        
        return {
          answer: result.text,
          toolCalls,
          iterations: iteration,
          status: 'completed',
        };
      } else if (result.text) {
        console.log('💭 Thinking:', result.text.substring(0, 100) + '...');
        messages.push({ role: 'assistant', content: result.text });
      }
      
    } catch (error) {
      console.error('❌ Error in iteration:', error);
      return {
        answer: `Error: ${error}`,
        toolCalls,
        iterations: iteration,
        status: 'error',
      };
    }
  }
  
  console.log('\n⚠️  Max iterations reached');
  return {
    answer: 'Max iterations reached without completing task',
    toolCalls,
    iterations: maxIterations,
    status: 'max_iterations',
  };
}

// Run tests
async function main() {
  console.log('\n');
  
  // Test 1: Simple question (no tools needed)
  console.log('╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 1: Simple question (should NOT use tools)             │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const test1 = await runAgent('What is 2 + 2? Just tell me the number.');
  console.log('\nResult:', JSON.stringify(test1, null, 2));
  
  // Test 2: Task requiring tool usage
  console.log('\n\n');
  console.log('╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 2: Generate content (should use openai_generate)      │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const test2 = await runAgent('Write a short 2-sentence poem about coding.');
  console.log('\nResult:', JSON.stringify(test2, null, 2));
  
  // Test 3: HTTP request
  console.log('\n\n');
  console.log('╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 3: Fetch data (should use http_request)               │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const test3 = await runAgent('Fetch the content from https://httpbin.org/get and tell me what IP address it shows.');
  console.log('\nResult:', JSON.stringify(test3, null, 2));
  
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ✅ ALL TESTS COMPLETE                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
