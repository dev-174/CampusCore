"""
PDF report builders for CampusCore.

Two entry points:
  - build_student_report_pdf(...)  -> single student's combined report card
                                       (marks + attendance + ML risk status)
  - build_class_report_pdf(...)    -> one row per student in a batch, for
                                       teachers/admins to export in bulk

Both return a BytesIO buffer of the finished PDF, ready to be streamed back
in an HttpResponse with content_type='application/pdf'.
"""
from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
)

# ── Palette (kept close to the app's own accent/badge colors) ───────────────
ACCENT      = colors.HexColor('#2952e3')
ACCENT_SOFT = colors.HexColor('#eef1fd')
DARK        = colors.HexColor('#111827')
GRAY        = colors.HexColor('#6b7280')
LINE        = colors.HexColor('#e5e7eb')
GREEN       = colors.HexColor('#15803d')
GREEN_SOFT  = colors.HexColor('#dcfce7')
YELLOW      = colors.HexColor('#a16207')
YELLOW_SOFT = colors.HexColor('#fef9c3')
RED         = colors.HexColor('#b91c1c')
RED_SOFT    = colors.HexColor('#fee2e2')
GRAY_SOFT   = colors.HexColor('#f3f4f6')

_styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    'ReportTitle', parent=_styles['Heading1'],
    fontSize=18, textColor=ACCENT, spaceAfter=2, leading=22,
)
SUBTITLE_STYLE = ParagraphStyle(
    'ReportSubtitle', parent=_styles['Normal'],
    fontSize=10, textColor=GRAY, spaceAfter=0,
)
SECTION_STYLE = ParagraphStyle(
    'SectionHeading', parent=_styles['Heading2'],
    fontSize=12.5, textColor=DARK, spaceBefore=14, spaceAfter=6,
)
CELL_STYLE = ParagraphStyle('Cell', parent=_styles['Normal'], fontSize=9, leading=12)
CELL_STYLE_BOLD = ParagraphStyle('CellBold', parent=CELL_STYLE, fontName='Helvetica-Bold')
CENTER_STYLE = ParagraphStyle('Center', parent=_styles['Normal'], fontSize=9, alignment=TA_CENTER)

HEADER_BG = colors.HexColor('#1e293b')
HEADER_CELL_STYLE = ParagraphStyle('HeaderCell', parent=CELL_STYLE_BOLD, textColor=colors.white)
HEADER_CENTER_STYLE = ParagraphStyle('HeaderCenter', parent=CENTER_STYLE, fontName='Helvetica-Bold', textColor=colors.white)


def _pct_colors(pct):
    """Green/yellow/red thresholds matching the frontend's own badge logic."""
    if pct is None:
        return GRAY_SOFT, GRAY
    if pct >= 75:
        return GREEN_SOFT, GREEN
    if pct >= 50:
        return YELLOW_SOFT, YELLOW
    return RED_SOFT, RED


def _risk_colors(level):
    return {
        'high':   (RED_SOFT, RED),
        'medium': (YELLOW_SOFT, YELLOW),
        'low':    (GREEN_SOFT, GREEN),
    }.get(level, (GRAY_SOFT, GRAY))


def _badge_paragraph(text, bg, fg):
    style = ParagraphStyle(
        'Badge', parent=CENTER_STYLE, textColor=fg, backColor=bg,
        borderPadding=(3, 6, 3, 6), fontName='Helvetica-Bold',
    )
    return Paragraph(text, style)


def _footer(canvas, doc, generated_at, footer_note):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(18 * mm, 12 * mm, footer_note)
    canvas.drawRightString(
        A4[0] - 18 * mm, 12 * mm,
        f"Generated {generated_at.strftime('%d %b %Y, %I:%M %p')} · Page {doc.page}",
    )
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 16 * mm, A4[0] - 18 * mm, 16 * mm)
    canvas.restoreState()


def _header_block(university_name, title, subtitle):
    elements = [
        Paragraph(university_name, TITLE_STYLE),
        Paragraph(subtitle, SUBTITLE_STYLE),
        Spacer(1, 10),
        Paragraph(title, ParagraphStyle(
            'DocTitle', parent=_styles['Heading2'], fontSize=14, textColor=DARK, spaceAfter=6,
        )),
    ]
    return elements


