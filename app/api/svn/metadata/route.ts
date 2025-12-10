import { NextRequest, NextResponse } from 'next/server';
import { fetchSvnMetadata, SvnResult } from '@/src/services/svn-metadata';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const urls = body.request?.urls as string[] | undefined;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        {
          response: {
            error: 'URLs array is required',
          },
        },
        { status: 400 },
      );
    }

    const results = await fetchSvnMetadata(urls);

    const projected = results.map((item: SvnResult) => {
      if (item.status === 'error') {
        return item;
      }

      const numericRevision = item.revision.startsWith('r')
        ? item.revision.substring(1)
        : item.revision;

      let releaseDate = item.date_modified;
      if (releaseDate) {
        const d = new Date(releaseDate);
        if (!isNaN(d.getTime())) {
          releaseDate = d.toISOString().split('T')[0];
        }
      }

      return {
        ...item,
        latest_revision: numericRevision,
        release_date: releaseDate,
      };
    });

    return NextResponse.json({
      response: {
        results: projected,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        response: {
          error: 'Internal server error',
        },
      },
      { status: 500 },
    );
  }
}
