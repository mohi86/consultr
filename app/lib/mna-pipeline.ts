import {
  type FinancialContext,
  type MnADataCategory,
  flattenFinancialContext,
} from "./valyu-search";

// ---------------------------------------------------------------------------
// 1. Build the enriched DeepResearch query for Phase 2 DD analysis
// ---------------------------------------------------------------------------

/**
 * Compose a comprehensive M&A due-diligence query that embeds Phase 1
 * financial data as context and requests a structured 10-section DD report.
 */
export function buildMnAQuery(
  targetCompany: string,
  financialContext: FinancialContext,
  dealContext?: string,
  researchFocus?: string,
  specificQuestions?: string
): string {
  // Flatten all successful Phase 1 results into a single text block
  const flatData = flattenFinancialContext(financialContext);

  // Build a summary of which categories succeeded vs failed
  const categoryStatus = financialContext.results
    .map((r) => {
      const status = r.success ? "SUCCEEDED" : `FAILED (${r.error ?? "unknown"})`;
      return `  - ${r.label}: ${status}`;
    })
    .join("\n");

  // --- Assemble the prompt ------------------------------------------------

  const sections: string[] = [];

  // Header & context
  sections.push(
    `You are an elite M&A due-diligence analyst preparing a comprehensive ` +
    `investment report on **${targetCompany}**.`
  );

  sections.push(
    `## Phase 1 Financial Data Context\n\n` +
    `The following financial data was gathered in Phase 1 ` +
    `(${financialContext.categoriesSucceeded}/${financialContext.categoriesSearched} ` +
    `categories succeeded):\n\n` +
    `**Category Status:**\n${categoryStatus}\n\n` +
    `**Financial Data:**\n${flatData}`
  );

  // DD report structure
  sections.push(
    `## Required Due-Diligence Report Structure\n\n` +
    `Produce a professional-grade due-diligence report with the following ` +
    `10 sections:\n\n` +
    `1. **Executive Summary & Investment Thesis** — Include a deal ` +
    `attractiveness score (1-10 scale with justification).\n` +
    `2. **Company Overview** — Business model, history, leadership, ` +
    `corporate structure.\n` +
    `3. **Financial Analysis** — Present key metrics in tables (revenue, ` +
    `EBITDA, margins, growth rates, leverage ratios). Highlight trends ` +
    `and anomalies.\n` +
    `4. **SEC Filing Key Findings** — Risk factors, MD&A insights, ` +
    `material 8-K events, auditor opinions.\n` +
    `5. **IP & Patent Portfolio Assessment** — Patent count, key ` +
    `technology areas, competitive moat from IP.\n` +
    `6. **Insider Activity & Market Sentiment** — Recent insider ` +
    `transactions, institutional ownership changes, analyst consensus.\n` +
    `7. **Competitive Positioning** — Market share, key competitors, ` +
    `differentiation, SWOT summary.\n` +
    `8. **Risk Matrix** — Structured table with severity ratings ` +
    `(High/Medium/Low), likelihood, and mitigation strategies for each ` +
    `identified risk.\n` +
    `9. **Valuation Context** — Relevant multiples (EV/EBITDA, P/E, ` +
    `EV/Revenue), peer comparison table, implied valuation range.\n` +
    `10. **Go/No-Go Recommendation Framework** — Weighted scoring of ` +
    `key factors with a clear recommendation and conditions/next steps.`
  );

  // Optional sections
  if (dealContext) {
    sections.push(
      `## Deal Context\n\n${dealContext}`
    );
  }

  if (researchFocus) {
    sections.push(
      `## Research Focus Areas\n\n${researchFocus}`
    );
  }

  if (specificQuestions) {
    sections.push(
      `## Specific Questions to Address\n\n${specificQuestions}`
    );
  }

  // Formatting requirements
  sections.push(
    `## Formatting Requirements\n\n` +
    `- Use **markdown tables** for all quantitative data (financials, ` +
    `comparisons, risk matrices, valuation multiples).\n` +
    `- Cite all data sources inline (e.g., "per 10-K FY2024", "SEC ` +
    `Filing dated …").\n` +
    `- Maintain **professional, investment-committee quality** throughout.\n` +
    `- Where Phase 1 data is unavailable (failed categories), clearly ` +
    `note the gap and provide analysis using available web/academic ` +
    `sources instead.\n` +
    `- Prioritize accuracy over speculation; flag low-confidence ` +
    `conclusions explicitly.`
  );

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// 2. Build the deliverables list for the M&A DD report
// ---------------------------------------------------------------------------

export interface MnADeliverable {
  type: "xlsx" | "docx" | "pptx";
  title: string;
  description: string;
}

/**
 * Return the standard set of three M&A deliverables to request from
 * DeepResearch.
 */
export function buildMnADeliverables(targetCompany: string): MnADeliverable[] {
  return [
    {
      type: "xlsx",
      title: `Financial Analysis Matrix — ${targetCompany}`,
      description:
        `Comprehensive spreadsheet containing financial statements, ` +
        `ratio analysis, peer comparisons, and valuation model inputs ` +
        `for ${targetCompany}.`,
    },
    {
      type: "docx",
      title: `Investment Committee Deal Memo — ${targetCompany}`,
      description:
        `Formal deal memo summarizing the due-diligence findings, risk ` +
        `assessment, and go/no-go recommendation for the ${targetCompany} ` +
        `acquisition opportunity.`,
    },
    {
      type: "pptx",
      title: `Executive Due Diligence Presentation — ${targetCompany}`,
      description:
        `Board-ready presentation covering the investment thesis, ` +
        `financial highlights, competitive positioning, and key risks ` +
        `for ${targetCompany}.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. Build search configuration for DeepResearch based on selected categories
// ---------------------------------------------------------------------------

export interface MnASearchConfig {
  searchType: "all";
  includedSources: string[];
}

/**
 * Derive the DeepResearch search configuration from the selected M&A data
 * categories. Always includes "web" and "academic"; conditionally adds
 * "finance" and "patent" based on the categories chosen.
 */
export function buildMnASearchConfig(
  categories: MnADataCategory[]
): MnASearchConfig {
  const sources = new Set<string>(["web", "academic"]);

  const financeCategories: MnADataCategory[] = [
    "sec_filings",
    "financial_statements",
    "insider_activity",
  ];

  for (const cat of categories) {
    if (financeCategories.includes(cat)) {
      sources.add("finance");
    }
    if (cat === "patents") {
      sources.add("patent");
    }
  }

  return {
    searchType: "all",
    includedSources: Array.from(sources),
  };
}
