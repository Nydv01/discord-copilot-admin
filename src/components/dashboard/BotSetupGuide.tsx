import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BOT_CODE = `// Discord Copilot Bot - Railway Deployment Ready
// Save this as index.js and deploy to Railway

const { Client, GatewayIntentBits, Events } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Environment variables (set these in Railway)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const AI_API_KEY = process.env.AI_API_KEY; // OpenAI or Gemini
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'gemini'

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// AI Provider abstraction
async function callAI(systemPrompt, userMessage, context) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(context ? [{ role: 'assistant', content: \`Previous context: \${context}\` }] : []),
    { role: 'user', content: userMessage }
  ];

  if (AI_PROVIDER === 'gemini') {
    const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=\${AI_API_KEY}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : 'user',
          parts: [{ text: m.content }]
        }))
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
  } else {
    // OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${AI_API_KEY}\`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1000
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  }
}

// Fetch data from Supabase
async function getSystemInstructions() {
  const { data } = await supabase.from('system_instructions').select('content').limit(1).single();
  return data?.content || 'You are a helpful assistant.';
}

async function getAllowedChannels() {
  const { data } = await supabase.from('allowed_channels').select('channel_id');
  return data?.map(c => c.channel_id) || [];
}

async function getMemory() {
  const { data } = await supabase.from('conversation_memory').select('*').limit(1).single();
  return data;
}

async function updateMemory(newSummary, messageCount) {
  await supabase.from('conversation_memory')
    .update({ summary: newSummary, message_count: messageCount })
    .neq('id', '00000000-0000-0000-0000-000000000000');
}

// Message handler
client.on(Events.MessageCreate, async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Check if mentioned or in allowed channel
  const allowedChannels = await getAllowedChannels();
  const isMentioned = message.mentions.has(client.user);
  const isAllowedChannel = allowedChannels.includes(message.channel.id);

  if (!isMentioned && !isAllowedChannel) return;

  // Get context
  const [instructions, memory] = await Promise.all([
    getSystemInstructions(),
    getMemory()
  ]);

  // Clean message content (remove bot mention)
  const content = message.content.replace(/<@!?\\d+>/g, '').trim();
  if (!content) return;

  try {
    await message.channel.sendTyping();

    // Call AI
    const response = await callAI(instructions, content, memory?.summary);

    // Send response (split if too long)
    if (response.length > 2000) {
      const chunks = response.match(/.{1,2000}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(response);
    }

    // Update memory (simple append for now - you can add summarization)
    const newCount = (memory?.message_count || 0) + 1;
    const newSummary = \`\${memory?.summary || ''}\\n[\${new Date().toISOString()}] User: \${content.slice(0, 100)}... → Bot responded\`.slice(-2000);
    await updateMemory(newSummary, newCount);

  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply('Sorry, I encountered an error. Please try again.');
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(\`✅ Bot ready! Logged in as \${c.user.tag}\`);
});

client.login(DISCORD_TOKEN);`;

const PACKAGE_JSON = `{
  "name": "discord-copilot-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "@supabase/supabase-js": "^2.39.0"
  }
}`;

export default function BotSetupGuide() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPackage, setCopiedPackage] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, type: 'code' | 'package') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPackage(true);
      setTimeout(() => setCopiedPackage(false), 2000);
    }
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discord Bot Setup Guide</CardTitle>
          <CardDescription>
            Follow these steps to deploy your Discord bot to Railway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
              Create a Discord Application
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Go to the Discord Developer Portal and create a new application. Add a bot user and copy the token.
            </p>
            <Button variant="outline" size="sm" className="ml-8" asChild>
              <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Discord Developer Portal
              </a>
            </Button>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
              Set Bot Permissions
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Under OAuth2 → URL Generator, select:
            </p>
            <ul className="text-sm text-muted-foreground ml-12 list-disc space-y-1">
              <li>Scopes: <code className="bg-muted px-1 rounded">bot</code></li>
              <li>Bot Permissions: <code className="bg-muted px-1 rounded">Send Messages</code>, <code className="bg-muted px-1 rounded">Read Message History</code></li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
              Enable Message Content Intent
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Under Bot settings, enable the "Message Content Intent" toggle. This is required to read message content.
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">4</span>
              Create Railway Project
            </h3>
            <p className="text-sm text-muted-foreground ml-8">
              Create a new project on Railway and add these environment variables:
            </p>
            <ul className="text-sm text-muted-foreground ml-12 list-disc space-y-1">
              <li><code className="bg-muted px-1 rounded">DISCORD_TOKEN</code> - Your bot token</li>
              <li><code className="bg-muted px-1 rounded">SUPABASE_URL</code> - Your project URL</li>
              <li><code className="bg-muted px-1 rounded">SUPABASE_ANON_KEY</code> - Your anon key</li>
              <li><code className="bg-muted px-1 rounded">AI_API_KEY</code> - OpenAI or Gemini API key</li>
              <li><code className="bg-muted px-1 rounded">AI_PROVIDER</code> - "openai" or "gemini"</li>
            </ul>
            <Button variant="outline" size="sm" className="ml-8" asChild>
              <a href="https://railway.app" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Railway
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* package.json */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">package.json</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(PACKAGE_JSON, 'package')}
            >
              {copiedPackage ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedPackage ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
            <code>{PACKAGE_JSON}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Bot Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">index.js - Complete Bot Code</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(BOT_CODE, 'code')}
            >
              {copiedCode ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copiedCode ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-[400px]">
            <code>{BOT_CODE}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
