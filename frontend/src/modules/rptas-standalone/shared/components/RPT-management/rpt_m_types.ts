export interface AssessmentRow {
  id: string;
  kind: string;
  class: string;
  actualUse: string;
  subClass: string;
  area: string;
  unitValue: string;
  baseMarketValue: string;
  adjustedMarketValue: string;
  assessmentLevel: string;
  assessedValue: string;
  taxability: string;
}

export interface AssessmentSummary {
  totalArea: number;
  totalAdjustedMarketValue: number;
  totalAssessedValue: number;
}
