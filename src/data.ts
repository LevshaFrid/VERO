export const dashboardData = {
  metrics: {
    arr: {
      value: "$12.4M",
      label: "Annual Recurring Revenue",
      trend: "+15% YoY",
      isPositive: true,
    },
    mrr: {
      value: "$1.03M",
      label: "Monthly Recurring Revenue",
      trend: "+1.2% MoM",
      isPositive: true,
    },
    q1Performance: {
      value: "$2.80M",
      label: "Q1 2026 Performance",
      trend: "-12% vs Forecast",
      isPositive: false,
    },
    nrr: {
      value: "108%",
      label: "Net Retention Rate",
      trend: "-2% YoY",
      isPositive: false,
    },
  },
  quarterlyData: [
    {
      quarter: "Q1 2026",
      actual: 2.8,
      forecast: 3.18,
      difference: -0.38,
      differencePercent: -12,
    },
    {
      quarter: "Q2 2026",
      actual: null,
      forecast: 3.5,
      difference: null,
      differencePercent: null,
    },
    {
      quarter: "Q3 2026",
      actual: null,
      forecast: 3.8,
      difference: null,
      differencePercent: null,
    },
    {
      quarter: "Q4 2026",
      actual: null,
      forecast: 4.2,
      difference: null,
      differencePercent: null,
    },
  ],
  contextForAI: `
    Current Date: March 2026.
    Company: Medium B2B SaaS.
    ARR: $12.4M (+15% YoY).
    MRR: $1.03M (+1.2% MoM).
    Q1 2026 Performance: $2.80M (12% less than the forecasted $3.18M).
    NRR: 108% (down 2% YoY).
    
    Quarterly Forecasts for 2026:
    - Q1: Forecast $3.18M, Actual $2.80M (Missed by $0.38M / 12%)
    - Q2: Forecast $3.50M
    - Q3: Forecast $3.80M
    - Q4: Forecast $4.20M
    
    The analyst needs help understanding why Q1 missed the forecast by 12% and what it means for the rest of the year. 
    
    Detailed Q1 Drop Data (Demo Data):
    - Mid-Market Segment: Churn increased by 4% in Feb/March. 12 accounts cancelled, representing $120k in lost ARR. Primary reason cited: "Budget cuts".
    - Enterprise Segment: 3 major deals (totaling $210k ARR) expected to close in March were delayed to Q2.
    - Expansion Revenue: Upsells from existing customers were 15% lower than historical Q1 averages, contributing to a $50k shortfall.
    - Regional Impact: EMEA region saw the largest drop, missing targets by 18%, while NA was only down 5%.
    
    Possible reasons for the miss (for the AI to suggest if asked):
    - Higher than expected churn in the mid-market segment.
    - Delayed enterprise deals pushing from Q1 to Q2.
    - Lower expansion revenue than historical averages.
  `
};
