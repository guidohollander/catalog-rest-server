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
                version: jenkinsInfo._class?.split('.')?.pop() || 'Unknown',
                instanceName: jenkinsInfo.nodeName || jenkinsInfo.displayName || 'Unknown'
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
              { status: 'error', message: `Failed to connect to Jenkins (${statusCode})` }, 
              { status: statusCode }
            )
          );
        }
      });
    });

    req.on('error', (error) => {
      console.error('Jenkins connection error:', error);
      resolve(
        NextResponse.json(
          { status: 'error', message: 'Failed to connect to Jenkins' }, 
          { status: 500 }
        )
      );
    });

    req.end();
  });
}
