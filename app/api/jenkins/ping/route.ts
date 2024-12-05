import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { loadConfig } from '@/src/config/loader';

// Load configuration
const config = loadConfig();

const jenkinsBaseUrl = config.services.jenkins.baseUrl;
const username = config.services.jenkins.username;
const apiToken = config.services.jenkins.apiToken;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const options = {
    hostname: jenkinsBaseUrl.replace('http://', ''),
    path: '/api/json',
    method: 'GET',
    auth: `${username}:${apiToken}`
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jenkinsInfo = JSON.parse(data);
            resolve(
              NextResponse.json({ 
                status: 'ok', 
                version: jenkinsInfo.hudson.version,
                instanceName: jenkinsInfo.hudson.nodeName
              })
            );
          } catch (error) {
            console.error('Error parsing Jenkins response:', error);
            resolve(
              NextResponse.json(
                { status: 'error', message: 'Failed to parse Jenkins response' }, 
                { status: 500 }
              )
            );
          }
        } else {
          const statusCode = res.statusCode ?? 500;
          console.error('Failed to ping Jenkins:', statusCode);
          resolve(
            NextResponse.json(
              { status: 'error', message: 'Failed to ping Jenkins' }, 
              { status: statusCode }
            )
          );
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve(
        NextResponse.json(
          { status: 'error', message: 'Failed to ping Jenkins' }, 
          { status: 500 }
        )
      );
    });

    req.end();
  });
}
