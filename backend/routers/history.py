import json
import base64
import os
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db, Prediction
from routers.auth import get_current_user
from database import User
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preds = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": p.id,
            "patient_name": p.patient_name,
            "filename": p.filename,
            "stage": p.stage,
            "stage_index": p.stage_index,
            "confidence": p.confidence,
            "all_confidences": json.loads(p.all_confidences),
            "created_at": p.created_at.isoformat(),
        }
        for p in preds
    ]


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preds = db.query(Prediction).filter(Prediction.user_id == current_user.id).all()
    total = len(preds)
    stage_counts = {}
    for p in preds:
        stage_counts[p.stage] = stage_counts.get(p.stage, 0) + 1
    stages_order = ["No DR", "Mild DR", "Moderate DR", "Severe DR", "Proliferative DR"]
    return {
        "total": total,
        "stage_distribution": {s: stage_counts.get(s, 0) for s in stages_order},
    }


@router.get("/report/{pred_id}")
def download_report(
    pred_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pred = db.query(Prediction).filter(
        Prediction.id == pred_id, Prediction.user_id == current_user.id
    ).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    pdf_buf = _generate_pdf(pred)
    headers = {"Content-Disposition": f'attachment; filename="DR_Report_{pred.patient_name}_{pred.id}.pdf"'}
    return StreamingResponse(pdf_buf, media_type="application/pdf", headers=headers)


def _generate_pdf(pred: Prediction) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=15 * mm, leftMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm
    )
    styles = getSampleStyleSheet()
    story = []

    # ---- Header ----
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18,
                                  textColor=colors.HexColor("#7c3aed"), alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontName="Helvetica", fontSize=10,
                                textColor=colors.grey, alignment=TA_CENTER)
    label_style = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=11,
                                  textColor=colors.HexColor("#1e293b"))
    value_style = ParagraphStyle("value", fontName="Helvetica", fontSize=11,
                                  textColor=colors.HexColor("#334155"))
    note_style = ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=9,
                                 textColor=colors.grey, alignment=TA_CENTER)

    story.append(Paragraph("AI-Powered Diabetic Retinopathy Detection", title_style))
    story.append(Paragraph("Rajalakshmi Institute of Technology — Clinical Report", sub_style))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c3aed")))
    story.append(Spacer(1, 5 * mm))

    # ---- Patient Info ----
    info_data = [
        ["Patient Name:", pred.patient_name, "Report ID:", f"AIDR-{pred.id:05d}"],
        ["Image File:", pred.filename, "Date:", datetime.fromisoformat(pred.created_at.isoformat()).strftime("%d %b %Y, %I:%M %p")],
    ]
    info_table = Table(info_data, colWidths=[35 * mm, 65 * mm, 30 * mm, 50 * mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 5 * mm))

    # ---- Prediction Result ----
    stage_colors_map = {
        "No DR": "#22c55e", "Mild DR": "#84cc16",
        "Moderate DR": "#f59e0b", "Severe DR": "#f97316", "Proliferative DR": "#ef4444"
    }
    stage_color = stage_colors_map.get(pred.stage, "#7c3aed")
    result_style = ParagraphStyle("result", fontName="Helvetica-Bold", fontSize=20,
                                   textColor=colors.HexColor(stage_color), alignment=TA_CENTER)
    story.append(Paragraph("DIAGNOSIS RESULT", ParagraphStyle("dh", fontName="Helvetica-Bold",
                                                                fontSize=12, textColor=colors.HexColor("#475569"), alignment=TA_CENTER)))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(pred.stage.upper(), result_style))
    story.append(Paragraph(f"Confidence Score: {pred.confidence:.1f}%", sub_style))
    story.append(Spacer(1, 4 * mm))

    # All confidences table
    all_conf = json.loads(pred.all_confidences)
    conf_data = [["Stage", "Confidence (%)"]] + [[k, f"{v:.2f}%"] for k, v in all_conf.items()]
    conf_table = Table(conf_data, colWidths=[90 * mm, 90 * mm])
    conf_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7c3aed")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f3ff")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ddd6fe")),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(conf_table)
    story.append(Spacer(1, 5 * mm))

    # ---- Images ----
    images_to_embed = []
    if pred.original_path and os.path.exists(pred.original_path):
        images_to_embed.append(("Original Retinal Image", pred.original_path))
    if pred.gradcam_path and os.path.exists(pred.gradcam_path):
        images_to_embed.append(("Grad-CAM Heatmap Overlay", pred.gradcam_path))

    if images_to_embed:
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 4 * mm))
        story.append(Paragraph("RETINAL IMAGE ANALYSIS", ParagraphStyle("ih", fontName="Helvetica-Bold",
                                                                          fontSize=12, textColor=colors.HexColor("#475569"), alignment=TA_CENTER)))
        story.append(Spacer(1, 4 * mm))
        img_row = []
        for label, path in images_to_embed:
            rl_img = RLImage(path, width=80 * mm, height=80 * mm)
            caption = Paragraph(label, note_style)
            img_row.append([rl_img, caption])

        if len(img_row) == 2:
            img_table_data = [[img_row[0][0], img_row[1][0]], [img_row[0][1], img_row[1][1]]]
            img_table = Table(img_table_data, colWidths=[90 * mm, 90 * mm])
            img_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                            ("PADDING", (0, 0), (-1, -1), 4)]))
            story.append(img_table)
        else:
            story.append(img_row[0][0])
            story.append(img_row[0][1])

    # ---- Disclaimer ----
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "⚠ DISCLAIMER: This report is generated by an AI system for screening purposes only. "
        "It is not a substitute for professional medical advice, diagnosis, or treatment. "
        "Please consult a qualified ophthalmologist for clinical evaluation.",
        note_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf
