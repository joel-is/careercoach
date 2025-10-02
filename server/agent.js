import Anthropic from '@anthropic-ai/sdk';
import { linkedInClient } from './linkedinMCP.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export class CareerCoachAgent {
  constructor(resumeText, linkedInProfileUrl = null) {
    this.resumeText = resumeText;
    this.linkedInProfileUrl = linkedInProfileUrl;
    this.linkedInProfile = null;
    this.conversationHistory = [];
    this.userPreferences = {
      field: null,
      responsibilities: null,
      idealRole: null,
      experienceLevel: null,
      keywords: []
    };
    this.state = 'initial'; // initial, gathering, ready
  }

  async fetchLinkedInProfile() {
    if (this.linkedInProfileUrl && !this.linkedInProfile) {
      try {
        console.log('Fetching LinkedIn profile:', this.linkedInProfileUrl);
        const result = await linkedInClient.getPersonProfile(this.linkedInProfileUrl);
        this.linkedInProfile = result.content[0].text;
        console.log('LinkedIn profile fetched successfully');
      } catch (error) {
        console.error('Failed to fetch LinkedIn profile:', error);
        // Continue without LinkedIn profile
      }
    }
  }

  async start() {
    // Fetch LinkedIn profile if provided
    await this.fetchLinkedInProfile();

    const profileContext = this.linkedInProfile
      ? `\n\nLinkedIn Profile Data:\n${this.linkedInProfile}`
      : '';

    const systemPrompt = `You are a career coach helping someone find their ideal job. You have analyzed their resume${this.linkedInProfile ? ' and LinkedIn profile' : ''} and need to understand what kind of role they're looking for.

Resume content:
${this.resumeText}
${profileContext}

Your job is to:
1. Ask thoughtful questions to understand their ideal role
2. Determine what field they want to work in
3. Understand what they want to be doing day-to-day
4. Extract key preferences and requirements
5. Once you have enough information, summarize the job criteria

Keep your questions conversational and helpful. Ask one or two questions at a time. When you have gathered enough information to create a comprehensive job search, respond with "READY:" followed by a JSON object containing the search criteria.`;

    this.conversationHistory.push({
      role: 'user',
      content: 'I want to find my ideal job. Can you help me?'
    });

    const response = await this.callClaude(systemPrompt, this.conversationHistory);

    this.conversationHistory.push({
      role: 'assistant',
      content: response
    });

    return response;
  }

  async processMessage(userMessage) {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const profileContext = this.linkedInProfile
      ? `\n\nLinkedIn Profile Data:\n${this.linkedInProfile}`
      : '';

    const systemPrompt = `You are a career coach helping someone find their ideal job. You have analyzed their resume${this.linkedInProfile ? ' and LinkedIn profile' : ''} and are gathering information about their preferences.

Resume content:
${this.resumeText}
${profileContext}

Current preferences gathered:
${JSON.stringify(this.userPreferences, null, 2)}

Continue asking helpful questions to understand their ideal role. When you have enough information (field, desired responsibilities, role type, and experience level), respond with "READY:" followed by a JSON object with these fields:
{
  "field": "the industry/field",
  "jobTitles": ["list", "of", "relevant", "job", "titles"],
  "keywords": ["important", "skills", "technologies"],
  "responsibilities": "what they want to be doing",
  "experienceLevel": "entry/mid/senior"
}`;

    const response = await this.callClaude(systemPrompt, this.conversationHistory);

    this.conversationHistory.push({
      role: 'assistant',
      content: response
    });

    // Check if agent is ready to search
    if (response.includes('READY:')) {
      this.state = 'ready';
      const jsonMatch = response.match(/READY:\s*({[\s\S]*})/);
      if (jsonMatch) {
        try {
          this.jobCriteria = JSON.parse(jsonMatch[1]);
        } catch (e) {
          console.error('Failed to parse job criteria:', e);
        }
      }
    }

    return response;
  }

  async callClaude(systemPrompt, messages) {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
    });

    return response.content[0].text;
  }

  getJobSearchCriteria() {
    return this.jobCriteria;
  }

  isReady() {
    return this.state === 'ready';
  }
}
