import { NextResponse } from 'next/server';

export interface CricketMatchData {
  id: string;
  tournament: string;
  isLive: boolean;
  statusText: string;
  team1: {
    name: string;
    shortName: string;
    score: string;
    overs: string;
    badge: string;
  };
  team2: {
    name: string;
    shortName: string;
    score: string;
    overs: string;
    badge: string;
  };
}

export async function GET(request: Request) {
  const apiKey = process.env.CRICKET_API_KEY || process.env.CRICAPI_KEY;
  const { searchParams } = new URL(request.url);
  const getAll = searchParams.get('all') === 'true';

  // 1. If user provided a CricAPI key in .env
  if (apiKey) {
    try {
      const cricApiRes = await fetch(
        `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`,
        { next: { revalidate: 10 } }
      );

      if (cricApiRes.ok) {
        const data = await cricApiRes.json();
        const matches = data?.data || [];

        if (matches.length > 0) {
          const parsedMatches: CricketMatchData[] = matches.map((m: any) => {
            const team1Info = m.teamInfo?.[0] || {};
            const team2Info = m.teamInfo?.[1] || {};
            const score1 = m.score?.[0] || {};
            const score2 = m.score?.[1] || {};

            return {
              id: String(m.id),
              tournament: m.name || 'International Cricket Match',
              isLive: m.matchStarted && !m.matchEnded,
              statusText: m.status || 'Match in Progress',
              team1: {
                name: team1Info.name || m.teams?.[0] || 'Team A',
                shortName: team1Info.shortname || m.teams?.[0]?.slice(0, 3)?.toUpperCase() || 'TMA',
                score: score1.r !== undefined ? `${score1.r}/${score1.w ?? 0}` : 'Yet to Bat',
                overs: score1.o !== undefined ? `${score1.o} OVERS` : '0 OVERS',
                badge: team1Info.shortname || 'TMA',
              },
              team2: {
                name: team2Info.name || m.teams?.[1] || 'Team B',
                shortName: team2Info.shortname || m.teams?.[1]?.slice(0, 3)?.toUpperCase() || 'TMB',
                score: score2.r !== undefined ? `${score2.r}/${score2.w ?? 0}` : 'Yet to Bat',
                overs: score2.o !== undefined ? `${score2.o} OVERS` : '0 OVERS',
                badge: team2Info.shortname || 'TMB',
              },
            };
          });

          if (getAll) {
            return NextResponse.json({ success: true, source: 'CricAPI', matches: parsedMatches });
          }

          // Prioritize ongoing live matches or recent India matches
          const liveOrIndiaMatch = parsedMatches.find((m) => m.isLive || m.tournament.includes('India')) || parsedMatches[0];

          return NextResponse.json({ success: true, source: 'CricAPI', match: liveOrIndiaMatch, matches: parsedMatches });
        }
      }
    } catch (err) {
      console.warn('[Cricket API Key] CricAPI call failed, falling back to public feed:', err);
    }
  }

  // 2. Fallback if API fails or key is missing
  const fallbackMatch: CricketMatchData = {
    id: 'zim-ind-t20',
    tournament: 'Zimbabwe vs India 3rd T20I',
    isLive: false,
    statusText: 'India won by 35 runs',
    team1: {
      name: 'India',
      shortName: 'IND',
      score: '192/5',
      overs: '20.0 OVERS',
      badge: 'IND',
    },
    team2: {
      name: 'Zimbabwe',
      shortName: 'ZIM',
      score: '157/7',
      overs: '20.0 OVERS',
      badge: 'ZIM',
    },
  };

  return NextResponse.json({ 
    success: true, 
    source: 'Fallback', 
    match: fallbackMatch, 
    matches: [fallbackMatch] 
  });
}
