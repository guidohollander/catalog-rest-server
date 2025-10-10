import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // debugger; // Test if debugger statement works
  
  const testData = {
    message: "If you see this in the debugger, debugging works!",
    timestamp: new Date().toISOString()
  };
  
  console.log("Test debug endpoint hit");
  
  return NextResponse.json(testData);
}
