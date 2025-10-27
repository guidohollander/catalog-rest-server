import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/src/utils/logger';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const body = await request.json();
    const { name, email, address, city, postalCode, country, message } = body;

    // Validate required fields
    if (!name || !email || !address || !city || !postalCode || !country) {
      logger.warn(`[${requestId}] Christmas card registration failed - missing required fields`);
      return NextResponse.json(
        { success: false, message: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // Prepare registration data
    const registration = {
      timestamp: new Date().toISOString(),
      name,
      email,
      address,
      city,
      postalCode,
      country,
      message: message || '',
    };

    // Save to file (you can also save to database)
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'christmas-card-registrations.json');

    // Ensure data directory exists
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Read existing registrations or create new array
    let registrations = [];
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      registrations = JSON.parse(fileContent);
    } catch (err) {
      // File doesn't exist yet, start with empty array
    }

    // Add new registration
    registrations.push(registration);

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(registrations, null, 2));

    logger.info(`[${requestId}] Christmas card registration received from ${name} (${email})`);

    return NextResponse.json({
      success: true,
      message: 'Registration received successfully',
    });
  } catch (error) {
    logger.error(`[${requestId}] Error processing Christmas card registration:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to process registration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const filePath = path.join(process.cwd(), 'data', 'christmas-card-registrations.json');
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const registrations = JSON.parse(fileContent);
      
      logger.info(`[${requestId}] Retrieved ${registrations.length} Christmas card registrations`);
      
      return NextResponse.json({
        success: true,
        count: registrations.length,
        registrations,
      });
    } catch (err) {
      return NextResponse.json({
        success: true,
        count: 0,
        registrations: [],
      });
    }
  } catch (error) {
    logger.error(`[${requestId}] Error retrieving Christmas card registrations:`, error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve registrations' },
      { status: 500 }
    );
  }
}
