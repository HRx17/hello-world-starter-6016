import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { analysisData, projectName } = await req.json();

    if (!analysisData || !projectName) {
      throw new Error('Missing required data');
    }

    // Validate input lengths
    if (typeof projectName !== 'string' || projectName.length > 200) {
      throw new Error('Invalid project name');
    }

    // Generate HTML report
    const html = generateReportHTML(analysisData, projectName);

    const pdfBlob = new Blob([html], { type: 'text/html' });

    return new Response(pdfBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${projectName}-ux-report.html"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateReportHTML(analysisData: any, projectName: string): string {
  const { overallScore, violations, url, websiteName } = analysisData;

  const violationsByCategory = violations.reduce((acc: any, v: any) => {
    if (!acc[v.severity]) acc[v.severity] = [];
    acc[v.severity].push(v);
    return acc;
  }, {});

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#ca8a04';
      case 'low': return '#2563eb';
      default: return '#6b7280';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${projectName} - UX Analysis Report</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #1f2937;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #6366f1;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #6366f1;
          margin-bottom: 10px;
        }
        .score-card {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin: 30px 0;
        }
        .score {
          font-size: 72px;
          font-weight: bold;
          margin: 10px 0;
        }
        .project-info {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .project-info h3 {
          margin-top: 0;
          color: #6366f1;
        }
        .violations-section {
          margin: 40px 0;
        }
        .severity-group {
          margin: 30px 0;
        }
        .severity-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          padding: 10px;
          border-left: 4px solid;
          background: #f9fafb;
        }
        .violation-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 15px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .violation-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .heuristic-badge {
          display: inline-block;
          background: #fee2e2;
          color: #991b1b;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          margin: 10px 0;
        }
        .description {
          color: #6b7280;
          margin: 10px 0;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }
        @media print {
          .score-card {
            break-inside: avoid;
          }
          .violation-card {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">UXProbe</div>
        <h1>UX Heuristic Analysis Report</h1>
        <p style="color: #6b7280;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="project-info">
        <h3>Project Information</h3>
        <p><strong>Project Name:</strong> ${websiteName || projectName}</p>
        <p><strong>URL:</strong> ${url}</p>
        <p><strong>Analysis Date:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <div class="score-card">
        <div style="font-size: 18px; opacity: 0.9;">Overall UX Score</div>
        <div class="score">${overallScore}</div>
        <div style="font-size: 14px; opacity: 0.8;">out of 100</div>
      </div>

      <div class="violations-section">
        <h2>Usability Issues Found</h2>
        ${Object.entries(violationsByCategory)
          .map(([severity, items]: [string, any]) => `
            <div class="severity-group">
              <div class="severity-header" style="border-left-color: ${getSeverityColor(severity)}">
                <h3 style="margin: 0; color: ${getSeverityColor(severity)}; text-transform: uppercase;">
                  ${severity} Priority (${items.length})
                </h3>
              </div>
              ${items.map((v: any) => `
                <div class="violation-card">
                  <div class="violation-title">${v.title}</div>
                  <div class="heuristic-badge">❌ Violates: ${v.heuristic}</div>
                  <div class="description">${v.description}</div>
                  ${v.location ? `<p><strong>Location:</strong> ${v.location}</p>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
      </div>

      <div class="footer">
        <p>This report was generated by UXProbe - AI-Powered UX Analysis</p>
        <p>Based on Nielsen's 10 Usability Heuristics</p>
      </div>
    </body>
    </html>
  `;
}
