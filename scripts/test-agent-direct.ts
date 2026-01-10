/**
 * Test script for AI Agent using direct OpenAI SDK
 * Run with: npx tsx scripts/test-agent-direct.ts
 * 
 * This bypasses the Vercel AI SDK to test the OpenAI tools API directly.
 */

import 'dotenv/config';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║    🧪 AI AGENT TEST (Direct OpenAI SDK)                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('API Key exists:', !!OPENAI_API_KEY);

if (!OPENAI_API_KEY) {
  console.error('❌ No OPENAI_API_KEY found in .env!');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Define tools in OpenAI's native format
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'openai_generate',
      description: 'Generate text content using OpenAI. Use this for writing, summarizing, or any text generation task.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt for text generation' },
          systemPrompt: { type: 'string', description: 'Optional system prompt' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'http_request',
      description: 'Make HTTP requests to external APIs. Use this to fetch data from URLs.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to request' },
          method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'gmail_send',
      description: 'Send an email via Gmail. Use this when you need to send emails.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
];

// Tool execution functions
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  console.log(`\n  🔧 [Tool: ${name}] Executing...`);
  console.log('     Args:', JSON.stringify(args).substring(0, 100));
  
  switch (name) {
    case 'openai_generate': {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      if (args.systemPrompt) messages.push({ role: 'system', content: args.systemPrompt });
      messages.push({ role: 'user', content: args.prompt });
      
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
      });
      
      const text = result.choices[0]?.message?.content || '';
      console.log('     Result:', text.substring(0, 100) + '...');
      return JSON.stringify({ text, model: 'gpt-4o-mini' });
    }
    
    case 'http_request': {
      try {
        const response = await fetch(args.url, { method: args.method || 'GET' });
        const text = await response.text();
        console.log('     Status:', response.status);
        return JSON.stringify({ status: response.status, body: text.substring(0, 500) });
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    }
    
    case 'gmail_send': {
      console.log('     To:', args.to);
      console.log('     Subject:', args.subject);
      return JSON.stringify({ success: true, message: `Email sent to ${args.to}`, simulated: true });
    }
    
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

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

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ];
  
  const toolCalls: Array<{ tool: string; args: any; result: any }> = [];
  
  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n🔄 ITERATION ${i + 1}/${maxIterations}`);
    console.log('─────────────────────────────────────');
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
      });

      const choice = response.choices[0];
      const message = choice.message;
      
      // Add assistant message to history
      messages.push(message);
      
      // Check if LLM made tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`  📞 Tool calls: ${message.tool_calls.map(tc => tc.type === 'function' ? tc.function.name : tc.custom.name).join(', ')}`);
        
        for (const toolCall of message.tool_calls) {
          // Discriminate between function and custom tool calls
          let toolName: string;
          let args: Record<string, unknown>;
          
          if (toolCall.type === 'function') {
            toolName = toolCall.function.name;
            args = JSON.parse(toolCall.function.arguments);
          } else {
            toolName = toolCall.custom.name;
            args = JSON.parse(toolCall.custom.input);
          }
          
          const result = await executeTool(toolName, args);
          
          toolCalls.push({
            tool: toolName,
            args,
            result: JSON.parse(result),
          });
          
          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      } else if (message.content) {
        // LLM returned final answer
        console.log('\n  ✅ FINAL ANSWER:');
        console.log('  ' + message.content);
        
        return {
          answer: message.content,
          toolCalls,
          iterations: i + 1,
          status: 'success',
        };
      }
      
      if (choice.finish_reason === 'stop' && !message.tool_calls) {
        return {
          answer: message.content || 'No response',
          toolCalls,
          iterations: i + 1,
          status: 'success',
        };
      }
    } catch (err) {
      console.error('  ❌ Error in iteration:', err);
      return {
        answer: `Error: ${err}`,
        toolCalls,
        iterations: i + 1,
        status: 'error',
      };
    }
  }
  
  return {
    answer: 'Max iterations reached',
    toolCalls,
    iterations: maxIterations,
    status: 'max_iterations',
  };
}

// Run tests
async function main() {
  // Test 1: Simple question
  console.log('\n╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 1: Simple question (should NOT use tools)             │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const result1 = await runAgent('What is 2 + 2? Just tell me the number.');
  console.log('\nResult:', JSON.stringify(result1, null, 2));
  
  // Test 2: Content generation
  console.log('\n╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 2: Generate content (should use openai_generate)      │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const result2 = await runAgent('Write a short 2-sentence poem about coding.');
  console.log('\nResult:', JSON.stringify(result2, null, 2));
  
  // Test 3: HTTP request
  console.log('\n╭─────────────────────────────────────────────────────────────╮');
  console.log('│ TEST 3: Fetch data (should use http_request)               │');
  console.log('╰─────────────────────────────────────────────────────────────╯');
  const result3 = await runAgent('Fetch the content from https://httpbin.org/get and tell me what IP address it shows.');
  console.log('\nResult:', JSON.stringify(result3, null, 2));
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ✅ ALL TESTS COMPLETE                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
