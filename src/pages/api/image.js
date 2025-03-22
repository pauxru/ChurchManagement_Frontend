import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const imagePath = path.join(process.cwd(), 'public', 'aipca_logo2.png');
  const imageBuffer = fs.readFileSync(imagePath);

  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
}
