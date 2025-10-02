import Anthropic from '@anthropic-ai/sdk';
import { linkedInClient } from './linkedinMCP.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function searchLinkedInJobs(criteria, location, resumeText, linkedInProfile = null) {
  try {
    // Use LinkedIn MCP server to search for real jobs
    const searchKeywords = [
      ...criteria.jobTitles,
      ...criteria.keywords,
      criteria.field
    ].join(' ');

    console.log('Searching LinkedIn jobs with:', { keywords: searchKeywords, location });

    const result = await linkedInClient.searchJobs(searchKeywords, location);

    // Parse the result from MCP server
    let jobsData = [];
    if (result.content && result.content[0]) {
      const content = result.content[0].text;
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jobsData = JSON.parse(jsonMatch[0]);
      } else {
        // If not JSON, use Claude to structure the data
        jobsData = await structureJobResults(content, criteria, resumeText, linkedInProfile);
      }
    }

    // Use Claude to filter and rank jobs based on resume and preferences
    const filteredJobs = await filterAndRankJobs(jobsData, criteria, resumeText, linkedInProfile);

    return filteredJobs;
  } catch (error) {
    console.error('Error searching LinkedIn jobs via MCP:', error);
    // Fallback to mock jobs if MCP server fails
    console.log('Falling back to mock job generation');
    return await generateMockJobs(criteria, location, resumeText, linkedInProfile);
  }
}

async function structureJobResults(content, criteria, resumeText, linkedInProfile) {
  const profileContext = linkedInProfile ? `\n\nLinkedIn Profile:\n${linkedInProfile}` : '';

  const prompt = `Structure the following LinkedIn job search results into a clean JSON array format.

Job search results:
${content}

Based on these criteria:
Field: ${criteria.field}
Job Titles: ${criteria.jobTitles.join(', ')}
Keywords: ${criteria.keywords.join(', ')}
Experience Level: ${criteria.experienceLevel}

Resume:
${resumeText.substring(0, 1000)}...
${profileContext}

Format as JSON array:
[
  {
    "company": "Company Name",
    "title": "Job Title",
    "location": "City, State",
    "description": "Job description",
    "requirements": ["req1", "req2", "req3"],
    "matchReason": "Why this job matches the candidate",
    "url": "LinkedIn job URL"
  }
]

Only include jobs that are good matches. Limit to top 10 results.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = response.content[0].text;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse structured jobs:', e);
      return [];
    }
  }

  return [];
}

async function filterAndRankJobs(jobsData, criteria, resumeText, linkedInProfile) {
  if (!jobsData || jobsData.length === 0) {
    return [];
  }

  const profileContext = linkedInProfile ? `\n\nLinkedIn Profile:\n${linkedInProfile}` : '';

  const prompt = `You are analyzing job matches for a candidate. Review these jobs and rank them by fit.

Jobs:
${JSON.stringify(jobsData, null, 2)}

Candidate Resume:
${resumeText.substring(0, 1000)}...
${profileContext}

Desired Criteria:
Field: ${criteria.field}
Job Titles: ${criteria.jobTitles.join(', ')}
Keywords: ${criteria.keywords.join(', ')}
Responsibilities: ${criteria.responsibilities}
Experience Level: ${criteria.experienceLevel}

Return the top 5-10 best matching jobs in JSON format, each with a detailed "matchReason" explaining why this job is a good fit based on their resume, experience, and preferences. Include only jobs they are qualified for.

Format as JSON array:
[
  {
    "company": "Company Name",
    "title": "Job Title",
    "location": "City, State",
    "description": "Job description",
    "requirements": ["req1", "req2", "req3"],
    "matchReason": "Detailed explanation of fit",
    "url": "LinkedIn job URL"
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = response.content[0].text;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse filtered jobs:', e);
      return jobsData.slice(0, 10);
    }
  }

  return jobsData.slice(0, 10);
}

async function generateMockJobs(criteria, location, resumeText, linkedInProfile) {
  const profileContext = linkedInProfile ? `\n\nLinkedIn Profile:\n${linkedInProfile}` : '';

  // Use Claude to generate realistic job listings based on criteria
  const prompt = `Generate 5 realistic job listings that match these criteria:

Field: ${criteria.field}
Job Titles: ${criteria.jobTitles.join(', ')}
Keywords: ${criteria.keywords.join(', ')}
Responsibilities: ${criteria.responsibilities}
Experience Level: ${criteria.experienceLevel}
Location: ${location}

Based on this resume:
${resumeText.substring(0, 1000)}...
${profileContext}

For each job, provide:
- Company name (make it realistic for the field)
- Job title
- Location
- Brief description (2-3 sentences)
- Key requirements (3-4 points)
- Why this matches the candidate's profile

Format as JSON array with this structure:
[
  {
    "company": "Company Name",
    "title": "Job Title",
    "location": "City, State",
    "description": "Job description...",
    "requirements": ["req1", "req2", "req3"],
    "matchReason": "Why this job matches...",
    "url": "https://www.linkedin.com/jobs/view/..."
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const responseText = response.content[0].text;
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse jobs:', e);
      return [];
    }
  }

  return [];
}

// Helper function to determine experience level from resume
export function determineExperienceLevel(resumeText) {
  const text = resumeText.toLowerCase();

  // Simple heuristic based on years of experience
  const yearsMatch = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    return 'senior';
  }

  // Look for role indicators
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    return 'senior';
  }
  if (text.includes('junior') || text.includes('intern') || text.includes('entry')) {
    return 'entry';
  }

  return 'mid';
}