def _info_table(pairs):
    """Two-column label/value grid, e.g. Roll No / Department / Batch."""
    rows = []
    for i in range(0, len(pairs), 2):
        left = pairs[i]
        right = pairs[i + 1] if i + 1 < len(pairs) else ('', '')
        rows.append([
            Paragraph(f"<b>{left[0]}</b>", CELL_STYLE), Paragraph(str(left[1]), CELL_STYLE),
            Paragraph(f"<b>{right[0]}</b>", CELL_STYLE), Paragraph(str(right[1]), CELL_STYLE),
        ])
    t = Table(rows, colWidths=[32 * mm, 55 * mm, 32 * mm, 55 * mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 0), (-1, -1), ACCENT_SOFT),
        ('BOX', (0, 0), (-1, -1), 0.5, LINE),
        ('LEFTPADDING', (0, 0), (0, -1), 8),
    ]))
    return t


def _stat_cards(cards):
    """cards: list of (label, value_text, (bg, fg)) shown as a row of boxes."""
    cell_style_val = lambda fg: ParagraphStyle(
        'StatVal', parent=_styles['Normal'], fontSize=16, fontName='Helvetica-Bold',
        alignment=TA_CENTER, textColor=fg,
    )
    cell_style_label = ParagraphStyle(
        'StatLabel', parent=_styles['Normal'], fontSize=8.5, alignment=TA_CENTER, textColor=GRAY,
    )
    row = []
    for label, value, (bg, fg) in cards:
        inner = Table(
            [[Paragraph(value, cell_style_val(fg))], [Paragraph(label, cell_style_label)]],
            colWidths=[(174 / len(cards)) * mm],
        )
        inner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('BOX', (0, 0), (-1, -1), 0.5, LINE),
            ('TOPPADDING', (0, 0), (0, 0), 10),
            ('BOTTOMPADDING', (0, 1), (0, 1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        row.append(inner)
    wrapper = Table([row], colWidths=[(174 / len(cards)) * mm] * len(cards))
    wrapper.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    return wrapper


# ─────────────────────────────────────────────────────────────────────────
# Individual student report card
# ─────────────────────────────────────────────────────────────────────────
def build_student_report_pdf(*, university_name, student_name, roll_no,
                              enrollment_number, department_name, batch_name,
                              marks_rows, attendance_rows, overall_marks_pct,
                              overall_attendance_pct, risk_info=None):
    """
    marks_rows:       [{'subject', 'exam', 'score', 'max_score', 'pct'}, ...]
    attendance_rows:  [{'subject', 'present', 'total', 'pct'}, ...]
    risk_info:        {'level': 'high'|'medium'|'low', 'risk_%': float} or None
    """
    buffer = BytesIO()
    generated_at = datetime.now()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=16 * mm, bottomMargin=22 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
        title=f"Report Card - {student_name}",
    )

    elements = _header_block(university_name, "Student Report Card", "Official Academic Performance Report")
    elements.append(_info_table([
        ('Student Name', student_name),
        ('Roll No', roll_no or '—'),
        ('Enrollment No', enrollment_number or '—'),
        ('Department', department_name or '—'),
        ('Batch', batch_name or '—'),
        ('Report Date', generated_at.strftime('%d %b %Y')),
    ]))
    elements.append(Spacer(1, 14))

    # Stat cards: overall marks %, overall attendance %, risk (if available)
    cards = [
        ('Overall Marks', f"{overall_marks_pct:.1f}%" if overall_marks_pct is not None else '—',
         _pct_colors(overall_marks_pct)),
        ('Overall Attendance', f"{overall_attendance_pct:.1f}%" if overall_attendance_pct is not None else '—',
         _pct_colors(overall_attendance_pct)),
    ]
    if risk_info:
        level = risk_info.get('level', 'low')
        cards.append((
            'ML Risk Status',
            level.upper() if level else '—',
            _risk_colors(level),
        ))
    elements.append(_stat_cards(cards))

    # Marks table
    elements.append(Paragraph('Marks', SECTION_STYLE))
    if marks_rows:
        header = [Paragraph('Subject', HEADER_CELL_STYLE), Paragraph('Exam', HEADER_CELL_STYLE),
                  Paragraph('Score', HEADER_CENTER_STYLE), Paragraph('Max', HEADER_CENTER_STYLE),
                  Paragraph('%', HEADER_CENTER_STYLE)]
        data = [header]
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, LINE),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]
        for i, m in enumerate(marks_rows, start=1):
            bg, fg = _pct_colors(m['pct'])
            data.append([
                Paragraph(m['subject'], CELL_STYLE), Paragraph(m['exam'], CELL_STYLE),
                Paragraph(str(m['score']), CENTER_STYLE), Paragraph(str(m['max_score']), CENTER_STYLE),
                _badge_paragraph(f"{m['pct']:.1f}%", bg, fg),
            ])
            if i % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_SOFT))
        t = Table(data, colWidths=[52 * mm, 52 * mm, 20 * mm, 20 * mm, 30 * mm], repeatRows=1)
        t.setStyle(TableStyle(style_cmds))
        elements.append(t)
    else:
        elements.append(Paragraph('No marks recorded yet.', CELL_STYLE))

    # Attendance table
    elements.append(Paragraph('Attendance', SECTION_STYLE))
    if attendance_rows:
        header = [Paragraph('Subject', HEADER_CELL_STYLE), Paragraph('Present', HEADER_CENTER_STYLE),
                  Paragraph('Total', HEADER_CENTER_STYLE), Paragraph('%', HEADER_CENTER_STYLE)]
        data = [header]
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, LINE),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]
        for i, a in enumerate(attendance_rows, start=1):
            bg, fg = _pct_colors(a['pct'])
            data.append([
                Paragraph(a['subject'], CELL_STYLE), Paragraph(str(a['present']), CENTER_STYLE),
                Paragraph(str(a['total']), CENTER_STYLE), _badge_paragraph(f"{a['pct']:.1f}%", bg, fg),
            ])
            if i % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_SOFT))
        t = Table(data, colWidths=[74 * mm, 33 * mm, 33 * mm, 34 * mm], repeatRows=1)
        t.setStyle(TableStyle(style_cmds))
        elements.append(t)
    else:
        elements.append(Paragraph('No attendance recorded yet.', CELL_STYLE))

    footer_note = f"{university_name} · CampusCore Report"
    doc.build(
        elements,
        onFirstPage=lambda c, d: _footer(c, d, generated_at, footer_note),
        onLaterPages=lambda c, d: _footer(c, d, generated_at, footer_note),
    )
    buffer.seek(0)
    return buffer


