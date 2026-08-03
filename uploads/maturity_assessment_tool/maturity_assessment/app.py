from flask import Flask, render_template, request, jsonify, send_file
from maturity_data import CATEGORIES, LEVEL_NAMES
from storage import AssessmentStorage
import json
from datetime import datetime
import io
import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfgen import canvas

app = Flask(__name__)

# Initialize storage
storage = AssessmentStorage()

# Load global weights from JSON file
def load_global_weights():
    weights_file = os.path.join(os.path.dirname(__file__), 'global_weights.json')
    if os.path.exists(weights_file):
        with open(weights_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'indicator_weights': {}, 'category_weights': {}}

GLOBAL_WEIGHTS = load_global_weights()


def load_translations(lang):
    """Load translations JSON from static/translations/{lang}.json"""
    translations_file = os.path.join(os.path.dirname(__file__), 'static', 'translations', f'{lang}.json')
    if os.path.exists(translations_file):
        try:
            with open(translations_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

@app.route('/')
def index():
    return render_template('index.html', categories=CATEGORIES, level_names=LEVEL_NAMES)

@app.route('/dashboard')
def dashboard():
    """Admin dashboard to view all assessment results"""
    return render_template('dashboard.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    selections = data.get('selections', {})
    language = data.get('language', 'en')
    
    # Always use global weights from JSON, ignore any user-provided weights
    merged_weights = GLOBAL_WEIGHTS.get('indicator_weights', {})
    
    # Calculate scores for each category
    category_scores = {}
    overall_weighted_score = 0
    total_weight = 0
    
    for cat_key, category in CATEGORIES.items():
        total_level = 0
        count = 0
        
        for indicator in category['indicators']:
            code = indicator['code']
            if code in selections:
                level = int(selections[code])
                weight = float(merged_weights.get(code, 1.0))
                total_level += level * weight
                count += weight
        
        if count > 0:
            category_scores[cat_key] = {
                'name': category['name'],
                'score': round(total_level / count, 2),
                'color': category['color']
            }
            
            # For overall score - use equal weight for all categories (1.0)
            overall_weighted_score += (total_level / count) * 1.0
            total_weight += 1.0
    
    overall_score = round(overall_weighted_score / total_weight, 2) if total_weight > 0 else 0
    
    # Determine maturity level
    if overall_score < 2:
        maturity_level = "Level 1: Initial"
        level_description = "Ad-hoc, unpredictable processes"
    elif overall_score < 3:
        maturity_level = "Level 2: Managed"
        level_description = "Repeatable processes with basic controls"
    elif overall_score < 4:
        maturity_level = "Level 3: Defined"
        level_description = "Standardized, documented processes"
    elif overall_score < 4.5:
        maturity_level = "Level 4: Quantitatively Managed"
        level_description = "Measured and controlled processes"
    else:
        maturity_level = "Level 5: Optimizing"
        level_description = "Continuous improvement and innovation"
    
    return jsonify({
        'category_scores': category_scores,
        'overall_score': overall_score,
        'maturity_level': maturity_level,
        'level_description': level_description
    })

@app.route('/save_assessment', methods=['POST'])
def save_assessment():
    """Save assessment result to backend"""
    data = request.json
    organization_name = data.get('organization_name', 'Unknown Organization')
    assessor_name = data.get('assessor_name', 'Anonymous')
    selections = data.get('selections', {})
    results = data.get('results', {})
    language = data.get('language', 'en')
    
    try:
        # Save to storage
        assessment = storage.save_assessment(organization_name, assessor_name, selections, results, language=language)
        
        return jsonify({
            'success': True,
            'message': 'Assessment saved successfully',
            'assessment_id': assessment['id']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error saving assessment: {str(e)}'
        }), 500

@app.route('/assessments', methods=['GET'])
def get_assessments():
    """Get all assessments (admin endpoint)"""
    try:
        assessments = storage.get_all_assessments()
        return jsonify({
            'success': True,
            'count': len(assessments),
            'assessments': assessments
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving assessments: {str(e)}'
        }), 500

@app.route('/assessments/<organization>', methods=['GET'])
def get_organization_assessments(organization):
    """Get assessments for a specific organization"""
    try:
        assessments = storage.get_assessments_by_organization(organization)
        return jsonify({
            'success': True,
            'organization': organization,
            'count': len(assessments),
            'assessments': assessments
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving assessments: {str(e)}'
        }), 500

@app.route('/export_pdf', methods=['POST'])
def export_pdf():
    data = request.json
    selections = data.get('selections', {})
    results = data.get('results', {})
    organization_name = data.get('organization_name', 'Organization')
    language = data.get('language', 'en')
    translations = load_translations(language) if language and language != 'en' else {}
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#7030A0'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#4472C4'),
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    # Title (translated when available)
    title_text = translations.get('title', "Digital Technology Adoption Maturity Assessment")
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Organization and Date
    elements.append(Paragraph(f"<b>Organization:</b> {organization_name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Assessment Date:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    # Overall Results
    overall_heading = translations.get('results_heading', 'Overall Assessment Results')
    elements.append(Paragraph(overall_heading, heading_style))
    overall_data = [
        [translations.get('metric_label', 'Metric'), translations.get('value_label', 'Value')],
        [translations.get('overall_maturity_title', 'Overall Maturity Score'), f"{results.get('overall_score', 0):.2f}"],
        [translations.get('maturity_level_label', 'Maturity Level'), results.get('maturity_level', 'N/A')],
        [translations.get('description_label', 'Description'), results.get('level_description', 'N/A')]
    ]
    
    overall_table = Table(overall_data, colWidths=[2.5*inch, 4*inch])
    overall_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7030A0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(overall_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Category Scores
    elements.append(Paragraph(translations.get('chart_category_scores', 'Category Scores'), heading_style))
    category_data = [['Category', 'Score', 'Level']]
    
    for cat_key, cat_score in results.get('category_scores', {}).items():
        score = cat_score['score']
        level = int(round(score))
        cat_name = translations.get(f'category_NAME_{cat_key}', cat_score.get('name', cat_key))
        category_data.append([
            cat_name,
            f"{score:.2f}",
            f"{translations.get('level_label', 'Level')} {level}"
        ])
    
    category_table = Table(category_data, colWidths=[3*inch, 1.5*inch, 2*inch])
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C00000')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(category_table)
    elements.append(PageBreak())
    
    # Detailed Indicator Selections
    elements.append(Paragraph(translations.get('detailed_indicators_heading', 'Detailed Indicator Selections'), heading_style))
    
    for cat_key, category in CATEGORIES.items():
        cat_name = translations.get(f'category_NAME_{cat_key}', category['name'])
        elements.append(Paragraph(cat_name, 
                                 ParagraphStyle('CategoryHeader',
                                              parent=styles['Heading3'],
                                              textColor=colors.HexColor(category['color']),
                                              fontSize=12,
                                              fontName='Helvetica-Bold')))
        elements.append(Spacer(1, 0.1*inch))
        
        indicator_data = [['Code', 'Indicator', 'Level', 'Weight']]
        global_weights = GLOBAL_WEIGHTS.get('indicator_weights', {})
        
        for indicator in category['indicators']:
            code = indicator['code']
            level = selections.get(code, 'N/A')
            weight = global_weights.get(code, 1.0)
            ind_name = translations.get(f'indicator_NAME_{code}', indicator.get('name', code))
            ind_level_label = translations.get('level_label', 'Level')
            indicator_data.append([
                code,
                ind_name,
                f"{ind_level_label} {level}" if level != 'N/A' else 'N/A',
                weight
            ])
        
        indicator_table = Table(indicator_data, colWidths=[0.7*inch, 3*inch, 1.3*inch, 1*inch])
        indicator_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(category['color'])),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(indicator_table)
        elements.append(Spacer(1, 0.2*inch))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'maturity_assessment_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)
