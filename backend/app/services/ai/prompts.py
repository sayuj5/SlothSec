import json
from typing import Dict, Any

SECURITY_ANALYST_SYSTEM_PROMPT = """You are SlothSec's Application Security Engineer. Provide precise, evidence-grounded security analysis in valid JSON format. Do not guess or hallucinate. Provide practical remediation diffs whenever possible. Output only the requested JSON object."""

def build_finding_analysis_prompt(finding_dict: Dict[str, Any], custom_instructions: str = "") -> str:
    prompt = f"""/nothink
Analyze this scanner finding and output valid JSON:

Finding: {finding_dict.get('title')}
Scanner: {finding_dict.get('scanner')}
Rule: {finding_dict.get('rule_id')}
Severity: {finding_dict.get('severity')}
File: {finding_dict.get('file_path')} (lines {finding_dict.get('start_line')}-{finding_dict.get('end_line')})
Package: {finding_dict.get('package_name')} {finding_dict.get('package_version')} (Fixed: {finding_dict.get('fixed_version') or 'N/A'})
Snippet: {finding_dict.get('snippet')}
Description: {finding_dict.get('description')}
{f"Instructions: {custom_instructions}" if custom_instructions else ""}

Respond ONLY with this JSON schema:
{{
  "executive_summary": "1-2 sentence summary of the vulnerability",
  "technical_explanation": "Technical mechanism and why this code is vulnerable",
  "root_cause": "Root cause of the weakness",
  "potential_impact": "Impact if exploited",
  "exploitability_context": "Attack vector or trigger conditions",
  "recommended_remediation": "Concrete remediation steps",
  "suggested_patch_diff": "Unified diff starting with --- a/ and +++ b/ or empty string",
  "priority_recommendation": "CRITICAL, HIGH, MEDIUM, or LOW",
  "confidence_score": 0.85,
  "limitations": "Assumptions or constraints"
}}
"""
    return prompt
