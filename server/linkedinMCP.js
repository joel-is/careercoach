import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class LinkedInMCPClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      // Spawn the Docker container running the LinkedIn MCP server
      const dockerProcess = spawn('docker', [
        'run',
        '--rm',
        '-i',
        '-e', `LINKEDIN_COOKIE=${process.env.LINKEDIN_COOKIE}`,
        'stickerdaniel/linkedin-mcp-server:latest'
      ]);

      // Create transport using stdio
      const transport = new StdioClientTransport({
        command: dockerProcess,
        stdin: dockerProcess.stdin,
        stdout: dockerProcess.stdout,
        stderr: dockerProcess.stderr
      });

      // Create and connect client
      this.client = new Client({
        name: 'careercoach-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(transport);
      this.isConnected = true;
      console.log('Connected to LinkedIn MCP server');
    } catch (error) {
      console.error('Failed to connect to LinkedIn MCP server:', error);
      throw error;
    }
  }

  async getPersonProfile(profileUrl) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'get_person_profile',
        arguments: {
          profile_url: profileUrl
        }
      });

      return result;
    } catch (error) {
      console.error('Error fetching person profile:', error);
      throw error;
    }
  }

  async searchJobs(keywords, location) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'search_jobs',
        arguments: {
          keywords: keywords,
          location: location
        }
      });

      return result;
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw error;
    }
  }

  async getRecommendedJobs() {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'get_recommended_jobs',
        arguments: {}
      });

      return result;
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
      throw error;
    }
  }

  async getJobDetails(jobId) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name: 'get_job_details',
        arguments: {
          job_id: jobId
        }
      });

      return result;
    } catch (error) {
      console.error('Error fetching job details:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from LinkedIn MCP server');
    }
  }
}

// Export singleton instance
export const linkedInClient = new LinkedInMCPClient();
