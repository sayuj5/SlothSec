import io
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.models.scan import ScanJob
from backend.app.models.finding import Finding
from backend.app.models.repository import Repository

class PDFReportGenerator:
    @staticmethod
    def generate_pdf(db: Session, scan_id: str) -> io.BytesIO:
        scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if not scan:
            raise ValueError(f"Scan {scan_id} not found.")

        repo = db.query(Repository).filter(Repository.id == scan.repository_id).first()
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A')
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#475569')
        )
        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        story = []

        # Document Header
        story.append(Paragraph("SlothSec — Security Scan Audit Report", title_style))
        repo_name = repo.name if repo else "Local Workspace"
        scan_date = scan.started_at.strftime("%Y-%m-%d %H:%M:%S UTC") if scan.started_at else "N/A"
        story.append(Paragraph(f"Repository: <b>{repo_name}</b> | Scan Date: {scan_date} | Scan ID: {scan.id[:8]}", subtitle_style))
        story.append(Spacer(1, 14))

        # Executive Metrics Summary Table
        crit_count = sum(1 for f in findings if f.severity == "CRITICAL")
        high_count = sum(1 for f in findings if f.severity == "HIGH")
        med_count = sum(1 for f in findings if f.severity == "MEDIUM")
        low_count = sum(1 for f in findings if f.severity == "LOW")

        summary_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Total Findings", str(len(findings)), "Scan Duration", f"{round(scan.duration_ms / 1000, 2)}s"],
            ["Critical Severity", str(crit_count), "High Severity", str(high_count)],
            ["Medium Severity", str(med_count), "Low / Info Severity", str(low_count)],
        ]
        summary_table = Table(summary_data, colWidths=[120, 130, 120, 130])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0E141B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#FFFFFF')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 14))

        # Scanner Executions Section
        story.append(Paragraph("Scanner Engine Breakdown", h2_style))
        scanner_data = [["Scanner Tool", "Status", "Exit Code", "Findings", "Duration"]]
        for se in scan.scanner_executions:
            scanner_data.append([
                se.scanner_name.upper(),
                se.status.capitalize(),
                str(se.exit_code),
                str(se.findings_count),
                f"{round(se.duration_ms, 1)} ms"
            ])
        if len(scanner_data) > 1:
            sc_table = Table(scanner_data, colWidths=[110, 90, 80, 90, 130])
            sc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(sc_table)
            story.append(Spacer(1, 14))

        # Findings Detail Table
        story.append(Paragraph(f"Vulnerability Findings Detail ({len(findings)})", h2_style))
        if not findings:
            story.append(Paragraph("No security findings were detected in this scan.", body_style))
        else:
            findings_table_data = [["Severity", "Scanner", "Rule / Title", "File Location"]]
            for f in findings[:40]: # Show up to 40 in standard executive report
                findings_table_data.append([
                    f.severity,
                    f.scanner.upper(),
                    Paragraph(f"<b>{f.rule_id}</b><br/>{f.title[:50]}", body_style),
                    Paragraph(f"{f.file_path}:{f.start_line}", body_style)
                ])

            f_table = Table(findings_table_data, colWidths=[65, 75, 210, 150])
            f_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(f_table)

        doc.build(story)
        buffer.seek(0)
        return buffer