# ─────────────────────────────────────────────────────────────────────────
# Class / batch summary report
# ─────────────────────────────────────────────────────────────────────────
def build_class_report_pdf(*, university_name, batch_name, department_name, rows):
    """
    rows: [{'roll_no', 'enrollment_number', 'name', 'avg_marks_pct',
            'attendance_pct', 'risk_level'}, ...]
    """
    buffer = BytesIO()
    generated_at = datetime.now()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=16 * mm, bottomMargin=22 * mm,
        leftMargin=14 * mm, rightMargin=14 * mm,
        title=f"Class Report - {batch_name}",
    )

    elements = _header_block(
        university_name, f"Class Report — {batch_name}",
        f"Department: {department_name or '—'} · {len(rows)} student(s)",
    )
    elements.append(Spacer(1, 6))

    header = [Paragraph(h, HEADER_CENTER_STYLE if h != 'Name' else HEADER_CELL_STYLE)
              for h in ['#', 'Roll No', 'Enrollment No', 'Name', 'Avg Marks %', 'Attendance %', 'Risk']]
    data = [header]
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for i, r in enumerate(rows, start=1):
        marks_bg, marks_fg = _pct_colors(r.get('avg_marks_pct'))
        att_bg, att_fg = _pct_colors(r.get('attendance_pct'))
        risk_level = r.get('risk_level')
        risk_bg, risk_fg = _risk_colors(risk_level)
        data.append([
            Paragraph(str(i), CENTER_STYLE),
            Paragraph(r.get('roll_no') or '—', CENTER_STYLE),
            Paragraph(r.get('enrollment_number') or '—', CENTER_STYLE),
            Paragraph(r.get('name') or '—', CELL_STYLE),
            _badge_paragraph(
                f"{r['avg_marks_pct']:.1f}%" if r.get('avg_marks_pct') is not None else '—',
                marks_bg, marks_fg),
            _badge_paragraph(
                f"{r['attendance_pct']:.1f}%" if r.get('attendance_pct') is not None else '—',
                att_bg, att_fg),
            _badge_paragraph((risk_level or '—').upper(), risk_bg, risk_fg),
        ])
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_SOFT))

    t = Table(
        data,
        colWidths=[10 * mm, 24 * mm, 30 * mm, 48 * mm, 26 * mm, 26 * mm, 18 * mm],
        repeatRows=1,
    )
    t.setStyle(TableStyle(style_cmds))
    elements.append(t)

    footer_note = f"{university_name} · CampusCore Class Report"
    doc.build(
        elements,
        onFirstPage=lambda c, d: _footer(c, d, generated_at, footer_note),
        onLaterPages=lambda c, d: _footer(c, d, generated_at, footer_note),
    )
    buffer.seek(0)
    return buffer
