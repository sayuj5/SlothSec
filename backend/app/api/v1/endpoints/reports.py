from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.services.reporting.json_generator import JSONReportGenerator
from backend.app.services.reporting.pdf_generator import PDFReportGenerator

router = APIRouter()

@router.get("/{scan_id}/json")
def get_json_report(scan_id: str, db: Session = Depends(get_db)):
    try:
        report = JSONReportGenerator.generate_report(db, scan_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{scan_id}/pdf")
def get_pdf_report(scan_id: str, db: Session = Depends(get_db)):
    try:
        pdf_buffer = PDFReportGenerator.generate_pdf(db, scan_id)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=slothsec_scan_{scan_id[:8]}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")
