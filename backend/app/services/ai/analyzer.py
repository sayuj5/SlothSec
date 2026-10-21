import re
import json
import time
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from opentelemetry.trace import Status, StatusCode
from backend.app.core.config import settings
from backend.app.core.telemetry import tracer, span_store
from backend.app.core.logging import logger
from backend.app.models.finding import Finding
from backend.app.models.analysis import AIAnalysis
from backend.app.schemas.analysis import AIAnalysisStructuredOutput
from backend.app.services.ai.ollama import ollama_client
from backend.app.services.ai.prompts import SECURITY_ANALYST_SYSTEM_PROMPT, build_finding_analysis_prompt

def extract_json_from_llm(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Extracts and parses JSON object from an LLM response string.
    Handles markdown code blocks and pre/post conversational text.
    """
    clean_text = raw_text.strip()
    
    # Strip markdown code blocks if wrapped
    md_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', clean_text, re.IGNORECASE)
    if md_match:
        clean_text = md_match.group(1).strip()
    
    # Direct attempt
    try:
        return json.loads(clean_text)
    except Exception:
        pass

    # Find first { and last }
    first_brace = clean_text.find('{')
    last_brace = clean_text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        sub = clean_text[first_brace:last_brace + 1]
        try:
            return json.loads(sub)
        except Exception:
            pass

    return None

class AIAnalyzerService:
    @staticmethod
    def analyze_finding(db: Session, finding_id: str, custom_instructions: str = "") -> AIAnalysis:
        finding = db.query(Finding).filter(Finding.id == finding_id).first()
        if not finding:
            raise ValueError(f"Finding with ID {finding_id} not found.")

        # Check Ollama status first
        avail, models, err = ollama_client.check_status()
        if not avail:
            raise RuntimeError(f"Local AI inference unavailable: {err}. Please ensure Ollama is running.")

        start_time = time.time()
        with tracer.start_as_current_span("ai.analysis") as span:
            span.set_attribute("finding.id", finding_id)
            span.set_attribute("finding.rule_id", finding.rule_id)
            span.set_attribute("ai.model", settings.OLLAMA_MODEL)

            finding_dict = {
                "scanner": finding.scanner,
                "rule_id": finding.rule_id,
                "title": finding.title,
                "severity": finding.severity,
                "file_path": finding.file_path,
                "start_line": finding.start_line,
                "end_line": finding.end_line,
                "vulnerability_ids": finding.vulnerability_ids,
                "package_name": finding.package_name,
                "package_version": finding.package_version,
                "fixed_version": finding.fixed_version,
                "description": finding.description,
                "snippet": finding.snippet,
            }

            prompt = build_finding_analysis_prompt(finding_dict, custom_instructions)

            gen_result = ollama_client.generate(
                prompt=prompt,
                system=SECURITY_ANALYST_SYSTEM_PROMPT,
                model=settings.OLLAMA_MODEL,
                timeout_seconds=settings.OLLAMA_TIMEOUT_SECONDS
            )

            duration_ms = (time.time() - start_time) * 1000

            if not gen_result["success"]:
                span_store.record_ai_inference(duration_ms=duration_ms, success=False)
                span.set_status(Status(StatusCode.ERROR, gen_result["error"] or "AI call failed"))
                raise RuntimeError(f"AI generation failed: {gen_result['error']}")

            raw_response = gen_result["response"]
            parsed_json = extract_json_from_llm(raw_response)

            # Validate against Pydantic schema or construct fallback
            if parsed_json:
                try:
                    structured = AIAnalysisStructuredOutput(**parsed_json)
                except Exception as e:
                    logger.warning(f"Structured output schema validation warning: {e}")
                    # Graceful fill
                    structured = AIAnalysisStructuredOutput(
                        executive_summary=parsed_json.get("executive_summary") or raw_response[:200],
                        technical_explanation=parsed_json.get("technical_explanation") or raw_response,
                        root_cause=parsed_json.get("root_cause") or "Identified by scanner rule " + finding.rule_id,
                        potential_impact=parsed_json.get("potential_impact") or "Potential security compromise",
                        exploitability_context=parsed_json.get("exploitability_context") or "See scanner evidence",
                        recommended_remediation=parsed_json.get("recommended_remediation") or "Remediate following vendor guidelines",
                        suggested_patch_diff=parsed_json.get("suggested_patch_diff") or "",
                        priority_recommendation=parsed_json.get("priority_recommendation") or finding.severity,
                        confidence_score=float(parsed_json.get("confidence_score", 0.85)),
                        limitations=parsed_json.get("limitations") or ""
                    )
            else:
                # Fallback if model returned unstructured plain text
                structured = AIAnalysisStructuredOutput(
                    executive_summary=raw_response[:200],
                    technical_explanation=raw_response,
                    root_cause=f"Weakness flagged by {finding.scanner} rule {finding.rule_id}",
                    potential_impact="Risk of vulnerability exploitation based on scanner findings.",
                    exploitability_context="Dependent on application data flow and exposure.",
                    recommended_remediation="Review the highlighted code snippet and update configuration or dependencies.",
                    suggested_patch_diff="",
                    priority_recommendation=finding.severity,
                    confidence_score=0.75,
                    limitations="Output parsed in unstructured fallback mode."
                )

            analysis = AIAnalysis(
                finding_id=finding.id,
                model_name=settings.OLLAMA_MODEL,
                executive_summary=structured.executive_summary,
                technical_explanation=structured.technical_explanation,
                root_cause=structured.root_cause,
                potential_impact=structured.potential_impact,
                exploitability_context=structured.exploitability_context,
                recommended_remediation=structured.recommended_remediation,
                suggested_patch_diff=structured.suggested_patch_diff or "",
                priority_recommendation=structured.priority_recommendation,
                confidence_score=structured.confidence_score,
                limitations=structured.limitations,
                raw_response=raw_response
            )

            db.add(analysis)
            db.commit()
            db.refresh(analysis)

            span_store.record_ai_inference(duration_ms=duration_ms, success=True)
            span.set_attribute("ai.confidence", structured.confidence_score)
            span.set_attribute("ai.priority", structured.priority_recommendation)

            return analysis
